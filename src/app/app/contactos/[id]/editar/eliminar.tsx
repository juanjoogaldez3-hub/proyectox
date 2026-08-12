"use client";

import { useFormStatus } from "react-dom";
import { Boton } from "@/components/ui";
import { eliminarContacto } from "../../acciones";

function BotonConfirmacion({ nombre }: { nombre: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton
      type="submit"
      variante="peligro"
      tamano="sm"
      className="mt-3"
      disabled={pending}
      onClick={(e) => {
        // Última red de seguridad: el borrado arrastra todo el historial.
        if (!confirm(`¿Seguro que querés eliminar a ${nombre} y todo su historial?`)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Eliminando…" : "Eliminar contacto"}
    </Boton>
  );
}

export function BotonEliminarContacto({ id, nombre }: { id: string; nombre: string }) {
  return (
    <form action={eliminarContacto.bind(null, id)}>
      <BotonConfirmacion nombre={nombre} />
    </form>
  );
}
