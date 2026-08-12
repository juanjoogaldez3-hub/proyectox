import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta, cx } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { fechaHora, tiempoRelativo } from "@/lib/gt";
import { alternarActividad, eliminarActividad } from "./acciones";

export const metadata: Metadata = { title: "Actividades" };

const FILTROS = [
  { valor: "pendientes", texto: "Pendientes" },
  { valor: "hoy", texto: "Para hoy" },
  { valor: "vencidas", texto: "Vencidas" },
  { valor: "completadas", texto: "Completadas" },
] as const;

type Filtro = (typeof FILTROS)[number]["valor"];

function condicionDelFiltro(filtro: Filtro): Prisma.ActividadWhereInput {
  const finDelDia = new Date();
  finDelDia.setHours(23, 59, 59, 999);

  switch (filtro) {
    case "hoy":
      return { completada: false, venceEl: { lte: finDelDia } };
    case "vencidas":
      return { completada: false, venceEl: { lt: new Date() } };
    case "completadas":
      return { completada: true };
    default:
      return { completada: false };
  }
}

export default async function PaginaActividades({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { filtro: filtroCrudo } = await searchParams;
  const filtro: Filtro = FILTROS.some((f) => f.valor === filtroCrudo)
    ? (filtroCrudo as Filtro)
    : "pendientes";

  const actividades = await prisma.actividad.findMany({
    where: { empresaId: empresa.id, ...condicionDelFiltro(filtro) },
    orderBy:
      filtro === "completadas"
        ? { completadaEl: "desc" }
        : [{ venceEl: "asc" }, { creadoEl: "asc" }],
    take: 100,
    include: {
      contacto: { select: { id: true, nombre: true } },
      oportunidad: { select: { id: true, titulo: true } },
      usuario: { select: { nombre: true } },
    },
  });

  return (
    <>
      <EncabezadoPagina
        titulo="Actividades"
        descripcion="Llamadas, mensajes y visitas pendientes."
        acciones={
          <BotonEnlace href="/app/actividades/nueva">
            <Icono nombre="mas" /> Agendar
          </BotonEnlace>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/app/actividades?filtro=${f.valor}`}
            className={cx(
              "rounded-lg border px-3 py-1.5 text-sm",
              filtro === f.valor
                ? "border-marca-300 bg-marca-50 font-medium text-marca-700"
                : "border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50",
            )}
          >
            {f.texto}
          </Link>
        ))}
      </div>

      {actividades.length === 0 ? (
        <EstadoVacio
          titulo={filtro === "completadas" ? "Nada completado todavía" : "No tenés pendientes"}
          descripcion="Agendá la próxima llamada o mensaje para que ningún cliente se quede esperando."
          accion={<BotonEnlace href="/app/actividades/nueva">Agendar seguimiento</BotonEnlace>}
        />
      ) : (
        <Tarjeta className="divide-y divide-tinta-100">
          {actividades.map((a) => {
            const atrasada = !a.completada && a.venceEl && a.venceEl.getTime() < Date.now();
            return (
              <div key={a.id} className="flex items-start gap-3 p-3.5">
                <form action={alternarActividad.bind(null, a.id)} className="pt-0.5">
                  <button
                    type="submit"
                    aria-label={a.completada ? "Marcar como pendiente" : "Marcar como hecha"}
                    className={cx(
                      "grid h-5 w-5 place-items-center rounded border transition-colors",
                      a.completada
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-tinta-300 hover:border-marca-500",
                    )}
                  >
                    {a.completada && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <p
                    className={cx(
                      "text-sm font-medium",
                      a.completada ? "text-tinta-400 line-through" : "text-tinta-900",
                    )}
                  >
                    {a.titulo}
                  </p>
                  {a.detalle && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-tinta-600">
                      {a.detalle}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-tinta-500">
                    <span className="capitalize">{a.tipo.toLowerCase()}</span>
                    {a.contacto && (
                      <>
                        ·
                        <Link
                          href={`/app/contactos/${a.contacto.id}`}
                          className="hover:text-marca-600"
                        >
                          {a.contacto.nombre}
                        </Link>
                      </>
                    )}
                    {a.oportunidad && (
                      <>
                        ·
                        <Link
                          href={`/app/embudo/${a.oportunidad.id}`}
                          className="hover:text-marca-600"
                        >
                          {a.oportunidad.titulo}
                        </Link>
                      </>
                    )}
                    {a.venceEl && <>· {fechaHora(a.venceEl)}</>}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {a.venceEl && !a.completada && (
                    <Insignia tono={atrasada ? "peligro" : "neutro"}>
                      {tiempoRelativo(a.venceEl)}
                    </Insignia>
                  )}
                  <form action={eliminarActividad.bind(null, a.id)}>
                    <button
                      type="submit"
                      aria-label="Eliminar actividad"
                      className="rounded p-1 text-tinta-400 hover:bg-tinta-100 hover:text-red-600"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </Tarjeta>
      )}
    </>
  );
}
