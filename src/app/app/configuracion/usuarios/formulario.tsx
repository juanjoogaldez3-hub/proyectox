"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo, Tarjeta } from "@/components/ui";
import type { EstadoAccion } from "@/lib/acciones";
import { alternarUsuario, crearUsuario } from "../acciones";

function BotonCrear() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Creando…" : "Agregar usuario"}
    </Boton>
  );
}

export function FormularioUsuario({
  profesionales,
  esClinica,
}: {
  profesionales: { id: string; nombre: string }[];
  esClinica: boolean;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(crearUsuario, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [rol, setRol] = useState("VENDEDOR");

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={enviar}>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Agregar a alguien del equipo</h2>
        <p className="mt-1 text-sm text-tinta-500">
          Le creás la contraseña y se la pasás. Después la puede cambiar desde su cuenta.
        </p>

        <div className="mt-4 space-y-3">
          {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}
          {estado?.ok && <Aviso tono="exito">Usuario creado.</Aviso>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre *">
            <input name="nombre" required className="campo" placeholder="Juan Pérez" />
          </Campo>
          <Campo etiqueta="Correo *">
            <input
              name="email"
              type="email"
              required
              className="campo"
              placeholder="juan@tunegocio.com"
            />
          </Campo>
          <Campo etiqueta="Teléfono">
            <input name="telefono" type="tel" className="campo" placeholder="5555-5555" />
          </Campo>
          <Campo etiqueta="Rol">
            <select name="rol" value={rol} onChange={(e) => setRol(e.target.value)} className="campo">
              <option value="VENDEDOR">
                {esClinica ? "Recepción — agenda y atiende pacientes" : "Vendedor — ve y trabaja sus clientes"}
              </option>
              <option value="MEDICO">Médico — su agenda y el expediente de los pacientes</option>
              <option value="ADMIN">Administrador — configura y ve todo</option>
            </select>
          </Campo>
          {rol === "MEDICO" && (
            <Campo
              etiqueta="¿Qué profesional de la agenda es? *"
              ayuda={profesionales.length === 0 ? "Primero agregalo en Configuración → Profesionales." : undefined}
            >
              <select name="profesionalId" required className="campo">
                <option value="">Elegí…</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo etiqueta="Contraseña temporal *" ayuda="Mínimo 8 caracteres.">
            <input
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="campo"
            />
          </Campo>
        </div>

        <div className="mt-5">
          <BotonCrear />
        </div>
      </Tarjeta>
    </form>
  );
}

function BotonAlternar({ activo }: { activo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante="secundario" tamano="sm" disabled={pending}>
      {pending ? "Guardando…" : activo ? "Desactivar" : "Reactivar"}
    </Boton>
  );
}

export function BotonUsuarioActivo({ id, activo }: { id: string; activo: boolean }) {
  return (
    <form action={alternarUsuario.bind(null, id)}>
      <BotonAlternar activo={activo} />
    </form>
  );
}
