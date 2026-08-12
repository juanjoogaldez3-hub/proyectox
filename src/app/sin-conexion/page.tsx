import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sin conexión" };

export default function PaginaSinConexion() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-marca-600 text-sm font-bold text-white">
        CC
      </span>
      <h1 className="mt-4 text-xl font-bold text-tinta-900">Te quedaste sin señal</h1>
      <p className="mt-2 max-w-sm text-sm text-tinta-500">
        El CRM necesita internet para mostrarte información al día. Nada de lo que guardaste se
        perdió: en cuanto vuelva la señal, seguí donde ibas.
      </p>
      <p className="mt-6 text-xs text-tinta-400">
        Volvé a cargar la página cuando tengas conexión.
      </p>
    </div>
  );
}
