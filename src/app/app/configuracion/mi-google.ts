"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { comoError, type EstadoAccion } from "@/lib/acciones";
import { desconectarGoogleProfesional, listarCalendarios, sincronizarCitaConGoogle } from "@/lib/google";

/** El Google Calendar propio del médico: solo lo toca el médico mismo. */
async function medicoActual() {
  const sesion = await requerirSesion();
  if (sesion.usuario.rol !== "MEDICO" || !sesion.usuario.profesionalId) {
    throw new Error("Esta opción es para médicos con agenda.");
  }
  return { empresaId: sesion.empresa.id, profesionalId: sesion.usuario.profesionalId };
}

async function proximasCitasDe(empresaId: string, profesionalId: string) {
  return prisma.cita.findMany({
    where: { empresaId, profesionalId, estado: { in: ["PROGRAMADA", "CONFIRMADA"] }, inicio: { gt: new Date() } },
    orderBy: { inicio: "asc" },
    take: 200,
    select: { id: true },
  });
}

export async function elegirMiCalendario(_estado: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  try {
    const { empresaId, profesionalId } = await medicoActual();
    const calendarioId = z.string().trim().min(1).parse(datos.get("calendarioId") ?? "");
    const calendarios = await listarCalendarios(empresaId, { tipo: "profesional", profesionalId });
    const elegido = calendarios.find((c) => c.id === calendarioId);
    if (!elegido) return { error: "Ese calendario no está disponible en tu cuenta." };
    await prisma.googleProfesional.update({
      where: { profesionalId },
      data: { calendarioId: elegido.id, calendarioNombre: elegido.nombre },
    });
    for (const c of await proximasCitasDe(empresaId, profesionalId)) await sincronizarCitaConGoogle(c.id);
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/configuracion");
  return { ok: true };
}

export async function sincronizarMisCitas(): Promise<EstadoAccion> {
  try {
    const { empresaId, profesionalId } = await medicoActual();
    const citas = await proximasCitasDe(empresaId, profesionalId);
    for (const c of citas) await sincronizarCitaConGoogle(c.id);
    const conError = await prisma.cita.count({
      where: { id: { in: citas.map((c) => c.id) }, googleError: { not: null } },
    });
    if (conError > 0) return { error: `${conError} cita(s) no se pudieron pasar a tu calendario.` };
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/configuracion");
  return { ok: true };
}

export async function desconectarMiGoogle(): Promise<void> {
  const { profesionalId } = await medicoActual();
  await desconectarGoogleProfesional(profesionalId);
  revalidatePath("/app/configuracion");
}
