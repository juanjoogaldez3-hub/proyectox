import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Empresa } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planEfectivo, pruebaVigente, suscripcionVigente } from "@/lib/planes";

export const COOKIE_SESION = "crm_sesion";
const DURACION_SESION_SEG = 60 * 60 * 24 * 30; // 30 dias

function llave(): Uint8Array {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 16 caracteres). Copia .env.example a .env y generá una llave.",
    );
  }
  return new TextEncoder().encode(secreto);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function crearSesion(usuarioId: string): Promise<void> {
  const token = await new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(llave());

  const almacen = await cookies();
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
}

export type Sesion = NonNullable<Awaited<ReturnType<typeof sesionActual>>>;

/**
 * Lee la cookie y trae usuario + empresa. `cache` evita repetir la consulta
 * cuando varios componentes del mismo render piden la sesion.
 */
export const sesionActual = cache(async () => {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (!token) return null;

  let usuarioId: string;
  try {
    const { payload } = await jwtVerify(token, llave());
    if (!payload.sub) return null;
    usuarioId = payload.sub;
  } catch {
    return null;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true },
  });
  if (!usuario || !usuario.activo) return null;

  const { empresa: empresaGuardada, passwordHash: _passwordHash, ...datosUsuario } = usuario;
  const empresa = await sincronizarSuscripcion(empresaGuardada);

  return {
    usuario: datosUsuario,
    empresa,
    plan: planEfectivo(empresa),
  };
});

/**
 * Marca la suscripcion como VENCIDA cuando se acabo la prueba o el periodo
 * pagado. `planEfectivo` ya baja los limites por su cuenta; esto solo deja el
 * estado guardado igual a la realidad para que la interfaz y los reportes no
 * digan "activa" sobre una cuenta que ya no lo esta. Solo escribe en la
 * transicion, no en cada visita.
 */
async function sincronizarSuscripcion<T extends Empresa>(empresa: T): Promise<T> {
  const debeVencer =
    (empresa.estadoSuscripcion === "ACTIVA" && !suscripcionVigente(empresa)) ||
    (empresa.estadoSuscripcion === "PRUEBA" && !pruebaVigente(empresa));

  if (!debeVencer) return empresa;

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { estadoSuscripcion: "VENCIDA" },
  });
  return { ...empresa, estadoSuscripcion: "VENCIDA" as const };
}

/** Para paginas y acciones dentro de /app: garantiza sesion o manda al login. */
export async function requerirSesion(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/ingresar");
  return sesion;
}

export async function requerirAdmin(): Promise<Sesion> {
  const sesion = await requerirSesion();
  if (sesion.usuario.rol === "VENDEDOR") {
    throw new Error("Solo el propietario o un administrador puede hacer este cambio.");
  }
  return sesion;
}
