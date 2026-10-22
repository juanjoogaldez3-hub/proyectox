import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { PLANES, formatoLimite } from "@/lib/planes";
import { fecha } from "@/lib/gt";
import { FormularioUsuario, BotonUsuarioActivo } from "./formulario";
import { esAdmin, textoRol } from "@/lib/roles";

export const metadata: Metadata = { title: "Usuarios" };

export default async function PaginaUsuarios() {
  const { empresa, usuario, plan } = await requerirSesion();
  const puedeAdministrar = esAdmin(usuario.rol);

  const [usuarios, profesionales] = await Promise.all([
    prisma.usuario.findMany({
      where: { empresaId: empresa.id },
      orderBy: [{ activo: "desc" }, { creadoEl: "asc" }],
      include: { profesional: { select: { nombre: true } } },
    }),
    prisma.profesional.findMany({
      where: { empresaId: empresa.id, activo: true, usuario: null },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

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
                    {textoRol(u.rol, empresa.giro)}
                  </Insignia>
                  {!u.activo && <Insignia tono="peligro">Desactivado</Insignia>}
                </p>
                <p className="truncate text-xs text-tinta-500">
                  {u.email}
                  {u.profesional && ` · agenda de ${u.profesional.nombre}`}
                  {u.ultimoAcceso && ` · último acceso ${fecha(u.ultimoAcceso)}`}
                </p>
              </div>
              {puedeAdministrar && u.rol !== "PROPIETARIO" && u.id !== usuario.id && (
                <BotonUsuarioActivo id={u.id} activo={u.activo} />
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>

      {puedeAdministrar ? (
        <FormularioUsuario profesionales={profesionales} esClinica={empresa.giro === "CLINICA"} />
      ) : (
        <Aviso tono="marca">Solo el propietario o un administrador puede agregar usuarios.</Aviso>
      )}
    </div>
  );
}
