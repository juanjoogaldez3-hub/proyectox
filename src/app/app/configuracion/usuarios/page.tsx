import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { PLANES, formatoLimite } from "@/lib/planes";
import { fecha } from "@/lib/gt";
import { FormularioUsuario, BotonUsuarioActivo } from "./formulario";

export const metadata: Metadata = { title: "Usuarios" };

const ROL_TEXTO = {
  PROPIETARIO: "Propietario",
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
} as const;

export default async function PaginaUsuarios() {
  const { empresa, usuario, plan } = await requerirSesion();
  const esAdmin = usuario.rol !== "VENDEDOR";

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: empresa.id },
    orderBy: [{ activo: "desc" }, { creadoEl: "asc" }],
  });

  const activos = usuarios.filter((u) => u.activo).length;
  const limite = PLANES[plan].limites.usuarios;

  return (
    <div className="space-y-6">
      <Tarjeta className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tinta-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-tinta-900">Tu equipo</h2>
          <span className="text-xs text-tinta-500">
            {activos} de {formatoLimite(limite)} usuarios del plan {PLANES[plan].nombre}
          </span>
        </div>

        <ul className="divide-y divide-tinta-100">
          {usuarios.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-tinta-900">
                  {u.nombre}
                  <Insignia tono={u.rol === "PROPIETARIO" ? "marca" : "neutro"}>
                    {ROL_TEXTO[u.rol]}
                  </Insignia>
                  {!u.activo && <Insignia tono="peligro">Desactivado</Insignia>}
                </p>
                <p className="truncate text-xs text-tinta-500">
                  {u.email}
                  {u.ultimoAcceso && ` · último acceso ${fecha(u.ultimoAcceso)}`}
                </p>
              </div>
              {esAdmin && u.rol !== "PROPIETARIO" && u.id !== usuario.id && (
                <BotonUsuarioActivo id={u.id} activo={u.activo} />
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>

      {esAdmin ? (
        <FormularioUsuario />
      ) : (
        <Aviso tono="marca">Solo el propietario o un administrador puede agregar usuarios.</Aviso>
      )}
    </div>
  );
}
