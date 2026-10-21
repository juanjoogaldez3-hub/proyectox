import { cookies } from "next/headers";
import { sesionActual } from "@/lib/auth";
import { COOKIE_ESTADO_GOOGLE, conectarCuentaGoogle } from "@/lib/google";
import { mismoSecreto } from "@/lib/secretos";

export const dynamic = "force-dynamic";

/** Vuelta del OAuth de Google: canjea el código y guarda la conexión. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const volver = new URL("/app/configuracion/integraciones", request.url);
  const terminar = (mensaje: string) => {
    volver.searchParams.set("google", mensaje);
    return Response.redirect(volver, 303);
  };

  const almacen = await cookies();
  const guardado = almacen.get(COOKIE_ESTADO_GOOGLE)?.value ?? "";
  almacen.delete({ name: COOKIE_ESTADO_GOOGLE, path: "/api/google" });

  const sesion = await sesionActual();
  if (!sesion) return Response.redirect(new URL("/ingresar", request.url), 303);
  if (sesion.usuario.rol === "VENDEDOR") {
    return terminar("Solo el propietario o un administrador puede conectar Google.");
  }

  if (url.searchParams.get("error")) {
    return terminar("Cancelaste la conexión con Google.");
  }

  const [estado, empresaId] = guardado.split(".");
  const codigo = url.searchParams.get("code");
  if (!codigo || !mismoSecreto(estado, url.searchParams.get("state")) || empresaId !== sesion.empresa.id) {
    return terminar("La conexión con Google expiró o no es válida. Intentá de nuevo.");
  }

  try {
    await conectarCuentaGoogle(sesion.empresa.id, codigo);
  } catch (e) {
    return terminar(e instanceof Error ? e.message : "No se pudo conectar con Google.");
  }
  return terminar("ok");
}
