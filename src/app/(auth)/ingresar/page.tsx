import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { FormularioIngreso } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaIngresar() {
  if (await sesionActual()) redirect("/app");

  return (
    <div className="tarjeta p-6">
      <h1 className="text-lg font-semibold text-tinta-900">Ingresá a tu cuenta</h1>
      <p className="mt-1 text-sm text-tinta-500">
        Bienvenido de vuelta. Seguí donde te quedaste.
      </p>
      <FormularioIngreso />
      <p className="mt-6 text-center text-sm text-tinta-500">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-marca-600 hover:underline">
          Creála gratis
        </Link>
      </p>
    </div>
  );
}
