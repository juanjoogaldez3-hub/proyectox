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

const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Depósito",
  "Tarjeta",
  "Cheque",
  "Crédito",
];

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar venta"}
    </Boton>
  );
}

export function FormularioVenta({
  accion,
  contactos,
  productos,
  ivaPorcentaje,
  contactoInicial,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  contactos: { id: string; nombre: string; negocio: string | null; nit: string | null }[];
  productos: OpcionProducto[];
  ivaPorcentaje: number;
  contactoInicial?: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [descuento, setDescuento] = useState(0);
  const [contactoId, setContactoId] = useState(contactoInicial ?? "");

  const totales = useMemo(
    () => calcularTotales(lineas, { descuento, ivaPorcentaje }),
    [lineas, descuento, ivaPorcentaje],
  );

  const contacto = contactos.find((c) => c.id === contactoId);

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
                value={contactoId}
                onChange={(e) => setContactoId(e.target.value)}
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

          <Campo etiqueta="Método de pago">
            <select name="metodoPago" defaultValue="Efectivo" className="campo">
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Estado del pago">
            <select name="estado" defaultValue="PAGADA" className="campo">
              <option value="PAGADA">Ya me pagaron</option>
              <option value="PENDIENTE">Queda pendiente</option>
            </select>
          </Campo>

          <Campo etiqueta="NIT para factura" ayuda="CF si es consumidor final.">
            {/* `key` fuerza a React a re-crear el input cuando cambia el cliente,
                para que tome el NIT del contacto recién elegido. */}
            <input
              key={contactoId}
              name="nitCliente"
              defaultValue={contacto?.nit ?? "CF"}
              className="campo"
              placeholder="CF"
            />
          </Campo>

          <Campo etiqueta="Nombre para la factura" className="sm:col-span-2">
            <input
              key={`factura-${contactoId}`}
              name="nombreFactura"
              defaultValue={contacto?.nombre ?? ""}
              className="campo"
              placeholder="Consumidor Final"
            />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-tinta-900">¿Qué vendiste?</h2>
        <EditorLineas lineas={lineas} setLineas={setLineas} productos={productos} />
        <ResumenTotales
          totales={totales}
          descuento={descuento}
          setDescuento={setDescuento}
          ivaPorcentaje={ivaPorcentaje}
        />
        <p className="mt-3 text-xs text-tinta-500">
          Los productos con control de inventario se descuentan al guardar.
        </p>
      </Tarjeta>

      <Tarjeta className="p-5">
        <Campo etiqueta="Notas">
          <textarea
            name="notas"
            rows={2}
            className="campo"
            placeholder="Entregado en la tienda, pendiente factura."
          />
        </Campo>
      </Tarjeta>

      <div className="flex items-center gap-3">
        <BotonGuardar />
        <Link href="/app/ventas" className="text-sm text-tinta-500 hover:text-tinta-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
