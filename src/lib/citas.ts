import type { EstadoCita } from "@prisma/client";
import { fechaDeCita, hora } from "@/lib/gt";

/**
 * Piezas de la agenda que se usan tanto en el servidor (cron, webhook,
 * Google) como en la interfaz. Nada aquí toca la base.
 */

export const ESTADOS_CITA: Record<
  EstadoCita,
  { texto: string; tono: "neutro" | "marca" | "exito" | "alerta" | "peligro" }
> = {
  PROGRAMADA: { texto: "Programada", tono: "marca" },
  CONFIRMADA: { texto: "Confirmada", tono: "exito" },
  COMPLETADA: { texto: "Atendida", tono: "neutro" },
  NO_ASISTIO: { texto: "No asistió", tono: "alerta" },
  CANCELADA: { texto: "Cancelada", tono: "peligro" },
};

/** Estados en los que la cita todavía va a ocurrir. */
export const ESTADOS_VIGENTES: EstadoCita[] = ["PROGRAMADA", "CONFIRMADA"];

export function citaVigente(estado: EstadoCita): boolean {
  return ESTADOS_VIGENTES.includes(estado);
}

export const DURACIONES = [15, 20, 30, 45, 60, 90, 120];

/**
 * URL pública de la app. El cron y el webhook no tienen un navegador del que
 * sacar el origen, así que para los enlaces que salen por WhatsApp hace falta
 * NEXT_PUBLIC_APP_URL.
 */
export function urlBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function enlacePublicoCita(token: string, origen: string = urlBase()): string {
  return `${origen}/cita/${token}`;
}

export type DatosEvento = {
  titulo: string;
  inicio: Date;
  fin: Date;
  detalle?: string;
  lugar?: string | null;
};

/** 20261021T163000Z — el formato que piden Google Calendar e iCalendar. */
function formatoUtcCompacto(valor: Date): string {
  return valor.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Enlace "Agregar a Google Calendar" para el paciente. No requiere que la
 * clínica tenga Google conectado ni que el paciente comparta su correo: abre
 * su propio calendario con el evento ya lleno.
 */
export function enlaceGoogleCalendar(evento: DatosEvento): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${formatoUtcCompacto(evento.inicio)}/${formatoUtcCompacto(evento.fin)}`,
    ctz: "America/Guatemala",
  });
  if (evento.detalle) params.set("details", evento.detalle);
  if (evento.lugar) params.set("location", evento.lugar);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escaparIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
}

/** Archivo .ics para Apple Calendar, Outlook y cualquier otro calendario. */
export function generarIcs(evento: DatosEvento & { uid: string; cancelada?: boolean }): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM Chapin//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.uid}`,
    `DTSTAMP:${formatoUtcCompacto(new Date())}`,
    `DTSTART:${formatoUtcCompacto(evento.inicio)}`,
    `DTEND:${formatoUtcCompacto(evento.fin)}`,
    `SUMMARY:${escaparIcs(evento.titulo)}`,
    evento.detalle ? `DESCRIPTION:${escaparIcs(evento.detalle)}` : "",
    evento.lugar ? `LOCATION:${escaparIcs(evento.lugar)}` : "",
    `STATUS:${evento.cancelada ? "CANCELLED" : "CONFIRMED"}`,
    // Aviso del propio teléfono una hora antes, además del de WhatsApp.
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escaparIcs(evento.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  // RFC 5545 pide CRLF.
  return lineas.join("\r\n") + "\r\n";
}

export type CitaParaMensaje = {
  inicio: Date;
  paciente: string;
  clinica: string;
  profesional?: string | null;
  token: string;
};

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** "martes, 21 de octubre a las 10:30 a. m. con Dra. Pérez" */
export function cuandoYConQuien(cita: Pick<CitaParaMensaje, "inicio" | "profesional">): string {
  return cita.profesional
    ? `${fechaDeCita(cita.inicio)} con ${cita.profesional}`
    : fechaDeCita(cita.inicio);
}

/**
 * Texto del recordatorio. Es el mismo que se manda por wa.me desde la ficha y
 * el que sale como texto libre cuando el paciente escribió en las últimas 24 h.
 */
export function mensajeRecordatorio(cita: CitaParaMensaje, origen?: string): string {
  return [
    `Hola ${primerNombre(cita.paciente)}, le recordamos su cita en ${cita.clinica} el ${cuandoYConQuien(cita)}.`,
    `Puede confirmarla, cancelarla o agregarla a su calendario aquí: ${enlacePublicoCita(cita.token, origen)}`,
    "También puede responder 1 para confirmar o 2 para cancelar.",
  ].join("\n\n");
}

/** Rango de horas legible: "10:30 a. m. – 11:00 a. m." */
export function rangoHoras(inicio: Date, fin: Date): string {
  return `${hora(inicio)} – ${hora(fin)}`;
}
