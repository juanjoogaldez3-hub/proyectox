"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? "Guardando…" : "Guardar y entrar"}
    </Boton>
  );
}

export function FormularioRestablecer({
  accion,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);

  return (
    <form action={enviar} className="mt-6 space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres.">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="campo"
          placeholder="••••••••"
        />
      </Campo>

      <Campo etiqueta="Repetila">
        <input
          name="confirmacion"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="campo"
          placeholder="••••••••"
        />
      </Campo>

      <BotonGuardar />
    </form>
  );
}
