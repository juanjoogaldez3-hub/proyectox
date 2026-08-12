import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { IVA_GUATEMALA, aNumero } from "@/lib/gt";
import { FormularioCotizacion } from "../../formulario";
import { actualizarCotizacion } from "../../acciones";

export const metadata: Metadata = { title: "Editar cotización" };

export default async function PaginaEditarCotizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const [cotizacion, contactos, oportunidades, productos] = await Promise.all([
    prisma.cotizacion.findFirst({
      where: { id, empresaId: empresa.id },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
    prisma.contacto.findMany({
      where: { empresaId: empresa.id },
      select: { id: true, nombre: true, negocio: true },
      orderBy: { nombre: "asc" },
      take: 500,
    }),
    prisma.oportunidad.findMany({
      where: { empresaId: empresa.id, estado: "ABIERTA" },
      select: { id: true, titulo: true },
      orderBy: { actualizadoEl: "desc" },
      take: 200,
    }),
    prisma.producto.findMany({
      where: { empresaId: empresa.id, activo: true },
      select: { id: true, nombre: true, descripcion: true, precio: true },
      orderBy: { nombre: "asc" },
      take: 500,
    }),
  ]);

  if (!cotizacion) notFound();
  // Una cotización aceptada ya generó (o va a generar) una venta: se congela.
  if (cotizacion.estado === "ACEPTADA") redirect(`/app/cotizaciones/${cotizacion.id}`);

  return (
    <div className="mx-auto max-w-4xl">
      <EncabezadoPagina titulo={`Editar cotización #${cotizacion.numero}`} />
      <FormularioCotizacion
        accion={actualizarCotizacion.bind(null, cotizacion.id)}
        contactos={contactos}
        oportunidades={oportunidades}
        productos={productos.map((p) => ({ ...p, precio: aNumero(p.precio) }))}
        ivaPorcentaje={aNumero(cotizacion.ivaPorcentaje) || IVA_GUATEMALA}
        cancelarHref={`/app/cotizaciones/${cotizacion.id}`}
        valores={{
          contactoId: cotizacion.contactoId,
          oportunidadId: cotizacion.oportunidadId,
          validaHasta: cotizacion.validaHasta,
          descuento: aNumero(cotizacion.descuento),
          notas: cotizacion.notas,
          condiciones: cotizacion.condiciones,
          items: cotizacion.items.map((i) => ({
            productoId: i.productoId ?? "",
            descripcion: i.descripcion,
            cantidad: aNumero(i.cantidad),
            precioUnitario: aNumero(i.precioUnitario),
          })),
        }}
      />
    </div>
  );
}
