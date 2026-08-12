"use client";

import type { Dispatch, SetStateAction } from "react";
import { Boton } from "@/components/ui";
import { quetzales, redondear } from "@/lib/gt";

export type OpcionProducto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
};

export type Linea = {
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

export const LINEA_VACIA: Linea = {
  productoId: "",
  descripcion: "",
  cantidad: 1,
  precioUnitario: 0,
};

/**
 * Editor de lineas compartido por cotizaciones y ventas. El estado vive en el
 * formulario que lo usa; aca solo se dibuja y se avisa de los cambios.
 */
export function EditorLineas({
  lineas,
  setLineas,
  productos,
}: {
  lineas: Linea[];
  setLineas: Dispatch<SetStateAction<Linea[]>>;
  productos: OpcionProducto[];
}) {
  function actualizar(indice: number, cambios: Partial<Linea>) {
    setLineas((previas) =>
      previas.map((linea, i) => (i === indice ? { ...linea, ...cambios } : linea)),
    );
  }

  /** Al elegir producto se copian descripción y precio; después se pueden editar. */
  function elegirProducto(indice: number, productoId: string) {
    const producto = productos.find((p) => p.id === productoId);
    actualizar(indice, {
      productoId,
      ...(producto && {
        descripcion: producto.descripcion
          ? `${producto.nombre} — ${producto.descripcion}`
          : producto.nombre,
        precioUnitario: producto.precio,
      }),
    });
  }

  return (
    <>
      <div className="space-y-3">
        {lineas.map((linea, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-lg border border-tinta-200 p-3 sm:grid-cols-12"
          >
            <div className="sm:col-span-5">
              <label className="etiqueta-campo">Producto</label>
              <select
                value={linea.productoId}
                onChange={(e) => elegirProducto(i, e.target.value)}
                className="campo"
              >
                <option value="">Escribir a mano</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                value={linea.descripcion}
                onChange={(e) => actualizar(i, { descripcion: e.target.value })}
                className="campo mt-2"
                placeholder="Descripción que verá el cliente"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="etiqueta-campo">Cantidad</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={linea.cantidad}
                onChange={(e) => actualizar(i, { cantidad: Number(e.target.value) || 0 })}
                className="campo"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="etiqueta-campo">Precio (Q)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={linea.precioUnitario}
                onChange={(e) => actualizar(i, { precioUnitario: Number(e.target.value) || 0 })}
                className="campo"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="etiqueta-campo">Total</label>
              <p className="px-1 py-2 text-sm font-medium text-tinta-900">
                {quetzales(redondear(linea.cantidad * linea.precioUnitario))}
              </p>
            </div>

            <div className="flex items-end sm:col-span-1">
              <button
                type="button"
                onClick={() => setLineas((p) => p.filter((_, j) => j !== i))}
                disabled={lineas.length === 1}
                aria-label="Quitar línea"
                className="mb-1 rounded p-2 text-tinta-400 hover:bg-tinta-100 hover:text-red-600 disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Boton
        type="button"
        variante="secundario"
        tamano="sm"
        className="mt-3"
        onClick={() => setLineas((p) => [...p, { ...LINEA_VACIA }])}
      >
        + Agregar línea
      </Boton>
    </>
  );
}

export function ResumenTotales({
  totales,
  descuento,
  setDescuento,
  ivaPorcentaje,
}: {
  totales: { subtotal: number; descuento: number; iva: number; total: number };
  descuento: number;
  setDescuento: (valor: number) => void;
  ivaPorcentaje: number;
}) {
  return (
    <div className="mt-5 flex justify-end border-t border-tinta-100 pt-4">
      <dl className="w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-tinta-500">Subtotal</dt>
          <dd className="font-medium text-tinta-900">{quetzales(totales.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-tinta-500">Descuento (Q)</dt>
          <dd>
            <input
              name="descuento"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value) || 0)}
              className="campo w-28 text-right"
            />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-tinta-500">IVA {ivaPorcentaje}%</dt>
          <dd className="font-medium text-tinta-900">{quetzales(totales.iva)}</dd>
        </div>
        <div className="flex justify-between border-t border-tinta-200 pt-1.5 text-base">
          <dt className="font-semibold text-tinta-900">Total</dt>
          <dd className="font-semibold text-tinta-900">{quetzales(totales.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
