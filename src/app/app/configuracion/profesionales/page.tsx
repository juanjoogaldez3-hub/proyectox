import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Tarjeta } from "@/components/ui";
import { listarCalendarios } from "@/lib/google";
import { fechaHora } from "@/lib/gt";
import { actualizarProfesional, crearProfesional, eliminarBloqueo } from "../acciones";
import { FormularioBloqueo } from "./bloqueos";
import { FilaProfesional, FormularioProfesional } from "./formulario";
import { esAdmin } from "@/lib/roles";

export const metadata: Metadata = { title: "Profesionales" };

export default async function PaginaProfesionales() {
  const { empresa, usuario } = await requerirSesion();
  const puedeAdministrar = esAdmin(usuario.rol);

  const [profesionales, google, bloqueos] = await Promise.all([
    prisma.profesional.findMany({
      where: { empresaId: empresa.id },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { horarios: true } } },
    }),
    prisma.integracionGoogle.findUnique({ where: { empresaId: empresa.id }, select: { error: true } }),
    prisma.bloqueoAgenda.findMany({
      where: { empresaId: empresa.id, fin: { gt: new Date() } },
      orderBy: { inicio: "asc" },
      include: { profesional: { select: { nombre: true } } },
    }),
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
                esAdmin={puedeAdministrar}
                calendarios={calendarios}
                tieneHorario={p._count.horarios > 0}
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

      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Bloqueos y vacaciones</h2>
        <p className="mb-3 mt-1 text-sm text-tinta-500">
          Esas horas no se ofrecen en la agenda ni en las reservas en línea.
        </p>
        {bloqueos.length > 0 && (
          <ul className="mb-4 divide-y divide-tinta-100 rounded-lg border border-tinta-100">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-tinta-800">{b.motivo}</span>
                  <span className="block text-xs text-tinta-500">
                    {b.profesional?.nombre ?? "Toda la clínica"} · {fechaHora(b.inicio)} → {fechaHora(b.fin)}
                  </span>
                </span>
                {puedeAdministrar && (
                  <form action={eliminarBloqueo.bind(null, b.id)}>
                    <button type="submit" className="text-xs text-tinta-500 hover:text-red-600">
                      Quitar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {puedeAdministrar && (
          <FormularioBloqueo
            profesionales={profesionales.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre }))}
          />
        )}
      </Tarjeta>

      {puedeAdministrar ? (
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
