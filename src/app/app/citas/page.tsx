import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta, cx } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { diaLargo, hora, hoyEnGuatemala, inicioDelDiaGT, partesLocalesGT } from "@/lib/gt";
import { ESTADOS_CITA } from "@/lib/citas";

export const metadata: Metadata = { title: "Agenda" };

type Vista = "dia" | "semana";

const DIA_MS = 86_400_000;

/** Lee "YYYY-MM-DD" o cae en hoy (de Guatemala). */
function leerFecha(texto?: string): { ano: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? "");
  if (m) {
    const [ano, mes, dia] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
    const prueba = new Date(Date.UTC(ano, mes, dia));
    if (prueba.getUTCMonth() === mes) return { ano, mes, dia };
  }
  return hoyEnGuatemala();
}

function textoFecha(d: Date): string {
  return partesLocalesGT(d).fecha;
}

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string; profesional?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const filtros = await searchParams;
  const vista: Vista = filtros.vista === "semana" ? "semana" : "dia";
  const { ano, mes, dia } = leerFecha(filtros.fecha);

  // La semana arranca el lunes, como en los consultorios de acá.
  const diaSemana = new Date(Date.UTC(ano, mes, dia)).getUTCDay();
  const desplazamiento = vista === "semana" ? (diaSemana + 6) % 7 : 0;
  const desde = inicioDelDiaGT(ano, mes, dia - desplazamiento);
  const dias = vista === "semana" ? 7 : 1;
  const hasta = new Date(desde.getTime() + dias * DIA_MS);

  const profesionales = await prisma.profesional.findMany({
    where: { empresaId: empresa.id, activo: true },
    select: { id: true, nombre: true, color: true },
    orderBy: { nombre: "asc" },
  });
  const profesionalId = profesionales.some((p) => p.id === filtros.profesional)
    ? filtros.profesional
    : undefined;

  const donde: Prisma.CitaWhereInput = {
    empresaId: empresa.id,
    inicio: { gte: desde, lt: hasta },
    ...(profesionalId ? { profesionalId } : {}),
  };

  const citas = await prisma.cita.findMany({
    where: donde,
    orderBy: { inicio: "asc" },
    include: {
      contacto: { select: { id: true, nombre: true } },
      profesional: { select: { nombre: true, color: true } },
      recordatorios: {
        where: { estado: { not: "CANCELADO" } },
        orderBy: { programadoPara: "desc" },
        take: 1,
        select: { estado: true },
      },
    },
  });

  const vigentes = citas.filter((c) => c.estado !== "CANCELADA");
  const porConfirmar = citas.filter((c) => c.estado === "PROGRAMADA").length;
  const confirmadas = citas.filter((c) => c.estado === "CONFIRMADA").length;

  // Agrupadas por día local, incluyendo los días vacíos de la semana.
  const grupos = Array.from({ length: dias }, (_, i) => {
    const inicioDia = new Date(desde.getTime() + i * DIA_MS);
    const finDia = new Date(inicioDia.getTime() + DIA_MS);
    return {
      inicioDia,
      citas: citas.filter((c) => c.inicio >= inicioDia && c.inicio < finDia),
    };
  });

  const paso = dias * DIA_MS;
  const enlace = (cambios: { fecha?: string; vista?: Vista; profesional?: string | null }) => {
    const params = new URLSearchParams();
    params.set("fecha", cambios.fecha ?? textoFecha(desde));
    params.set("vista", cambios.vista ?? vista);
    const prof = cambios.profesional === undefined ? profesionalId : cambios.profesional;
    if (prof) params.set("profesional", prof);
    return `/app/citas?${params.toString()}`;
  };
  const hoyTexto = textoFecha(new Date());

  return (
    <>
      <EncabezadoPagina
        titulo="Agenda"
        descripcion={
          vista === "dia"
            ? diaLargo(desde)
            : `Semana del ${diaLargo(desde)} al ${diaLargo(new Date(hasta.getTime() - 1))}`
        }
        acciones={
          <BotonEnlace href={`/app/citas/nueva?fecha=${textoFecha(desde)}${profesionalId ? `&profesional=${profesionalId}` : ""}`}>
            <Icono nombre="mas" /> Agendar cita
          </BotonEnlace>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-tinta-200 bg-white">
          <Link
            href={enlace({ fecha: textoFecha(new Date(desde.getTime() - paso)) })}
            className="px-2.5 py-1.5 text-tinta-600 hover:bg-tinta-50"
            aria-label="Anterior"
          >
            <Icono nombre="atras" />
          </Link>
          <Link
            href={enlace({ fecha: hoyTexto })}
            className="border-x border-tinta-200 px-3 py-1.5 text-sm text-tinta-700 hover:bg-tinta-50"
          >
            Hoy
          </Link>
          <Link
            href={enlace({ fecha: textoFecha(new Date(desde.getTime() + paso)) })}
            className="px-2.5 py-1.5 text-tinta-600 hover:bg-tinta-50"
            aria-label="Siguiente"
          >
            <Icono nombre="atras" className="h-4 w-4 rotate-180" />
          </Link>
        </div>

        <div className="flex rounded-lg border border-tinta-200 bg-white p-0.5">
          {(["dia", "semana"] as const).map((v) => (
            <Link
              key={v}
              href={enlace({ vista: v })}
              className={cx(
                "rounded-md px-3 py-1 text-sm",
                vista === v ? "bg-marca-50 font-medium text-marca-700" : "text-tinta-600 hover:bg-tinta-50",
              )}
            >
              {v === "dia" ? "Día" : "Semana"}
            </Link>
          ))}
        </div>

        {profesionales.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={enlace({ profesional: null })}
              className={cx(
                "rounded-full border px-3 py-1 text-xs",
                !profesionalId
                  ? "border-marca-300 bg-marca-50 font-medium text-marca-700"
                  : "border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50",
              )}
            >
              Todos
            </Link>
            {profesionales.map((p) => (
              <Link
                key={p.id}
                href={enlace({ profesional: p.id })}
                className={cx(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                  profesionalId === p.id
                    ? "border-marca-300 bg-marca-50 font-medium text-marca-700"
                    : "border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.nombre}
              </Link>
            ))}
          </div>
        )}
      </div>

      {citas.length > 0 && (
        <p className="mb-3 text-sm text-tinta-500">
          {vigentes.length} cita{vigentes.length === 1 ? "" : "s"} · {confirmadas} confirmada
          {confirmadas === 1 ? "" : "s"} · {porConfirmar} por confirmar
        </p>
      )}

      {citas.length === 0 && vista === "dia" ? (
        <EstadoVacio
          titulo="No hay citas este día"
          descripcion="Agendá una y el paciente recibe la confirmación y sus recordatorios por WhatsApp."
          accion={
            <BotonEnlace href={`/app/citas/nueva?fecha=${textoFecha(desde)}`}>Agendar cita</BotonEnlace>
          }
        />
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <section key={g.inicioDia.toISOString()}>
              {vista === "semana" && (
                <h2
                  className={cx(
                    "mb-2 text-sm font-semibold first-letter:uppercase",
                    textoFecha(g.inicioDia) === hoyTexto ? "text-marca-700" : "text-tinta-700",
                  )}
                >
                  {diaLargo(g.inicioDia)}
                  {textoFecha(g.inicioDia) === hoyTexto && " · hoy"}
                </h2>
              )}
              {g.citas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-tinta-200 bg-white px-4 py-3 text-sm text-tinta-400">
                  Sin citas
                </p>
              ) : (
                <Tarjeta className="divide-y divide-tinta-100">
                  {g.citas.map((c) => {
                    const estado = ESTADOS_CITA[c.estado];
                    const recordatorio = c.recordatorios[0]?.estado;
                    return (
                      <Link
                        key={c.id}
                        href={`/app/citas/${c.id}`}
                        className={cx(
                          "flex items-center gap-3 p-3.5 hover:bg-tinta-50",
                          c.estado === "CANCELADA" && "opacity-60",
                        )}
                      >
                        <div className="w-20 shrink-0 text-sm">
                          <p className="font-semibold text-tinta-900">{hora(c.inicio)}</p>
                          <p className="text-xs text-tinta-500">{hora(c.fin)}</p>
                        </div>
                        <span
                          className="h-10 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: c.profesional?.color ?? "var(--color-tinta-300)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cx(
                              "truncate text-sm font-medium text-tinta-900",
                              c.estado === "CANCELADA" && "line-through",
                            )}
                          >
                            {c.contacto.nombre}
                          </p>
                          <p className="truncate text-xs text-tinta-500">
                            {c.motivo}
                            {c.profesional && ` · ${c.profesional.nombre}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                          {c.googleError ? (
                            <span title={`Google Calendar: ${c.googleError}`} className="text-amber-600">
                              <Icono nombre="alerta" className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            c.googleEventoId && (
                              <span title="En Google Calendar" className="text-tinta-400">
                                <Icono nombre="calendario" className="h-3.5 w-3.5" />
                              </span>
                            )
                          )}
                          {recordatorio && (
                            <span
                              title={`Recordatorio: ${recordatorio.toLowerCase()}`}
                              className={recordatorio === "FALLIDO" ? "text-red-500" : "text-emerald-600"}
                            >
                              <Icono nombre="whatsapp" className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                        </div>
                      </Link>
                    );
                  })}
                </Tarjeta>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
