import "server-only";

import { prisma } from "@/lib/prisma";

/** Lo que necesita el formulario de cita, compartido entre crear y editar. */
export async function datosFormularioCita(empresaId: string) {
  const [pacientes, profesionales, google, whatsapp, tipos] = await Promise.all([
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
    prisma.integracionGoogle
      .findUnique({ where: { empresaId }, select: { error: true } })
      // Si la clínica no conectó Google pero algún médico sí, también hay invitaciones.
      .then(async (g) => g ?? (await prisma.googleProfesional.findFirst({ where: { empresaId, error: null }, select: { error: true } }))),
    prisma.integracionWhatsApp.findUnique({ where: { empresaId }, select: { activa: true } }),
    prisma.tipoConsulta.findMany({
      where: { empresaId, activo: true },
      select: { id: true, nombre: true, duracionMin: true, profesionalIds: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return {
    pacientes,
    profesionales,
    tipos,
    googleConectado: Boolean(google && !google.error),
    whatsappConectado: Boolean(whatsapp?.activa),
  };
}
