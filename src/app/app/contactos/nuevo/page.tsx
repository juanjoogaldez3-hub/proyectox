import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioContacto } from "../formulario";
import { crearContacto } from "../acciones";

export const metadata: Metadata = { title: "Nuevo contacto" };

export default async function PaginaNuevoContacto() {
  const { empresa } = await requerirSesion();
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: empresa.id, activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Nuevo contacto"
        descripcion="Solo el nombre es obligatorio; lo demás lo podés completar después."
      />
      <FormularioContacto accion={crearContacto} usuarios={usuarios} />
    </div>
  );
}
