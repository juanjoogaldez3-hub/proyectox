import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Tarjeta } from "@/components/ui";
import { aNumero, quetzales } from "@/lib/gt";
import { urlBase } from "@/lib/citas";
import { esAdmin } from "@/lib/roles";
import { actualizarServicio, crearServicio } from "../acciones";
import { FilaServicio, FormularioReservas, FormularioServicio } from "./formularios";

export const metadata: Metadata = { title: "Servicios y reservas" };

export default async function PaginaServicios() {
  const { empresa, usuario } = await requerirSesion();
  const puedeAdministrar = esAdmin(usuario.rol);
  const [servicios, profesionales, conHorario] = await Promise.all([
    prisma.tipoConsulta.findMany({ where: { empresaId: empresa.id }, orderBy: [{ activo: "desc" }, { nombre: "asc" }] }),
    prisma.profesional.findMany({
      where: { empresaId: empresa.id, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.profesional.count({ where: { empresaId: empresa.id, activo: true, horarios: { some: {} } } }),
  ]);

  return (
    <div className="space-y-6">
      <Tarjeta className="overflow-hidden">
        <div className="border-b border-tinta-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-tinta-900">Servicios</h2>
          <p className="text-xs text-tinta-500">
            Cada uno con su duración y precio. El precio se propone al cobrar la consulta.
          </p>
        </div>
        {servicios.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tinta-500">Todavía no hay servicios.</p>
        ) : (
          <ul className="divide-y divide-tinta-100">
            {servicios.map((s) => (
              <FilaServicio
                key={s.id}
                id={s.id}
                activo={s.activo}
                profesionales={profesionales}
                textoPrecio={quetzales(aNumero(s.precio))}
                accion={actualizarServicio.bind(null, s.id)}
                valores={{
                  nombre: s.nombre,
                  duracionMin: s.duracionMin,
                  precio: aNumero(s.precio),
                  reservable: s.reservable,
                  profesionalIds: s.profesionalIds,
                }}
              />
            ))}
          </ul>
        )}
        {puedeAdministrar && (
          <div className="border-t border-tinta-200 p-4">
            <FormularioServicio accion={crearServicio} profesionales={profesionales} />
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Reservas en línea</h2>
        {conHorario === 0 && (
          <Aviso>Configurá el horario de al menos un profesional: las reservas solo ofrecen horas dentro de un horario.</Aviso>
        )}
        {puedeAdministrar ? (
          <FormularioReservas
            enlace={`${urlBase()}/reservar/${empresa.slug}`}
            valores={{
              reservasActivas: empresa.reservasActivas,
              reservasAnticipacionHoras: empresa.reservasAnticipacionHoras,
              reservasDiasMax: empresa.reservasDiasMax,
            }}
          />
        ) : (
          <p className="text-sm text-tinta-500">
            Enlace: <span className="font-mono">{`${urlBase()}/reservar/${empresa.slug}`}</span>
          </p>
        )}
      </Tarjeta>
    </div>
  );
}
