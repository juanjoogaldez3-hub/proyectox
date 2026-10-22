import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { mostrarTelefono, partesLocalesGT } from "@/lib/gt";
import { FormularioPaciente } from "../../formulario";
import { actualizarPaciente } from "../../acciones";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function PaginaEditarPaciente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { empresa } = await requerirSesion();
  const p = await prisma.contacto.findFirst({ where: { id, empresaId: empresa.id } });
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo={`Editar a ${p.nombre}`} />
      <FormularioPaciente
        accion={actualizarPaciente.bind(null, p.id)}
        volverA={`/app/pacientes/${p.id}`}
        esEdicion
        valores={{
          ...p,
          whatsapp: mostrarTelefono(p.whatsapp),
          telefono: mostrarTelefono(p.telefono),
          contactoEmergenciaTelefono: mostrarTelefono(p.contactoEmergenciaTelefono),
          fechaNacimiento: p.fechaNacimiento ? partesLocalesGT(p.fechaNacimiento).fecha : "",
          consentimiento: Boolean(p.consentimientoEl),
        }}
      />
    </div>
  );
}
