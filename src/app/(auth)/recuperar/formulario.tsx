"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";
import { pedirRecuperacion } from "./acciones";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? "Enviando…" : "Enviarme el enlace"}
    </Boton>
  );
}

export function FormularioRecuperar() {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(pedirRecuperacion, null);

  if (estado?.ok) {
    return (
      <div className="mt-6">
        <Aviso tono="exito">
          Si ese correo tiene una cuenta, ya va en camino un enlace para cambiar la contraseña.
          Vence en una hora. Revisá también la carpeta de spam.
        </Aviso>
      </div>
    );
  }

  return (
    <form action={enviar} className="mt-6 space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      <Campo etiqueta="Tu correo">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          placeholder="vos@tunegocio.com"
        />
      </Campo>
      <BotonEnviar />
    </form>
  );
}
