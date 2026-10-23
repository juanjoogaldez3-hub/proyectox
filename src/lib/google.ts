import "server-only";

import { prisma } from "@/lib/prisma";
import { cifrar, descifrar } from "@/lib/cifrado";
import { ZONA_GT, instanteGT, mostrarTelefono } from "@/lib/gt";
import { enlacePublicoCita, urlBase } from "@/lib/citas";

/**
 * Integración con Google Calendar por OAuth 2.0, hablando directo con la API
 * REST (sin el SDK de Google, que pesa varios megas para cuatro llamadas).
 *
 * La clínica conecta su cuenta una vez; desde ahí cada cita que se agenda,
 * mueve o cancela se refleja en su calendario. Si el paciente tiene correo,
 * se le agrega como invitado y Google le manda la invitación: la cita aparece
 * también en el calendario del paciente y se actualiza sola si cambia.
 */

const URL_AUTORIZACION = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_REVOCAR = "https://oauth2.googleapis.com/revoke";
const URL_USUARIO = "https://openidconnect.googleapis.com/v1/userinfo";
const API_CALENDARIO = "https://www.googleapis.com/calendar/v3";

export const COOKIE_ESTADO_GOOGLE = "crm_google_estado";

const ALCANCES = ["openid", "email", "https://www.googleapis.com/auth/calendar"];

export class GoogleError extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message);
    this.name = "GoogleError";
  }
}

function credenciales() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleConfigurado(): boolean {
  return credenciales() !== null;
}

export function urlRetornoGoogle(): string {
  return `${urlBase()}/api/google/callback`;
}

export function urlAutorizacionGoogle(estado: string): string {
  const cred = credenciales();
  if (!cred) throw new GoogleError("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
  const params = new URLSearchParams({
    client_id: cred.clientId,
    redirect_uri: urlRetornoGoogle(),
    response_type: "code",
    scope: ALCANCES.join(" "),
    // offline + consent: así Google siempre devuelve refresh token, también
    // cuando la cuenta ya había autorizado la app antes.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  });
  return `${URL_AUTORIZACION}?${params.toString()}`;
}

type RespuestaToken = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function pedirToken(cuerpo: Record<string, string>): Promise<RespuestaToken> {
  const cred = credenciales();
  if (!cred) throw new GoogleError("Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      ...cuerpo,
    }),
    cache: "no-store",
  });
  const datos = (await respuesta.json()) as RespuestaToken;
  if (!respuesta.ok || datos.error) {
    throw new GoogleError(datos.error_description ?? datos.error ?? "Google rechazó el token.", respuesta.status);
  }
  return datos;
}

/**
 * A quién pertenece una conexión de Google: la cuenta general de la clínica o
 * la de un médico que conectó su propio calendario.
 */
export type CuentaGoogle = { tipo: "empresa"; empresaId: string } | { tipo: "profesional"; profesionalId: string };

/** Clave con la que se anota en la cita en qué cuenta vive su evento. */
function claveDe(cuenta: CuentaGoogle): string {
  return cuenta.tipo === "empresa" ? "empresa" : cuenta.profesionalId;
}

type RegistroGoogle = {
  refreshTokenCifrado: string;
  accessTokenCifrado: string | null;
  accessTokenExpira: Date | null;
  calendarioId: string;
};

async function leerRegistro(cuenta: CuentaGoogle): Promise<RegistroGoogle | null> {
  return cuenta.tipo === "empresa"
    ? prisma.integracionGoogle.findUnique({ where: { empresaId: cuenta.empresaId } })
    : prisma.googleProfesional.findUnique({ where: { profesionalId: cuenta.profesionalId } });
}

async function actualizarRegistro(
  cuenta: CuentaGoogle,
  data: { accessTokenCifrado?: string; accessTokenExpira?: Date; error?: string | null },
): Promise<void> {
  if (cuenta.tipo === "empresa") {
    await prisma.integracionGoogle.update({ where: { empresaId: cuenta.empresaId }, data });
  } else {
    await prisma.googleProfesional.update({ where: { profesionalId: cuenta.profesionalId }, data });
  }
}

/**
 * Paso final del OAuth: guarda la cuenta conectada. Para un médico, además,
 * hace falta saber de qué empresa es (para filtrar y borrar en cascada).
 */
export async function conectarCuentaGoogle(
  destino: { empresaId: string; profesionalId?: string },
  codigo: string,
): Promise<string> {
  const token = await pedirToken({
    code: codigo,
    redirect_uri: urlRetornoGoogle(),
    grant_type: "authorization_code",
  });
  if (!token.refresh_token) {
    throw new GoogleError(
      "Google no devolvió acceso permanente. Quitá la app en myaccount.google.com/permissions y conectá de nuevo.",
    );
  }
  if (!token.scope?.includes("auth/calendar")) {
    throw new GoogleError("Hace falta marcar el permiso de Google Calendar al conectar.");
  }

  const usuario = await fetch(URL_USUARIO, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  }).then((r) => r.json() as Promise<{ email?: string }>);
  const email = usuario.email ?? "cuenta de Google";

  const datos = {
    email,
    refreshTokenCifrado: cifrar(token.refresh_token),
    accessTokenCifrado: cifrar(token.access_token),
    accessTokenExpira: new Date(Date.now() + (token.expires_in - 60) * 1000),
    conectadaEl: new Date(),
    error: null,
  };
  // Si reconecta otra cuenta, el calendario elegido antes ya no aplica.
  const reinicio = { calendarioId: "primary", calendarioNombre: null };
  if (destino.profesionalId) {
    await prisma.googleProfesional.upsert({
      where: { profesionalId: destino.profesionalId },
      create: { empresaId: destino.empresaId, profesionalId: destino.profesionalId, ...datos },
      update: { ...datos, ...reinicio },
    });
  } else {
    await prisma.integracionGoogle.upsert({
      where: { empresaId: destino.empresaId },
      create: { empresaId: destino.empresaId, ...datos },
      update: { ...datos, ...reinicio },
    });
  }
  return email;
}

async function revocar(refreshTokenCifrado: string): Promise<void> {
  try {
    await fetch(`${URL_REVOCAR}?token=${encodeURIComponent(descifrar(refreshTokenCifrado))}`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // Si Google no responde igual borramos la conexión de nuestro lado.
  }
}

export async function desconectarCuentaGoogle(empresaId: string): Promise<void> {
  const integracion = await prisma.integracionGoogle.findUnique({ where: { empresaId } });
  if (!integracion) return;
  await revocar(integracion.refreshTokenCifrado);
  await prisma.integracionGoogle.delete({ where: { empresaId } });
}

/**
 * El médico desconecta su Google. Antes de soltar el acceso se borran de su
 * calendario las citas que vienen, y después se pasan al de la clínica: así
 * no le quedan citas duplicadas ni huérfanas.
 */
export async function desconectarGoogleProfesional(profesionalId: string): Promise<void> {
  const conexion = await prisma.googleProfesional.findUnique({ where: { profesionalId } });
  if (!conexion) return;
  const citas = await prisma.cita.findMany({
    where: { profesionalId, googleCuenta: profesionalId, inicio: { gt: new Date() } },
    select: { id: true, googleEventoId: true, googleCalendarioId: true },
  });
  const acceso = await accesoDe({ tipo: "profesional", profesionalId }).catch(() => null);
  for (const c of citas) {
    if (acceso && c.googleEventoId && c.googleCalendarioId) {
      await llamarCalendario(acceso.token, `${rutaEvento(c.googleCalendarioId, c.googleEventoId)}?sendUpdates=none`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    await prisma.cita.update({
      where: { id: c.id },
      data: { googleEventoId: null, googleCalendarioId: null, googleCuenta: null },
    });
  }
  await revocar(conexion.refreshTokenCifrado);
  await prisma.googleProfesional.delete({ where: { profesionalId } });
  for (const c of citas) await sincronizarCitaConGoogle(c.id);
}

/** Devuelve un access token vigente, renovándolo con el refresh token si hace falta. */
async function accesoDe(cuenta: CuentaGoogle): Promise<{ token: string; calendarioId: string } | null> {
  const registro = await leerRegistro(cuenta);
  if (!registro) return null;

  if (registro.accessTokenCifrado && registro.accessTokenExpira && registro.accessTokenExpira.getTime() > Date.now()) {
    return { token: descifrar(registro.accessTokenCifrado), calendarioId: registro.calendarioId };
  }

  try {
    const nuevo = await pedirToken({
      refresh_token: descifrar(registro.refreshTokenCifrado),
      grant_type: "refresh_token",
    });
    await actualizarRegistro(cuenta, {
      accessTokenCifrado: cifrar(nuevo.access_token),
      accessTokenExpira: new Date(Date.now() + (nuevo.expires_in - 60) * 1000),
      error: null,
    });
    return { token: nuevo.access_token, calendarioId: registro.calendarioId };
  } catch (e) {
    // invalid_grant = el usuario quitó el permiso o cambió la contraseña.
    const mensaje =
      e instanceof GoogleError && e.estado === 400
        ? "Google revocó el acceso. Conectá la cuenta de nuevo."
        : e instanceof Error
          ? e.message
          : "No se pudo renovar el acceso a Google.";
    await actualizarRegistro(cuenta, { error: mensaje });
    throw new GoogleError(mensaje);
  }
}

function tokenDeAcceso(empresaId: string) {
  return accesoDe({ tipo: "empresa", empresaId });
}

/**
 * Dónde van las citas de un profesional: a su propio Google si lo conectó y
 * funciona; si no, a la cuenta de la clínica, en el calendario que se le haya
 * asignado o en el general.
 */
async function destinoDelProfesional(
  empresaId: string,
  profesional: { id: string; calendarioId: string | null } | null,
): Promise<{ cuenta: CuentaGoogle; token: string; calendarioId: string } | null> {
  if (profesional) {
    const propia = await prisma.googleProfesional.findUnique({
      where: { profesionalId: profesional.id },
      select: { error: true },
    });
    if (propia && !propia.error) {
      const cuenta: CuentaGoogle = { tipo: "profesional", profesionalId: profesional.id };
      const acceso = await accesoDe(cuenta).catch(() => null);
      if (acceso) return { cuenta, token: acceso.token, calendarioId: acceso.calendarioId };
    }
  }
  const acceso = await tokenDeAcceso(empresaId);
  if (!acceso) return null;
  return {
    cuenta: { tipo: "empresa", empresaId },
    token: acceso.token,
    calendarioId: profesional?.calendarioId || acceso.calendarioId,
  };
}

async function llamarCalendario<T>(
  token: string,
  ruta: string,
  init: RequestInit = {},
): Promise<T | null> {
  const respuesta = await fetch(`${API_CALENDARIO}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (respuesta.status === 204) return null;
  if (!respuesta.ok) {
    let mensaje = `Google Calendar respondió ${respuesta.status}`;
    try {
      const cuerpo = (await respuesta.json()) as { error?: { message?: string } };
      if (cuerpo.error?.message) mensaje = cuerpo.error.message;
    } catch {
      // Sin cuerpo JSON nos quedamos con el código.
    }
    throw new GoogleError(mensaje, respuesta.status);
  }
  return (await respuesta.json()) as T;
}

export type CalendarioGoogle = { id: string; nombre: string; principal: boolean };

/** Calendarios donde la cuenta conectada puede escribir. */
export async function listarCalendarios(
  empresaId: string,
  cuenta: CuentaGoogle = { tipo: "empresa", empresaId },
): Promise<CalendarioGoogle[]> {
  const acceso = await accesoDe(cuenta);
  if (!acceso) return [];
  const datos = await llamarCalendario<{
    items?: { id: string; summary: string; summaryOverride?: string; primary?: boolean }[];
  }>(acceso.token, "/users/me/calendarList?minAccessRole=writer&maxResults=100");
  return (datos?.items ?? []).map((c) => ({
    id: c.id,
    nombre: c.summaryOverride ?? c.summary,
    principal: Boolean(c.primary),
  }));
}

/**
 * Lo que el profesional tiene ocupado en su Google Calendar y que no salió de
 * esta agenda: una reunión, un congreso, un rato que se bloqueó a mano. Si
 * Google falla devuelve una lista vacía: la agenda sigue funcionando con lo
 * que sabe.
 */
export async function ocupadoEnGoogle(
  empresaId: string,
  profesional: { id: string; calendarioId: string | null },
  desde: Date,
  hasta: Date,
): Promise<{ inicio: Date; fin: Date; titulo: string }[]> {
  try {
    const destino = await destinoDelProfesional(empresaId, profesional);
    if (!destino) return [];
    const acceso = destino;
    const calendarioId = destino.calendarioId;
    const params = new URLSearchParams({
      timeMin: desde.toISOString(),
      timeMax: hasta.toISOString(),
      singleEvents: "true",
      maxResults: "250",
      fields: "items(status,transparency,summary,start,end,extendedProperties)",
    });
    const datos = await llamarCalendario<{
      items?: {
        status?: string;
        transparency?: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        extendedProperties?: { private?: Record<string, string> };
      }[];
    }>(acceso.token, `${rutaEvento(calendarioId)}?${params.toString()}`);

    return (datos?.items ?? [])
      .filter(
        (e) =>
          e.status !== "cancelled" &&
          e.transparency !== "transparent" &&
          !e.extendedProperties?.private?.crmCitaId,
      )
      .map((e) => {
        // Un evento de todo el día ocupa el día completo en Guatemala.
        const inicio = e.start?.dateTime
          ? new Date(e.start.dateTime)
          : instanteGT(e.start?.date ?? "", "00:00");
        const fin = e.end?.dateTime ? new Date(e.end.dateTime) : instanteGT(e.end?.date ?? "", "00:00");
        return inicio && fin ? { inicio, fin, titulo: e.summary ?? "Ocupado en Google Calendar" } : null;
      })
      .filter((e): e is { inicio: Date; fin: Date; titulo: string } => e !== null);
  } catch (e) {
    console.error("Google Calendar (ocupado):", e instanceof Error ? e.message : e);
    return [];
  }
}

type EventoGoogle = { id: string; htmlLink?: string };

function rutaEvento(calendarioId: string, eventoId?: string): string {
  const base = `/calendars/${encodeURIComponent(calendarioId)}/events`;
  return eventoId ? `${base}/${encodeURIComponent(eventoId)}` : base;
}

/**
 * Lleva la cita al calendario de la clínica: la crea, la actualiza o la borra
 * según su estado. Nunca lanza: si Google falla, el error queda guardado en la
 * cita para mostrarlo con un botón de reintentar, y la agenda sigue funcionando.
 */
export async function sincronizarCitaConGoogle(citaId: string): Promise<void> {
  const cita = await prisma.cita.findUnique({
    where: { id: citaId },
    include: {
      contacto: { select: { nombre: true, email: true, whatsapp: true, telefono: true } },
      profesional: { select: { id: true, nombre: true, especialidad: true, calendarioId: true } },
      empresa: { select: { nombre: true, direccion: true, municipio: true, departamento: true } },
    },
  });
  if (!cita) return;

  try {
    const destino = await destinoDelProfesional(cita.empresaId, cita.profesional);
    // Sin Google en ningún lado y sin evento previo: nada que hacer.
    if (!destino && !cita.googleEventoId) return;

    const calendarioId = destino?.calendarioId ?? null;
    const clave = destino ? claveDe(destino.cuenta) : null;
    const claveAnterior = cita.googleCuenta ?? "empresa";
    const invitado = cita.invitarPaciente && cita.contacto.email ? cita.contacto.email : null;
    const avisar = invitado ? "all" : "none";

    // Si la cita se canceló, o cambió de cuenta o de calendario (por ejemplo
    // porque el médico conectó su Google), se borra el evento viejo con el
    // token de la cuenta donde estaba.
    const debeBorrar = Boolean(
      cita.googleEventoId &&
        (cita.estado === "CANCELADA" || claveAnterior !== clave || cita.googleCalendarioId !== calendarioId),
    );
    if (debeBorrar && cita.googleEventoId && cita.googleCalendarioId) {
      const cuentaAnterior: CuentaGoogle =
        claveAnterior === "empresa"
          ? { tipo: "empresa", empresaId: cita.empresaId }
          : { tipo: "profesional", profesionalId: claveAnterior };
      const anterior = claveAnterior === clave && destino ? destino : await accesoDe(cuentaAnterior).catch(() => null);
      if (anterior) {
        try {
          await llamarCalendario(
            anterior.token,
            `${rutaEvento(cita.googleCalendarioId, cita.googleEventoId)}?sendUpdates=${avisar}`,
            { method: "DELETE" },
          );
        } catch (e) {
          // 404/410: ya lo habían borrado a mano en Google.
          if (!(e instanceof GoogleError && (e.estado === 404 || e.estado === 410))) throw e;
        }
      }
    }

    if (!destino || !calendarioId) {
      await prisma.cita.update({
        where: { id: cita.id },
        data: { googleEventoId: null, googleCalendarioId: null, googleCuenta: null },
      });
      return;
    }
    const acceso = destino;

    if (cita.estado === "CANCELADA") {
      await prisma.cita.update({
        where: { id: cita.id },
        data: {
          googleEventoId: null,
          googleCalendarioId: null,
          googleCuenta: null,
          googleSincronizadaEl: new Date(),
          googleError: null,
        },
      });
      return;
    }

    const lugar = [cita.empresa.direccion, cita.empresa.municipio, cita.empresa.departamento]
      .filter(Boolean)
      .join(", ");
    const telefono = mostrarTelefono(cita.contacto.whatsapp ?? cita.contacto.telefono);
    const profesional = cita.profesional
      ? `${cita.profesional.nombre}${cita.profesional.especialidad ? ` (${cita.profesional.especialidad})` : ""}`
      : null;

    // El paciente invitado ve esta descripción: no lleva notas internas.
    const descripcion = [
      `Paciente: ${cita.contacto.nombre}`,
      telefono && `Teléfono: ${telefono}`,
      profesional && `Atiende: ${profesional}`,
      `Motivo: ${cita.motivo}`,
      "",
      `Confirmar o cancelar: ${enlacePublicoCita(cita.tokenPublico)}`,
      !invitado && cita.notas && `\nNotas: ${cita.notas}`,
      !invitado && `Ficha en el CRM: ${urlBase()}/app/citas/${cita.id}`,
    ]
      .filter((l) => l !== false && l !== null && l !== undefined && l !== "")
      .join("\n");

    const evento = {
      summary: `${cita.estado === "CONFIRMADA" ? "✅ " : ""}${cita.motivo} · ${cita.contacto.nombre}`,
      description: descripcion,
      location: lugar || undefined,
      start: { dateTime: cita.inicio.toISOString(), timeZone: ZONA_GT },
      end: { dateTime: cita.fin.toISOString(), timeZone: ZONA_GT },
      attendees: invitado ? [{ email: invitado, displayName: cita.contacto.nombre }] : [],
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      extendedProperties: { private: { crmCitaId: cita.id } },
      source: { title: cita.empresa.nombre, url: enlacePublicoCita(cita.tokenPublico) },
    };

    let guardado: EventoGoogle | null = null;
    const existente = cita.googleEventoId && !debeBorrar ? cita.googleEventoId : null;
    if (existente) {
      try {
        guardado = await llamarCalendario<EventoGoogle>(
          acceso.token,
          `${rutaEvento(calendarioId, existente)}?sendUpdates=${avisar}`,
          { method: "PATCH", body: JSON.stringify(evento) },
        );
      } catch (e) {
        if (!(e instanceof GoogleError && (e.estado === 404 || e.estado === 410))) throw e;
      }
    }
    if (!guardado) {
      guardado = await llamarCalendario<EventoGoogle>(
        acceso.token,
        `${rutaEvento(calendarioId)}?sendUpdates=${avisar}`,
        { method: "POST", body: JSON.stringify(evento) },
      );
    }

    await prisma.cita.update({
      where: { id: cita.id },
      data: {
        googleEventoId: guardado?.id ?? null,
        googleCalendarioId: calendarioId,
        googleCuenta: clave,
        googleSincronizadaEl: new Date(),
        googleError: null,
      },
    });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo sincronizar con Google Calendar.";
    console.error(`Google Calendar (cita ${citaId}):`, mensaje);
    await prisma.cita.update({
      where: { id: cita.id },
      data: { googleError: mensaje.slice(0, 500) },
    });
  }
}

