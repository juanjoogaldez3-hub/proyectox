import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { mostrarTelefono, tiempoRelativo } from "@/lib/gt";
import { BotonWhatsApp } from "@/components/whatsapp";

export const metadata: Metadata = { title: "Contactos" };

const POR_PAGINA = 25;

export default async function PaginaContactos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { q = "", pagina = "1" } = await searchParams;
  const busqueda = q.trim();
  const numeroPagina = Math.max(1, Number(pagina) || 1);

  const filtro: Prisma.ContactoWhereInput = {
    empresaId: empresa.id,
    ...(busqueda && {
      OR: [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { negocio: { contains: busqueda, mode: "insensitive" } },
        { telefono: { contains: busqueda.replace(/\D/g, "") } },
        { whatsapp: { contains: busqueda.replace(/\D/g, "") } },
        { email: { contains: busqueda, mode: "insensitive" } },
        { nit: { contains: busqueda.replace(/[\s-]/g, "").toUpperCase() } },
      ],
    }),
  };

  const [contactos, total] = await Promise.all([
    prisma.contacto.findMany({
      where: filtro,
      orderBy: { actualizadoEl: "desc" },
      skip: (numeroPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        responsable: { select: { nombre: true } },
        _count: { select: { oportunidades: true } },
      },
    }),
    prisma.contacto.count({ where: filtro }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <EncabezadoPagina
        titulo="Contactos"
        descripcion={`${total} contacto${total === 1 ? "" : "s"} en tu cuenta`}
        acciones={
          <>
            <BotonEnlace href="/app/contactos/importar" variante="secundario">
              Importar
            </BotonEnlace>
            <BotonEnlace href="/app/contactos/nuevo">
              <Icono nombre="mas" /> Nuevo contacto
            </BotonEnlace>
          </>
        }
      />

      <form className="mb-4 flex gap-2" action="/app/contactos">
        <div className="relative flex-1 sm:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-400">
            <Icono nombre="buscar" />
          </span>
          <input
            name="q"
            defaultValue={busqueda}
            className="campo pl-9"
            placeholder="Buscar por nombre, teléfono, NIT…"
            aria-label="Buscar contactos"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-tinta-300 bg-white px-3 py-2 text-sm text-tinta-700 hover:bg-tinta-50"
        >
          Buscar
        </button>
        {busqueda && (
          <Link
            href="/app/contactos"
            className="self-center text-sm text-tinta-500 hover:text-tinta-900"
          >
            Limpiar
          </Link>
        )}
      </form>

      {contactos.length === 0 ? (
        <EstadoVacio
          titulo={busqueda ? "No encontramos ese contacto" : "Todavía no tenés contactos"}
          descripcion={
            busqueda
              ? "Probá con otro nombre, teléfono o NIT."
              : "Agregá a los clientes que ya te compran y a los que te escriben por WhatsApp."
          }
          accion={
            !busqueda && (
              <div className="flex flex-wrap justify-center gap-2">
                <BotonEnlace href="/app/contactos/nuevo">Agregar el primero</BotonEnlace>
                <BotonEnlace href="/app/contactos/importar" variante="secundario">
                  Importar desde Excel
                </BotonEnlace>
              </div>
            )
          }
        />
      ) : (
        <Tarjeta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-tinta-200 bg-tinta-50 text-left text-xs uppercase tracking-wide text-tinta-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                  <th className="px-4 py-2.5 font-medium">Teléfono</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Responsable</th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Actualizado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {contactos.map((c) => (
                  <tr key={c.id} className="hover:bg-tinta-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/contactos/${c.id}`}
                        className="font-medium text-tinta-900 hover:text-marca-600"
                      >
                        {c.nombre}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-tinta-500">
                        {c.negocio && <span>{c.negocio}</span>}
                        {c._count.oportunidades > 0 && (
                          <Insignia tono="marca">
                            {c._count.oportunidades} oportunidad
                            {c._count.oportunidades === 1 ? "" : "es"}
                          </Insignia>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-tinta-600">
                      {mostrarTelefono(c.telefono) || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-tinta-600 md:table-cell">
                      {c.responsable?.nombre ?? "Sin asignar"}
                    </td>
                    <td className="hidden px-4 py-3 text-tinta-500 lg:table-cell">
                      {tiempoRelativo(c.actualizadoEl)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BotonWhatsApp
                        numero={c.whatsapp}
                        mensaje={`Hola ${c.nombre.split(" ")[0]}, le escribo de ${empresa.nombre}.`}
                        contactoId={c.id}
                        resumen="Le escribiste por WhatsApp desde la lista"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-tinta-500">
            Página {numeroPagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            {numeroPagina > 1 && (
              <Link
                href={`/app/contactos?q=${encodeURIComponent(busqueda)}&pagina=${numeroPagina - 1}`}
                className="rounded-lg border border-tinta-300 bg-white px-3 py-1.5 hover:bg-tinta-50"
              >
                Anterior
              </Link>
            )}
            {numeroPagina < totalPaginas && (
              <Link
                href={`/app/contactos?q=${encodeURIComponent(busqueda)}&pagina=${numeroPagina + 1}`}
                className="rounded-lg border border-tinta-300 bg-white px-3 py-1.5 hover:bg-tinta-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
