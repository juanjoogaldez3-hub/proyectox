import "server-only";

import type { TipoRecordatorio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sincronizarCitaConGoogle } from "@/lib/google";
import {
  configWhatsApp,
  enviarPlantilla,
  enviarTexto,
  interpretarRespuesta,
  leerWebhook,
  type ConfigWhatsApp,
} from "@/lib/whatsapp";
import { citaVigente, cuandoYConQuien, enlacePublicoCita, primerNombre } from "@/lib/citas";

/**
 * Ciclo de vida de una cita fuera de las pantallas: recordatorios programados,
 * respuestas del paciente (desde el enlace o por WhatsApp) y el envío que hace
 * el cron. Las acciones de servidor y los endpoints llaman aquí para que la
 * regla sea una sola.
 */

const HORA = 3_600_000;
const MAX_INTENTOS = 3;
// Un recordatorio que caería a menos de esto de ahora no aporta: el paciente
// acaba de recibir la confirmación.
const MARGEN_MINIMO = 30 * 60_000;

/**
 * Deja los recordatorios de la cita alineados con su fecha actual. Se llama al
 * crearla y cada vez que se reprograma: los que ya salieron para la hora vieja
 * vuelven a quedar pendientes para la nueva.
 */
export async function programarRecordatorios(
  citaId: string,
  opciones: { avisarAhora: boolean },
): Promise<void> {
  const cita = await prisma.cita.findUnique({
    where: { id: citaId },
    select: {
      id: true,
      empresaId: true,
      inicio: true,
      estado: true,
      contacto: { select: { whatsapp: true } },
    },
  });
  if (!cita) return;

  const config = await prisma.integracionWhatsApp.findUnique({
    where: { empresaId: cita.empresaId },
  });

  if (!config?.activa || !cita.contacto.whatsapp || !citaVigente(cita.estado)) {
    await cancelarRecordatorios(citaId);
    return;
  }

  const ahora = Date.now();
  const deseados: { tipo: TipoRecordatorio; cuando: Date }[] = [];

  if (opciones.avisarAhora && config.enviarConfirmacion) {
    deseados.push({ tipo: "CONFIRMACION", cuando: new Date(ahora) });
  }
  const primero = cita.inicio.getTime() - config.horasPrimero * HORA;
  if (config.horasPrimero > 0 && primero > ahora + MARGEN_MINIMO) {
    deseados.push({ tipo: "PRIMERO", cuando: new Date(primero) });
  }
  const segundo = cita.inicio.getTime() - config.horasSegundo * HORA;
  if (
    config.horasSegundo > 0 &&
    config.horasSegundo < config.horasPrimero &&
    segundo > ahora + MARGEN_MINIMO
  ) {
    deseados.push({ tipo: "SEGUNDO", cuando: new Date(segundo) });
  }

  const tipos = deseados.map((d) => d.tipo);
  await prisma.$transaction([
    // Los que ya no aplican (p. ej. la cita se acercó) se cancelan si no salieron.
    prisma.recordatorio.updateMany({
      where: {
        citaId,
        tipo: { notIn: [...tipos, "CONFIRMACION"] },
        estado: { in: ["PENDIENTE", "FALLIDO"] },
      },
      data: { estado: "CANCELADO" },
    }),
    ...deseados.map((d) =>
      prisma.recordatorio.upsert({
        where: { citaId_tipo: { citaId, tipo: d.tipo } },
        create: {
          empresaId: cita.empresaId,
          citaId,
          tipo: d.tipo,
          programadoPara: d.cuando,
        },
        update: {
          programadoPara: d.cuando,
          estado: "PENDIENTE",
          intentos: 0,
          error: null,
          enviadoEl: null,
          mensajeId: null,
        },
      }),
    ),
  ]);
}

export async function cancelarRecordatorios(citaId: string): Promise<void> {
  await prisma.recordatorio.updateMany({
    where: { citaId, estado: { in: ["PENDIENTE", "FALLIDO"] } },
    data: { estado: "CANCELADO" },
  });
}

/**
 * Usuario a nombre de quien quedan las anotaciones automáticas en el historial
 * (las actividades siempre tienen autor): quien agendó la cita o, si ya no
 * está, el propietario de la cuenta.
 */
async function autorAutomatico(empresaId: string, preferido?: string | null): Promise<string | null> {
  if (preferido) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: preferido, empresaId },
      select: { id: true },
    });
    if (usuario) return usuario.id;
  }
  const propietario = await prisma.usuario.findFirst({
    where: { empresaId },
    orderBy: [{ rol: "asc" }, { creadoEl: "asc" }],
    select: { id: true },
  });
  return propietario?.id ?? null;
}

export async function anotarEnHistorial(
  empresaId: string,
  contactoId: string,
  titulo: string,
  autorPreferido?: string | null,
): Promise<void> {
  const usuarioId = await autorAutomatico(empresaId, autorPreferido);
  if (!usuarioId) return;
  await prisma.actividad.create({
    data: {
      empresaId,
      usuarioId,
      contactoId,
      tipo: "WHATSAPP",
      titulo: titulo.slice(0, 140),
      completada: true,
      completadaEl: new Date(),
    },
  });
}

export type ResultadoRespuesta = "confirmada" | "cancelada" | "sin-cambio";

/**
 * El paciente confirma o cancela. Lo usan el enlace público y el webhook de
 * WhatsApp. Es idempotente: confirmar dos veces no hace nada la segunda.
 */
export async function responderCita(
  citaId: string,
  accion: "confirmar" | "cancelar",
  origen: string,
  motivo?: string,
): Promise<ResultadoRespuesta> {
  const cita = await prisma.cita.findUnique({
    where: { id: citaId },
    select: {
      id: true,
      empresaId: true,
      contactoId: true,
      estado: true,
      inicio: true,
      creadaPorId: true,
    },
  });
  if (!cita || !citaVigente(cita.estado)) return "sin-cambio";

  if (accion === "confirmar") {
    if (cita.estado === "CONFIRMADA") return "sin-cambio";
    await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: "CONFIRMADA", confirmadaEl: new Date(), confirmadaPor: origen },
    });
    await anotarEnHistorial(
      cita.empresaId,
      cita.contactoId,
      `Confirmó su cita del ${cuandoYConQuien({ inicio: cita.inicio })} (${origen})`,
      cita.creadaPorId,
    );
    await sincronizarCitaConGoogle(cita.id);
    return "confirmada";
  }

  await prisma.cita.update({
    where: { id: cita.id },
    data: {
      estado: "CANCELADA",
      canceladaEl: new Date(),
      motivoCancelacion: motivo ? `${origen}: ${motivo}` : origen,
    },
  });
  await cancelarRecordatorios(cita.id);
  await anotarEnHistorial(
    cita.empresaId,
    cita.contactoId,
    `Canceló su cita del ${cuandoYConQuien({ inicio: cita.inicio })} (${origen})${motivo ? `: ${motivo}` : ""}`,
    cita.creadaPorId,
  );
  await sincronizarCitaConGoogle(cita.id);
  return "cancelada";
}

// ---------------------------------------------------------------------------
// Envío programado (cron)
// ---------------------------------------------------------------------------

export type ResumenEnvio = { enviados: number; fallidos: number; omitidos: number };

/**
 * Manda los recordatorios cuya hora ya llegó. Pensado para correr cada 5 o 10
 * minutos desde /api/cron/recordatorios; con `citaId` manda en el momento lo
 * que ya toca de esa cita (la confirmación al agendar no espera al cron).
 *
 * Cada recordatorio se "reserva" con un update condicional antes de enviarlo,
 * así dos ejecuciones simultáneas no le mandan el mismo mensaje dos veces al
 * paciente.
 */
export async function procesarRecordatorios(
  opciones: { limite?: number; citaId?: string } = {},
): Promise<ResumenEnvio> {
  const { limite = 100, citaId } = opciones;
  const resumen: ResumenEnvio = { enviados: 0, fallidos: 0, omitidos: 0 };
  const ahora = new Date();

  // Si un envío anterior murió a medias, el recordatorio vuelve a la fila.
  await prisma.recordatorio.updateMany({
    where: { estado: "ENVIANDO", actualizadoEl: { lt: new Date(ahora.getTime() - 15 * 60_000) } },
    data: { estado: "PENDIENTE" },
  });

  const vencidos = await prisma.recordatorio.findMany({
    where: { estado: "PENDIENTE", programadoPara: { lte: ahora }, ...(citaId ? { citaId } : {}) },
    orderBy: { programadoPara: "asc" },
    take: limite,
    select: { id: true },
  });

  const configs = new Map<string, ConfigWhatsApp | null>();

  for (const { id } of vencidos) {
    const reservado = await prisma.recordatorio.updateMany({
      where: { id, estado: "PENDIENTE" },
      data: { estado: "ENVIANDO", intentos: { increment: 1 } },
    });
    if (reservado.count === 0) continue;

    const recordatorio = await prisma.recordatorio.findUniqueOrThrow({
      where: { id },
      include: {
        cita: {
          include: {
            contacto: { select: { nombre: true, whatsapp: true } },
            profesional: { select: { nombre: true } },
            empresa: { select: { nombre: true } },
          },
        },
      },
    });
    const { cita } = recordatorio;

    if (!citaVigente(cita.estado) || cita.inicio.getTime() <= Date.now() || !cita.contacto.whatsapp) {
      await prisma.recordatorio.update({
        where: { id },
        data: { estado: "CANCELADO", error: "La cita ya pasó, se canceló o el paciente no tiene WhatsApp." },
      });
      resumen.omitidos++;
      continue;
    }

    if (!configs.has(cita.empresaId)) {
      configs.set(cita.empresaId, await configWhatsApp(cita.empresaId).catch(() => null));
    }
    const config = configs.get(cita.empresaId);
    if (!config) {
      await prisma.recordatorio.update({
        where: { id },
        data: { estado: "CANCELADO", error: "WhatsApp no está conectado o está pausado." },
      });
      resumen.omitidos++;
      continue;
    }

    const plantilla =
      recordatorio.tipo === "CONFIRMACION"
        ? config.plantillaConfirmacion || config.plantillaRecordatorio
        : config.plantillaRecordatorio;

    try {
      const mensajeId = await enviarPlantilla(config, {
        para: cita.contacto.whatsapp,
        plantilla,
        idioma: config.idiomaPlantilla,
        parametros: parametrosPlantilla(cita),
      });
      await prisma.recordatorio.update({
        where: { id },
        data: { estado: "ENVIADO", enviadoEl: new Date(), mensajeId, error: null },
      });
      resumen.enviados++;
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido al enviar.";
      const reintentar = recordatorio.intentos < MAX_INTENTOS;
      await prisma.recordatorio.update({
        where: { id },
        data: reintentar
          ? {
              estado: "PENDIENTE",
              // Espera creciente: 10, 20 minutos…
              programadoPara: new Date(Date.now() + recordatorio.intentos * 10 * 60_000),
              error: mensaje.slice(0, 500),
            }
          : { estado: "FALLIDO", error: mensaje.slice(0, 500) },
      });
      resumen.fallidos++;
    }
  }

  return resumen;
}

/**
 * Parámetros de la plantilla, en orden:
 * {{1}} nombre del paciente, {{2}} clínica, {{3}} fecha, hora y profesional,
 * {{4}} enlace para confirmar o cancelar.
 */
export function parametrosPlantilla(cita: {
  inicio: Date;
  tokenPublico: string;
  contacto: { nombre: string };
  profesional: { nombre: string } | null;
  empresa: { nombre: string };
}): string[] {
  return [
    primerNombre(cita.contacto.nombre),
    cita.empresa.nombre,
    cuandoYConQuien({ inicio: cita.inicio, profesional: cita.profesional?.nombre }),
    enlacePublicoCita(cita.tokenPublico),
  ];
}

// ---------------------------------------------------------------------------
// Webhook de WhatsApp
// ---------------------------------------------------------------------------

const ORDEN_ESTADO = { ENVIADO: 1, ENTREGADO: 2, LEIDO: 3 } as const;

export async function procesarWebhookWhatsApp(cuerpo: unknown): Promise<void> {
  const { estados, mensajes } = leerWebhook(cuerpo);

  for (const e of estados) {
    const recordatorio = await prisma.recordatorio.findUnique({
      where: { mensajeId: e.mensajeId },
      select: { id: true, estado: true },
    });
    if (!recordatorio) continue;

    if (e.estado === "failed") {
      await prisma.recordatorio.update({
        where: { id: recordatorio.id },
        data: { estado: "FALLIDO", error: (e.error ?? "WhatsApp no pudo entregarlo.").slice(0, 500) },
      });
      continue;
    }
    const nuevo = e.estado === "read" ? "LEIDO" : e.estado === "delivered" ? "ENTREGADO" : null;
    const actual = recordatorio.estado as keyof typeof ORDEN_ESTADO;
    // Los avisos pueden llegar desordenados: "leído" nunca vuelve a "entregado".
    if (nuevo && (ORDEN_ESTADO[actual] ?? 0) < ORDEN_ESTADO[nuevo]) {
      await prisma.recordatorio.update({ where: { id: recordatorio.id }, data: { estado: nuevo } });
    }
  }

  for (const m of mensajes) {
    await procesarMensajeEntrante(m.phoneNumberId, m.de, m.texto, m.respondeA);
  }
}

async function procesarMensajeEntrante(
  phoneNumberId: string,
  de: string,
  texto: string,
  respondeA?: string,
): Promise<void> {
  const integracion = await prisma.integracionWhatsApp.findUnique({
    where: { phoneNumberId },
    select: { empresaId: true },
  });
  if (!integracion) return;
  const { empresaId } = integracion;

  // 1) Si respondió citando el recordatorio, sabemos exactamente a qué cita.
  let cita = respondeA
    ? await prisma.recordatorio
        .findUnique({
          where: { mensajeId: respondeA },
          select: { cita: { select: { id: true, empresaId: true, contactoId: true, creadaPorId: true } } },
        })
        .then((r) => (r?.cita.empresaId === empresaId ? r.cita : null))
    : null;

  // 2) Si no, su próxima cita vigente con ese número.
  const contacto = cita
    ? null
    : await prisma.contacto.findFirst({
        where: { empresaId, whatsapp: de },
        select: { id: true },
        orderBy: { actualizadoEl: "desc" },
      });
  if (!cita && contacto) {
    cita = await prisma.cita.findFirst({
      where: {
        empresaId,
        contactoId: contacto.id,
        estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
        inicio: { gte: new Date(Date.now() - HORA) },
      },
      orderBy: { inicio: "asc" },
      select: { id: true, empresaId: true, contactoId: true, creadaPorId: true },
    });
  }

  const contactoId = cita?.contactoId ?? contacto?.id;
  if (!contactoId) return; // Número desconocido: no es de la agenda.

  const accion = cita ? interpretarRespuesta(texto) : null;
  if (!cita || !accion) {
    if (texto.trim()) {
      await anotarEnHistorial(empresaId, contactoId, `Escribió por WhatsApp: "${texto.trim()}"`, cita?.creadaPorId);
    }
    return;
  }

  const resultado = await responderCita(cita.id, accion, "paciente por WhatsApp");

  // Acuse de recibo: el paciente acaba de escribir, así que estamos dentro de
  // la ventana de 24 h y se puede mandar texto libre.
  const config = await configWhatsApp(empresaId).catch(() => null);
  if (!config) return;
  const respuesta =
    resultado === "confirmada"
      ? "¡Gracias! Su cita quedó confirmada. Lo esperamos."
      : resultado === "cancelada"
        ? "Listo, su cita quedó cancelada. Si desea reprogramar, escríbanos por este medio."
        : null;
  if (respuesta) {
    await enviarTexto(config, { para: de, texto: respuesta }).catch((e) =>
      console.error("WhatsApp: no se pudo mandar el acuse", e),
    );
  }
}
