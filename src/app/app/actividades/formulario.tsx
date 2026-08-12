"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

const TIPOS = [
  { valor: "WHATSAPP", texto: "Mensaje de WhatsApp" },
  { valor: "LLAMADA", texto: "Llamada" },
  { valor: "REUNION", texto: "Reunión" },
  { valor: "VISITA", texto: "Visita" },
  { valor: "CORREO", texto: "Correo" },
  { valor: "TAREA", texto: "Tarea" },
];

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Agendar"}
    </Boton>
  );
}

export function FormularioActividad({
  accion,
  contactos,
  oportunidades,
  contactoInicial,
  oportunidadInicial,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  contactos: { id: string; nombre: string }[];
  oportunidades: { id: string; titulo: string }[];
  contactoInicial?: string;
  oportunidadInicial?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);

  return (
    <form action={enviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="¿Qué hay que hacer? *" className="sm:col-span-2">
            <input
              name="titulo"
              required
              className="campo"
              placeholder="Llamar para confirmar el pedido"
            />
          </Campo>

          <Campo etiqueta="Tipo">
            <select name="tipo" defaultValue="WHATSAPP" className="campo">
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="¿Cuándo?">
            <input name="venceEl" type="datetime-local" className="campo" />
          </Campo>

          <Campo etiqueta="Contacto">
            <select name="contactoId" defaultValue={contactoInicial ?? ""} className="campo">
              <option value="">Sin contacto</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Oportunidad">
            <select
              name="oportunidadId"
              defaultValue={oportunidadInicial ?? ""}
              className="campo"
            >
              <option value="">Sin oportunidad</option>
              {oportunidades.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Detalle" className="sm:col-span-2">
            <textarea
              name="detalle"
              rows={3}
              className="campo"
              placeholder="Preguntar si ya revisó la cotización y si necesita factura."
            />
          </Campo>
        </div>
      </Tarjeta>

      <div className="flex items-center gap-3">
        <BotonGuardar />
        <Link href="/app/actividades" className="text-sm text-tinta-500 hover:text-tinta-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
