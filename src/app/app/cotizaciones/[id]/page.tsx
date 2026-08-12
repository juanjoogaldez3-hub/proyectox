import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { BotonImprimir } from "@/components/imprimir";
import { aNumero, fecha, mostrarNit, mostrarTelefono, numero, quetzales } from "@/lib/gt";
import { AccionesEstado } from "./estado";

export const metadata: Metadata = { title: "Cotización" };

const TONO_ESTADO = {
  BORRADOR: "neutro",
  ENVIADA: "marca",
  ACEPTADA: "exito",
  RECHAZADA: "peligro",
  VENCIDA: "alerta",
} as const;

export default async function PaginaCotizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const cotizacion = await prisma.cotizacion.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      contacto: true,
      items: { orderBy: { orden: "asc" } },
      creadaPor: { select: { nombre: true, telefono: true } },
      ventas: { select: { id: true, numero: true } },
    },
  });

  if (!cotizacion) notFound();

  const total = aNumero(cotizacion.total);
  const mensajeWhatsApp = [
    `Buen día ${cotizacion.contacto.nombre.split(" ")[0]}, le comparto la cotización #${cotizacion.numero} de ${empresa.nombre}.`,
    "",
    ...cotizacion.items.map(
      (i) => `• ${i.descripcion} (${numero(aNumero(i.cantidad))}) — ${quetzales(aNumero(i.total))}`,
    ),
    "",
    `Total con IVA: ${quetzales(total)}`,
    cotizacion.validaHasta ? `Válida hasta el ${fecha(cotizacion.validaHasta)}.` : "",
    "",
    "Quedo atento a cualquier duda.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-imprimir">
        <Link
          href="/app/cotizaciones"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
        >
          <Icono nombre="atras" /> Cotizaciones
        </Link>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900">
              Cotización #{cotizacion.numero}
            </h1>
            <Insignia tono={TONO_ESTADO[cotizacion.estado]}>{cotizacion.estado}</Insignia>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotonWhatsApp
              numero={cotizacion.contacto.whatsapp}
              mensaje={mensajeWhatsApp}
              texto="Enviar por WhatsApp"
              className="px-3 py-2 text-sm"
            />
            <BotonImprimir />
            {cotizacion.estado !== "ACEPTADA" && (
              <BotonEnlace
                href={`/app/cotizaciones/${cotizacion.id}/editar`}
                variante="secundario"
              >
                Editar
              </BotonEnlace>
            )}
          </div>
        </div>

        <AccionesEstado
          id={cotizacion.id}
          estado={cotizacion.estado}
          ventaId={cotizacion.ventas[0]?.id ?? null}
          ventaNumero={cotizacion.ventas[0]?.numero ?? null}
        />
      </div>

      {/* Documento imprimible */}
      <Tarjeta className="mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-tinta-200 pb-5">
          <div>
            <h2 className="text-lg font-bold text-tinta-900">{empresa.nombre}</h2>
            <div className="mt-1 space-y-0.5 text-xs text-tinta-600">
              {empresa.nit && <p>NIT: {mostrarNit(empresa.nit)}</p>}
              {empresa.telefono && <p>Tel: {mostrarTelefono(empresa.telefono)}</p>}
              {empresa.direccion && <p>{empresa.direccion}</p>}
              {(empresa.municipio || empresa.departamento) && (
                <p>{[empresa.municipio, empresa.departamento].filter(Boolean).join(", ")}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wide text-tinta-500">
              Cotización
            </p>
            <p className="text-xl font-bold text-tinta-900">#{cotizacion.numero}</p>
            <p className="mt-1 text-xs text-tinta-600">Fecha: {fecha(cotizacion.fecha)}</p>
            {cotizacion.validaHasta && (
              <p className="text-xs text-tinta-600">
                Válida hasta: {fecha(cotizacion.validaHasta)}
              </p>
            )}
          </div>
        </div>

        <div className="border-b border-tinta-200 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-500">Cliente</p>
          <p className="mt-1 font-medium text-tinta-900">{cotizacion.contacto.nombre}</p>
          <div className="mt-0.5 space-y-0.5 text-xs text-tinta-600">
            {cotizacion.contacto.negocio && <p>{cotizacion.contacto.negocio}</p>}
            {cotizacion.contacto.nit && <p>NIT: {mostrarNit(cotizacion.contacto.nit)}</p>}
            {cotizacion.contacto.telefono && (
              <p>Tel: {mostrarTelefono(cotizacion.contacto.telefono)}</p>
            )}
            {cotizacion.contacto.direccion && <p>{cotizacion.contacto.direccion}</p>}
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
              {cotizacion.items.map((item) => (
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
              <dd className="text-tinta-900">{quetzales(aNumero(cotizacion.subtotal))}</dd>
            </div>
            {aNumero(cotizacion.descuento) > 0 && (
              <div className="flex justify-between">
                <dt className="text-tinta-600">Descuento</dt>
                <dd className="text-tinta-900">
                  −{quetzales(aNumero(cotizacion.descuento))}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-tinta-600">
                IVA {numero(aNumero(cotizacion.ivaPorcentaje))}%
              </dt>
              <dd className="text-tinta-900">{quetzales(aNumero(cotizacion.iva))}</dd>
            </div>
            <div className="flex justify-between border-t border-tinta-300 pt-2 text-base font-bold">
              <dt className="text-tinta-900">Total</dt>
              <dd className="text-tinta-900">{quetzales(total)}</dd>
            </div>
          </dl>
        </div>

        {(cotizacion.notas || cotizacion.condiciones) && (
          <div className="mt-6 grid gap-4 border-t border-tinta-200 pt-5 text-xs text-tinta-600 sm:grid-cols-2">
            {cotizacion.notas && (
              <div>
                <p className="font-semibold uppercase tracking-wide text-tinta-500">Notas</p>
                <p className="mt-1 whitespace-pre-wrap">{cotizacion.notas}</p>
              </div>
            )}
            {cotizacion.condiciones && (
              <div>
                <p className="font-semibold uppercase tracking-wide text-tinta-500">
                  Condiciones
                </p>
                <p className="mt-1 whitespace-pre-wrap">{cotizacion.condiciones}</p>
              </div>
            )}
          </div>
        )}

        {cotizacion.creadaPor && (
          <p className="mt-6 text-xs text-tinta-500">
            Atendido por {cotizacion.creadaPor.nombre}
            {cotizacion.creadaPor.telefono &&
              ` · ${mostrarTelefono(cotizacion.creadaPor.telefono)}`}
          </p>
        )}
      </Tarjeta>
    </div>
  );
}
