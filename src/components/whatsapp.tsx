"use client";

import { Icono } from "@/components/iconos";
import { enlaceWhatsApp } from "@/lib/gt";
import { cx } from "@/components/ui";
import { registrarMensajeWhatsApp } from "@/app/app/acciones-whatsapp";

/**
 * Abre el chat de WhatsApp con el mensaje ya escrito. Se apoya en wa.me, que
 * funciona igual en el celular y en WhatsApp Web.
 *
 * Si se le pasa `contactoId`, además deja la interacción anotada en la ficha
 * del cliente. Así el historial muestra cuándo se le escribió, aunque la
 * conversación viva en el teléfono del vendedor.
 */
export function BotonWhatsApp({
  numero,
  mensaje,
  texto,
  className,
  contactoId,
  oportunidadId,
  resumen,
}: {
  numero: string | null | undefined;
  mensaje?: string;
  texto?: string;
  className?: string;
  contactoId?: string;
  oportunidadId?: string | null;
  resumen?: string;
}) {
  const enlace = enlaceWhatsApp(numero, mensaje);
  if (!enlace) return null;

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      title="Escribir por WhatsApp"
      onClick={() => {
        // Sin `await` y sin cancelar el clic: el chat tiene que abrirse ya. Si
        // el registro falla, se pierde la anotación, nunca el mensaje.
        if (contactoId) {
          void registrarMensajeWhatsApp(
            contactoId,
            oportunidadId ?? null,
            resumen ?? "Le escribiste por WhatsApp",
          );
        }
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100",
        className,
      )}
    >
      <Icono nombre="whatsapp" />
      {texto ?? "WhatsApp"}
    </a>
  );
}
