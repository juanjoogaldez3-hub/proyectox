"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import { DEPARTAMENTOS, mostrarNit, mostrarTelefono } from "@/lib/gt";
import type { EstadoAccion } from "@/lib/acciones";
import { actualizarEmpresa, cambiarPassword } from "./acciones";

function BotonGuardar({ texto = "Guardar cambios" }: { texto?: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </Boton>
  );
}

export function FormularioEmpresa({
  valores,
}: {
  valores: {
    nombre: string;
    nit: string | null;
    telefono: string | null;
    direccion: string | null;
    departamento: string | null;
    municipio: string | null;
    ivaPorcentaje: number;
  };
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(actualizarEmpresa, null);

  return (
    <form action={enviar}>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Datos de tu negocio</h2>
        <p className="mt-1 text-sm text-tinta-500">
          Aparecen en tus cotizaciones y comprobantes de venta.
        </p>

        <div className="mt-4 space-y-3">
          {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
          {estado?.ok && <Aviso tono="exito">Datos guardados.</Aviso>}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del negocio *" className="sm:col-span-2">
            <input name="nombre" required defaultValue={valores.nombre} className="campo" />
          </Campo>
          <Campo etiqueta="NIT">
            <input
              name="nit"
              defaultValue={mostrarNit(valores.nit)}
              className="campo"
              placeholder="1234567-8"
            />
          </Campo>
          <Campo etiqueta="Teléfono">
            <input
              name="telefono"
              type="tel"
              defaultValue={mostrarTelefono(valores.telefono)}
              className="campo"
              placeholder="5555-5555"
            />
          </Campo>
          <Campo etiqueta="Dirección" className="sm:col-span-2">
            <input
              name="direccion"
              defaultValue={valores.direccion ?? ""}
              className="campo"
              placeholder="5a calle 3-20 zona 1"
            />
          </Campo>
          <Campo etiqueta="Departamento">
            <select
              name="departamento"
              defaultValue={valores.departamento ?? ""}
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
            <input name="municipio" defaultValue={valores.municipio ?? ""} className="campo" />
          </Campo>
          <Campo
            etiqueta="IVA (%)"
            ayuda="En Guatemala el IVA general es 12%. Cambialo solo si tu caso es distinto."
          >
            <input
              name="ivaPorcentaje"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={valores.ivaPorcentaje}
              className="campo"
            />
          </Campo>
        </div>

        <div className="mt-5">
          <BotonGuardar />
        </div>
      </Tarjeta>
    </form>
  );
}

export function FormularioPassword({ nombre, email }: { nombre: string; email: string }) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(cambiarPassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={enviar}>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Mi cuenta</h2>
        <p className="mt-1 text-sm text-tinta-500">
          {nombre} · {email}
        </p>

        <div className="mt-4 space-y-3">
          {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
          {estado?.ok && <Aviso tono="exito">Contraseña actualizada.</Aviso>}
        </div>

        <div className="mt-4 max-w-sm">
          <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres.">
            <input
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="campo"
              placeholder="••••••••"
            />
          </Campo>
        </div>

        <div className="mt-4">
          <BotonGuardar texto="Cambiar contraseña" />
        </div>
      </Tarjeta>
    </form>
  );
}
