"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import { DURACIONES } from "@/lib/citas";
import { alternarServicio, guardarReservas } from "../acciones";

export type ValoresServicio = {
  nombre: string;
  duracionMin: number;
  precio: number;
  reservable: boolean;
  profesionalIds: string[];
};

export function FormularioServicio({
  accion,
  valores,
  profesionales,
  alGuardar,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresServicio;
  profesionales: { id: string; nombre: string }[];
  alGuardar?: () => void;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado?.ok) return;
    if (valores) alGuardar?.();
    else formRef.current?.reset();
  }, [estado, valores, alGuardar]);

  return (
    <form ref={formRef} onSubmit={alEnviar} className="space-y-3">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && !valores && <Aviso tono="exito">Servicio agregado.</Aviso>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo etiqueta="Nombre *" className="sm:col-span-3">
          <input name="nombre" required defaultValue={valores?.nombre} className="campo" placeholder="Consulta general" />
        </Campo>
        <Campo etiqueta="Duración">
          <select name="duracionMin" defaultValue={valores?.duracionMin ?? 30} className="campo">
            {DURACIONES.map((d) => (
              <option key={d} value={d}>
                {d} minutos
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Precio (Q)" ayuda="Con IVA incluido.">
          <input name="precio" type="number" min="0" step="0.01" defaultValue={valores?.precio ?? ""} className="campo" placeholder="250" />
        </Campo>
        <label className="flex items-center gap-2 pt-6 text-sm text-tinta-700">
          <input type="checkbox" name="reservable" defaultChecked={valores?.reservable ?? true} />
          Se puede reservar en línea
        </label>
      </div>
      {profesionales.length > 1 && (
        <fieldset>
          <legend className="etiqueta-campo">¿Quiénes lo atienden?</legend>
          <div className="flex flex-wrap gap-3">
            {profesionales.map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 text-sm text-tinta-700">
                <input type="checkbox" name="profesionalIds" value={p.id} defaultChecked={valores?.profesionalIds.includes(p.id)} />
                {p.nombre}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-tinta-400">Sin marcar ninguno, lo atiende cualquiera.</p>
        </fieldset>
      )}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : valores ? "Guardar" : "Agregar servicio"}
      </Boton>
    </form>
  );
}

export function FilaServicio({
  id,
  activo,
  valores,
  accion,
  profesionales,
  textoPrecio,
}: {
  id: string;
  activo: boolean;
  valores: ValoresServicio;
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  profesionales: { id: string; nombre: string }[];
  textoPrecio: string;
}) {
  const [editando, setEditando] = useState(false);
  const quienes = valores.profesionalIds
    .map((pid) => profesionales.find((p) => p.id === pid)?.nombre)
    .filter(Boolean)
    .join(", ");
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={activo ? "text-sm font-medium text-tinta-900" : "text-sm text-tinta-400 line-through"}>{valores.nombre}</p>
          <p className="text-xs text-tinta-500">
            {[`${valores.duracionMin} min`, textoPrecio, valores.reservable ? "en línea" : "solo recepción", quienes]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setEditando((v) => !v)}>
            {editando ? "Cerrar" : "Editar"}
          </Boton>
          <form action={alternarServicio.bind(null, id)}>
            <Boton type="submit" variante="fantasma" tamano="sm">
              {activo ? "Desactivar" : "Activar"}
            </Boton>
          </form>
        </div>
      </div>
      {editando && (
        <Tarjeta className="mt-3 p-4">
          <FormularioServicio accion={accion} valores={valores} profesionales={profesionales} alGuardar={() => setEditando(false)} />
        </Tarjeta>
      )}
    </li>
  );
}

export function FormularioReservas({
  valores,
  enlace,
}: {
  valores: { reservasActivas: boolean; reservasAnticipacionHoras: number; reservasDiasMax: number };
  enlace: string;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(guardarReservas);
  const [copiado, setCopiado] = useState(false);
  return (
    <form onSubmit={alEnviar} className="space-y-3">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Guardado.</Aviso>}
      <label className="flex items-center gap-2 text-sm font-medium text-tinta-800">
        <input type="checkbox" name="reservasActivas" defaultChecked={valores.reservasActivas} />
        Los pacientes pueden reservar solos desde un enlace
      </label>
      <div className="flex items-center gap-2">
        <input readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} className="campo min-w-0 flex-1 font-mono text-xs" aria-label="Enlace de reservas" />
        <Boton
          type="button"
          variante="secundario"
          tamano="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(enlace);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              // Sin portapapeles se puede copiar a mano.
            }
          }}
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </Boton>
      </div>
      <p className="text-xs text-tinta-500">Ponelo en tu Instagram, Facebook, Google Maps o en el saludo de WhatsApp.</p>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Anticipación mínima (horas)">
          <input name="reservasAnticipacionHoras" type="number" min="0" max="168" defaultValue={valores.reservasAnticipacionHoras} className="campo" />
        </Campo>
        <Campo etiqueta="Hasta cuántos días adelante">
          <input name="reservasDiasMax" type="number" min="1" max="180" defaultValue={valores.reservasDiasMax} className="campo" />
        </Campo>
      </div>
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </Boton>
    </form>
  );
}
