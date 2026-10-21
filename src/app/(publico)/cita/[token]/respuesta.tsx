"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

function BotonCancelar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="peligro" disabled={pending}>
      {pending ? "Cancelando…" : "Sí, cancelar mi cita"}
    </Boton>
  );
}

/** Confirmar o cancelar: lo único que el paciente necesita hacer. */
export function RespuestaPaciente({
  confirmar,
  cancelar,
  yaConfirmada,
}: {
  confirmar: () => Promise<EstadoAccion>;
  cancelar: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  yaConfirmada: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const [estadoConfirmar, setEstadoConfirmar] = useState<EstadoAccion>(null);
  const [estadoCancelar, enviarCancelar] = useActionState<EstadoAccion, FormData>(cancelar, null);
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const error = estadoConfirmar?.error ?? estadoCancelar?.error;

  return (
    <Tarjeta className="p-5">
      {error && (
        <div className="mb-3">
          <Aviso tono="peligro">{error}</Aviso>
        </div>
      )}

      {!mostrarCancelar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {!yaConfirmada && (
            <Boton
              type="button"
              tamano="lg"
              disabled={pendiente}
              onClick={() => iniciar(async () => setEstadoConfirmar(await confirmar()))}
            >
              {pendiente ? "Confirmando…" : "Confirmar mi asistencia"}
            </Boton>
          )}
          <button
            type="button"
            onClick={() => setMostrarCancelar(true)}
            className="text-sm text-tinta-500 hover:text-red-700"
          >
            No podré asistir, quiero cancelar
          </button>
        </div>
      ) : (
        <form action={enviarCancelar} className="space-y-3">
          <Campo etiqueta="¿Nos cuenta el motivo? (opcional)">
            <textarea
              name="motivo"
              rows={2}
              maxLength={300}
              className="campo"
              placeholder="Me surgió un compromiso de trabajo."
            />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <BotonCancelar />
            <button
              type="button"
              onClick={() => setMostrarCancelar(false)}
              className="text-sm text-tinta-500 hover:text-tinta-900"
            >
              Volver
            </button>
          </div>
        </form>
      )}
    </Tarjeta>
  );
}
