"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirAdmin } from "@/lib/auth";
import { cifrar } from "@/lib/cifrado";
import { comoError, numeroDeFormulario, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { desconectarCuentaGoogle, listarCalendarios, sincronizarCitaConGoogle } from "@/lib/google";
import { configWhatsApp, enviarPlantilla, verificarNumero } from "@/lib/whatsapp";
import { cancelarRecordatorios, programarRecordatorios } from "@/lib/agenda";
import { fechaDeCita } from "@/lib/gt";
import { urlBase } from "@/lib/citas";

const RUTA = "/app/configuracion/integraciones";

/** Citas que todavía no pasan: las que hay que reacomodar cuando cambia la configuración. */
async function proximasCitas(empresaId: string) {
  return prisma.cita.findMany({
    where: { empresaId, estado: { in: ["PROGRAMADA", "CONFIRMADA"] }, inicio: { gt: new Date() } },
    orderBy: { inicio: "asc" },
    take: 300,
    select: { id: true },
  });
}

// --- Google Calendar --------------------------------------------------------

export async function elegirCalendario(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const calendarioId = z.string().trim().min(1).parse(datos.get("calendarioId") ?? "");
    const calendarios = await listarCalendarios(empresa.id);
    const elegido = calendarios.find((c) => c.id === calendarioId);
    if (!elegido) return { error: "Ese calendario no está disponible en la cuenta conectada." };

    await prisma.integracionGoogle.update({
      where: { empresaId: empresa.id },
      data: { calendarioId: elegido.id, calendarioNombre: elegido.nombre },
    });

    // Las citas que vienen se mudan al calendario nuevo.
    for (const c of await proximasCitas(empresa.id)) await sincronizarCitaConGoogle(c.id);
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(RUTA);
  return { ok: true };
}

export async function sincronizarProximas(): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const citas = await proximasCitas(empresa.id);
    for (const c of citas) await sincronizarCitaConGoogle(c.id);
    const conError = await prisma.cita.count({
      where: { id: { in: citas.map((c) => c.id) }, googleError: { not: null } },
    });
    if (conError > 0) {
      return { error: `${conError} cita(s) no se pudieron sincronizar. Revisalas en la agenda.` };
    }
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(RUTA);
  revalidatePath("/app/citas");
  return { ok: true };
}

export async function desconectarGoogle(): Promise<void> {
  const { empresa } = await requerirAdmin();
  await desconectarCuentaGoogle(empresa.id);
  revalidatePath(RUTA);
}

// --- WhatsApp ---------------------------------------------------------------

const nombrePlantilla = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]+$/, "El nombre de la plantilla va en minúsculas, números y guion bajo.");

const esquemaWhatsApp = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{6,20}$/, "El Phone Number ID son solo números."),
  accessToken: textoOpcional,
  plantillaRecordatorio: nombrePlantilla,
  plantillaConfirmacion: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(nombrePlantilla.optional()),
  idiomaPlantilla: z.string().trim().regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Idioma no válido (ej. es o es_MX)."),
  horasPrimero: numeroDeFormulario.transform((v) => Math.min(168, Math.max(0, Math.trunc(v)))),
  horasSegundo: numeroDeFormulario.transform((v) => Math.min(168, Math.max(0, Math.trunc(v)))),
  enviarConfirmacion: z.boolean(),
  activa: z.boolean(),
});

export async function guardarWhatsApp(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaWhatsApp.parse({
      phoneNumberId: datos.get("phoneNumberId") ?? "",
      accessToken: datos.get("accessToken") ?? "",
      plantillaRecordatorio: datos.get("plantillaRecordatorio") ?? "",
      plantillaConfirmacion: datos.get("plantillaConfirmacion") ?? "",
      idiomaPlantilla: (datos.get("idiomaPlantilla") as string) || "es",
      horasPrimero: (datos.get("horasPrimero") as string) || "24",
      horasSegundo: (datos.get("horasSegundo") as string) || "0",
      enviarConfirmacion: datos.get("enviarConfirmacion") === "on",
      activa: datos.get("activa") === "on",
    });
    if (entrada.horasSegundo > 0 && entrada.horasSegundo >= entrada.horasPrimero) {
      return { error: "El segundo recordatorio tiene que salir más cerca de la cita que el primero." };
    }

    const actual = await prisma.integracionWhatsApp.findUnique({ where: { empresaId: empresa.id } });
    const actualConfig = actual ? await configWhatsApp(empresa.id) : null;
    const token = entrada.accessToken ?? actualConfig?.token;
    if (!token) return { error: "Pegá el token de acceso de tu cuenta de WhatsApp Business." };

    // Solo se verifica contra Meta si cambiaron las credenciales.
    const credencialesNuevas =
      !actual || entrada.accessToken !== undefined || actual.phoneNumberId !== entrada.phoneNumberId;
    const verificado = credencialesNuevas
      ? await verificarNumero({ phoneNumberId: entrada.phoneNumberId, token })
      : { numero: actual.numeroVisible, nombre: actual.nombreVerificado };

    const valores = {
      phoneNumberId: entrada.phoneNumberId,
      accessTokenCifrado: cifrar(token),
      numeroVisible: verificado.numero,
      nombreVerificado: verificado.nombre,
      plantillaRecordatorio: entrada.plantillaRecordatorio,
      plantillaConfirmacion: entrada.plantillaConfirmacion ?? null,
      idiomaPlantilla: entrada.idiomaPlantilla,
      horasPrimero: entrada.horasPrimero,
      horasSegundo: entrada.horasSegundo,
      enviarConfirmacion: entrada.enviarConfirmacion,
      activa: entrada.activa,
    };
    await prisma.integracionWhatsApp.upsert({
      where: { empresaId: empresa.id },
      create: { empresaId: empresa.id, ...valores },
      update: valores,
    });

    // Las citas ya agendadas toman los horarios nuevos (o se pausan).
    for (const c of await proximasCitas(empresa.id)) {
      await programarRecordatorios(c.id, { avisarAhora: false });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese número de WhatsApp ya está conectado en otra cuenta." };
    }
    return comoError(e);
  }
  revalidatePath(RUTA);
  return { ok: true };
}

export async function probarWhatsApp(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const numero = z.string().trim().min(8, "Escribí el número al que querés mandar la prueba.").parse(
      datos.get("numero") ?? "",
    );
    const config = await configWhatsApp(empresa.id);
    if (!config) return { error: "Guardá y activá la configuración primero." };

    const manana = new Date(Date.now() + 86_400_000);
    await enviarPlantilla(config, {
      para: numero,
      plantilla: config.plantillaRecordatorio,
      idioma: config.idiomaPlantilla,
      parametros: ["Prueba", empresa.nombre, fechaDeCita(manana), `${urlBase()}/cita/prueba`],
    });
  } catch (e) {
    return comoError(e);
  }
  return { ok: true };
}

export async function desconectarWhatsApp(): Promise<void> {
  const { empresa } = await requerirAdmin();
  await prisma.integracionWhatsApp.deleteMany({ where: { empresaId: empresa.id } });
  for (const c of await proximasCitas(empresa.id)) await cancelarRecordatorios(c.id);
  revalidatePath(RUTA);
}
