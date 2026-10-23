import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sesionActual } from "@/lib/auth";
import { COOKIE_ESTADO_GOOGLE, googleConfigurado, urlAutorizacionGoogle } from "@/lib/google";
import { esAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Arranca el OAuth con Google. Dos casos:
 * - la cuenta de la clínica (propietario o administrador);
 * - `?para=medico`: el médico conecta su propio Google Calendar.
 */
export async function GET(request: Request) {
  const sesion = await sesionActual();
  if (!sesion) return Response.redirect(new URL("/ingresar", request.url), 303);

  const paraMedico = new URL(request.url).searchParams.get("para") === "medico";
  const volver = new URL(paraMedico ? "/app/configuracion" : "/app/configuracion/integraciones", request.url);
  const negar = (mensaje: string) => {
    volver.searchParams.set("google", mensaje);
    return Response.redirect(volver, 303);
  };

  if (paraMedico) {
    if (sesion.usuario.rol !== "MEDICO" || !sesion.usuario.profesionalId) {
      return negar("Solo un médico con agenda puede conectar su propio Google Calendar.");
    }
  } else if (!esAdmin(sesion.usuario.rol)) {
    return negar("Solo el propietario o un administrador puede conectar Google.");
  }
  if (!googleConfigurado()) {
    return negar("El servidor no tiene GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.");
  }

  // El estado ata la vuelta de Google a esta sesión y a este destino (anti-CSRF).
  const estado = randomBytes(24).toString("base64url");
  const destino = paraMedico ? sesion.usuario.profesionalId : "empresa";
  const almacen = await cookies();
  almacen.set(COOKIE_ESTADO_GOOGLE, `${estado}.${sesion.empresa.id}.${destino}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google",
    maxAge: 600,
  });

  return Response.redirect(urlAutorizacionGoogle(estado), 303);
}
