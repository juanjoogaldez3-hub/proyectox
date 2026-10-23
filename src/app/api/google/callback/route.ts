import { cookies } from "next/headers";
import { sesionActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOKIE_ESTADO_GOOGLE, conectarCuentaGoogle, sincronizarCitaConGoogle } from "@/lib/google";
import { mismoSecreto } from "@/lib/secretos";
import { esAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** Vuelta del OAuth de Google: canjea el código y guarda la conexión. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const almacen = await cookies();
  const guardado = almacen.get(COOKIE_ESTADO_GOOGLE)?.value ?? "";
  almacen.delete({ name: COOKIE_ESTADO_GOOGLE, path: "/api/google" });
  const [estado, empresaId, destino] = guardado.split(".");
  const paraMedico = Boolean(destino) && destino !== "empresa";

  const volver = new URL(paraMedico ? "/app/configuracion" : "/app/configuracion/integraciones", request.url);
  const terminar = (mensaje: string) => {
    volver.searchParams.set("google", mensaje);
    return Response.redirect(volver, 303);
  };

  const sesion = await sesionActual();
  if (!sesion) return Response.redirect(new URL("/ingresar", request.url), 303);
  if (url.searchParams.get("error")) return terminar("Cancelaste la conexión con Google.");

  const codigo = url.searchParams.get("code");
  if (!codigo || !mismoSecreto(estado, url.searchParams.get("state")) || empresaId !== sesion.empresa.id) {
    return terminar("La conexión con Google expiró o no es válida. Intentá de nuevo.");
  }
  if (paraMedico ? sesion.usuario.profesionalId !== destino : !esAdmin(sesion.usuario.rol)) {
    return terminar("No tenés permiso para conectar esta cuenta.");
  }

  try {
    await conectarCuentaGoogle(
      { empresaId: sesion.empresa.id, profesionalId: paraMedico ? destino : undefined },
      codigo,
    );
    // Las próximas citas del médico se mudan a su calendario.
    if (paraMedico) {
      const citas = await prisma.cita.findMany({
        where: {
          empresaId: sesion.empresa.id,
          profesionalId: destino,
          estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
          inicio: { gt: new Date() },
        },
        orderBy: { inicio: "asc" },
        take: 200,
        select: { id: true },
      });
      for (const c of citas) await sincronizarCitaConGoogle(c.id);
    }
  } catch (e) {
    return terminar(e instanceof Error ? e.message : "No se pudo conectar con Google.");
  }
  return terminar("ok");
}
