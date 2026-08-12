"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { DEPARTAMENTOS, mostrarTelefono } from "@/lib/gt";
import type { EstadoAccion } from "@/lib/acciones";

const ORIGENES: { valor: string; texto: string }[] = [
  { valor: "WHATSAPP", texto: "WhatsApp" },
  { valor: "FACEBOOK", texto: "Facebook" },
  { valor: "INSTAGRAM", texto: "Instagram" },
  { valor: "TIKTOK", texto: "TikTok" },
  { valor: "REFERIDO", texto: "Referido" },
  { valor: "SITIO_WEB", texto: "Sitio web" },
  { valor: "LLAMADA", texto: "Llamada" },
  { valor: "VISITA", texto: "Visita" },
  { valor: "FERIA", texto: "Feria o evento" },
  { valor: "OTRO", texto: "Otro" },
];

export type ValoresContacto = {
  nombre: string;
  negocio: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  nit: string | null;
  direccion: string | null;
  departamento: string | null;
  municipio: string | null;
  origen: string;
  etiquetas: string[];
  notas: string | null;
  responsableId: string | null;
};

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioContacto({
  accion,
  valores,
  usuarios,
  textoBoton = "Guardar contacto",
  cancelarHref = "/app/contactos",
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresContacto;
  usuarios: { id: string; nombre: string }[];
  textoBoton?: string;
  cancelarHref?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);

  return (
    <form action={enviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-tinta-900">Datos del contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre *">
            <input
              name="nombre"
              required
              defaultValue={valores?.nombre}
              className="campo"
              placeholder="María López"
            />
          </Campo>
          <Campo etiqueta="Negocio">
            <input
              name="negocio"
              defaultValue={valores?.negocio ?? ""}
              className="campo"
              placeholder="Tienda La Bendición"
            />
          </Campo>
          <Campo etiqueta="Teléfono" ayuda="Ejemplo: 5555-5555">
            <input
              name="telefono"
              type="tel"
              inputMode="tel"
              defaultValue={mostrarTelefono(valores?.telefono)}
              className="campo"
              placeholder="5555-5555"
            />
          </Campo>
          <Campo etiqueta="WhatsApp" ayuda="Si lo dejás vacío usamos el teléfono.">
            <input
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={mostrarTelefono(valores?.whatsapp)}
              className="campo"
              placeholder="5555-5555"
            />
          </Campo>
          <Campo etiqueta="Correo">
            <input
              name="email"
              type="email"
              defaultValue={valores?.email ?? ""}
              className="campo"
              placeholder="cliente@correo.com"
            />
          </Campo>
          <Campo etiqueta="NIT" ayuda="Escribí CF si es consumidor final.">
            <input
              name="nit"
              defaultValue={valores?.nit ?? ""}
              className="campo"
              placeholder="1234567-8"
            />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-tinta-900">Ubicación y seguimiento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Departamento">
            <select
              name="departamento"
              defaultValue={valores?.departamento ?? ""}
              className="campo"
            >
              <option value="">Sin especificar</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Municipio">
            <input
              name="municipio"
              defaultValue={valores?.municipio ?? ""}
              className="campo"
              placeholder="Mixco"
            />
          </Campo>
          <Campo etiqueta="Dirección" className="sm:col-span-2">
            <input
              name="direccion"
              defaultValue={valores?.direccion ?? ""}
              className="campo"
              placeholder="5a calle 3-20 zona 1"
            />
          </Campo>
          <Campo etiqueta="¿De dónde llegó?">
            <select name="origen" defaultValue={valores?.origen ?? "WHATSAPP"} className="campo">
              {ORIGENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Responsable">
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
          <Campo
            etiqueta="Etiquetas"
            ayuda="Separadas por coma. Ejemplo: mayorista, zona 1"
            className="sm:col-span-2"
          >
            <input
              name="etiquetas"
              defaultValue={valores?.etiquetas.join(", ") ?? ""}
              className="campo"
              placeholder="mayorista, recurrente"
            />
          </Campo>
          <Campo etiqueta="Notas" className="sm:col-span-2">
            <textarea
              name="notas"
              rows={3}
              defaultValue={valores?.notas ?? ""}
              className="campo"
              placeholder="Compra cada quincena, prefiere que le escriban por la tarde…"
            />
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
