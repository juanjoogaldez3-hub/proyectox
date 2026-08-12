"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comoError, type EstadoAccion } from "@/lib/acciones";

/**
 * Acciones que ejecuta el cliente final desde el enlace publico, sin cuenta.
 * El token es la unica credencial, asi que cada consulta filtra por el.
 */

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribí tu nombre para dejar constancia."),
});

export async function aceptarDesdeEnlace(
  token: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { nombre } = esquema.parse({ nombre: datos.get("nombre") ?? "" });

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { tokenPublico: token },
      select: { id: true, estado: true, validaHasta: true, empresaId: true },
    });
    if (!cotizacion) return { error: "Este enlace ya no está disponible." };
    if (cotizacion.estado === "ACEPTADA") return { ok: true };
    if (cotizacion.estado === "RECHAZADA") {
      return { error: "Esta cotización ya había sido rechazada." };
    }
    if (cotizacion.validaHasta && cotizacion.validaHasta.getTime() < Date.now()) {
      return {
        error: "Esta cotización ya venció. Pedile una nueva a quien te la envió.",
      };
    }

    await prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: { estado: "ACEPTADA", aceptadaEl: new Date(), aceptadaPor: nombre },
    });

    revalidatePath(`/app/cotizaciones/${cotizacion.id}`);
    revalidatePath("/app/cotizaciones");
  } catch (e) {
    return comoError(e);
  }

  return { ok: true };
}

export async function rechazarDesdeEnlace(
  token: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const motivo = ((datos.get("motivo") as string) ?? "").trim();

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { tokenPublico: token },
      select: { id: true, estado: true, notas: true },
    });
    if (!cotizacion) return { error: "Este enlace ya no está disponible." };
    if (cotizacion.estado === "ACEPTADA") {
      return { error: "Esta cotización ya fue aceptada." };
    }

    await prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: {
        estado: "RECHAZADA",
        // El motivo del cliente se guarda como nota para que el vendedor lo vea.
        notas: motivo
          ? [cotizacion.notas, `El cliente no la aceptó: ${motivo}`]
              .filter(Boolean)
              .join("\n\n")
          : cotizacion.notas,
      },
    });

    revalidatePath(`/app/cotizaciones/${cotizacion.id}`);
    revalidatePath("/app/cotizaciones");
  } catch (e) {
    return comoError(e);
  }

  return { ok: true };
}
