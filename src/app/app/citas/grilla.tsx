import Link from "next/link";
import { cx } from "@/components/ui";
import { hora, partesLocalesGT } from "@/lib/gt";
import { ESTADOS_CITA } from "@/lib/citas";
import type { EstadoCita } from "@prisma/client";

/**
 * Vista de un día como la agenda de papel: una columna por profesional y una
 * fila cada media hora. Lo blanco es horario de atención, lo gris no; las
 * rayas son bloqueos. Tocar un hueco abre el formulario con todo ya puesto.
 */

const PX_POR_MINUTO = 1.6; // media hora = 48 px
const PASO = 30;

export type ColumnaGrilla = {
  id: string | null;
  nombre: string;
  color: string;
  tramos: { inicio: Date; fin: Date }[];
  bloqueos: { inicio: Date; fin: Date; motivo: string }[];
  citas: {
    id: string;
    inicio: Date;
    fin: Date;
    paciente: string;
    motivo: string;
    estado: EstadoCita;
  }[];
};

const COLOR_ESTADO: Record<EstadoCita, string> = {
  PROGRAMADA: "border-l-marca-500 bg-marca-50",
  CONFIRMADA: "border-l-emerald-500 bg-emerald-50",
  COMPLETADA: "border-l-tinta-400 bg-tinta-100",
  NO_ASISTIO: "border-l-amber-500 bg-amber-50",
  CANCELADA: "border-l-red-400 bg-red-50 opacity-60",
};

export function GrillaDia({
  inicioDia,
  desdeMin,
  hastaMin,
  columnas,
  fecha,
}: {
  inicioDia: Date;
  desdeMin: number;
  hastaMin: number;
  columnas: ColumnaGrilla[];
  fecha: string;
}) {
  const alto = (hastaMin - desdeMin) * PX_POR_MINUTO;
  const y = (d: Date) => ((d.getTime() - inicioDia.getTime()) / 60_000 - desdeMin) * PX_POR_MINUTO;
  const filas = Array.from({ length: Math.ceil((hastaMin - desdeMin) / PASO) }, (_, i) => desdeMin + i * PASO);
  const ahora = new Date();
  const lineaAhora =
    ahora >= new Date(inicioDia.getTime() + desdeMin * 60_000) &&
    ahora <= new Date(inicioDia.getTime() + hastaMin * 60_000)
      ? y(ahora)
      : null;

  return (
    <div className="tarjeta overflow-x-auto">
      <div className="flex min-w-fit">
        {/* Columna de horas */}
        <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-tinta-200 bg-white">
          <div className="h-10 border-b border-tinta-200" />
          <div className="relative" style={{ height: alto }}>
            {filas.map((m) =>
              m % 60 === 0 ? (
                <span
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-tinta-500"
                  style={{ top: (m - desdeMin) * PX_POR_MINUTO }}
                >
                  {`${Math.floor(m / 60)}:00`}
                </span>
              ) : null,
            )}
          </div>
        </div>

        {columnas.map((col) => (
          <div key={col.id ?? "sin"} className="w-48 shrink-0 border-r border-tinta-100 last:border-r-0 sm:w-56">
            <div className="flex h-10 items-center gap-2 border-b border-tinta-200 px-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="truncate text-sm font-medium text-tinta-800">{col.nombre}</span>
            </div>
            <div className="relative bg-tinta-100/70" style={{ height: alto }}>
              {/* Horario de atención en blanco; sin horario, todo el día disponible. */}
              {(col.tramos.length > 0 ? col.tramos : [{ inicio: new Date(inicioDia.getTime() + desdeMin * 60_000), fin: new Date(inicioDia.getTime() + hastaMin * 60_000) }]).map((t, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 bg-white"
                  style={{ top: Math.max(0, y(t.inicio)), height: Math.min(alto, y(t.fin)) - Math.max(0, y(t.inicio)) }}
                />
              ))}
              {filas.map((m) => (
                <div
                  key={m}
                  className={cx("absolute inset-x-0 border-t", m % 60 === 0 ? "border-tinta-200" : "border-dashed border-tinta-100")}
                  style={{ top: (m - desdeMin) * PX_POR_MINUTO }}
                />
              ))}
              {col.bloqueos.map((b, i) => (
                <div
                  key={`b${i}`}
                  className="absolute inset-x-1 z-10 flex items-start overflow-hidden rounded-md border border-tinta-200 px-2 py-1 text-[11px] text-tinta-600"
                  style={{
                    top: Math.max(0, y(b.inicio)),
                    height: Math.max(18, Math.min(alto, y(b.fin)) - Math.max(0, y(b.inicio))),
                    backgroundImage:
                      "repeating-linear-gradient(135deg, var(--color-tinta-100) 0 6px, var(--color-tinta-50) 6px 12px)",
                  }}
                  title={b.motivo}
                >
                  {b.motivo}
                </div>
              ))}
              {/* Huecos clicables para agendar. */}
              {col.id &&
                filas.map((m) => {
                  const h = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                  return (
                    <Link
                      key={`s${m}`}
                      href={`/app/citas/nueva?fecha=${fecha}&hora=${h}&profesional=${col.id}`}
                      className="group absolute inset-x-0 z-[5] flex items-center justify-center hover:bg-marca-50/80"
                      style={{ top: (m - desdeMin) * PX_POR_MINUTO, height: PASO * PX_POR_MINUTO }}
                      aria-label={`Agendar con ${col.nombre} a las ${h}`}
                    >
                      <span className="hidden text-[11px] font-medium text-marca-600 group-hover:inline">+ {h}</span>
                    </Link>
                  );
                })}
              {col.citas.map((c) => {
                const top = y(c.inicio);
                const altura = Math.max(22, y(c.fin) - top - 2);
                return (
                  <Link
                    key={c.id}
                    href={`/app/citas/${c.id}`}
                    className={cx(
                      "absolute inset-x-1 z-10 overflow-hidden rounded-md border border-l-4 border-tinta-200 px-2 py-1 shadow-sm hover:shadow",
                      COLOR_ESTADO[c.estado],
                    )}
                    style={{ top: top + 1, height: altura }}
                    title={`${hora(c.inicio)} ${c.paciente} · ${c.motivo} · ${ESTADOS_CITA[c.estado].texto}`}
                  >
                    <p className={cx("truncate text-xs font-semibold text-tinta-900", c.estado === "CANCELADA" && "line-through")}>
                      {c.paciente}
                    </p>
                    {altura > 34 && (
                      <p className="truncate text-[11px] text-tinta-600">
                        {hora(c.inicio)} · {c.motivo}
                      </p>
                    )}
                  </Link>
                );
              })}
              {lineaAhora !== null && (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-400" style={{ top: lineaAhora }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">Agenda del {partesLocalesGT(inicioDia).fecha}</p>
    </div>
  );
}
