import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { IVA_GUATEMALA, aNumero } from "@/lib/gt";
import { FormularioVenta } from "../formulario";
import { crearVenta } from "../acciones";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function PaginaNuevaVenta({
  searchParams,
}: {
  searchParams: Promise<{ contacto?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { contacto } = await searchParams;

  const [contactos, productos] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId: empresa.id },
      select: { id: true, nombre: true, negocio: true, nit: true },
      orderBy: { nombre: "asc" },
      take: 500,
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
        titulo="Registrar venta"
        descripcion="Para ventas directas. Si venís de una cotización, aceptála y se crea sola."
      />
      <FormularioVenta
        accion={crearVenta}
        contactos={contactos}
        productos={productos.map((p) => ({ ...p, precio: aNumero(p.precio) }))}
        ivaPorcentaje={aNumero(empresa.ivaPorcentaje) || IVA_GUATEMALA}
        contactoInicial={contacto}
      />
    </div>
  );
}
