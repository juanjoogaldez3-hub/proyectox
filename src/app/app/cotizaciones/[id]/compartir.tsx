"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Boton, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { enlaceWhatsApp } from "@/lib/gt";
import { compartirCotizacion, revocarEnlace } from "../acciones";

function BotonGenerar() {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending}>
      {pending ? "Generando…" : "Crear enlace para el cliente"}
    </Boton>
  );
}

function BotonRevocar() {
  const { pending } = useFormStatus();
  return (
    <Boton
      type="submit"
      variante="fantasma"
      tamano="sm"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("El enlace dejará de funcionar para quien ya lo tenga. ¿Seguir?")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Revocando…" : "Revocar enlace"}
    </Boton>
  );
}

export function PanelCompartir({
  id,
  token,
  numero,
  total,
  whatsappCliente,
  nombreCliente,
  nombreEmpresa,
  vistaEl,
}: {
  id: string;
  token: string | null;
  numero: number;
  total: string;
  whatsappCliente: string | null;
  nombreCliente: string;
  nombreEmpresa: string;
  vistaEl: string | null;
}) {
  // El origen se toma del navegador: así el enlace sirve igual en localhost,
  // en el dominio propio o detrás de un proxy, sin depender de configuración.
  const [origen, setOrigen] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setOrigen(window.location.origin), []);

  if (!token) {
    return (
      <Tarjeta className="p-4">
        <h2 className="text-sm font-semibold text-tinta-900">Mandásela al cliente</h2>
        <p className="mt-1 text-sm text-tinta-500">
          Se crea un enlace para que la abra desde su celular, sin instalar nada, y pueda
          aceptarla de un clic.
        </p>
        <form action={compartirCotizacion.bind(null, id)} className="mt-3">
          <BotonGenerar />
        </form>
      </Tarjeta>
    );
  }

  const enlace = origen ? `${origen}/c/${token}` : "";
  const mensaje = `Buen día ${nombreCliente.split(" ")[0]}, le comparto la cotización #${numero} de ${nombreEmpresa} por ${total}. La puede ver y aceptar acá: ${enlace}`;
  const whatsapp = enlace ? enlaceWhatsApp(whatsappCliente, mensaje) : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles el usuario todavía puede copiar a mano.
    }
  }

  return (
    <Tarjeta className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-tinta-900">Enlace para el cliente</h2>
        {vistaEl && (
          <span className="text-xs text-tinta-500">El cliente ya la abrió · {vistaEl}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={enlace}
          onFocus={(e) => e.currentTarget.select()}
          className="campo min-w-0 flex-1 font-mono text-xs"
          aria-label="Enlace público de la cotización"
        />
        <Boton type="button" variante="secundario" tamano="sm" onClick={copiar}>
          {copiado ? "¡Copiado!" : "Copiar"}
        </Boton>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Icono nombre="whatsapp" />
            Enviar por WhatsApp
          </a>
        )}
      </div>

      <div className="mt-2">
        <form action={revocarEnlace.bind(null, id)}>
          <BotonRevocar />
        </form>
      </div>
    </Tarjeta>
  );
}
