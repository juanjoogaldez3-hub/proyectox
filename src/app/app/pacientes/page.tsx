import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { edad, fecha, fechaHora, mostrarTelefono, normalizarTelefono } from "@/lib/gt";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { empresa, usuario } = await requerirSesion();
  const { q: crudo } = await searchParams;
  const q = (crudo ?? "").trim();

  const digitos = q.replace(/\D/g, "");
  const busqueda: Prisma.ContactoWhereInput = q
    ? {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          ...(digitos.length >= 4
            ? [
                { whatsapp: { contains: normalizarTelefono(digitos) ?? digitos } },
                { whatsapp: { contains: digitos } },
                { dpi: { contains: digitos } },
              ]
            : []),
        ],
      }
    : {};
  // El médico ve los pacientes que tienen o tuvieron cita con él.
  const soloMios: Prisma.ContactoWhereInput =
    usuario.rol === "MEDICO" ? { citas: { some: { profesionalId: usuario.profesionalId ?? "ninguno" } } } : {};

  const [pacientes, total] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId: empresa.id, ...busqueda, ...soloMios },
      orderBy: { nombre: "asc" },
      take: 100,
      select: {
        id: true,
        nombre: true,
        whatsapp: true,
        fechaNacimiento: true,
        sexo: true,
        alergias: true,
        _count: { select: { citas: true } },
      },
    }),
    prisma.contacto.count({ where: { empresaId: empresa.id, ...soloMios } }),
  ]);

  const ids = pacientes.map((p) => p.id);
  const [proximas, ultimas] = await Promise.all([
    prisma.cita.groupBy({
      by: ["contactoId"],
      where: { contactoId: { in: ids }, estado: { in: ["PROGRAMADA", "CONFIRMADA"] }, inicio: { gte: new Date() } },
      _min: { inicio: true },
    }),
    prisma.cita.groupBy({
      by: ["contactoId"],
      where: { contactoId: { in: ids }, estado: "COMPLETADA" },
      _max: { inicio: true },
    }),
  ]);
  const proxima = new Map(proximas.map((p) => [p.contactoId, p._min.inicio]));
  const ultima = new Map(ultimas.map((u) => [u.contactoId, u._max.inicio]));

  return (
    <>
      <EncabezadoPagina
        titulo="Pacientes"
        descripcion={`${total.toLocaleString("es-GT")} paciente${total === 1 ? "" : "s"} registrados.`}
        acciones={
          <BotonEnlace href="/app/pacientes/nuevo">
            <Icono nombre="mas" /> Nuevo paciente
          </BotonEnlace>
        }
      />

      <form className="mb-4 flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          className="campo max-w-md"
          placeholder="Buscar por nombre, WhatsApp, DPI o correo"
          aria-label="Buscar pacientes"
        />
        <button type="submit" className="rounded-lg border border-tinta-300 bg-white px-3 text-sm text-tinta-700 hover:bg-tinta-50">
          Buscar
        </button>
      </form>

      {pacientes.length === 0 ? (
        <EstadoVacio
          titulo={q ? "No encontramos a nadie con esa búsqueda" : "Todavía no hay pacientes"}
          descripcion={q ? "Probá con otra parte del nombre o con el número de WhatsApp." : "Registrá al primero o agendá una cita."}
          accion={<BotonEnlace href="/app/pacientes/nuevo">Registrar paciente</BotonEnlace>}
        />
      ) : (
        <Tarjeta className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-tinta-200 text-left text-xs uppercase tracking-wide text-tinta-500">
                <th className="px-4 py-2.5 font-medium">Paciente</th>
                <th className="px-4 py-2.5 font-medium">WhatsApp</th>
                <th className="px-4 py-2.5 font-medium">Última visita</th>
                <th className="px-4 py-2.5 font-medium">Próxima cita</th>
                <th className="px-4 py-2.5 text-right font-medium">Citas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tinta-100">
              {pacientes.map((p) => {
                const anos = edad(p.fechaNacimiento);
                const prox = proxima.get(p.id);
                const ult = ultima.get(p.id);
                return (
                  <tr key={p.id} className="hover:bg-tinta-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/app/pacientes/${p.id}`} className="font-medium text-tinta-900 hover:text-marca-600">
                        {p.nombre}
                      </Link>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-tinta-500">
                        {[anos !== null && `${anos} años`, p.sexo].filter(Boolean).join(" · ")}
                        {p.alergias && <Insignia tono="peligro">Alergias</Insignia>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-tinta-700">{mostrarTelefono(p.whatsapp)}</td>
                    <td className="px-4 py-2.5 text-tinta-700">{ult ? fecha(ult) : "—"}</td>
                    <td className="px-4 py-2.5 text-tinta-700">{prox ? fechaHora(prox) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-tinta-700">{p._count.citas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pacientes.length === 100 && (
            <p className="border-t border-tinta-100 px-4 py-2 text-xs text-tinta-500">
              Se muestran los primeros 100. Usá la búsqueda para encontrar a alguien en particular.
            </p>
          )}
        </Tarjeta>
      )}
    </>
  );
}
