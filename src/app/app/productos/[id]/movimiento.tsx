"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";

const TIPOS = [
  { valor: "ENTRADA", texto: "Entrada (me llegó mercadería)" },
  { valor: "SALIDA", texto: "Salida (salió sin venta registrada)" },
  { valor: "AJUSTE", texto: "Ajuste (dejar el stock en…)" },
];

function BotonRegistrar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" tamano="sm" className="w-full" disabled={pending}>
      {pending ? "Registrando…" : "Registrar movimiento"}
    </Boton>
  );
}

export function FormularioMovimiento({
  accion,
  stockActual,
}: {
  accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  stockActual: number;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(accion, null);
  const [tipo, setTipo] = useState("ENTRADA");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={enviar} className="space-y-3">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
      {estado?.ok && <Aviso tono="exito">Movimiento registrado.</Aviso>}

      <Campo etiqueta="Tipo">
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="campo"
        >
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        etiqueta={tipo === "AJUSTE" ? "Dejar el stock en" : "Cantidad"}
        ayuda={tipo === "AJUSTE" ? `Hoy tenés ${stockActual}.` : undefined}
      >
        <input
          name="cantidad"
          type="number"
          step="1"
          min="0"
          required
          inputMode="numeric"
          className="campo"
          placeholder="0"
        />
      </Campo>

      <Campo etiqueta="Motivo">
        <input
          name="motivo"
          className="campo"
          placeholder={tipo === "AJUSTE" ? "Conteo físico" : "Compra a proveedor"}
        />
      </Campo>

      <BotonRegistrar />
    </form>
  );
}
