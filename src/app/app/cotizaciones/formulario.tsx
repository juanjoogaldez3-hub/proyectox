"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import {
  EditorLineas,
  LINEA_VACIA,
  ResumenTotales,
  type Linea,
  type OpcionProducto,
} from "@/components/lineas";
import { calcularTotales } from "@/lib/gt";
import type { EstadoAccion } from "@/lib/acciones";

export type ValoresCotizacion = {
  contactoId: string;
  oportunidadId: string | null;
  validaHasta: Date | null;
  descuento: number;
  notas: string | null;
  condiciones: string | null;
  items: Linea[];
};

function paraInputFecha(valor: Date | null | undefined): string {
  return valor ? valor.toISOString().slice(0, 10) : "";
}

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioCotizacion({
  accion,
  valores,
  contactos,
  oportunidades,
  productos,
  ivaPorcentaje,
  textoBoton = "Guardar cotización",
  cancelarHref = "/app/cotizaciones",
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresCotizacion;
  contactos: { id: string; nombre: string; negocio: string | null }[];
  oportunidades: { id: string; titulo: string }[];
  productos: OpcionProducto[];
  ivaPorcentaje: number;
  textoBoton?: string;
  cancelarHref?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);
  const [lineas, setLineas] = useState<Linea[]>(
    valores?.items?.length ? valores.items : [{ ...LINEA_VACIA }],
  );
  const [descuento, setDescuento] = useState(valores?.descuento ?? 0);

  const totales = useMemo(
    () => calcularTotales(lineas, { descuento, ivaPorcentaje }),
    [lineas, descuento, ivaPorcentaje],
  );

  return (
    <form action={enviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />

      <Tarjeta className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cliente *">
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
                <option value="">Elegí un cliente</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.negocio ? ` — ${c.negocio}` : ""}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo etiqueta="Válida hasta">
            <input
              name="validaHasta"
              type="date"
              defaultValue={paraInputFecha(valores?.validaHasta)}
              className="campo"
            />
          </Campo>

          <Campo etiqueta="Oportunidad relacionada" className="sm:col-span-2">
            <select
              name="oportunidadId"
              defaultValue={valores?.oportunidadId ?? ""}
              className="campo"
            >
              <option value="">Ninguna</option>
              {oportunidades.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-tinta-900">¿Qué le vas a cotizar?</h2>
        <EditorLineas lineas={lineas} setLineas={setLineas} productos={productos} />
        <ResumenTotales
          totales={totales}
          descuento={descuento}
          setDescuento={setDescuento}
          ivaPorcentaje={ivaPorcentaje}
        />
      </Tarjeta>

      <Tarjeta className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Notas para el cliente">
            <textarea
              name="notas"
              rows={3}
              defaultValue={valores?.notas ?? ""}
              className="campo"
              placeholder="Entrega en 3 días hábiles dentro de la capital."
            />
          </Campo>
          <Campo etiqueta="Condiciones">
            <textarea
              name="condiciones"
              rows={3}
              defaultValue={
                valores?.condiciones ??
                "Precios en quetzales, IVA incluido. Se requiere 50% de anticipo."
              }
              className="campo"
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
