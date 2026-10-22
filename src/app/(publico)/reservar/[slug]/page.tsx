import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BotonWhatsApp } from "@/components/whatsapp";
import { aNumero, hoyEnGuatemala, inicioDelDiaGT, partesLocalesGT, quetzales } from "@/lib/gt";
import { Reserva } from "./reserva";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { slug }, select: { nombre: true } });
  return { title: empresa ? `Reservar cita · ${empresa.nombre}` : "Reservar cita" };
}

const fmtDia = new Intl.DateTimeFormat("es-GT", { weekday: "short", timeZone: "America/Guatemala" });
const fmtMes = new Intl.DateTimeFormat("es-GT", { month: "short", timeZone: "America/Guatemala" });

export default async function PaginaReservar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      direccion: true,
      municipio: true,
      reservasActivas: true,
      reservasDiasMax: true,
    },
  });
  if (!empresa) notFound();

  const [servicios, profesionales] = empresa.reservasActivas
    ? await Promise.all([
        prisma.tipoConsulta.findMany({
          where: { empresaId: empresa.id, activo: true, reservable: true },
          orderBy: { nombre: "asc" },
        }),
        prisma.profesional.findMany({
          where: { empresaId: empresa.id, activo: true, horarios: { some: {} } },
          select: { id: true, nombre: true, especialidad: true },
          orderBy: { nombre: "asc" },
        }),
      ])
    : [[], []];

  const hoy = hoyEnGuatemala();
  const dias = Array.from({ length: Math.min(empresa.reservasDiasMax, 60) }, (_, i) => {
    const d = new Date(inicioDelDiaGT(hoy.ano, hoy.mes, hoy.dia + i).getTime() + 12 * 3_600_000);
    return {
      fecha: partesLocalesGT(d).fecha,
      corto: fmtDia.format(d).replace(".", ""),
      numero: partesLocalesGT(d).fecha.slice(8),
      mes: fmtMes.format(d).replace(".", ""),
    };
  });

  const disponible = empresa.reservasActivas && profesionales.length > 0;

  return (
    <div className="min-h-screen bg-tinta-50 py-6">
      <div className="mx-auto max-w-xl space-y-4 px-4">
        <div>
          <p className="text-sm text-tinta-500">Reservar cita en</p>
          <h1 className="text-xl font-semibold text-tinta-900">{empresa.nombre}</h1>
          {(empresa.direccion || empresa.municipio) && (
            <p className="text-sm text-tinta-500">{[empresa.direccion, empresa.municipio].filter(Boolean).join(", ")}</p>
          )}
        </div>

        {disponible ? (
          <Reserva
            slug={slug}
            dias={dias}
            profesionales={profesionales}
            servicios={servicios.map((s) => ({
              id: s.id,
              nombre: s.nombre,
              duracionMin: s.duracionMin,
              precio: aNumero(s.precio) > 0 ? quetzales(aNumero(s.precio)) : null,
              profesionalIds: s.profesionalIds,
            }))}
          />
        ) : (
          <div className="rounded-xl border border-tinta-200 bg-white p-4 text-sm text-tinta-600">
            Esta clínica no está recibiendo reservas en línea en este momento.
          </div>
        )}

        {empresa.telefono && (
          <div className="flex justify-center">
            <BotonWhatsApp
              numero={empresa.telefono}
              mensaje="Hola, quisiera agendar una cita."
              texto="¿Prefiere escribirnos? WhatsApp"
              className="px-3 py-2 text-sm"
            />
          </div>
        )}
        <p className="text-center text-xs text-tinta-400">Agenda gestionada con CRM Chapín</p>
      </div>
    </div>
  );
}
