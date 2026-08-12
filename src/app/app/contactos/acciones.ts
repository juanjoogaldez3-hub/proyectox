"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OrigenContacto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { normalizarNit, normalizarTelefono } from "@/lib/gt";

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre del contacto."),
  negocio: textoOpcional,
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v.toLowerCase()))
    .optional()
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: "Ese correo no parece válido.",
    }),
  telefono: textoOpcional,
  whatsapp: textoOpcional,
  nit: textoOpcional,
  direccion: textoOpcional,
  departamento: textoOpcional,
  municipio: textoOpcional,
  origen: z.nativeEnum(OrigenContacto).default("WHATSAPP"),
  etiquetas: textoOpcional,
  notas: textoOpcional,
  responsableId: textoOpcional,
});

function leer(datos: FormData) {
  const entrada = esquema.parse({
    nombre: datos.get("nombre") ?? "",
    negocio: datos.get("negocio") ?? "",
    email: datos.get("email") ?? "",
    telefono: datos.get("telefono") ?? "",
    whatsapp: datos.get("whatsapp") ?? "",
    nit: datos.get("nit") ?? "",
    direccion: datos.get("direccion") ?? "",
    departamento: datos.get("departamento") ?? "",
    municipio: datos.get("municipio") ?? "",
    origen: (datos.get("origen") as string) || "WHATSAPP",
    etiquetas: datos.get("etiquetas") ?? "",
    notas: datos.get("notas") ?? "",
    responsableId: datos.get("responsableId") ?? "",
  });

  const telefono = normalizarTelefono(entrada.telefono);
  // Si no ponen WhatsApp aparte, asumimos que es el mismo teléfono.
  const whatsapp = normalizarTelefono(entrada.whatsapp) ?? telefono;

  return {
    nombre: entrada.nombre,
    negocio: entrada.negocio ?? null,
    email: entrada.email ?? null,
    telefono,
    whatsapp,
    nit: normalizarNit(entrada.nit),
    direccion: entrada.direccion ?? null,
    departamento: entrada.departamento ?? null,
    municipio: entrada.municipio ?? null,
    origen: entrada.origen,
    etiquetas: (entrada.etiquetas ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
    notas: entrada.notas ?? null,
    responsableId: entrada.responsableId ?? null,
  };
}

export async function crearContacto(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  let destino: string;
  try {
    const { empresa, plan, usuario } = await requerirSesion();
    await verificarLimite(empresa.id, plan, "contactos");

    const valores = leer(datos);
    const contacto = await prisma.contacto.create({
      data: {
        ...valores,
        empresaId: empresa.id,
        responsableId: valores.responsableId ?? usuario.id,
      },
    });
    destino = `/app/contactos/${contacto.id}`;
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/contactos");
  redirect(destino);
}

export async function actualizarContacto(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const valores = leer(datos);
    // El where con empresaId evita que alguien edite el contacto de otro tenant.
    const { count } = await prisma.contacto.updateMany({
      where: { id, empresaId: empresa.id },
      data: valores,
    });
    if (count === 0) return { error: "No encontramos ese contacto." };
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/contactos");
  revalidatePath(`/app/contactos/${id}`);
  redirect(`/app/contactos/${id}`);
}

export async function eliminarContacto(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.contacto.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/app/contactos");
  redirect("/app/contactos");
}

// --- Notas y actividades rápidas desde la ficha del contacto -----------------

export async function agregarNota(
  contactoId: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa, usuario } = await requerirSesion();
    const contenido = z
      .string()
      .trim()
      .min(1, "Escribí algo antes de guardar.")
      .parse(datos.get("contenido") ?? "");

    const contacto = await prisma.contacto.findFirst({
      where: { id: contactoId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!contacto) return { error: "No encontramos ese contacto." };

    await prisma.nota.create({
      data: { contenido, contactoId, empresaId: empresa.id, usuarioId: usuario.id },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath(`/app/contactos/${contactoId}`);
  return { ok: true };
}
