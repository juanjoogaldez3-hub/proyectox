"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";
import { crearEtapa, eliminarEtapa } from "../acciones";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Creando…" : "Agregar etapa"}
    </Boton>
  );
}

export function FormularioEtapa() {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(crearEtapa, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={enviar}>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Agregar una etapa</h2>
        <p className="mt-1 text-sm text-tinta-500">
          Se coloca antes de las etapas de cierre (ganado y perdido).
        </p>

        <div className="mt-4 space-y-3">
          {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
          {estado?.ok && <Aviso tono="exito">Etapa creada.</Aviso>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Nombre *">
            <input name="nombre" required className="campo" placeholder="Muestra enviada" />
          </Campo>
          <Campo etiqueta="Probabilidad (%)">
            <input
              name="probabilidad"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={40}
              className="campo"
            />
          </Campo>
          <Campo etiqueta="Color">
            <input name="color" type="color" defaultValue="#3366f5" className="campo h-10 p-1" />
          </Campo>
        </div>

        <div className="mt-5">
          <BotonCrear />
        </div>
      </Tarjeta>
    </form>
  );
}

function BotonEnvioEliminar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="secundario" tamano="sm" disabled={pending}>
      {pending ? "Eliminando…" : "Eliminar"}
    </Boton>
  );
}

export function BotonEliminarEtapa({ id }: { id: string }) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(
    async () => eliminarEtapa(id),
    null,
  );

  return (
    <form action={enviar} className="flex items-center gap-2">
      {estado?.error && <span className="text-xs text-red-600">{estado.error}</span>}
      <BotonEnvioEliminar />
    </form>
  );
}
