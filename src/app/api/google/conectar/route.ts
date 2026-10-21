import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sesionActual } from "@/lib/auth";
import { COOKIE_ESTADO_GOOGLE, googleConfigurado, urlAutorizacionGoogle } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Arranca el OAuth con Google. Solo propietario o administrador. */
export async function GET(request: Request) {
  const sesion = await sesionActual();
  if (!sesion) return Response.redirect(new URL("/ingresar", request.url), 303);

  const volver = new URL("/app/configuracion/integraciones", request.url);
  if (sesion.usuario.rol === "VENDEDOR") {
    volver.searchParams.set("google", "Solo el propietario o un administrador puede conectar Google.");
    return Response.redirect(volver, 303);
  }
  if (!googleConfigurado()) {
    volver.searchParams.set("google", "El servidor no tiene GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
    return Response.redirect(volver, 303);
  }

  // El estado ata la vuelta de Google a esta sesión del navegador (anti-CSRF).
  const estado = randomBytes(24).toString("base64url");
  const almacen = await cookies();
  almacen.set(COOKIE_ESTADO_GOOGLE, `${estado}.${sesion.empresa.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google",
    maxAge: 600,
  });

  return Response.redirect(urlAutorizacionGoogle(estado), 303);
}
