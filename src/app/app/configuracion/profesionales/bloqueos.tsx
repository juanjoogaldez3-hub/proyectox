"use client";

import { useEffect, useRef } from "react";
import { Aviso, Boton, Campo } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import { crearBloqueo } from "../acciones";

export function FormularioBloqueo({ profesionales }: { profesionales: { id: string; nombre: string }[] }) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(crearBloqueo);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} onSubmit={alEnviar} className="space-y-3">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Bloqueo agregado. Esas horas ya no se ofrecen.</Aviso>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="¿A quién?">
          <select name="profesionalId" className="campo">
            <option value="">Toda la clínica (feriado, cierre)</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Motivo *">
          <input name="motivo" required className="campo" placeholder="Vacaciones" />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Desde *">
            <input name="desdeFecha" type="date" required className="campo" />
          </Campo>
          <Campo etiqueta="Hora" ayuda="Vacío = todo el día">
            <input name="desdeHora" type="time" className="campo" />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Hasta *">
            <input name="hastaFecha" type="date" required className="campo" />
          </Campo>
          <Campo etiqueta="Hora" ayuda="Vacío = todo el día">
            <input name="hastaHora" type="time" className="campo" />
          </Campo>
        </div>
      </div>
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Bloquear"}
      </Boton>
    </form>
  );
}
