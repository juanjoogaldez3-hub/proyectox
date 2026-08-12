"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

export type ValoresOportunidad = {
  titulo: string;
  contactoId: string;
  etapaId: string;
  monto: number;
  fechaCierre: Date | null;
  responsableId: string | null;
};

function paraInputFecha(valor: Date | null | undefined): string {
  if (!valor) return "";
  return valor.toISOString().slice(0, 10);
}

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioOportunidad({
  accion,
  valores,
  contactos,
  etapas,
  usuarios,
  textoBoton = "Guardar oportunidad",
  cancelarHref = "/app/embudo",
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresOportunidad;
  contactos: { id: string; nombre: string; negocio: string | null }[];
  etapas: { id: string; nombre: string }[];
  usuarios: { id: string; nombre: string }[];
  textoBoton?: string;
  cancelarHref?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);

  return (
    <form action={enviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="¿Qué le vas a vender? *" className="sm:col-span-2">
            <input
              name="titulo"
              required
              defaultValue={valores?.titulo}
              className="campo"
              placeholder="Pedido de 20 cajas de café"
            />
          </Campo>

          <Campo etiqueta="Contacto *">
            {contactos.length === 0 ? (
              <p className="text-sm text-tinta-500">
                Primero{" "}
                <Link href="/app/contactos/nuevo" className="text-marca-600 hover:underline">
                  agregá un contacto
                </Link>
                .
              </p>
            ) : (
              <select
                name="contactoId"
                required
                defaultValue={valores?.contactoId ?? ""}
                className="campo"
              >
                <option value="">Elegí un contacto</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.negocio ? ` — ${c.negocio}` : ""}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo etiqueta="Etapa *">
            <select
              name="etapaId"
              required
              defaultValue={valores?.etapaId ?? etapas[0]?.id ?? ""}
              className="campo"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Monto (Q)" ayuda="Lo que esperás vender, sin IVA.">
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={valores?.monto ?? ""}
              className="campo"
              placeholder="0.00"
            />
          </Campo>

          <Campo etiqueta="Fecha estimada de cierre">
            <input
              name="fechaCierre"
              type="date"
              defaultValue={paraInputFecha(valores?.fechaCierre)}
              className="campo"
            />
          </Campo>

          <Campo etiqueta="Responsable" className="sm:col-span-2">
            <select
              name="responsableId"
              defaultValue={valores?.responsableId ?? ""}
              className="campo"
            >
              <option value="">Sin asignar</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Tarjeta>

      <div className="flex items-center gap-3">
        <BotonGuardar texto={textoBoton} />
        <Link href={cancelarHref} className="text-sm text-tinta-500 hover:text-tinta-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
