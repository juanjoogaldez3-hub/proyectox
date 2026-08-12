"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { EstadoCotizacion } from "@prisma/client";
import { Boton, Tarjeta } from "@/components/ui";
import { cambiarEstadoCotizacion } from "../acciones";
import { convertirEnVenta } from "../../ventas/acciones";

function BotonAccion({
  children,
  variante = "secundario",
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario";
}) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante={variante} tamano="sm" disabled={pending}>
      {pending ? "Guardando…" : children}
    </Boton>
  );
}

export function AccionesEstado({
  id,
  estado,
  ventaId,
  ventaNumero,
}: {
  id: string;
  estado: EstadoCotizacion;
  ventaId: string | null;
  ventaNumero: number | null;
}) {
  if (ventaId) {
    return (
      <Tarjeta className="flex flex-wrap items-center gap-2 p-3 text-sm">
        <span className="text-tinta-600">
          Esta cotización ya se convirtió en la venta #{ventaNumero}.
        </span>
        <Link href={`/app/ventas/${ventaId}`} className="font-medium text-marca-600 hover:underline">
          Ver la venta
        </Link>
      </Tarjeta>
    );
  }

  // Una cotización aceptada por el cliente desde el enlace público todavía no
  // tiene venta: hay que poder registrarla desde acá.
  if (estado === "ACEPTADA") {
    return (
      <Tarjeta className="flex flex-wrap items-center gap-2 p-3">
        <span className="mr-1 text-sm text-tinta-500">
          Aceptada. Registrá la venta para descontar inventario:
        </span>
        <form action={convertirEnVenta.bind(null, id)}>
          <BotonAccion variante="primario">Registrar la venta</BotonAccion>
        </form>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="flex flex-wrap items-center gap-2 p-3">
      <span className="mr-1 text-sm text-tinta-500">Marcar como:</span>

      {estado === "BORRADOR" && (
        <form action={cambiarEstadoCotizacion.bind(null, id, "ENVIADA")}>
          <BotonAccion>Enviada</BotonAccion>
        </form>
      )}

      {(estado === "ENVIADA" || estado === "BORRADOR") && (
        <>
          <form action={convertirEnVenta.bind(null, id)}>
            <BotonAccion variante="primario">Aceptada → registrar venta</BotonAccion>
          </form>
          <form action={cambiarEstadoCotizacion.bind(null, id, "RECHAZADA")}>
            <BotonAccion>Rechazada</BotonAccion>
          </form>
        </>
      )}

      {(estado === "RECHAZADA" || estado === "VENCIDA") && (
        <form action={cambiarEstadoCotizacion.bind(null, id, "ENVIADA")}>
          <BotonAccion>Reabrir como enviada</BotonAccion>
        </form>
      )}
    </Tarjeta>
  );
}
