"use client";

import { useState } from "react";
import { Aviso, Boton, Tarjeta, cx } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";

export function Calificar({ accion }: { accion: (estado: EstadoAccion, datos: FormData) => Promise<EstadoAccion> }) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(accion);
  const [estrellas, setEstrellas] = useState(0);

  if (estado?.ok) {
    return <Aviso tono="exito">¡Gracias por su opinión! Nos ayuda a atenderle mejor.</Aviso>;
  }
  return (
    <Tarjeta className="p-5">
      <form onSubmit={alEnviar} className="space-y-3">
        <h2 className="font-semibold text-tinta-900">¿Cómo le atendimos?</h2>
        {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
        <input type="hidden" name="calificacion" value={estrellas} />
        <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={`${n} de 5`}
              onClick={() => setEstrellas(n)}
              className={cx("text-3xl leading-none", n <= estrellas ? "text-amber-400" : "text-tinta-300")}
            >
              ★
            </button>
          ))}
        </div>
        <textarea name="comentario" rows={2} maxLength={500} className="campo" placeholder="¿Algo que quiera contarnos? (opcional)" />
        <Boton type="submit" disabled={pendiente || estrellas === 0}>
          {pendiente ? "Enviando…" : "Enviar"}
        </Boton>
      </form>
    </Tarjeta>
  );
}
