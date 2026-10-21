"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { EstadoAccion } from "@/lib/acciones";

/**
 * Como `useActionState`, pero sin el reinicio automático que React 19 le hace
 * al formulario después de cada envío. En formularios largos, perder todo lo
 * escrito por un error de validación ("ese horario ya está ocupado") obliga a
 * llenarlo de nuevo; así los campos se quedan como estaban.
 */
export function useAccionFormulario(
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>,
) {
  const [estado, enviar, pendiente] = useActionState<EstadoAccion, FormData>(accion, null);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => enviar(datos));
  }

  return { estado, alEnviar, pendiente };
}
