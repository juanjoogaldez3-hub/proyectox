import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { IVA_GUATEMALA, aNumero } from "@/lib/gt";
import { FormularioCotizacion } from "../formulario";
import { crearCotizacion } from "../acciones";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function PaginaNuevaCotizacion({
  searchParams,
}: {
  searchParams: Promise<{ contacto?: string; oportunidad?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { contacto, oportunidad } = await searchParams;

  const [contactos, oportunidades, productos] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-4xl">
      <EncabezadoPagina
        titulo="Nueva cotización"
        descripcion="El IVA y los totales se calculan solos."
      />
      <FormularioCotizacion
        accion={crearCotizacion}
        contactos={contactos}
        oportunidades={oportunidades}
        productos={productos.map((p) => ({ ...p, precio: aNumero(p.precio) }))}
        ivaPorcentaje={aNumero(empresa.ivaPorcentaje) || IVA_GUATEMALA}
        valores={{
          contactoId: contacto ?? "",
          oportunidadId: oportunidad ?? null,
          validaHasta: null,
          descuento: 0,
          notas: null,
          condiciones: null,
          items: [],
        }}
      />
    </div>
  );
}
