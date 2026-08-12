"use client";

import { useFormStatus } from "react-dom";
import type { EstadoVenta } from "@prisma/client";
import { Boton, Tarjeta } from "@/components/ui";
import { anularVenta, marcarVentaPagada } from "../acciones";

function BotonPagada() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" tamano="sm" disabled={pending}>
      {pending ? "Guardando…" : "Marcar como pagada"}
    </Boton>
  );
}

function BotonAnular() {
  const { pending } = useFormStatus();
  return (
    <Boton
      type="submit"
      variante="secundario"
      tamano="sm"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("¿Anular esta venta? El inventario vuelve a su lugar.")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Anulando…" : "Anular venta"}
    </Boton>
  );
}

export function AccionesVenta({
  id,
  estado,
  puedeAnular,
}: {
  id: string;
  estado: EstadoVenta;
  puedeAnular: boolean;
}) {
  if (estado === "ANULADA") {
    return (
      <Tarjeta className="p-3 text-sm text-tinta-500">
        Esta venta está anulada y el inventario ya fue devuelto.
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="flex flex-wrap items-center gap-2 p-3">
      {estado === "PENDIENTE" && (
        <form action={marcarVentaPagada.bind(null, id)}>
          <BotonPagada />
        </form>
      )}
      {puedeAnular && (
        <form action={anularVenta.bind(null, id)}>
          <BotonAnular />
        </form>
      )}
    </Tarjeta>
  );
}
