import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta, cx } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, quetzales } from "@/lib/gt";

export const metadata: Metadata = { title: "Productos" };

const FILTROS = [
  { valor: "activos", texto: "Activos" },
  { valor: "bajo-stock", texto: "Bajo stock" },
  { valor: "inactivos", texto: "Inactivos" },
] as const;

type Filtro = (typeof FILTROS)[number]["valor"];

export default async function PaginaProductos({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { filtro: filtroCrudo, q = "" } = await searchParams;
  const filtro: Filtro = FILTROS.some((f) => f.valor === filtroCrudo)
    ? (filtroCrudo as Filtro)
    : "activos";
  const busqueda = q.trim();

  const where: Prisma.ProductoWhereInput = {
    empresaId: empresa.id,
    activo: filtro !== "inactivos",
    ...(busqueda && {
      OR: [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { sku: { contains: busqueda, mode: "insensitive" } },
      ],
    }),
  };

  const productos = await prisma.producto.findMany({
    where,
    orderBy: { nombre: "asc" },
    take: 300,
  });

  // Postgres no compara dos columnas dentro de `where`, así que el filtro de
  // stock mínimo se aplica acá.
  const visibles =
    filtro === "bajo-stock"
      ? productos.filter((p) => p.controlaInventario && p.stock <= p.stockMinimo)
      : productos;

  return (
    <>
      <EncabezadoPagina
        titulo="Productos"
        descripcion="Lo que vendés, con precio en quetzales y control de existencias."
        acciones={
          <BotonEnlace href="/app/productos/nuevo">
            <Icono nombre="mas" /> Nuevo producto
          </BotonEnlace>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/app/productos?filtro=${f.valor}`}
            className={cx(
              "rounded-lg border px-3 py-1.5 text-sm",
              filtro === f.valor
                ? "border-marca-300 bg-marca-50 font-medium text-marca-700"
                : "border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50",
            )}
          >
            {f.texto}
          </Link>
        ))}
        <form action="/app/productos" className="ml-auto flex gap-2">
          <input type="hidden" name="filtro" value={filtro} />
          <input
            name="q"
            defaultValue={busqueda}
            className="campo w-48"
            placeholder="Buscar producto…"
            aria-label="Buscar productos"
          />
        </form>
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={
            filtro === "bajo-stock" ? "Nada bajo stock mínimo" : "Todavía no tenés productos"
          }
          descripcion={
            filtro === "bajo-stock"
              ? "Todo tu inventario está por arriba del mínimo que definiste."
              : "Cargá lo que vendés para poder cotizar y llevar tus existencias."
          }
          accion={
            filtro !== "bajo-stock" && (
              <BotonEnlace href="/app/productos/nuevo">Agregar producto</BotonEnlace>
            )
          }
        />
      ) : (
        <Tarjeta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-tinta-200 bg-tinta-50 text-left text-xs uppercase tracking-wide text-tinta-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Precio</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                    Costo
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Existencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {visibles.map((p) => {
                  const bajo = p.controlaInventario && p.stock <= p.stockMinimo;
                  return (
                    <tr key={p.id} className="hover:bg-tinta-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/productos/${p.id}`}
                          className="font-medium text-tinta-900 hover:text-marca-600"
                        >
                          {p.nombre}
                        </Link>
                        <p className="text-xs text-tinta-500">
                          {p.sku ? `SKU ${p.sku} · ` : ""}
                          {p.unidad}
                          {!p.activo && " · inactivo"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-tinta-900">
                        {quetzales(aNumero(p.precio))}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-tinta-500 sm:table-cell">
                        {quetzales(aNumero(p.costo))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.controlaInventario ? (
                          bajo ? (
                            <Insignia tono="alerta">
                              {p.stock} / mín {p.stockMinimo}
                            </Insignia>
                          ) : (
                            <span className="text-tinta-700">{p.stock}</span>
                          )
                        ) : (
                          <span className="text-xs text-tinta-400">Servicio</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
    </>
  );
}
