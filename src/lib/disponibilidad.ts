import { instanteGT } from "@/lib/gt";

/**
 * Cálculo de espacios libres de la agenda. Es puro (no toca la base) para que
 * se pueda probar con números a mano: recibe los tramos de atención del día y
 * lo ocupado, y devuelve las horas en que cabe una cita.
 */

export type Tramo = { diaSemana: number; desde: string; hasta: string };
export type Rango = { inicio: Date; fin: Date };

export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Horario que se sugiere cuando el profesional todavía no tiene uno configurado. */
export const HORARIO_SUGERIDO = { desde: "07:00", hasta: "19:00" };

export function minutosDelDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function horaValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

/** 0 = domingo para una fecha "YYYY-MM-DD" (calendario, sin zona horaria). */
export function diaSemanaDe(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Los tramos de atención de esa fecha, ya como instantes. */
export function tramosDeLaFecha(tramos: Tramo[], fecha: string): Rango[] {
  const dia = diaSemanaDe(fecha);
  return tramos
    .filter((t) => t.diaSemana === dia)
    .map((t) => ({ inicio: instanteGT(fecha, t.desde), fin: instanteGT(fecha, t.hasta) }))
    .filter((r): r is Rango => r.inicio !== null && r.fin !== null && r.fin > r.inicio)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export function seCruzan(a: Rango, b: Rango): boolean {
  return a.inicio < b.fin && a.fin > b.inicio;
}

/**
 * ¿La cita cae completa dentro de algún tramo de atención? Un profesional sin
 * horario configurado no restringe nada.
 */
export function dentroDeHorario(tramos: Tramo[], cita: Rango, fecha: string): boolean {
  if (tramos.length === 0) return true;
  return tramosDeLaFecha(tramos, fecha).some((t) => cita.inicio >= t.inicio && cita.fin <= t.fin);
}

/**
 * Horas de inicio libres, cada `pasoMin` minutos, dentro de los tramos del día,
 * sin cruzarse con nada ocupado y no antes de `noAntesDe`.
 */
export function espaciosLibres(opciones: {
  fecha: string;
  tramos: Tramo[];
  ocupados: Rango[];
  duracionMin: number;
  pasoMin?: number;
  noAntesDe?: Date;
}): Date[] {
  const { fecha, ocupados, duracionMin, noAntesDe } = opciones;
  const paso = Math.max(5, opciones.pasoMin ?? 15);
  const tramos =
    opciones.tramos.length > 0
      ? tramosDeLaFecha(opciones.tramos, fecha)
      : tramosDeLaFecha([{ diaSemana: diaSemanaDe(fecha), ...HORARIO_SUGERIDO }], fecha);

  const libres: Date[] = [];
  for (const tramo of tramos) {
    for (let t = tramo.inicio.getTime(); t + duracionMin * 60_000 <= tramo.fin.getTime(); t += paso * 60_000) {
      const espacio = { inicio: new Date(t), fin: new Date(t + duracionMin * 60_000) };
      if (noAntesDe && espacio.inicio < noAntesDe) continue;
      if (ocupados.some((o) => seCruzan(o, espacio))) continue;
      libres.push(espacio.inicio);
    }
  }
  return libres;
}
