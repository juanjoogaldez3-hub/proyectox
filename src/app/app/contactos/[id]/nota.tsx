"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" tamano="sm" disabled={pending}>
      {pending ? "Guardando…" : "Agregar nota"}
    </Boton>
  );
}

export function FormularioNota({
  accion,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Se limpia el textarea solo cuando la nota quedó guardada.
  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={enviar} className="space-y-2">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      <textarea
        name="contenido"
        rows={2}
        className="campo"
        placeholder="Anotá lo que hablaron: qué necesita, cuánto ofreció, cuándo volver a llamar…"
        required
      />
      <BotonGuardar />
    </form>
  );
}
