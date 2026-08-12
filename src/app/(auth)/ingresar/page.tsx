import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { Aviso } from "@/components/ui";
import { FormularioIngreso } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{ restablecida?: string }>;
}) {
  if (await sesionActual()) redirect("/app");
  const { restablecida } = await searchParams;

  return (
    <div className="tarjeta p-6">
      <h1 className="text-lg font-semibold text-tinta-900">Ingresá a tu cuenta</h1>
      <p className="mt-1 text-sm text-tinta-500">
        Bienvenido de vuelta. Seguí donde te quedaste.
      </p>

      {restablecida && (
        <div className="mt-4">
          <Aviso tono="exito">
            Tu contraseña quedó cambiada. Ingresá con la nueva.
          </Aviso>
        </div>
      )}

      <FormularioIngreso />

      <p className="mt-4 text-center text-sm">
        <Link href="/recuperar" className="text-tinta-500 hover:text-tinta-900">
          Olvidé mi contraseña
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-tinta-500">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-marca-600 hover:underline">
          Creála gratis
        </Link>
      </p>
    </div>
  );
}
