"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import { ingresar, type EstadoFormulario } from "../acciones";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </Boton>
  );
}

export function FormularioIngreso() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(ingresar, null);

  return (
    <form action={accion} className="mt-6 space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Campo etiqueta="Correo">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          placeholder="vos@tunegocio.com"
        />
      </Campo>

      <Campo etiqueta="Contraseña">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
          placeholder="••••••••"
        />
      </Campo>

      <BotonEnviar />
    </form>
  );
}
