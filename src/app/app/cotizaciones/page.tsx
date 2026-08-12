import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, fecha, quetzales } from "@/lib/gt";

export const metadata: Metadata = { title: "Cotizaciones" };

const TONO_ESTADO = {
  BORRADOR: "neutro",
  ENVIADA: "marca",
  ACEPTADA: "exito",
  RECHAZADA: "peligro",
  VENCIDA: "alerta",
} as const;

const TEXTO_ESTADO = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
} as const;

export default async function PaginaCotizaciones() {
  const { empresa } = await requerirSesion();

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { empresaId: empresa.id },
    orderBy: { numero: "desc" },
    take: 100,
    include: { contacto: { select: { id: true, nombre: true } } },
  });

  return (
    <>
      <EncabezadoPagina
        titulo="Cotizaciones"
        descripcion="Con IVA calculado y listas para mandar por WhatsApp."
        acciones={
          <BotonEnlace href="/app/cotizaciones/nueva">
            <Icono nombre="mas" /> Nueva cotización
          </BotonEnlace>
        }
      />

      {cotizaciones.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no has cotizado"
          descripcion="Armá una cotización en un minuto: elegís el cliente, agregás productos y el sistema calcula el IVA."
          accion={<BotonEnlace href="/app/cotizaciones/nueva">Hacer una cotización</BotonEnlace>}
        />
      ) : (
        <Tarjeta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-tinta-200 bg-tinta-50 text-left text-xs uppercase tracking-wide text-tinta-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">No.</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {cotizaciones.map((c) => (
                  <tr key={c.id} className="hover:bg-tinta-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/cotizaciones/${c.id}`}
                        className="font-medium text-tinta-900 hover:text-marca-600"
                      >
                        #{c.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/contactos/${c.contacto.id}`}
                        className="text-tinta-700 hover:text-marca-600"
                      >
                        {c.contacto.nombre}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-tinta-500 sm:table-cell">
                      {fecha(c.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <Insignia tono={TONO_ESTADO[c.estado]}>{TEXTO_ESTADO[c.estado]}</Insignia>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-tinta-900">
                      {quetzales(aNumero(c.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
    </>
  );
}
