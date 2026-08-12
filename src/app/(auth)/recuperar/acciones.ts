"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { enviarCorreo } from "@/lib/correo";
import { comoError, type EstadoAccion } from "@/lib/acciones";

const HORAS_DE_VIDA = 1;

/** Solo se guarda el hash: quien lea la base de datos no puede usar el enlace. */
function hashDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Origen real de la petición, para que el enlace funcione en cualquier dominio. */
async function origen(): Promise<string> {
  const cabeceras = await headers();
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host");
  const protocolo = cabeceras.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocolo}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function pedirRecuperacion(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const email = z
      .string()
      .trim()
      .toLowerCase()
      .email("Ese correo no parece válido.")
      .parse(datos.get("email") ?? "");

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, activo: true, empresa: { select: { nombre: true } } },
    });

    // Se responde igual exista o no la cuenta: si no, cualquiera podría usar
    // este formulario para averiguar qué correos están registrados.
    if (usuario && usuario.activo) {
      const token = randomBytes(32).toString("base64url");

      await prisma.$transaction([
        // Un enlace nuevo invalida los anteriores.
        prisma.tokenRecuperacion.updateMany({
          where: { usuarioId: usuario.id, usadoEl: null },
          data: { usadoEl: new Date() },
        }),
        prisma.tokenRecuperacion.create({
          data: {
            usuarioId: usuario.id,
            tokenHash: hashDeToken(token),
            expiraEl: new Date(Date.now() + HORAS_DE_VIDA * 3_600_000),
          },
        }),
      ]);

      const enlace = `${await origen()}/restablecer/${token}`;
      await enviarCorreo({
        para: email,
        asunto: "Recuperá tu contraseña de CRM Chapín",
        texto: [
          `Hola ${usuario.nombre},`,
          "",
          `Alguien pidió restablecer la contraseña de tu cuenta de ${usuario.empresa.nombre} en CRM Chapín.`,
          "Si fuiste vos, entrá acá y elegí una nueva:",
          "",
          enlace,
          "",
          `El enlace vence en ${HORAS_DE_VIDA} hora y sirve una sola vez.`,
          "Si no fuiste vos, ignorá este mensaje: tu contraseña no cambia.",
        ].join("\n"),
      });
    }
  } catch (e) {
    return comoError(e);
  }

  return { ok: true };
}

const esquemaNueva = z
  .object({
    password: z.string().min(8, "La contraseña necesita al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((v) => v.password === v.confirmacion, {
    message: "Las dos contraseñas no coinciden.",
  });

export async function restablecerPassword(
  token: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const entrada = esquemaNueva.parse({
      password: datos.get("password") ?? "",
      confirmacion: datos.get("confirmacion") ?? "",
    });

    const registro = await prisma.tokenRecuperacion.findUnique({
      where: { tokenHash: hashDeToken(token) },
      select: { id: true, usuarioId: true, expiraEl: true, usadoEl: true },
    });

    if (!registro || registro.usadoEl || registro.expiraEl.getTime() < Date.now()) {
      return {
        error: "Este enlace ya no sirve. Pedí uno nuevo desde “Olvidé mi contraseña”.",
      };
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { passwordHash: await hashPassword(entrada.password) },
      }),
      prisma.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { usadoEl: new Date() },
      }),
    ]);
  } catch (e) {
    return comoError(e);
  }

  redirect("/ingresar?restablecida=1");
}
