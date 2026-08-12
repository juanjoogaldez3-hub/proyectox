"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

const MOTIVOS = [
  "Precio muy alto",
  "Se fue con la competencia",
  "Ya no lo necesita",
  "No contestó",
  "No tenía presupuesto",
];

function BotonMarcar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="secundario" tamano="sm" disabled={pending}>
      {pending ? "Guardando…" : "Marcar como perdida"}
    </Boton>
  );
}

export function FormularioPerdida({
  accion,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);

  return (
    <form action={enviar} className="mt-3 space-y-2">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      <input
        name="motivo"
        list="motivos-perdida"
        className="campo"
        placeholder="¿Por qué se perdió?"
      />
      <datalist id="motivos-perdida">
        {MOTIVOS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <BotonMarcar />
    </form>
  );
}
