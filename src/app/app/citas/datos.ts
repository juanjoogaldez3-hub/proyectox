import "server-only";

import { prisma } from "@/lib/prisma";

/** Lo que necesita el formulario de cita, compartido entre crear y editar. */
export async function datosFormularioCita(empresaId: string) {
  const [pacientes, profesionales, google, whatsapp] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, whatsapp: true, email: true },
      orderBy: { nombre: "asc" },
      take: 2000,
    }),
    prisma.profesional.findMany({
      where: { empresaId, activo: true },
      select: { id: true, nombre: true, especialidad: true, duracionMin: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.integracionGoogle.findUnique({ where: { empresaId }, select: { error: true } }),
    prisma.integracionWhatsApp.findUnique({ where: { empresaId }, select: { activa: true } }),
  ]);

  return {
    pacientes,
    profesionales,
    googleConectado: Boolean(google && !google.error),
    whatsappConectado: Boolean(whatsapp?.activa),
  };
}
