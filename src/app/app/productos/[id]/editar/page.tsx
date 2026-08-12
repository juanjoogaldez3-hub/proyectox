import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { aNumero } from "@/lib/gt";
import { FormularioProducto } from "../../formulario";
import { actualizarProducto } from "../../acciones";
import { BotonActivo } from "./activo";

export const metadata: Metadata = { title: "Editar producto" };

export default async function PaginaEditarProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const producto = await prisma.producto.findFirst({ where: { id, empresaId: empresa.id } });
  if (!producto) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo={`Editar ${producto.nombre}`}
        descripcion="La existencia se cambia con movimientos de inventario, no acá."
      />
      <FormularioProducto
        accion={actualizarProducto.bind(null, producto.id)}
        valores={{
          nombre: producto.nombre,
          sku: producto.sku,
          descripcion: producto.descripcion,
          precio: aNumero(producto.precio),
          costo: aNumero(producto.costo),
          unidad: producto.unidad,
          controlaInventario: producto.controlaInventario,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
        }}
        cancelarHref={`/app/productos/${producto.id}`}
      />

      <div className="mt-8 rounded-xl border border-tinta-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-tinta-900">
          {producto.activo ? "Desactivar producto" : "Reactivar producto"}
        </h2>
        <p className="mt-1 text-sm text-tinta-500">
          {producto.activo
            ? "Deja de aparecer al cotizar y vender, pero se conserva todo su historial."
            : "Vuelve a aparecer en cotizaciones y ventas."}
        </p>
        <BotonActivo id={producto.id} activo={producto.activo} />
      </div>
    </div>
  );
}
