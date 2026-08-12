import "server-only";

import { prisma } from "@/lib/prisma";

/** Listas que llenan los selectores de los formularios. */
export async function opcionesDeFormulario(empresaId: string) {
  const [contactos, etapas, usuarios] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, negocio: true },
      orderBy: { nombre: "asc" },
      take: 500,
    }),
    prisma.etapaEmbudo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { orden: "asc" },
    }),
    prisma.usuario.findMany({
      where: { empresaId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  return { contactos, etapas, usuarios };
}
