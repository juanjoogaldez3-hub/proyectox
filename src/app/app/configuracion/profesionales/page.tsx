import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Tarjeta } from "@/components/ui";
import { listarCalendarios } from "@/lib/google";
import { actualizarProfesional, crearProfesional } from "../acciones";
import { FilaProfesional, FormularioProfesional } from "./formulario";

export const metadata: Metadata = { title: "Profesionales" };

export default async function PaginaProfesionales() {
  const { empresa, usuario } = await requerirSesion();
  const esAdmin = usuario.rol !== "VENDEDOR";

  const [profesionales, google] = await Promise.all([
    prisma.profesional.findMany({
      where: { empresaId: empresa.id },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.integracionGoogle.findUnique({ where: { empresaId: empresa.id }, select: { error: true } }),
  ]);

  // Si Google está conectado, cada profesional puede ir a su propio calendario.
  const calendarios =
    google && !google.error ? await listarCalendarios(empresa.id).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <Tarjeta className="overflow-hidden">
        <div className="border-b border-tinta-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-tinta-900">Quiénes atienden</h2>
          <p className="text-xs text-tinta-500">
            Médicos, odontólogos, terapeutas… No necesitan usuario en el CRM: la recepción agenda por
            ellos.
          </p>
        </div>
        {profesionales.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta-500">
            Todavía no hay profesionales. Agregá al menos uno para ver la agenda por doctor y evitar
            citas encimadas.
          </p>
        ) : (
          <ul className="divide-y divide-tinta-100">
            {profesionales.map((p) => (
              <FilaProfesional
                key={p.id}
                id={p.id}
                activo={p.activo}
                esAdmin={esAdmin}
                calendarios={calendarios}
                accion={actualizarProfesional.bind(null, p.id)}
                valores={{
                  nombre: p.nombre,
                  especialidad: p.especialidad,
                  color: p.color,
                  duracionMin: p.duracionMin,
                  calendarioId: p.calendarioId,
                }}
              />
            ))}
          </ul>
        )}
      </Tarjeta>

      {esAdmin ? (
        <Tarjeta className="p-5">
          <FormularioProfesional
            accion={crearProfesional}
            calendarios={calendarios}
            titulo="Agregar profesional"
          />
        </Tarjeta>
      ) : (
        <Aviso tono="marca">Solo el propietario o un administrador puede agregar profesionales.</Aviso>
      )}
    </div>
  );
}
