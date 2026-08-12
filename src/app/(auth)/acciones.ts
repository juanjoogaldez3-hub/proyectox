"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { crearSesion, hashPassword, verificarPassword, cerrarSesion } from "@/lib/auth";
import { DIAS_DE_PRUEBA } from "@/lib/planes";
import { ETAPAS_INICIALES } from "@/lib/embudo";
import { normalizarTelefono } from "@/lib/gt";

export type EstadoFormulario = { error?: string } | null;

const esquemaRegistro = z.object({
  empresa: z.string().trim().min(2, "Escribí el nombre de tu negocio."),
  nombre: z.string().trim().min(2, "Escribí tu nombre."),
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  telefono: z.string().trim().optional(),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres."),
});

function generarSlug(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "empresa"
  );
}

async function slugDisponible(base: string): Promise<string> {
  for (let intento = 0; intento < 50; intento++) {
    const candidato = intento === 0 ? base : `${base}-${intento + 1}`;
    const existe = await prisma.empresa.findUnique({ where: { slug: candidato } });
    if (!existe) return candidato;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function registrar(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const parseado = esquemaRegistro.safeParse({
    empresa: datos.get("empresa"),
    nombre: datos.get("nombre"),
    email: datos.get("email"),
    telefono: datos.get("telefono"),
    password: datos.get("password"),
  });
  if (!parseado.success) {
    return { error: parseado.error.issues[0].message };
  }
  const entrada = parseado.data;

  const yaExiste = await prisma.usuario.findUnique({ where: { email: entrada.email } });
  if (yaExiste) {
    return { error: "Ya hay una cuenta con ese correo. Probá ingresando." };
  }

  const pruebaTermina = new Date(Date.now() + DIAS_DE_PRUEBA * 86_400_000);
  const slug = await slugDisponible(generarSlug(entrada.empresa));
  const passwordHash = await hashPassword(entrada.password);

  const usuario = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nombre: entrada.empresa,
        slug,
        telefono: normalizarTelefono(entrada.telefono),
        estadoSuscripcion: "PRUEBA",
        pruebaTermina,
        // Cada empresa arranca con un embudo usable en lugar de una pantalla vacía.
        etapas: { create: ETAPAS_INICIALES },
      },
    });

    return tx.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        email: entrada.email,
        telefono: normalizarTelefono(entrada.telefono),
        passwordHash,
        rol: "PROPIETARIO",
      },
    });
  });

  await crearSesion(usuario.id);
  redirect("/app");
}

const esquemaIngreso = z.object({
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export async function ingresar(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const parseado = esquemaIngreso.safeParse({
    email: datos.get("email"),
    password: datos.get("password"),
  });
  if (!parseado.success) {
    return { error: parseado.error.issues[0].message };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parseado.data.email },
  });
  // Mismo mensaje en ambos casos para no revelar qué correos existen.
  const credencialesMalas = { error: "Correo o contraseña incorrectos." };
  if (!usuario) {
    // Gastamos el mismo tiempo que una verificación real para que la respuesta
    // no delate si el correo está registrado.
    await hashPassword(parseado.data.password);
    return credencialesMalas;
  }

  const coincide = await verificarPassword(parseado.data.password, usuario.passwordHash);
  if (!coincide) return credencialesMalas;
  if (!usuario.activo) {
    return { error: "Tu usuario está desactivado. Pedile al dueño de la cuenta que lo active." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  });
  await crearSesion(usuario.id);
  redirect("/app");
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect("/ingresar");
}
