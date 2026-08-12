import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonImprimir } from "@/components/imprimir";
import { aNumero, fecha, mostrarNit, mostrarTelefono, numero, quetzales } from "@/lib/gt";
import { AccionesVenta } from "./acciones-venta";

export const metadata: Metadata = { title: "Venta" };

const TONO_ESTADO = {
  PENDIENTE: "alerta",
  PAGADA: "exito",
  ANULADA: "neutro",
} as const;

export default async function PaginaVenta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { empresa, usuario } = await requerirSesion();

  const venta = await prisma.venta.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      contacto: true,
      items: { orderBy: { orden: "asc" } },
      creadaPor: { select: { nombre: true } },
      cotizacion: { select: { id: true, numero: true } },
    },
  });

  if (!venta) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-imprimir">
        <Link
          href="/app/ventas"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
        >
          <Icono nombre="atras" /> Ventas
        </Link>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900">Venta #{venta.numero}</h1>
            <Insignia tono={TONO_ESTADO[venta.estado]}>{venta.estado}</Insignia>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotonImprimir texto="Imprimir comprobante" />
          </div>
        </div>

        <AccionesVenta
          id={venta.id}
          estado={venta.estado}
          puedeAnular={usuario.rol !== "VENDEDOR"}
        />

        {venta.cotizacion && (
          <p className="mt-3 text-sm text-tinta-500">
            Viene de la{" "}
            <Link
              href={`/app/cotizaciones/${venta.cotizacion.id}`}
              className="text-marca-600 hover:underline"
            >
              cotización #{venta.cotizacion.numero}
            </Link>
            .
          </p>
        )}
      </div>

      <Tarjeta className="mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-tinta-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-tinta-900">{empresa.nombre}</h2>
            <div className="mt-1 space-y-0.5 text-xs text-tinta-600">
              {empresa.nit && <p>NIT: {mostrarNit(empresa.nit)}</p>}
              {empresa.telefono && <p>Tel: {mostrarTelefono(empresa.telefono)}</p>}
              {empresa.direccion && <p>{empresa.direccion}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-tinta-500">
              Comprobante de venta
            </p>
            <p className="text-xl font-bold text-tinta-900">#{venta.numero}</p>
            <p className="mt-1 text-xs text-tinta-600">{fecha(venta.fecha)}</p>
            <p className="text-xs text-tinta-600">Pago: {venta.metodoPago}</p>
          </div>
        </div>

        <div className="border-b border-tinta-200 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-500">Cliente</p>
          <p className="mt-1 font-medium text-tinta-900">
            {venta.nombreFactura || venta.contacto.nombre}
          </p>
          <div className="mt-0.5 space-y-0.5 text-xs text-tinta-600">
            <p>NIT: {mostrarNit(venta.nitCliente) || "CF"}</p>
            {venta.contacto.telefono && (
              <p>Tel: {mostrarTelefono(venta.contacto.telefono)}</p>
            )}
            {venta.contacto.direccion && <p>{venta.contacto.direccion}</p>}
          </div>
        </div>

        <div className="overflow-x-auto py-5">
          <table className="w-full text-sm">
            <thead className="border-b border-tinta-300 text-left text-xs uppercase tracking-wide text-tinta-500">
              <tr>
                <th className="pb-2 font-medium">Descripción</th>
                <th className="pb-2 text-right font-medium">Cant.</th>
                <th className="pb-2 text-right font-medium">P. unitario</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta-100">
              {venta.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pr-3 text-tinta-800">{item.descripcion}</td>
                  <td className="py-2.5 text-right text-tinta-600">
                    {numero(aNumero(item.cantidad))}
                  </td>
                  <td className="py-2.5 text-right text-tinta-600">
                    {quetzales(aNumero(item.precioUnitario))}
                  </td>
                  <td className="py-2.5 text-right font-medium text-tinta-900">
                    {quetzales(aNumero(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-tinta-200 pt-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-tinta-600">Subtotal</dt>
              <dd className="text-tinta-900">{quetzales(aNumero(venta.subtotal))}</dd>
            </div>
            {aNumero(venta.descuento) > 0 && (
              <div className="flex justify-between">
                <dt className="text-tinta-600">Descuento</dt>
                <dd className="text-tinta-900">−{quetzales(aNumero(venta.descuento))}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-tinta-600">IVA {numero(aNumero(venta.ivaPorcentaje))}%</dt>
              <dd className="text-tinta-900">{quetzales(aNumero(venta.iva))}</dd>
            </div>
            <div className="flex justify-between border-t border-tinta-300 pt-2 text-base font-bold">
              <dt className="text-tinta-900">Total</dt>
              <dd className="text-tinta-900">{quetzales(aNumero(venta.total))}</dd>
            </div>
          </dl>
        </div>

        {venta.notas && (
          <p className="mt-6 whitespace-pre-wrap border-t border-tinta-200 pt-5 text-xs text-tinta-600">
            {venta.notas}
          </p>
        )}

        <p className="mt-6 text-xs text-tinta-500">
          Este documento es un comprobante interno y no sustituye a la factura autorizada por la
          SAT.
          {venta.creadaPor && ` Registrado por ${venta.creadaPor.nombre}.`}
        </p>
      </Tarjeta>
    </div>
  );
}
