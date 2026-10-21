"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { responderCita } from "@/lib/agenda";
import { citaVigente } from "@/lib/citas";
import { comoError, type EstadoAccion } from "@/lib/acciones";

/**
 * Lo que hace el paciente desde su enlace, sin cuenta. El token es la única
 * credencial, así que cada consulta parte de él.
 */

async function citaDelToken(token: string) {
  const cita = await prisma.cita.findUnique({
    where: { tokenPublico: token },
    select: { id: true, estado: true, inicio: true },
  });
  if (!cita) throw new Error("Este enlace ya no está disponible.");
  if (!citaVigente(cita.estado)) throw new Error("Esta cita ya no se puede modificar.");
  if (cita.inicio.getTime() <= Date.now()) throw new Error("Esta cita ya pasó.");
  return cita;
}

export async function confirmarDesdeEnlace(token: string): Promise<EstadoAccion> {
  try {
    const cita = await citaDelToken(token);
    await responderCita(cita.id, "confirmar", "paciente desde su enlace");
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(`/cita/${token}`);
  return { ok: true };
}

export async function cancelarDesdeEnlace(
  token: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const cita = await citaDelToken(token);
    const motivo = ((datos.get("motivo") as string) ?? "").trim().slice(0, 300);
    await responderCita(cita.id, "cancelar", "paciente desde su enlace", motivo || undefined);
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(`/cita/${token}`);
  return { ok: true };
}

/** Después de la consulta, el paciente califica la atención desde el mismo enlace. */
export async function calificarDesdeEnlace(
  token: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const calificacion = Math.trunc(Number(datos.get("calificacion")));
    if (!(calificacion >= 1 && calificacion <= 5)) return { error: "Elija de 1 a 5 estrellas." };
    const comentario = ((datos.get("comentario") as string) ?? "").trim().slice(0, 500);
    const cita = await prisma.cita.findUnique({
      where: { tokenPublico: token },
      select: { id: true, estado: true, calificacion: true },
    });
    if (!cita || cita.estado !== "COMPLETADA") return { error: "Esta cita todavía no se puede calificar." };
    if (cita.calificacion) return { ok: true };
    await prisma.cita.update({
      where: { id: cita.id },
      data: { calificacion, comentarioPaciente: comentario || null },
    });
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(`/cita/${token}`);
  return { ok: true };
}
