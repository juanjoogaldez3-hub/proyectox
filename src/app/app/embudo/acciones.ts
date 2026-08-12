"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import {
  comoError,
  fechaOpcional,
  numeroDeFormulario,
  textoOpcional,
  type EstadoAccion,
} from "@/lib/acciones";

const esquema = z.object({
  titulo: z.string().trim().min(2, "Ponele un nombre al negocio."),
  contactoId: z.string().trim().min(1, "Elegí a qué contacto pertenece."),
  etapaId: z.string().trim().min(1, "Elegí la etapa del embudo."),
  monto: numeroDeFormulario,
  fechaCierre: fechaOpcional,
  responsableId: textoOpcional,
});

function leer(datos: FormData) {
  return esquema.parse({
    titulo: datos.get("titulo") ?? "",
    contactoId: datos.get("contactoId") ?? "",
    etapaId: datos.get("etapaId") ?? "",
    monto: (datos.get("monto") as string) || "0",
    fechaCierre: datos.get("fechaCierre") ?? "",
    responsableId: datos.get("responsableId") ?? "",
  });
}

/** El estado de la oportunidad lo manda la etapa: no se guardan por separado. */
async function estadoSegunEtapa(empresaId: string, etapaId: string) {
  const etapa = await prisma.etapaEmbudo.findFirst({
    where: { id: etapaId, empresaId },
    select: { esGanada: true, esPerdida: true },
  });
  if (!etapa) throw new Error("Esa etapa no existe en tu embudo.");
  if (etapa.esGanada) return { estado: "GANADA" as const, cerradaEl: new Date() };
  if (etapa.esPerdida) return { estado: "PERDIDA" as const, cerradaEl: new Date() };
  return { estado: "ABIERTA" as const, cerradaEl: null };
}

export async function crearOportunidad(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  let destino: string;
  try {
    const { empresa, usuario } = await requerirSesion();
    const entrada = leer(datos);

    const contacto = await prisma.contacto.findFirst({
      where: { id: entrada.contactoId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!contacto) return { error: "No encontramos ese contacto." };

    const cierre = await estadoSegunEtapa(empresa.id, entrada.etapaId);
    const oportunidad = await prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: entrada.titulo,
        contactoId: entrada.contactoId,
        etapaId: entrada.etapaId,
        monto: entrada.monto,
        fechaCierre: entrada.fechaCierre ?? null,
        responsableId: entrada.responsableId ?? usuario.id,
        ...cierre,
      },
    });
    destino = `/app/embudo/${oportunidad.id}`;
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/embudo");
  redirect(destino);
}

export async function actualizarOportunidad(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const entrada = leer(datos);
    const cierre = await estadoSegunEtapa(empresa.id, entrada.etapaId);

    const { count } = await prisma.oportunidad.updateMany({
      where: { id, empresaId: empresa.id },
      data: {
        titulo: entrada.titulo,
        contactoId: entrada.contactoId,
        etapaId: entrada.etapaId,
        monto: entrada.monto,
        fechaCierre: entrada.fechaCierre ?? null,
        responsableId: entrada.responsableId ?? null,
        ...cierre,
      },
    });
    if (count === 0) return { error: "No encontramos esa oportunidad." };
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/embudo");
  revalidatePath(`/app/embudo/${id}`);
  redirect(`/app/embudo/${id}`);
}

/** La usa el tablero al soltar una tarjeta en otra columna. */
export async function moverOportunidad(id: string, etapaId: string): Promise<void> {
  const { empresa } = await requerirSesion();
  const cierre = await estadoSegunEtapa(empresa.id, etapaId);
  await prisma.oportunidad.updateMany({
    where: { id, empresaId: empresa.id },
    data: { etapaId, ...cierre },
  });
  revalidatePath("/app/embudo");
  revalidatePath(`/app/embudo/${id}`);
}

export async function marcarPerdida(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const motivo = ((datos.get("motivo") as string) ?? "").trim() || null;

    const etapaPerdida = await prisma.etapaEmbudo.findFirst({
      where: { empresaId: empresa.id, esPerdida: true },
      select: { id: true },
    });

    await prisma.oportunidad.updateMany({
      where: { id, empresaId: empresa.id },
      data: {
        estado: "PERDIDA",
        motivoPerdida: motivo,
        cerradaEl: new Date(),
        ...(etapaPerdida && { etapaId: etapaPerdida.id }),
      },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/embudo");
  revalidatePath(`/app/embudo/${id}`);
  return { ok: true };
}

export async function eliminarOportunidad(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.oportunidad.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/app/embudo");
  redirect("/app/embudo");
}
