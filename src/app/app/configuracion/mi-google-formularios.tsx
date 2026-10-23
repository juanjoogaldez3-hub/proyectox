"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";
import { desconectarMiGoogle, elegirMiCalendario, sincronizarMisCitas } from "./mi-google";

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="secundario" tamano="sm" disabled={pending}>
      {pending ? "Moviendo citas…" : "Guardar"}
    </Boton>
  );
}

export function ElegirMiCalendario({
  calendarios,
  actual,
}: {
  calendarios: { id: string; nombre: string; principal: boolean }[];
  actual: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(elegirMiCalendario, null);
  const seleccion = actual === "primary" ? (calendarios.find((c) => c.principal)?.id ?? actual) : actual;
  return (
    <form action={enviar} className="space-y-2">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Listo. Tus próximas citas ya están en ese calendario.</Aviso>}
      <Campo etiqueta="Calendario donde caen tus citas">
        <div className="flex flex-wrap gap-2">
          <select name="calendarioId" defaultValue={seleccion} className="campo min-w-0 flex-1">
            {calendarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.principal ? " (principal)" : ""}
              </option>
            ))}
          </select>
          <BotonGuardar />
        </div>
      </Campo>
    </form>
  );
}

export function AccionesMiGoogle() {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoAccion>(null);
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div className="space-y-2">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Tus próximas citas ya están en tu Google Calendar.</Aviso>}
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          type="button"
          variante="secundario"
          tamano="sm"
          disabled={pendiente}
          onClick={() => iniciar(async () => setEstado(await sincronizarMisCitas()))}
        >
          {pendiente ? "Sincronizando…" : "Volver a sincronizar mis citas"}
        </Boton>
        {confirmando ? (
          <form action={desconectarMiGoogle} className="flex items-center gap-2">
            <span className="text-xs text-tinta-500">Tus citas vuelven al calendario de la clínica.</span>
            <Boton type="submit" variante="peligro" tamano="sm">
              Sí, desconectar
            </Boton>
            <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setConfirmando(false)}>
              No
            </Boton>
          </form>
        ) : (
          <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setConfirmando(true)}>
            Desconectar
          </Boton>
        )}
      </div>
    </div>
  );
}
