"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

export type ValoresProducto = {
  nombre: string;
  sku: string | null;
  descripcion: string | null;
  precio: number;
  costo: number;
  unidad: string;
  controlaInventario: boolean;
  stock: number;
  stockMinimo: number;
};

const UNIDADES = ["unidad", "libra", "quintal", "caja", "docena", "litro", "metro", "servicio"];

function BotonGuardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioProducto({
  accion,
  valores,
  esNuevo = false,
  textoBoton = "Guardar producto",
  cancelarHref = "/app/productos",
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  valores?: ValoresProducto;
  esNuevo?: boolean;
  textoBoton?: string;
  cancelarHref?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);
  const [controla, setControla] = useState(valores?.controlaInventario ?? true);

  return (
    <form action={enviar} className="space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Tarjeta className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre *" className="sm:col-span-2">
            <input
              name="nombre"
              required
              defaultValue={valores?.nombre}
              className="campo"
              placeholder="Café molido 1 libra"
            />
          </Campo>

          <Campo etiqueta="Código / SKU" ayuda="Opcional, pero no se puede repetir.">
            <input
              name="sku"
              defaultValue={valores?.sku ?? ""}
              className="campo"
              placeholder="CAF-001"
            />
          </Campo>

          <Campo etiqueta="Unidad de medida">
            <input
              name="unidad"
              list="unidades"
              defaultValue={valores?.unidad ?? "unidad"}
              className="campo"
            />
            <datalist id="unidades">
              {UNIDADES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Campo>

          <Campo etiqueta="Precio de venta (Q) *" ayuda="Sin IVA.">
            <input
              name="precio"
              type="number"
              step="0.01"
              min="0"
              required
              inputMode="decimal"
              defaultValue={valores?.precio ?? ""}
              className="campo"
              placeholder="0.00"
            />
          </Campo>

          <Campo etiqueta="Costo (Q)" ayuda="Lo que te cuesta a vos. Sirve para tu margen.">
            <input
              name="costo"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={valores?.costo ?? ""}
              className="campo"
              placeholder="0.00"
            />
          </Campo>

          <Campo etiqueta="Descripción" className="sm:col-span-2">
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={valores?.descripcion ?? ""}
              className="campo"
              placeholder="Se muestra en la cotización."
            />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="controlaInventario"
            checked={controla}
            onChange={(e) => setControla(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-tinta-300"
          />
          <span>
            <span className="block text-sm font-medium text-tinta-800">
              Llevar control de existencias
            </span>
            <span className="block text-xs text-tinta-500">
              Desactivalo si es un servicio: no se descuenta nada al vender.
            </span>
          </span>
        </label>

        {controla && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {esNuevo && (
              <Campo etiqueta="Existencia inicial">
                <input
                  name="stock"
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  defaultValue={valores?.stock ?? 0}
                  className="campo"
                />
              </Campo>
            )}
            <Campo
              etiqueta="Stock mínimo"
              ayuda="Te avisamos cuando la existencia llegue a este número."
            >
              <input
                name="stockMinimo"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                defaultValue={valores?.stockMinimo ?? 0}
                className="campo"
              />
            </Campo>
          </div>
        )}
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
