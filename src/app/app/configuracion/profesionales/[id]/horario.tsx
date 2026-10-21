"use client";

import { useState } from "react";
import { Aviso, Boton } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import { DIAS_SEMANA } from "@/lib/disponibilidad";

type Tramo = { diaSemana: number; desde: string; hasta: string };

// Lunes primero, como se lee un horario de consultorio.
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

export function FormularioHorario({
  accion,
  tramos,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  tramos: Tramo[];
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const [atiende, setAtiende] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(ORDEN.map((d) => [d, tramos.some((t) => t.diaSemana === d)])),
  );

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Horario guardado. La agenda y las reservas en línea ya lo usan.</Aviso>}

      <div className="divide-y divide-tinta-100">
        {ORDEN.map((dia) => {
          const delDia = tramos.filter((t) => t.diaSemana === dia);
          // Si es día nuevo, se sugiere 8–12 y 14–18.
          const a = delDia[0] ?? { desde: "08:00", hasta: "12:00" };
          const b = delDia[1] ?? (delDia.length === 0 ? { desde: "14:00", hasta: "18:00" } : { desde: "", hasta: "" });
          return (
            <div key={dia} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex w-32 items-center gap-2 text-sm font-medium text-tinta-800">
                <input
                  type="checkbox"
                  name={`d${dia}_atiende`}
                  checked={atiende[dia]}
                  onChange={(e) => setAtiende((v) => ({ ...v, [dia]: e.target.checked }))}
                />
                {DIAS_SEMANA[dia]}
              </label>
              {atiende[dia] ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-tinta-600">
                  <input type="time" name={`d${dia}_a_desde`} defaultValue={a.desde} className="campo w-28" aria-label={`${DIAS_SEMANA[dia]}, primer tramo desde`} />
                  a
                  <input type="time" name={`d${dia}_a_hasta`} defaultValue={a.hasta} className="campo w-28" aria-label={`${DIAS_SEMANA[dia]}, primer tramo hasta`} />
                  <span className="px-1 text-tinta-400">y</span>
                  <input type="time" name={`d${dia}_b_desde`} defaultValue={b.desde} className="campo w-28" aria-label={`${DIAS_SEMANA[dia]}, segundo tramo desde`} />
                  a
                  <input type="time" name={`d${dia}_b_hasta`} defaultValue={b.hasta} className="campo w-28" aria-label={`${DIAS_SEMANA[dia]}, segundo tramo hasta`} />
                </div>
              ) : (
                <span className="text-sm text-tinta-400">No atiende</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-tinta-500">Dejá vacío el segundo tramo si ese día atiende de corrido.</p>
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar horario"}
      </Boton>
    </form>
  );
}
