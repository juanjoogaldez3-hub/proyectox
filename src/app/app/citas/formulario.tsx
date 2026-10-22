"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import { DURACIONES } from "@/lib/citas";
import { buscarEspacios } from "./acciones";

const MOTIVOS = [
  "Consulta general",
  "Primera consulta",
  "Control",
  "Seguimiento",
  "Resultados de laboratorio",
  "Procedimiento",
  "Vacunación",
];

type Paciente = { id: string; nombre: string; whatsapp: string | null; email: string | null };
type Profesional = { id: string; nombre: string; especialidad: string | null; duracionMin: number };
type TipoConsulta = { id: string; nombre: string; duracionMin: number; profesionalIds: string[] };

export type ValoresCita = {
  contactoId?: string;
  profesionalId?: string | null;
  fecha?: string;
  hora?: string;
  duracionMin?: number;
  motivo?: string;
  notas?: string | null;
  invitarPaciente?: boolean;
  tipoConsultaId?: string | null;
};

function BotonGuardar({ texto, pendiente }: { texto: string; pendiente: boolean }) {
  return (
    <Boton type="submit" disabled={pendiente}>
      {pendiente ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioCita({
  accion,
  pacientes,
  profesionales,
  tipos,
  valores = {},
  googleConectado,
  whatsappConectado,
  esEdicion = false,
  volverA,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  pacientes: Paciente[];
  profesionales: Profesional[];
  tipos: TipoConsulta[];
  valores?: ValoresCita;
  googleConectado: boolean;
  whatsappConectado: boolean;
  esEdicion?: boolean;
  volverA: string;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const [pacienteId, setPacienteId] = useState(valores.contactoId ?? "");
  const [duracion, setDuracion] = useState(String(valores.duracionMin ?? 30));
  const [profesionalId, setProfesionalId] = useState(valores.profesionalId ?? "");
  const [tipoId, setTipoId] = useState(valores.tipoConsultaId ?? "");
  const [motivo, setMotivo] = useState(valores.motivo ?? "");
  const [fecha, setFecha] = useState(valores.fecha ?? "");
  const [hora, setHora] = useState(valores.hora ?? "");
  const [espacios, setEspacios] = useState<string[] | null>(null);
  const [buscando, iniciarBusqueda] = useTransition();
  const paciente = pacientes.find((p) => p.id === pacienteId);

  // Cada vez que cambia el profesional, la fecha o la duración, se buscan los
  // espacios libres de ese día (horario, citas, bloqueos y Google Calendar).
  useEffect(() => {
    if (!profesionalId || !fecha) {
      setEspacios(null);
      return;
    }
    let vigente = true;
    iniciarBusqueda(async () => {
      const libres = await buscarEspacios(profesionalId, fecha, Number(duracion));
      if (vigente) setEspacios(libres);
    });
    return () => {
      vigente = false;
    };
  }, [profesionalId, fecha, duracion]);

  const tiposDelProfesional = tipos.filter(
    (t) => t.profesionalIds.length === 0 || !profesionalId || t.profesionalIds.includes(profesionalId),
  );

  // Las duraciones de la lista más la actual, por si se guardó una distinta.
  const duraciones = Array.from(new Set([...DURACIONES, Number(duracion)])).sort((a, b) => a - b);

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Paciente *" className="sm:col-span-2">
            <select
              name="contactoId"
              required
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              className="campo"
            >
              <option value="">Elegí un paciente…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-tinta-400">
              ¿Es nuevo?{" "}
              <Link href="/app/pacientes/nuevo" className="text-marca-600 hover:underline">
                Registralo primero
              </Link>
              .
            </span>
          </Campo>

          <Campo etiqueta="Profesional">
            <select
              name="profesionalId"
              value={profesionalId}
              onChange={(e) => {
                setProfesionalId(e.target.value);
                const elegido = profesionales.find((p) => p.id === e.target.value);
                if (elegido && !esEdicion && !tipoId) setDuracion(String(elegido.duracionMin));
              }}
              className="campo"
            >
              <option value="">Sin asignar</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.especialidad ? ` · ${p.especialidad}` : ""}
                </option>
              ))}
            </select>
          </Campo>

          {tipos.length > 0 && (
            <Campo etiqueta="Servicio">
              <select
                name="tipoConsultaId"
                value={tipoId}
                onChange={(e) => {
                  setTipoId(e.target.value);
                  const tipo = tipos.find((t) => t.id === e.target.value);
                  if (tipo) {
                    setDuracion(String(tipo.duracionMin));
                    if (!motivo) setMotivo(tipo.nombre);
                  }
                }}
                className="campo"
              >
                <option value="">Sin servicio</option>
                {tiposDelProfesional.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} · {t.duracionMin} min
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo etiqueta="Motivo *" className={tipos.length > 0 ? "sm:col-span-2" : undefined}>
            <input
              name="motivo"
              required
              list="motivos-cita"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="campo"
              placeholder="Consulta general"
            />
            <datalist id="motivos-cita">
              {MOTIVOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Campo>

          <Campo etiqueta="Fecha *">
            <input
              name="fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="campo"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Hora *">
              <input
                name="hora"
                type="time"
                required
                step={300}
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="campo"
              />
            </Campo>
            <Campo etiqueta="Duración">
              <select
                name="duracionMin"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="campo"
              >
                {duraciones.map((d) => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} min` : `${d / 60} h`.replace(".5", " ½")}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {profesionalId && fecha && (
            <div className="sm:col-span-2">
              <span className="etiqueta-campo">Horas libres de ese día</span>
              {buscando && espacios === null ? (
                <p className="text-xs text-tinta-500">Buscando…</p>
              ) : espacios && espacios.length > 0 ? (
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {espacios.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setHora(e)}
                      aria-pressed={hora === e}
                      className={
                        hora === e
                          ? "rounded-md border border-marca-500 bg-marca-600 px-2 py-1 text-xs font-medium text-white"
                          : "rounded-md border border-tinta-200 bg-white px-2 py-1 text-xs text-tinta-700 hover:border-marca-300 hover:bg-marca-50"
                      }
                    >
                      {e}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-tinta-500">
                  No quedan espacios libres ese día. Probá otra fecha o marcá “Sobreturno”.
                </p>
              )}
            </div>
          )}

          <Campo etiqueta="Notas internas" className="sm:col-span-2" ayuda="El paciente no las ve.">
            <textarea
              name="notas"
              rows={3}
              defaultValue={valores.notas ?? ""}
              className="campo"
              placeholder="Traer exámenes anteriores. Viene referido por el Dr. Gómez."
            />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="space-y-3 p-5">
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="sobreturno" className="mt-0.5" />
          <span>
            <span className="font-medium text-tinta-800">Sobreturno</span>
            <span className="block text-xs text-tinta-500">
              Agendar aunque el profesional esté ocupado o fuera de su horario.
            </span>
          </span>
        </label>
      </Tarjeta>

      <Tarjeta className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Avisos al paciente</h2>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="invitarPaciente"
            defaultChecked={valores.invitarPaciente ?? true}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-tinta-800">
              Agregar a su Google Calendar con una invitación
            </span>
            <span className="block text-xs text-tinta-500">
              {!googleConectado
                ? "Conectá Google Calendar en Configuración → Google y WhatsApp para usarlo. Igual recibe el enlace para agregarla."
                : paciente && !paciente.email
                  ? "Este paciente no tiene correo: recibirá el enlace para agregarla por su cuenta."
                  : "Google le manda la invitación a su correo y la cita se actualiza sola si la movés."}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="avisarAhora"
            defaultChecked={whatsappConectado}
            disabled={!whatsappConectado}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-tinta-800">
              {esEdicion
                ? "Avisarle por WhatsApp si cambia la fecha"
                : "Mandarle la confirmación por WhatsApp ahora"}
            </span>
            <span className="block text-xs text-tinta-500">
              {!whatsappConectado
                ? "Conectá WhatsApp en Configuración → Google y WhatsApp para enviar automático."
                : paciente && !paciente.whatsapp
                  ? "Este paciente no tiene WhatsApp registrado."
                  : "Los recordatorios antes de la cita salen solos, marques esto o no."}
            </span>
          </span>
        </label>
      </Tarjeta>

      <div className="flex items-center gap-3">
        <BotonGuardar texto={esEdicion ? "Guardar cambios" : "Agendar cita"} pendiente={pendiente} />
        <Link href={volverA} className="text-sm text-tinta-500 hover:text-tinta-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
