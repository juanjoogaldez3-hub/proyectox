import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Icono } from "@/components/iconos";
import { BotonImprimir } from "@/components/imprimir";
import { edad, fecha, mostrarTelefono } from "@/lib/gt";
import { puedeVerExpediente } from "@/lib/roles";
import { registrarAccesoExpediente } from "@/lib/expediente";

export const metadata: Metadata = { title: "Receta" };

/** Receta imprimible con los datos de la clínica, el médico y el paciente. */
export default async function PaginaReceta({ params }: { params: Promise<{ id: string; notaId: string }> }) {
  const { id, notaId } = await params;
  const { empresa, usuario } = await requerirSesion();
  if (!puedeVerExpediente(usuario.rol)) redirect(`/app/pacientes/${id}`);

  const nota = await prisma.notaClinica.findFirst({
    where: { id: notaId, contactoId: id, empresaId: empresa.id },
    include: {
      contacto: { select: { nombre: true, fechaNacimiento: true, alergias: true } },
      profesional: { select: { nombre: true, especialidad: true } },
      usuario: { select: { nombre: true } },
    },
  });
  if (!nota || !nota.receta) notFound();
  await registrarAccesoExpediente(empresa.id, id, usuario.id, "Imprimió una receta", true);
  const anos = edad(nota.contacto.fechaNacimiento);
  const lugar = [empresa.direccion, empresa.municipio, empresa.departamento].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-imprimir mb-4 flex items-center justify-between gap-2">
        <Link href={`/app/pacientes/${id}`} className="inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900">
          <Icono nombre="atras" /> {nota.contacto.nombre}
        </Link>
        <BotonImprimir texto="Imprimir receta" />
      </div>

      <article className="tarjeta space-y-6 p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-tinta-200 pb-4">
          <div>
            <p className="text-lg font-semibold text-tinta-900">{empresa.nombre}</p>
            {lugar && <p className="text-sm text-tinta-600">{lugar}</p>}
            {empresa.telefono && <p className="text-sm text-tinta-600">Tel. {mostrarTelefono(empresa.telefono)}</p>}
          </div>
          <div className="text-right">
            <p className="font-medium text-tinta-900">{nota.profesional?.nombre ?? nota.usuario.nombre}</p>
            {nota.profesional?.especialidad && <p className="text-sm text-tinta-600">{nota.profesional.especialidad}</p>}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <span className="text-tinta-500">Paciente: </span>
            <span className="font-medium text-tinta-900">{nota.contacto.nombre}</span>
            {anos !== null && <span className="text-tinta-600"> · {anos} años</span>}
          </p>
          <p className="text-right">
            <span className="text-tinta-500">Fecha: </span>
            {fecha(nota.creadoEl)}
          </p>
          {nota.contacto.alergias && (
            <p className="col-span-2 text-red-700">
              <span className="font-medium">Alergias:</span> {nota.contacto.alergias}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-2xl font-semibold text-tinta-900">℞</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-tinta-900">{nota.receta}</p>
        </div>

        {nota.tratamiento && (
          <div>
            <p className="mb-1 text-sm font-medium text-tinta-700">Indicaciones</p>
            <p className="whitespace-pre-wrap text-sm text-tinta-800">{nota.tratamiento}</p>
          </div>
        )}

        <footer className="pt-16 text-center">
          <div className="mx-auto w-64 border-t border-tinta-400 pt-1 text-sm text-tinta-700">
            Firma y sello
          </div>
        </footer>
      </article>
    </div>
  );
}
