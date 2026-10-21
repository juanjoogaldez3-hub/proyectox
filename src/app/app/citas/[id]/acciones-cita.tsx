"use client";

import { useEffect, useState, useTransition } from "react";
import type { EstadoCita } from "@prisma/client";
import { Aviso, Boton, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import type { EstadoAccion } from "@/lib/acciones";
import { cambiarEstadoCita, enviarRecordatorioAhora } from "../acciones";

type Opcion = { estado: EstadoCita; texto: string; variante: "primario" | "secundario" | "fantasma"; confirmar?: string };

const OPCIONES: Record<EstadoCita, Opcion[]> = {
  PROGRAMADA: [
    { estado: "CONFIRMADA", texto: "Marcar confirmada", variante: "primario" },
    { estado: "COMPLETADA", texto: "Atendida", variante: "secundario" },
    { estado: "NO_ASISTIO", texto: "No asistió", variante: "secundario" },
    {
      estado: "CANCELADA",
      texto: "Cancelar cita",
      variante: "fantasma",
      confirmar: "Se borra de Google Calendar y se cancelan los recordatorios. ¿Seguir?",
    },
  ],
  CONFIRMADA: [
    { estado: "COMPLETADA", texto: "Atendida", variante: "primario" },
    { estado: "NO_ASISTIO", texto: "No asistió", variante: "secundario" },
    {
      estado: "CANCELADA",
      texto: "Cancelar cita",
      variante: "fantasma",
      confirmar: "Se borra de Google Calendar y se cancelan los recordatorios. ¿Seguir?",
    },
  ],
  COMPLETADA: [],
  NO_ASISTIO: [{ estado: "COMPLETADA", texto: "Sí asistió", variante: "secundario" }],
  CANCELADA: [{ estado: "PROGRAMADA", texto: "Reactivar cita", variante: "secundario" }],
};

export function AccionesCita({ id, estado }: { id: string; estado: EstadoCita }) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<EstadoAccion>(null);
  const opciones = OPCIONES[estado];
  if (opciones.length === 0 && !resultado?.error) return null;

  return (
    <Tarjeta className="space-y-2 p-3">
      {resultado?.error && <Aviso tono="peligro">{resultado.error}</Aviso>}
      <div className="flex flex-wrap items-center gap-2">
        {opciones.map((o) => (
          <Boton
            key={o.estado}
            type="button"
            tamano="sm"
            variante={o.variante}
            disabled={pendiente}
            onClick={() => {
              if (o.confirmar && !confirm(o.confirmar)) return;
              iniciar(async () => setResultado(await cambiarEstadoCita(id, o.estado)));
            }}
          >
            {o.texto}
          </Boton>
        ))}
        {pendiente && <span className="text-xs text-tinta-500">Guardando…</span>}
      </div>
    </Tarjeta>
  );
}

export function BotonEnviarRecordatorio({ id }: { id: string }) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<EstadoAccion>(null);

  useEffect(() => {
    if (!resultado?.ok) return;
    const t = setTimeout(() => setResultado(null), 3000);
    return () => clearTimeout(t);
  }, [resultado]);

  return (
    <div className="space-y-2">
      <Boton
        type="button"
        variante="secundario"
        tamano="sm"
        disabled={pendiente}
        onClick={() => iniciar(async () => setResultado(await enviarRecordatorioAhora(id)))}
      >
        <Icono nombre="whatsapp" />
        {pendiente ? "Enviando…" : "Enviar recordatorio ahora"}
      </Boton>
      {resultado?.error && <Aviso tono="peligro">{resultado.error}</Aviso>}
      {resultado?.ok && <Aviso tono="exito">Mensaje enviado.</Aviso>}
    </div>
  );
}

export function EnlacePaciente({ enlace, enlaceGoogle }: { enlace: string; enlaceGoogle: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles todavía se puede copiar a mano.
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={enlace}
          onFocus={(e) => e.currentTarget.select()}
          className="campo min-w-0 flex-1 font-mono text-xs"
          aria-label="Enlace de la cita para el paciente"
        />
        <Boton type="button" variante="secundario" tamano="sm" onClick={copiar}>
          {copiado ? "¡Copiado!" : "Copiar"}
        </Boton>
      </div>
      <a
        href={enlaceGoogle}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-marca-600 hover:underline"
      >
        <Icono nombre="calendario" className="h-3.5 w-3.5" />
        Abrir como evento de Google Calendar
      </a>
    </div>
  );
}
