"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cx } from "@/components/ui";
import { quetzales } from "@/lib/gt";
import { moverOportunidad } from "./acciones";

export type TarjetaOportunidad = {
  id: string;
  titulo: string;
  monto: number;
  contactoNombre: string;
  contactoId: string;
  responsable: string | null;
};

export type ColumnaEtapa = {
  id: string;
  nombre: string;
  color: string;
  total: number;
  tarjetas: TarjetaOportunidad[];
};

export function Tablero({ columnas }: { columnas: ColumnaEtapa[] }) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobreColumna, setSobreColumna] = useState<string | null>(null);

  function mover(oportunidadId: string, etapaId: string) {
    iniciarTransicion(async () => {
      await moverOportunidad(oportunidadId, etapaId);
    });
  }

  function soltar(etapaId: string) {
    setSobreColumna(null);
    const id = arrastrando;
    setArrastrando(null);
    if (!id) return;
    const origen = columnas.find((c) => c.tarjetas.some((t) => t.id === id));
    if (origen?.id === etapaId) return;
    mover(id, etapaId);
  }

  return (
    // El envoltorio recorta y desplaza; la fila de adentro crece con las
    // columnas. Si el propio contenedor flex hace de scroller, la página
    // termina desplazándose a un lienzo vacío en pantallas angostas.
    <div
      className={cx(
        "w-full overflow-x-auto pb-4",
        pendiente && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex w-max gap-3">
      {columnas.map((columna) => (
        <section
          key={columna.id}
          onDragOver={(e) => {
            e.preventDefault();
            setSobreColumna(columna.id);
          }}
          onDragLeave={() => setSobreColumna((c) => (c === columna.id ? null : c))}
          onDrop={() => soltar(columna.id)}
          className={cx(
            "flex w-72 shrink-0 flex-col rounded-xl border bg-tinta-100/60 p-2",
            sobreColumna === columna.id
              ? "border-marca-400 bg-marca-50"
              : "border-tinta-200",
          )}
        >
          <header className="flex items-center gap-2 px-2 py-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: columna.color }}
            />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta-800">
              {columna.nombre}
            </h2>
            <span className="text-xs text-tinta-500">{columna.tarjetas.length}</span>
          </header>
          <p className="px-2 pb-2 text-xs font-medium text-tinta-500">
            {quetzales(columna.total)}
          </p>

          <div className="flex min-h-[3rem] flex-1 flex-col gap-2">
            {columna.tarjetas.map((t) => (
              <article
                key={t.id}
                draggable
                onDragStart={() => setArrastrando(t.id)}
                onDragEnd={() => setArrastrando(null)}
                className={cx(
                  // `relative` no es decorativo: el `sr-only` de más abajo se
                  // posiciona en absoluto y, sin un ancestro posicionado, su
                  // bloque contenedor sería el viewport. Se escaparía del
                  // recorte del scroller y estiraría la página a lo ancho.
                  "relative cursor-grab rounded-lg border border-tinta-200 bg-white p-3 shadow-sm active:cursor-grabbing",
                  arrastrando === t.id && "opacity-40",
                )}
              >
                <Link
                  href={`/app/embudo/${t.id}`}
                  className="block text-sm font-medium text-tinta-900 hover:text-marca-600"
                >
                  {t.titulo}
                </Link>
                <p className="mt-0.5 truncate text-xs text-tinta-500">{t.contactoNombre}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-tinta-900">
                    {quetzales(t.monto)}
                  </span>
                  {t.responsable && (
                    <span className="truncate text-xs text-tinta-400">{t.responsable}</span>
                  )}
                </div>

                {/* En celular no hay arrastre, así que se mueve con el selector. */}
                <label className="mt-2 block sm:hidden">
                  <span className="sr-only">Mover a otra etapa</span>
                  <select
                    value={columna.id}
                    onChange={(e) => mover(t.id, e.target.value)}
                    className="w-full rounded border border-tinta-200 px-2 py-1 text-xs text-tinta-600"
                  >
                    {columnas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}

            {columna.tarjetas.length === 0 && (
              <p className="rounded-lg border border-dashed border-tinta-300 px-3 py-4 text-center text-xs text-tinta-400">
                Arrastrá una oportunidad acá
              </p>
            )}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
