"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TipoActividad } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { comoError, textoOpcional, type EstadoAccion } from "@/lib/acciones";

const esquema = z.object({
  tipo: z.nativeEnum(TipoActividad).default("TAREA"),
  titulo: z.string().trim().min(2, "Escribí qué hay que hacer."),
  detalle: textoOpcional,
  // datetime-local llega como "2026-08-12T15:30"; el navegador ya usa la hora local.
  venceEl: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : new Date(v)))
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "La fecha no es válida."),
  contactoId: textoOpcional,
  oportunidadId: textoOpcional,
});

export async function crearActividad(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa, usuario } = await requerirSesion();
    const entrada = esquema.parse({
      tipo: (datos.get("tipo") as string) || "TAREA",
      titulo: datos.get("titulo") ?? "",
      detalle: datos.get("detalle") ?? "",
      venceEl: datos.get("venceEl") ?? "",
      contactoId: datos.get("contactoId") ?? "",
      oportunidadId: datos.get("oportunidadId") ?? "",
    });

    // Verificamos que lo relacionado sea de esta empresa antes de enlazarlo.
    if (entrada.contactoId) {
      const existe = await prisma.contacto.findFirst({
        where: { id: entrada.contactoId, empresaId: empresa.id },
        select: { id: true },
      });
      if (!existe) return { error: "No encontramos ese contacto." };
    }
    if (entrada.oportunidadId) {
      const existe = await prisma.oportunidad.findFirst({
        where: { id: entrada.oportunidadId, empresaId: empresa.id },
        select: { id: true },
      });
      if (!existe) return { error: "No encontramos esa oportunidad." };
    }

    await prisma.actividad.create({
      data: {
        empresaId: empresa.id,
        usuarioId: usuario.id,
        tipo: entrada.tipo,
        titulo: entrada.titulo,
        detalle: entrada.detalle ?? null,
        venceEl: entrada.venceEl ?? null,
        contactoId: entrada.contactoId ?? null,
        oportunidadId: entrada.oportunidadId ?? null,
      },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/actividades");
  revalidatePath("/app");
  redirect("/app/actividades");
}

export async function alternarActividad(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  const actividad = await prisma.actividad.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true, completada: true, contactoId: true, oportunidadId: true },
  });
  if (!actividad) return;

  await prisma.actividad.update({
    where: { id: actividad.id },
    data: {
      completada: !actividad.completada,
      completadaEl: actividad.completada ? null : new Date(),
    },
  });

  revalidatePath("/app/actividades");
  revalidatePath("/app");
  if (actividad.contactoId) revalidatePath(`/app/contactos/${actividad.contactoId}`);
  if (actividad.oportunidadId) revalidatePath(`/app/embudo/${actividad.oportunidadId}`);
}

export async function eliminarActividad(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.actividad.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/app/actividades");
  revalidatePath("/app");
}
