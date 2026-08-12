import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, fechaHora, quetzales } from "@/lib/gt";
import { FormularioMovimiento } from "./movimiento";
import { registrarMovimiento } from "../acciones";

export const metadata: Metadata = { title: "Producto" };

const TIPO_TEXTO: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
};

export default async function PaginaProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const producto = await prisma.producto.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      movimientos: {
        orderBy: { creadoEl: "desc" },
        take: 30,
        include: { usuario: { select: { nombre: true } } },
      },
    },
  });

  if (!producto) notFound();

  const precio = aNumero(producto.precio);
  const costo = aNumero(producto.costo);
  const margen = precio > 0 ? Math.round(((precio - costo) / precio) * 100) : 0;
  const bajo = producto.controlaInventario && producto.stock <= producto.stockMinimo;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app/productos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Productos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">
              {producto.nombre}
            </h1>
            {!producto.activo && <Insignia tono="neutro">Inactivo</Insignia>}
          </div>
          <p className="mt-1 text-sm text-tinta-500">
            {producto.sku ? `SKU ${producto.sku} · ` : ""}
            por {producto.unidad}
          </p>
        </div>
        <BotonEnlace href={`/app/productos/${producto.id}/editar`} variante="secundario">
          Editar
        </BotonEnlace>
      </div>

      {bajo && (
        <div className="mb-4">
          <Aviso tono="alerta">
            Te quedan {producto.stock} {producto.unidad}
            {producto.stock === 1 ? "" : "s"} y tu mínimo es {producto.stockMinimo}. Es momento de
            pedir más.
          </Aviso>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-2">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Precio</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">
                {quetzales(precio)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Costo</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">{quetzales(costo)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Margen</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">{margen}%</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Existencia</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">
                {producto.controlaInventario ? producto.stock : "—"}
              </dd>
            </div>
          </dl>

          {producto.descripcion && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-tinta-600">
              {producto.descripcion}
            </p>
          )}

          <div className="mt-6 border-t border-tinta-100 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Movimientos</h2>
            {producto.movimientos.length === 0 ? (
              <p className="text-sm text-tinta-500">Todavía no hay movimientos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-tinta-500">
                    <tr>
                      <th className="py-2 font-medium">Fecha</th>
                      <th className="py-2 font-medium">Tipo</th>
                      <th className="py-2 text-right font-medium">Cantidad</th>
                      <th className="py-2 text-right font-medium">Quedó en</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tinta-100">
                    {producto.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 text-tinta-600">
                          {fechaHora(m.creadoEl)}
                          {m.motivo && (
                            <span className="block text-xs text-tinta-400">{m.motivo}</span>
                          )}
                        </td>
                        <td className="py-2 text-tinta-700">{TIPO_TEXTO[m.tipo]}</td>
                        <td className="py-2 text-right font-medium text-tinta-900">
                          {m.tipo === "SALIDA" ? "−" : m.tipo === "ENTRADA" ? "+" : ""}
                          {m.cantidad}
                        </td>
                        <td className="py-2 text-right text-tinta-600">{m.stockFinal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tarjeta>

        <Tarjeta className="h-fit p-5">
          <h2 className="mb-3 text-sm font-semibold text-tinta-900">Mover inventario</h2>
          {producto.controlaInventario ? (
            <FormularioMovimiento
              accion={registrarMovimiento.bind(null, producto.id)}
              stockActual={producto.stock}
            />
          ) : (
            <p className="text-sm text-tinta-500">
              Este producto está marcado como servicio, así que no lleva existencias.
            </p>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
