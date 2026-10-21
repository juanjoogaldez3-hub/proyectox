"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";

export function FormularioNotaClinica({
  accion,
  citas,
  citaInicial,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  citas: { id: string; texto: string }[];
  citaInicial?: string;
}) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const [abierto, setAbierto] = useState(Boolean(citaInicial));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) {
      formRef.current?.reset();
      setAbierto(false);
    }
  }, [estado]);

  if (!abierto) {
    return (
      <div className="space-y-2">
        {estado?.ok && <Aviso tono="exito">Nota guardada en el expediente.</Aviso>}
        <Boton type="button" variante="secundario" tamano="sm" onClick={() => setAbierto(true)}>
          Nueva nota de consulta
        </Boton>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={alEnviar} className="space-y-3 rounded-lg border border-tinta-200 p-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Cita">
          <select name="citaId" defaultValue={citaInicial ?? ""} className="campo">
            <option value="">Sin cita (nota suelta)</option>
            {citas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.texto}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Motivo de consulta">
          <input name="motivo" className="campo" placeholder="Dolor de garganta de 3 días" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo etiqueta="Presión">
          <input name="presion" className="campo" placeholder="120/80" />
        </Campo>
        <Campo etiqueta="Peso (kg)">
          <input name="pesoKg" inputMode="decimal" className="campo" placeholder="68" />
        </Campo>
        <Campo etiqueta="Talla (cm)">
          <input name="tallaCm" inputMode="decimal" className="campo" placeholder="165" />
        </Campo>
        <Campo etiqueta="Temperatura (°C)">
          <input name="temperatura" inputMode="decimal" className="campo" placeholder="37.2" />
        </Campo>
      </div>
      <Campo etiqueta="Diagnóstico">
        <textarea name="diagnostico" rows={2} className="campo" placeholder="Faringitis aguda" />
      </Campo>
      <Campo etiqueta="Tratamiento e indicaciones">
        <textarea name="tratamiento" rows={2} className="campo" placeholder="Reposo, abundantes líquidos. Control en 7 días si persiste." />
      </Campo>
      <Campo etiqueta="Receta" ayuda="Se puede imprimir aparte con los datos de la clínica.">
        <textarea name="receta" rows={3} className="campo" placeholder={"Amoxicilina 500 mg — 1 cápsula cada 8 horas por 7 días\nAcetaminofén 500 mg — 1 tableta cada 6 horas si hay fiebre"} />
      </Campo>
      <div className="flex items-center gap-2">
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar en el expediente"}
        </Boton>
        <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
