import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoPagina } from "@/components/ui";
import { partesLocalesGT } from "@/lib/gt";
import { citaVigente } from "@/lib/citas";
import { FormularioCita } from "../../formulario";
import { actualizarCita } from "../../acciones";
import { datosFormularioCita } from "../../datos";

export const metadata: Metadata = { title: "Reprogramar cita" };

export default async function PaginaEditarCita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const cita = await prisma.cita.findFirst({ where: { id, empresaId: empresa.id } });
  if (!cita) notFound();
  if (!citaVigente(cita.estado)) redirect(`/app/citas/${cita.id}`);

  const datos = await datosFormularioCita(empresa.id);
  const { fecha, hora } = partesLocalesGT(cita.inicio);

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPagina
        titulo="Editar o reprogramar"
        descripcion="Si cambiás la hora, Google Calendar y los recordatorios se ajustan solos."
      />
      <FormularioCita
        accion={actualizarCita.bind(null, cita.id)}
        {...datos}
        esEdicion
        volverA={`/app/citas/${cita.id}`}
        valores={{
          contactoId: cita.contactoId,
          profesionalId: cita.profesionalId,
          fecha,
          hora,
          duracionMin: Math.round((cita.fin.getTime() - cita.inicio.getTime()) / 60_000),
          motivo: cita.motivo,
          notas: cita.notas,
          invitarPaciente: cita.invitarPaciente,
          tipoConsultaId: cita.tipoConsultaId,
        }}
      />
    </div>
  );
}
