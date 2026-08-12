import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar contactos" };

export default async function PaginaImportar() {
  const { empresa } = await requerirSesion();
  const contactosActuales = await prisma.contacto.count({ where: { empresaId: empresa.id } });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/contactos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Contactos
      </Link>
      <EncabezadoPagina
        titulo="Importar contactos"
        descripcion="Traé de un solo golpe la lista que tenés en Excel o en tu celular."
      />
      <Importador contactosActuales={contactosActuales} />
    </div>
  );
}
