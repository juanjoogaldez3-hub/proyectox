"use client";

import { useEffect, useState } from "react";
import { Boton } from "@/components/ui";

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CLAVE_RECHAZO = "crm_instalacion_rechazada";

/**
 * Registra el service worker y, en Android, ofrece instalar la app.
 *
 * Chrome dispara `beforeinstallprompt` solo cuando la instalacion es posible
 * (hay manifiesto, hay service worker y el sitio va por HTTPS), asi que el
 * boton simplemente no aparece donde no aplica: en iOS o en escritorio no
 * estorba.
 */
export function Instalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la app funciona igual; solo no es instalable.
      });
    }

    function alPoderInstalar(e: Event) {
      // Sin esto Chrome muestra su propia barra, que tapa la interfaz.
      e.preventDefault();
      if (localStorage.getItem(CLAVE_RECHAZO) === "1") return;
      setEvento(e as EventoInstalacion);
    }

    window.addEventListener("beforeinstallprompt", alPoderInstalar);
    window.addEventListener("appinstalled", () => setEvento(null));
    return () => window.removeEventListener("beforeinstallprompt", alPoderInstalar);
  }, []);

  if (!evento) return null;

  return (
    <div className="no-imprimir flex flex-wrap items-center justify-between gap-2 border-b border-marca-200 bg-marca-50 px-4 py-2 text-sm text-marca-800">
      <span>Instalá el CRM en tu teléfono y abrilo como cualquier otra app.</span>
      <div className="flex items-center gap-2">
        <Boton
          tamano="sm"
          onClick={async () => {
            await evento.prompt();
            await evento.userChoice;
            setEvento(null);
          }}
        >
          Instalar
        </Boton>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(CLAVE_RECHAZO, "1");
            setEvento(null);
          }}
          className="rounded px-2 py-1 text-marca-700 hover:bg-marca-100"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
