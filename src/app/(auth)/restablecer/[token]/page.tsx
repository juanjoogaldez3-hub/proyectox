import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRestablecer } from "./formulario";
import { restablecerPassword } from "../../recuperar/acciones";

export const metadata: Metadata = { title: "Elegir nueva contraseña" };

export default async function PaginaRestablecer({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="tarjeta p-6">
      <h1 className="text-lg font-semibold text-tinta-900">Elegí tu nueva contraseña</h1>
      <p className="mt-1 text-sm text-tinta-500">
        Después de guardarla vas a poder ingresar con ella.
      </p>
      {/* El token no se valida acá a propósito: hacerlo delataría cuáles
          existen. La acción responde igual para uno inválido o vencido. */}
      <FormularioRestablecer accion={restablecerPassword.bind(null, token)} />
      <p className="mt-6 text-center text-sm text-tinta-500">
        <Link href="/recuperar" className="font-medium text-marca-600 hover:underline">
          Pedir otro enlace
        </Link>
      </p>
    </div>
  );
}
