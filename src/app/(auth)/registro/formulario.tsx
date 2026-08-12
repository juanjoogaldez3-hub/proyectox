"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import { registrar, type EstadoFormulario } from "../acciones";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? "Creando tu cuenta…" : "Crear mi cuenta"}
    </Boton>
  );
}

export function FormularioRegistro() {
  const [estado, accion] = useActionState<EstadoFormulario, FormData>(registrar, null);

  return (
    <form action={accion} className="mt-6 space-y-4">
      {estado?.error && <Aviso tono="peligro">{estado.error}</Aviso>}

      <Campo etiqueta="Nombre de tu negocio">
        <input
          name="empresa"
          required
          className="campo"
          placeholder="Distribuidora El Quetzal"
        />
      </Campo>

      <Campo etiqueta="Tu nombre">
        <input name="nombre" required className="campo" placeholder="María López" />
      </Campo>

      <Campo etiqueta="Correo">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          placeholder="vos@tunegocio.com"
        />
      </Campo>

      <Campo etiqueta="Teléfono / WhatsApp" ayuda="Opcional. Ejemplo: 5555-5555">
        <input
          name="telefono"
          type="tel"
          className="campo"
          placeholder="5555-5555"
          inputMode="tel"
        />
      </Campo>

      <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres.">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="campo"
          placeholder="••••••••"
        />
      </Campo>

      <BotonEnviar />
    </form>
  );
}
