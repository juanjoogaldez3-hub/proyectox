import "server-only";

import { prisma } from "@/lib/prisma";
import { ZONA_GT, aNumero, hoyEnGuatemala, inicioDelDiaGT, nombreDeMes, redondear } from "@/lib/gt";

export const RANGOS = [
  { valor: "3", texto: "Últimos 3 meses", meses: 3 },
  { valor: "6", texto: "Últimos 6 meses", meses: 6 },
  { valor: "12", texto: "Últimos 12 meses", meses: 12 },
] as const;

export type Rango = (typeof RANGOS)[number]["valor"];

export function rangoValido(valor: string | undefined): Rango {
  return RANGOS.some((r) => r.valor === valor) ? (valor as Rango) : "6";
}

function mesesDelRango(rango: Rango): number {
  return RANGOS.find((r) => r.valor === rango)!.meses;
}

/** Los meses del rango como casillas de calendario, la más vieja primero. */
function casillasDelRango(rango: Rango): { ano: number; mes: number }[] {
  const hoy = hoyEnGuatemala();
  const total = mesesDelRango(rango);
  const casillas: { ano: number; mes: number }[] = [];
  for (let i = total - 1; i >= 0; i--) {
    // El Date normaliza los meses negativos al año anterior.
    const d = new Date(Date.UTC(hoy.ano, hoy.mes - i, 1));
    casillas.push({ ano: d.getUTCFullYear(), mes: d.getUTCMonth() });
  }
  return casillas;
}

/** Instante en que arranca el rango, medido en hora de Guatemala. */
export function inicioDelRango(rango: Rango): Date {
  const primera = casillasDelRango(rango)[0];
  return inicioDelDiaGT(primera.ano, primera.mes, 1);
}

function etiquetaMes(ano: number, mes: number, incluirAno: boolean): string {
  const nombre = nombreDeMes(mes);
  return incluirAno ? `${nombre} ${String(ano).slice(2)}` : nombre;
}

export type PuntoMensual = { clave: string; etiqueta: string; total: number; ventas: number };

export async function ventasPorMes(empresaId: string, rango: Rango): Promise<PuntoMensual[]> {
  const desde = inicioDelRango(rango);

  // `fecha` se guarda sin zona (UTC): se interpreta como UTC y se lleva a hora
  // de Guatemala antes de agrupar, para que una venta de las 7 de la noche no
  // caiga en el mes siguiente.
  const filas = await prisma.$queryRaw<{ mes: Date; total: number; ventas: bigint }[]>`
    SELECT date_trunc('month', "fecha" AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_GT}) AS mes,
           SUM("total")::float8 AS total,
           COUNT(*)::bigint     AS ventas
    FROM "Venta"
    WHERE "empresaId" = ${empresaId}
      AND "estado" <> 'ANULADA'
      AND "fecha" >= ${desde}
    GROUP BY 1
    ORDER BY 1
  `;

  // El resultado viene sin zona; el driver lo entrega como UTC, así que sus
  // componentes UTC son justamente el año y el mes guatemaltecos.
  const porClave = new Map(
    filas.map((f) => [
      `${f.mes.getUTCFullYear()}-${f.mes.getUTCMonth()}`,
      { total: redondear(f.total ?? 0), ventas: Number(f.ventas) },
    ]),
  );

  // Los meses sin ventas también van en la serie: un hueco cuenta una historia.
  const casillas = casillasDelRango(rango);
  const cruzaAno = casillas[0].ano !== casillas[casillas.length - 1].ano;

  return casillas.map(({ ano, mes }) => {
    const clave = `${ano}-${mes}`;
    const datos = porClave.get(clave) ?? { total: 0, ventas: 0 };
    return { clave, etiqueta: etiquetaMes(ano, mes, cruzaAno), ...datos };
  });
}

export type FilaRanking = { id: string; nombre: string; total: number; cantidad: number };

export async function ventasPorVendedor(
  empresaId: string,
  rango: Rango,
): Promise<FilaRanking[]> {
  const desde = inicioDelRango(rango);
  const filas = await prisma.$queryRaw<
    { id: string | null; nombre: string | null; total: number; ventas: bigint }[]
  >`
    SELECT u."id"                AS id,
           u."nombre"            AS nombre,
           SUM(v."total")::float8 AS total,
           COUNT(*)::bigint      AS ventas
    FROM "Venta" v
    LEFT JOIN "Usuario" u ON u."id" = v."creadaPorId"
    WHERE v."empresaId" = ${empresaId}
      AND v."estado" <> 'ANULADA'
      AND v."fecha" >= ${desde}
    GROUP BY 1, 2
    ORDER BY 3 DESC
  `;

  return filas.map((f) => ({
    id: f.id ?? "sin-usuario",
    nombre: f.nombre ?? "Sin usuario asignado",
    total: redondear(f.total ?? 0),
    cantidad: Number(f.ventas),
  }));
}

export async function productosMasVendidos(
  empresaId: string,
  rango: Rango,
  limite = 8,
): Promise<FilaRanking[]> {
  const desde = inicioDelRango(rango);
  const filas = await prisma.$queryRaw<
    { id: string | null; nombre: string; total: number; unidades: number }[]
  >`
    SELECT vi."productoId"            AS id,
           COALESCE(p."nombre", vi."descripcion") AS nombre,
           SUM(vi."total")::float8    AS total,
           SUM(vi."cantidad")::float8 AS unidades
    FROM "VentaItem" vi
    JOIN "Venta" v ON v."id" = vi."ventaId"
    LEFT JOIN "Producto" p ON p."id" = vi."productoId"
    WHERE v."empresaId" = ${empresaId}
      AND v."estado" <> 'ANULADA'
      AND v."fecha" >= ${desde}
    GROUP BY 1, 2
    ORDER BY 3 DESC
    LIMIT ${limite}
  `;

  return filas.map((f) => ({
    id: f.id ?? f.nombre,
    nombre: f.nombre,
    total: redondear(f.total ?? 0),
    cantidad: redondear(f.unidades ?? 0),
  }));
}

export type PasoEmbudo = { nombre: string; cantidad: number; monto: number };

/**
 * Oportunidades abiertas por etapa, en el orden del embudo. Es una foto de hoy,
 * no del rango: lo que importa es qué hay vivo ahora mismo.
 */
export async function embudoActual(empresaId: string): Promise<PasoEmbudo[]> {
  const etapas = await prisma.etapaEmbudo.findMany({
    where: { empresaId, esGanada: false, esPerdida: false },
    orderBy: { orden: "asc" },
    include: {
      oportunidades: {
        where: { estado: "ABIERTA" },
        select: { monto: true },
      },
    },
  });

  return etapas.map((e) => ({
    nombre: e.nombre,
    cantidad: e.oportunidades.length,
    monto: redondear(e.oportunidades.reduce((acc, o) => acc + aNumero(o.monto), 0)),
  }));
}

export type ResumenReportes = {
  vendido: number;
  ventas: number;
  ticketPromedio: number;
  porCobrar: number;
  cotizacionesEnviadas: number;
  cotizacionesAceptadas: number;
  oportunidadesGanadas: number;
  oportunidadesPerdidas: number;
};

export async function resumenDelRango(
  empresaId: string,
  rango: Rango,
): Promise<ResumenReportes> {
  const desde = inicioDelRango(rango);

  const [ventas, porCobrar, cotizaciones, cerradas] = await Promise.all([
    prisma.venta.aggregate({
      where: { empresaId, estado: { not: "ANULADA" }, fecha: { gte: desde } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.venta.aggregate({
      where: { empresaId, estado: "PENDIENTE" },
      _sum: { total: true },
    }),
    prisma.cotizacion.groupBy({
      by: ["estado"],
      where: { empresaId, creadoEl: { gte: desde } },
      _count: true,
    }),
    prisma.oportunidad.groupBy({
      by: ["estado"],
      where: { empresaId, cerradaEl: { gte: desde } },
      _count: true,
    }),
  ]);

  const conteo = (grupos: { estado: string; _count: number }[], estados: string[]) =>
    grupos.filter((g) => estados.includes(g.estado)).reduce((acc, g) => acc + g._count, 0);

  const vendido = redondear(aNumero(ventas._sum.total));
  // "Enviada" incluye las que ya avanzaron: una aceptada también se envió.
  const enviadas = conteo(cotizaciones, ["ENVIADA", "ACEPTADA", "RECHAZADA", "VENCIDA"]);

  return {
    vendido,
    ventas: ventas._count,
    ticketPromedio: ventas._count > 0 ? redondear(vendido / ventas._count) : 0,
    porCobrar: redondear(aNumero(porCobrar._sum.total)),
    cotizacionesEnviadas: enviadas,
    cotizacionesAceptadas: conteo(cotizaciones, ["ACEPTADA"]),
    oportunidadesGanadas: conteo(cerradas, ["GANADA"]),
    oportunidadesPerdidas: conteo(cerradas, ["PERDIDA"]),
  };
}

// ---------------------------------------------------------------------------
// Clínicas
// ---------------------------------------------------------------------------

/** Lo cobrado por consultas, agrupado por el profesional que atendió. */
export async function ingresosPorProfesional(empresaId: string, rango: Rango): Promise<FilaRanking[]> {
  const desde = inicioDelRango(rango);
  const filas = await prisma.$queryRaw<
    { id: string | null; nombre: string | null; total: number; consultas: bigint }[]
  >`
    SELECT p."id"                 AS id,
           p."nombre"             AS nombre,
           SUM(v."total")::float8 AS total,
           COUNT(*)::bigint       AS consultas
    FROM "Cita" c
    JOIN "Venta" v ON v."id" = c."ventaId"
    LEFT JOIN "Profesional" p ON p."id" = c."profesionalId"
    WHERE c."empresaId" = ${empresaId}
      AND v."estado" <> 'ANULADA'
      AND v."fecha" >= ${desde}
    GROUP BY 1, 2
    ORDER BY 3 DESC
  `;
  return filas.map((f) => ({
    id: f.id ?? "sin-profesional",
    nombre: f.nombre ?? "Sin profesional asignado",
    total: redondear(f.total ?? 0),
    cantidad: Number(f.consultas),
  }));
}

export type AsistenciaProfesional = {
  id: string;
  nombre: string;
  atendidas: number;
  faltas: number;
  canceladas: number;
};

/** Citas ya pasadas por profesional: cuántas se atendieron y cuántas no. */
export async function asistenciaPorProfesional(empresaId: string, rango: Rango): Promise<AsistenciaProfesional[]> {
  const desde = inicioDelRango(rango);
  const grupos = await prisma.cita.groupBy({
    by: ["profesionalId", "estado"],
    where: { empresaId, inicio: { gte: desde, lt: new Date() } },
    _count: true,
  });
  const profesionales = await prisma.profesional.findMany({
    where: { empresaId },
    select: { id: true, nombre: true },
  });
  const nombre = new Map(profesionales.map((p) => [p.id, p.nombre]));
  const filas = new Map<string, AsistenciaProfesional>();
  for (const g of grupos) {
    const id = g.profesionalId ?? "sin-profesional";
    const fila =
      filas.get(id) ??
      ({ id, nombre: nombre.get(id) ?? "Sin profesional asignado", atendidas: 0, faltas: 0, canceladas: 0 } as AsistenciaProfesional);
    if (g.estado === "COMPLETADA") fila.atendidas += g._count;
    if (g.estado === "NO_ASISTIO") fila.faltas += g._count;
    if (g.estado === "CANCELADA") fila.canceladas += g._count;
    filas.set(id, fila);
  }
  return [...filas.values()].sort((a, b) => b.atendidas - a.atendidas);
}

/** Citas por servicio, para ver qué se pide más. */
export async function citasPorServicio(empresaId: string, rango: Rango): Promise<FilaRanking[]> {
  const desde = inicioDelRango(rango);
  const grupos = await prisma.cita.groupBy({
    by: ["tipoConsultaId"],
    where: { empresaId, inicio: { gte: desde }, estado: { not: "CANCELADA" } },
    _count: true,
  });
  const tipos = await prisma.tipoConsulta.findMany({ where: { empresaId }, select: { id: true, nombre: true } });
  const nombre = new Map(tipos.map((t) => [t.id, t.nombre]));
  return grupos
    .map((g) => ({
      id: g.tipoConsultaId ?? "sin-servicio",
      nombre: g.tipoConsultaId ? (nombre.get(g.tipoConsultaId) ?? "Servicio") : "Sin servicio",
      total: g._count,
      cantidad: g._count,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function resumenClinica(empresaId: string, rango: Rango) {
  const desde = inicioDelRango(rango);
  const [enLinea, calificaciones] = await Promise.all([
    prisma.cita.count({ where: { empresaId, origen: "EN_LINEA", creadoEl: { gte: desde } } }),
    prisma.cita.aggregate({
      where: { empresaId, inicio: { gte: desde }, calificacion: { not: null } },
      _avg: { calificacion: true },
      _count: { calificacion: true },
    }),
  ]);
  return {
    reservasEnLinea: enLinea,
    calificacionPromedio: calificaciones._avg.calificacion,
    calificaciones: calificaciones._count.calificacion,
  };
}
