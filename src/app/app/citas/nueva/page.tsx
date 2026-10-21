import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { EncabezadoPagina } from "@/components/ui";
import { fechaDeHoyGT } from "@/lib/gt";
import { FormularioCita } from "../formulario";
import { crearCita } from "../acciones";
import { datosFormularioCita } from "../datos";

export const metadata: Metadata = { title: "Agendar cita" };

export default async function PaginaNuevaCita({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string; profesional?: string; fecha?: string; hora?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const filtros = await searchParams;
  const datos = await datosFormularioCita(empresa.id);
  const profesional = datos.profesionales.find((p) => p.id === filtros.profesional);

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPagina
        titulo="Agendar cita"
        descripcion="Queda en la agenda, en Google Calendar y con recordatorios por WhatsApp."
      />
      <FormularioCita
        accion={crearCita}
        {...datos}
        volverA="/app/citas"
        valores={{
          contactoId: filtros.paciente,
          profesionalId: profesional?.id ?? (datos.profesionales.length === 1 ? datos.profesionales[0].id : null),
          fecha: /^\d{4}-\d{2}-\d{2}$/.test(filtros.fecha ?? "") ? filtros.fecha : fechaDeHoyGT(),
          hora: /^\d{2}:\d{2}$/.test(filtros.hora ?? "") ? filtros.hora : undefined,
          duracionMin: profesional?.duracionMin ?? datos.profesionales[0]?.duracionMin ?? 30,
        }}
      />
    </div>
  );
}
