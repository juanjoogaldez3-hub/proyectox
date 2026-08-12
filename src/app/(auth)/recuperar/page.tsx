import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <div className="tarjeta p-6">
      <h1 className="text-lg font-semibold text-tinta-900">¿Olvidaste tu contraseña?</h1>
      <p className="mt-1 text-sm text-tinta-500">
        Escribí tu correo y te mandamos un enlace para elegir una nueva.
      </p>
      <FormularioRecuperar />
      <p className="mt-6 text-center text-sm text-tinta-500">
        <Link href="/ingresar" className="font-medium text-marca-600 hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
