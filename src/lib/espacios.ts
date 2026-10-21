import "server-only";

import { prisma } from "@/lib/prisma";
import { ocupadoEnGoogle } from "@/lib/google";
import { instanteGT, partesLocalesGT } from "@/lib/gt";
import { dentroDeHorario, espaciosLibres, seCruzan, type Rango, type Tramo } from "@/lib/disponibilidad";
import { rangoHoras } from "@/lib/citas";

/**
 * Disponibilidad real de un profesional: junta su horario, sus citas, los
 * bloqueos (suyos y de toda la clínica) y lo que tenga ocupado en Google
 * Calendar, y se lo pasa al cálculo puro de `disponibilidad.ts`.
 */

type Ocupado = Rango & { motivo: string };

async function ocupadoDelDia(
  empresaId: string,
  profesional: { id: string; calendarioId: string | null },
  fecha: string,
  excluirCitaId?: string,
): Promise<Ocupado[]> {
  const desde = instanteGT(fecha, "00:00");
  const hasta = desde ? new Date(desde.getTime() + 86_400_000) : null;
  if (!desde || !hasta) return [];

  const [citas, bloqueos, google] = await Promise.all([
    prisma.cita.findMany({
      where: {
        empresaId,
        profesionalId: profesional.id,
        estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
        inicio: { lt: hasta },
        fin: { gt: desde },
        ...(excluirCitaId ? { id: { not: excluirCitaId } } : {}),
      },
      select: { inicio: true, fin: true, contacto: { select: { nombre: true } } },
    }),
    prisma.bloqueoAgenda.findMany({
      where: {
        empresaId,
        OR: [{ profesionalId: profesional.id }, { profesionalId: null }],
        inicio: { lt: hasta },
        fin: { gt: desde },
      },
      select: { inicio: true, fin: true, motivo: true },
    }),
    ocupadoEnGoogle(empresaId, profesional.calendarioId, desde, hasta),
  ]);

  return [
    ...citas.map((c) => ({ inicio: c.inicio, fin: c.fin, motivo: `cita con ${c.contacto.nombre}` })),
    ...bloqueos.map((b) => ({ inicio: b.inicio, fin: b.fin, motivo: b.motivo })),
    ...google.map((g) => ({ inicio: g.inicio, fin: g.fin, motivo: `“${g.titulo}” en su Google Calendar` })),
  ];
}

async function profesionalConHorario(empresaId: string, profesionalId: string) {
  return prisma.profesional.findFirst({
    where: { id: profesionalId, empresaId },
    select: {
      id: true,
      nombre: true,
      calendarioId: true,
      horarios: { select: { diaSemana: true, desde: true, hasta: true } },
    },
  });
}

/** Horas libres de un profesional en una fecha ("YYYY-MM-DD"). */
export async function espaciosDisponibles(opciones: {
  empresaId: string;
  profesionalId: string;
  fecha: string;
  duracionMin: number;
  pasoMin?: number;
  noAntesDe?: Date;
  // En línea solo se ofrece lo que está dentro de un horario configurado.
  exigirHorario?: boolean;
}): Promise<Date[]> {
  const profesional = await profesionalConHorario(opciones.empresaId, opciones.profesionalId);
  if (!profesional) return [];
  if (opciones.exigirHorario && profesional.horarios.length === 0) return [];
  const ocupados = await ocupadoDelDia(opciones.empresaId, profesional, opciones.fecha);
  return espaciosLibres({
    fecha: opciones.fecha,
    tramos: profesional.horarios as Tramo[],
    ocupados,
    duracionMin: opciones.duracionMin,
    pasoMin: opciones.pasoMin,
    noAntesDe: opciones.noAntesDe ?? new Date(),
  });
}

/**
 * Por qué no se puede agendar en ese rango, o null si está libre. La
 * recepción puede pasar por encima marcando "sobreturno".
 */
export async function problemaDeHorario(opciones: {
  empresaId: string;
  profesionalId: string;
  inicio: Date;
  fin: Date;
  excluirCitaId?: string;
}): Promise<string | null> {
  const profesional = await profesionalConHorario(opciones.empresaId, opciones.profesionalId);
  if (!profesional) return "No encontramos a ese profesional.";
  const fecha = partesLocalesGT(opciones.inicio).fecha;
  const cita = { inicio: opciones.inicio, fin: opciones.fin };

  const ocupados = await ocupadoDelDia(opciones.empresaId, profesional, fecha, opciones.excluirCitaId);
  const choque = ocupados.find((o) => seCruzan(o, cita));
  if (choque) {
    return `${profesional.nombre} tiene ocupado de ${rangoHoras(choque.inicio, choque.fin)}: ${choque.motivo}.`;
  }
  if (!dentroDeHorario(profesional.horarios as Tramo[], cita, fecha)) {
    return `Ese horario está fuera de la atención de ${profesional.nombre}.`;
  }
  return null;
}
