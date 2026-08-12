"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Plan } from "@prisma/client";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { PLANES } from "@/lib/planes";
import { quetzales } from "@/lib/gt";
import type { EstadoAccion } from "@/lib/acciones";
import { registrarPago } from "../acciones";

const METODOS = ["Depósito bancario", "Transferencia", "Efectivo", "Tarjeta"];

function BotonRegistrar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar pago y activar"}
    </Boton>
  );
}

export function FormularioPago({ planActual }: { planActual: Plan }) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(registrarPago, null);
  const [plan, setPlan] = useState<Plan>(planActual === "GRATIS" ? "EMPRENDEDOR" : planActual);
  const [meses, setMeses] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  const total = PLANES[plan].precioMensual * meses;

  return (
    <form ref={formRef} action={enviar}>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Activar o renovar tu plan</h2>
        <p className="mt-1 text-sm text-tinta-500">
          Hacé el depósito o la transferencia y registrá acá el comprobante para activar la
          cuenta.
        </p>

        <div className="mt-4 space-y-3">
          {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
          {estado?.ok && <Aviso tono="exito">Pago registrado. Tu plan quedó activo.</Aviso>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Plan">
            <select
              name="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
              className="campo"
            >
              {Object.values(PLANES)
                .filter((p) => p.precioMensual > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {quetzales(p.precioMensual)}/mes
                  </option>
                ))}
            </select>
          </Campo>

          <Campo etiqueta="Meses a pagar">
            <input
              name="meses"
              type="number"
              min="1"
              max="24"
              step="1"
              value={meses}
              onChange={(e) => setMeses(Math.max(1, Number(e.target.value) || 1))}
              className="campo"
            />
          </Campo>

          <Campo etiqueta="Método de pago">
            <select name="metodo" defaultValue={METODOS[0]} className="campo">
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="No. de boleta o referencia">
            <input name="referencia" className="campo" placeholder="Ej. 4471829" />
          </Campo>
        </div>

        <p className="mt-4 rounded-lg bg-tinta-50 px-3 py-2 text-sm text-tinta-700">
          Total a pagar: <strong>{quetzales(total)}</strong> por {meses} mes
          {meses === 1 ? "" : "es"} del plan {PLANES[plan].nombre}.
        </p>

        <div className="mt-4">
          <BotonRegistrar />
        </div>
      </Tarjeta>
    </form>
  );
}
