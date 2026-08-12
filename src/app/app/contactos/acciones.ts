"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { OrigenContacto, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { ILIMITADO, PLANES } from "@/lib/planes";
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

// --- Importación desde archivo ----------------------------------------------

const esquemaImportado = z.object({
  nombre: z.string().trim().min(1),
  negocio: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().optional(),
  nit: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  departamento: z.string().trim().optional(),
  municipio: z.string().trim().optional(),
  etiquetas: z.string().trim().optional(),
  notas: z.string().trim().optional(),
});

export type ResultadoImportacion = {
  importados: number;
  repetidos: number;
  sinNombre: number;
  cortadoPorPlan: boolean;
};

/**
 * Carga masiva de contactos. Dos decisiones que importan:
 *
 * - Un contacto se considera repetido si coincide el WhatsApp, el teléfono o
 *   el NIT con alguno ya guardado. Se salta y se cuenta, no se sobrescribe:
 *   los datos que ya tenía el usuario valen más que los del archivo.
 * - Si el archivo excede el tope del plan, se importa hasta donde alcanza y se
 *   avisa, en vez de fallar y dejar todo a medias.
 */
export async function importarContactos(
  filas: unknown,
): Promise<ResultadoImportacion & { error?: string }> {
  const vacio = { importados: 0, repetidos: 0, sinNombre: 0, cortadoPorPlan: false };
  try {
    const { empresa, plan, usuario } = await requerirSesion();
    const entrada = z.array(esquemaImportado.partial({ nombre: true })).parse(filas);

    const limite = PLANES[plan].limites.contactos;
    const yaTiene = await prisma.contacto.count({ where: { empresaId: empresa.id } });
    let disponibles = limite === ILIMITADO ? Number.POSITIVE_INFINITY : limite - yaTiene;

    // Un solo viaje a la base para saber qué ya existe.
    const existentes = await prisma.contacto.findMany({
      where: { empresaId: empresa.id },
      select: { telefono: true, whatsapp: true, nit: true },
    });
    const claves = new Set<string>();
    for (const c of existentes) {
      if (c.telefono) claves.add(`t:${c.telefono}`);
      if (c.whatsapp) claves.add(`t:${c.whatsapp}`);
      if (c.nit) claves.add(`n:${c.nit}`);
    }

    const aCrear: Prisma.ContactoCreateManyInput[] = [];
    let repetidos = 0;
    let sinNombre = 0;
    let cortadoPorPlan = false;

    for (const fila of entrada) {
      const nombre = (fila.nombre ?? "").trim();
      if (nombre.length < 2) {
        sinNombre++;
        continue;
      }

      const telefono = normalizarTelefono(fila.telefono);
      const whatsapp = normalizarTelefono(fila.whatsapp) ?? telefono;
      const nit = normalizarNit(fila.nit);

      const propias = [
        telefono && `t:${telefono}`,
        whatsapp && `t:${whatsapp}`,
        nit && nit !== "CF" && `n:${nit}`,
      ].filter(Boolean) as string[];

      if (propias.some((k) => claves.has(k))) {
        repetidos++;
        continue;
      }
      if (disponibles <= 0) {
        cortadoPorPlan = true;
        break;
      }

      propias.forEach((k) => claves.add(k));
      disponibles--;

      const correo = (fila.email ?? "").trim().toLowerCase();
      aCrear.push({
        empresaId: empresa.id,
        nombre,
        negocio: fila.negocio?.trim() || null,
        email: z.string().email().safeParse(correo).success ? correo : null,
        telefono,
        whatsapp,
        nit,
        direccion: fila.direccion?.trim() || null,
        departamento: fila.departamento?.trim() || null,
        municipio: fila.municipio?.trim() || null,
        origen: "OTRO",
        etiquetas: (fila.etiquetas ?? "")
          .split(/[,;]/)
          .map((e) => e.trim())
          .filter(Boolean),
        notas: fila.notas?.trim() || null,
        responsableId: usuario.id,
      });
    }

    if (aCrear.length > 0) {
      await prisma.contacto.createMany({ data: aCrear });
    }

    revalidatePath("/app/contactos");
    return { importados: aCrear.length, repetidos, sinNombre, cortadoPorPlan };
  } catch (e) {
    const problema = comoError(e);
    return { ...vacio, error: problema?.error ?? "No se pudo importar el archivo." };
  }
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
