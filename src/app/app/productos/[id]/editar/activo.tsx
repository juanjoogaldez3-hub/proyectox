"use client";

import { useFormStatus } from "react-dom";
import { Boton } from "@/components/ui";
import { alternarActivo } from "../../acciones";

function BotonEnvio({ activo }: { activo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="secundario" tamano="sm" className="mt-3" disabled={pending}>
      {pending ? "Guardando…" : activo ? "Desactivar" : "Reactivar"}
    </Boton>
  );
}

export function BotonActivo({ id, activo }: { id: string; activo: boolean }) {
  return (
    <form action={alternarActivo.bind(null, id)}>
      <BotonEnvio activo={activo} />
    </form>
  );
}
