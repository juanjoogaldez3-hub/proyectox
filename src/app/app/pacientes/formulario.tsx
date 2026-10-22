"use client";

import Link from "next/link";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import { DEPARTAMENTOS } from "@/lib/gt";

export type ValoresPaciente = {
  nombre?: string;
  whatsapp?: string;
  telefono?: string;
  email?: string | null;
  fechaNacimiento?: string;
  dpi?: string | null;
  sexo?: string | null;
  tipoSangre?: string | null;
  seguroMedico?: string | null;
  alergias?: string | null;
  antecedentes?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string;
  direccion?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  notas?: string | null;
  consentimiento?: boolean;
};

const TIPOS_SANGRE = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

export function FormularioPaciente({
  accion,
  valores = {},
  volverA,
  esEdicion = false,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresPaciente;
  volverA: string;
  esEdicion?: boolean;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-tinta-900">Datos personales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre completo *" className="sm:col-span-2">
            <input name="nombre" required defaultValue={valores.nombre} className="campo" placeholder="Rosa Elena Castillo" />
          </Campo>
          <Campo etiqueta="WhatsApp" ayuda="Para confirmaciones y recordatorios.">
            <input name="whatsapp" type="tel" defaultValue={valores.whatsapp} className="campo" placeholder="5555-5555" />
          </Campo>
          <Campo etiqueta="Correo" ayuda="Para la invitación de Google Calendar.">
            <input name="email" type="email" defaultValue={valores.email ?? ""} className="campo" placeholder="rosa@gmail.com" />
          </Campo>
          <Campo etiqueta="Fecha de nacimiento">
            <input name="fechaNacimiento" type="date" defaultValue={valores.fechaNacimiento} className="campo" />
          </Campo>
          <Campo etiqueta="DPI" ayuda="13 dígitos.">
            <input name="dpi" inputMode="numeric" defaultValue={valores.dpi ?? ""} className="campo" placeholder="1234 56789 0101" />
          </Campo>
          <Campo etiqueta="Sexo">
            <select name="sexo" defaultValue={valores.sexo ?? ""} className="campo">
              <option value="">Sin indicar</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
          </Campo>
          <Campo etiqueta="Otro teléfono">
            <input name="telefono" type="tel" defaultValue={valores.telefono} className="campo" />
          </Campo>
          <Campo etiqueta="Dirección" className="sm:col-span-2">
            <input name="direccion" defaultValue={valores.direccion ?? ""} className="campo" />
          </Campo>
          <Campo etiqueta="Municipio">
            <input name="municipio" defaultValue={valores.municipio ?? ""} className="campo" />
          </Campo>
          <Campo etiqueta="Departamento">
            <select name="departamento" defaultValue={valores.departamento ?? ""} className="campo">
              <option value="">Sin indicar</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-tinta-900">Datos médicos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo de sangre">
            <select name="tipoSangre" defaultValue={valores.tipoSangre ?? ""} className="campo">
              <option value="">No se sabe</option>
              {TIPOS_SANGRE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Seguro médico">
            <input name="seguroMedico" defaultValue={valores.seguroMedico ?? ""} className="campo" placeholder="IGSS, aseguradora, póliza…" />
          </Campo>
          <Campo etiqueta="Alergias" className="sm:col-span-2" ayuda="Se muestran en rojo en su ficha.">
            <input name="alergias" defaultValue={valores.alergias ?? ""} className="campo" placeholder="Penicilina, mariscos" />
          </Campo>
          <Campo etiqueta="Antecedentes" className="sm:col-span-2">
            <textarea name="antecedentes" rows={2} defaultValue={valores.antecedentes ?? ""} className="campo" placeholder="Hipertensión, diabetes, cirugías…" />
          </Campo>
          <Campo etiqueta="Contacto de emergencia">
            <input name="contactoEmergenciaNombre" defaultValue={valores.contactoEmergenciaNombre ?? ""} className="campo" placeholder="Nombre y parentesco" />
          </Campo>
          <Campo etiqueta="Teléfono de emergencia">
            <input name="contactoEmergenciaTelefono" type="tel" defaultValue={valores.contactoEmergenciaTelefono} className="campo" />
          </Campo>
          <Campo etiqueta="Notas para la recepción" className="sm:col-span-2">
            <textarea name="notas" rows={2} defaultValue={valores.notas ?? ""} className="campo" placeholder="Prefiere citas por la mañana." />
          </Campo>
        </div>
        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="consentimiento" defaultChecked={valores.consentimiento} className="mt-0.5" />
          <span>
            <span className="font-medium text-tinta-800">El paciente autorizó el manejo de sus datos de salud</span>
            <span className="block text-xs text-tinta-500">
              Queda registrada la fecha. Sin esta autorización la ficha muestra un aviso.
            </span>
          </span>
        </label>
      </Tarjeta>

      <div className="flex items-center gap-3">
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar paciente"}
        </Boton>
        <Link href={volverA} className="text-sm text-tinta-500 hover:text-tinta-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
