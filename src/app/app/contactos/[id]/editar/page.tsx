import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioContacto } from "../../formulario";
import { actualizarContacto } from "../../acciones";
import { BotonEliminarContacto } from "./eliminar";

export const metadata: Metadata = { title: "Editar contacto" };

export default async function PaginaEditarContacto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa, usuario } = await requerirSesion();

  const [contacto, usuarios] = await Promise.all([
    prisma.contacto.findFirst({ where: { id, empresaId: empresa.id } }),
    prisma.usuario.findMany({
      where: { empresaId: empresa.id, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  if (!contacto) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo={`Editar ${contacto.nombre}`} />
      <FormularioContacto
        accion={actualizarContacto.bind(null, contacto.id)}
        valores={contacto}
        usuarios={usuarios}
        cancelarHref={`/app/contactos/${contacto.id}`}
      />
      {usuario.rol !== "VENDEDOR" && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Eliminar contacto</h2>
          <p className="mt-1 text-sm text-red-700">
            Se borran también sus oportunidades, actividades, notas y cotizaciones. Esto no se
            puede deshacer.
          </p>
          <BotonEliminarContacto id={contacto.id} nombre={contacto.nombre} />
        </div>
      )}
    </div>
  );
}
