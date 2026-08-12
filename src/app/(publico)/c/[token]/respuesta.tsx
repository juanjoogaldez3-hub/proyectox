"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

function BotonEnviar({ texto, variante = "primario" }: { texto: string; variante?: "primario" | "secundario" }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante={variante} disabled={pending}>
      {pending ? "Enviando…" : texto}
    </Boton>
  );
}

/**
 * Lo que ve el cliente al final de la cotizacion. Se pide el nombre para que
 * el vendedor sepa quien acepto: en un negocio chico rara vez responde la
 * misma persona a la que se le cotizo.
 */
export function RespuestaCliente({
  aceptar,
  rechazar,
  total,
  nombreSugerido,
}: {
  aceptar: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  rechazar: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  total: string;
  nombreSugerido: string;
}) {
  const [estadoAceptar, enviarAceptar] = useActionState<EstadoAccion, FormData>(aceptar, null);
  const [estadoRechazar, enviarRechazar] = useActionState<EstadoAccion, FormData>(rechazar, null);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  if (estadoAceptar?.ok || estadoRechazar?.ok) {
    return (
      <Aviso tono="exito">
        Listo, ya registramos tu respuesta. Podés cerrar esta página.
      </Aviso>
    );
  }

  return (
    <Tarjeta className="p-5">
      <h2 className="font-semibold text-tinta-900">¿Aceptás esta cotización?</h2>
      <p className="mt-1 text-sm text-tinta-500">
        Con un clic le avisás al vendedor. Total con IVA: <strong>{total}</strong>.
      </p>

      {(estadoAceptar?.error || estadoRechazar?.error) && (
        <div className="mt-3">
          <Aviso tono="peligro">{estadoAceptar?.error ?? estadoRechazar?.error}</Aviso>
        </div>
      )}

      {!mostrarRechazo ? (
        <form action={enviarAceptar} className="mt-4 space-y-3">
          <Campo etiqueta="Tu nombre">
            <input
              name="nombre"
              required
              minLength={2}
              defaultValue={nombreSugerido}
              className="campo"
              placeholder="Tu nombre"
            />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <BotonEnviar texto="Sí, la acepto" />
            <button
              type="button"
              onClick={() => setMostrarRechazo(true)}
              className="text-sm text-tinta-500 hover:text-tinta-900"
            >
              Por ahora no
            </button>
          </div>
        </form>
      ) : (
        <form action={enviarRechazar} className="mt-4 space-y-3">
          <Campo etiqueta="¿Nos contás por qué?" ayuda="Opcional, pero nos ayuda a mejorar.">
            <input
              name="motivo"
              className="campo"
              placeholder="El precio, el tiempo de entrega…"
            />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <BotonEnviar texto="Enviar respuesta" variante="secundario" />
            <button
              type="button"
              onClick={() => setMostrarRechazo(false)}
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
