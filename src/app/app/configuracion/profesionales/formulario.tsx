"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import { DURACIONES } from "@/lib/citas";
import { alternarProfesional } from "../acciones";

const COLORES = ["#3366f5", "#0f9d58", "#8b5cf6", "#e8a33d", "#d64545", "#0891b2", "#db2777", "#4d5566"];

export type ValoresProfesional = {
  nombre: string;
  especialidad: string | null;
  color: string;
  duracionMin: number;
  calendarioId: string | null;
};

export function FormularioProfesional({
  accion,
  valores,
  calendarios,
  titulo,
  alGuardar,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresProfesional;
  calendarios: { id: string; nombre: string }[] | null;
  titulo?: string;
  alGuardar?: () => void;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const [color, setColor] = useState(valores?.color ?? COLORES[0]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado?.ok) return;
    if (valores) alGuardar?.();
    else formRef.current?.reset();
  }, [estado, valores, alGuardar]);

  return (
    <form ref={formRef} onSubmit={alEnviar} className="space-y-4">
      {titulo && <h2 className="text-sm font-semibold text-tinta-900">{titulo}</h2>}
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && !valores && <Aviso tono="exito">Profesional agregado.</Aviso>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre *">
          <input
            name="nombre"
            required
            defaultValue={valores?.nombre}
            className="campo"
            placeholder="Dra. Ana Morales"
          />
        </Campo>
        <Campo etiqueta="Especialidad">
          <input
            name="especialidad"
            defaultValue={valores?.especialidad ?? ""}
            className="campo"
            placeholder="Pediatría"
          />
        </Campo>
        <Campo etiqueta="Duración de sus consultas">
          <select name="duracionMin" defaultValue={valores?.duracionMin ?? 30} className="campo">
            {DURACIONES.map((d) => (
              <option key={d} value={d}>
                {d} minutos
              </option>
            ))}
          </select>
        </Campo>
        <div>
          <span className="etiqueta-campo">Color en la agenda</span>
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-2 pt-1">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className="h-7 w-7 rounded-full ring-offset-2"
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined,
                }}
              />
            ))}
          </div>
        </div>
        {calendarios && (
          <Campo
            etiqueta="Calendario de Google"
            className="sm:col-span-2"
            ayuda="Útil si cada doctor lleva su propio calendario. Por defecto usa el de la clínica."
          >
            <select name="calendarioId" defaultValue={valores?.calendarioId ?? ""} className="campo">
              <option value="">El calendario de la clínica</option>
              {calendarios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : valores ? "Guardar" : "Agregar profesional"}
      </Boton>
    </form>
  );
}

export function FilaProfesional({
  id,
  activo,
  valores,
  accion,
  calendarios,
  esAdmin,
  tieneHorario,
}: {
  id: string;
  activo: boolean;
  tieneHorario: boolean;
  valores: ValoresProfesional;
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  calendarios: { id: string; nombre: string }[] | null;
  esAdmin: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const calendario = calendarios?.find((c) => c.id === valores.calendarioId);

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: valores.color }} />
          <div className="min-w-0">
            <p className={activo ? "text-sm font-medium text-tinta-900" : "text-sm text-tinta-400 line-through"}>
              {valores.nombre}
            </p>
            <p className="truncate text-xs text-tinta-500">
              {[
                valores.especialidad,
                `${valores.duracionMin} min`,
                tieneHorario ? "con horario" : "sin horario",
                calendario && `Google: ${calendario.nombre}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        {esAdmin && (
          <div className="flex items-center gap-1">
            <Link
              href={`/app/configuracion/profesionales/${id}`}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-marca-600 hover:bg-marca-50"
            >
              Horario
            </Link>
            <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setEditando((v) => !v)}>
              {editando ? "Cerrar" : "Editar"}
            </Boton>
            <form action={alternarProfesional.bind(null, id)}>
              <Boton type="submit" variante="fantasma" tamano="sm">
                {activo ? "Desactivar" : "Activar"}
              </Boton>
            </form>
          </div>
        )}
      </div>
      {editando && (
        <Tarjeta className="mt-3 p-4">
          <FormularioProfesional
            accion={accion}
            valores={valores}
            calendarios={calendarios}
            alGuardar={() => setEditando(false)}
          />
        </Tarjeta>
      )}
    </li>
  );
}
