"use client";

import { useEffect } from "react";
import { Boton } from "@/components/ui";

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-tinta-900">Algo salió mal</h1>
      <p className="mt-2 max-w-sm text-sm text-tinta-500">
        Tu información está a salvo. Probá de nuevo; si sigue fallando, escribinos.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-tinta-400">Código de error: {error.digest}</p>
      )}
      <Boton className="mt-6" onClick={reset}>
        Intentar de nuevo
      </Boton>
    </div>
  );
}
