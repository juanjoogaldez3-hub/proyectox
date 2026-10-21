import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioPaciente } from "../formulario";
import { crearPaciente } from "../acciones";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function PaginaNuevoPaciente() {
  await requerirSesion();
  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo="Nuevo paciente" descripcion="Solo el nombre es obligatorio; el resto se completa cuando venga." />
      <FormularioPaciente accion={crearPaciente} volverA="/app/pacientes" />
    </div>
  );
}
