import Link from "next/link";
import { BotonEnlace } from "@/components/ui";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-marca-600">Error 404</p>
      <h1 className="mt-2 text-2xl font-bold text-tinta-900">No encontramos esta página</h1>
      <p className="mt-2 max-w-sm text-sm text-tinta-500">
        Puede que el enlace esté mal o que el registro se haya eliminado.
      </p>
      <div className="mt-6 flex gap-3">
        <BotonEnlace href="/app">Ir a mi CRM</BotonEnlace>
        <Link
          href="/"
          className="self-center text-sm text-tinta-500 hover:text-tinta-900"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
