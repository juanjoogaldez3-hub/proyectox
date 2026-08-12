import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { DIAS_DE_PRUEBA } from "@/lib/planes";
import { FormularioRegistro } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function PaginaRegistro() {
  if (await sesionActual()) redirect("/app");

  return (
    <div className="tarjeta p-6">
      <h1 className="text-lg font-semibold text-tinta-900">Creá tu cuenta</h1>
      <p className="mt-1 text-sm text-tinta-500">
        {DIAS_DE_PRUEBA} días de prueba del plan Emprendedor, sin tarjeta de crédito.
      </p>
      <FormularioRegistro />
      <p className="mt-6 text-center text-sm text-tinta-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-marca-600 hover:underline">
          Ingresá acá
        </Link>
      </p>
    </div>
  );
}
