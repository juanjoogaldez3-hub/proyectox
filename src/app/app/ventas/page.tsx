import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, fecha, quetzales } from "@/lib/gt";

export const metadata: Metadata = { title: "Ventas" };

const TONO_ESTADO = {
  PENDIENTE: "alerta",
  PAGADA: "exito",
  ANULADA: "neutro",
} as const;

export default async function PaginaVentas() {
  const { empresa } = await requerirSesion();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [ventas, resumenMes, porCobrar] = await Promise.all([
    prisma.venta.findMany({
      where: { empresaId: empresa.id },
      orderBy: { numero: "desc" },
      take: 100,
      include: { contacto: { select: { id: true, nombre: true } } },
    }),
    prisma.venta.aggregate({
      where: { empresaId: empresa.id, estado: { not: "ANULADA" }, fecha: { gte: inicioMes } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.venta.aggregate({
      where: { empresaId: empresa.id, estado: "PENDIENTE" },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return (
    <>
      <EncabezadoPagina
        titulo="Ventas"
        descripcion="Lo que ya vendiste, con IVA y descuento de inventario."
        acciones={
          <BotonEnlace href="/app/ventas/nueva">
            <Icono nombre="mas" /> Registrar venta
          </BotonEnlace>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Tarjeta className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-500">
            Vendido este mes
          </p>
          <p className="mt-2 text-2xl font-semibold text-tinta-900">
            {quetzales(aNumero(resumenMes._sum.total))}
          </p>
          <p className="mt-1 text-xs text-tinta-500">
            {resumenMes._count} venta{resumenMes._count === 1 ? "" : "s"}
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-500">
            Pendiente de cobro
          </p>
          <p className="mt-2 text-2xl font-semibold text-tinta-900">
            {quetzales(aNumero(porCobrar._sum.total))}
          </p>
          <p className="mt-1 text-xs text-tinta-500">
            {porCobrar._count} venta{porCobrar._count === 1 ? "" : "s"} sin pagar
          </p>
        </Tarjeta>
      </div>

      {ventas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no registrás ventas"
          descripcion="Cada venta descuenta tu inventario y alimenta tus reportes del mes."
          accion={<BotonEnlace href="/app/ventas/nueva">Registrar la primera</BotonEnlace>}
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
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Pago</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-tinta-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/ventas/${v.id}`}
                        className="font-medium text-tinta-900 hover:text-marca-600"
                      >
                        #{v.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/contactos/${v.contacto.id}`}
                        className="text-tinta-700 hover:text-marca-600"
                      >
                        {v.contacto.nombre}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-tinta-500 sm:table-cell">
                      {fecha(v.fecha)}
                    </td>
                    <td className="hidden px-4 py-3 text-tinta-500 md:table-cell">
                      {v.metodoPago}
                    </td>
                    <td className="px-4 py-3">
                      <Insignia tono={TONO_ESTADO[v.estado]}>{v.estado}</Insignia>
                    </td>
                    <td
                      className={
                        v.estado === "ANULADA"
                          ? "px-4 py-3 text-right text-tinta-400 line-through"
                          : "px-4 py-3 text-right font-medium text-tinta-900"
                      }
                    >
                      {quetzales(aNumero(v.total))}
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
