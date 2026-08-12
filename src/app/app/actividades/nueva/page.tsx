import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioActividad } from "../formulario";
import { crearActividad } from "../acciones";

export const metadata: Metadata = { title: "Agendar actividad" };

export default async function PaginaNuevaActividad({
  searchParams,
}: {
  searchParams: Promise<{ contacto?: string; oportunidad?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { contacto, oportunidad } = await searchParams;

  const [contactos, oportunidades] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId: empresa.id },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
      take: 500,
    }),
    prisma.oportunidad.findMany({
      where: { empresaId: empresa.id, estado: "ABIERTA" },
      select: { id: true, titulo: true },
      orderBy: { actualizadoEl: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPagina
        titulo="Agendar actividad"
        descripcion="Una llamada, un mensaje o una visita que no se te puede pasar."
      />
      <FormularioActividad
        accion={crearActividad}
        contactos={contactos}
        oportunidades={oportunidades}
        contactoInicial={contacto}
        oportunidadInicial={oportunidad}
      />
    </div>
  );
}
