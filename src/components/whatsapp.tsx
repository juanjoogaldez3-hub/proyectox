import { Icono } from "@/components/iconos";
import { enlaceWhatsApp } from "@/lib/gt";
import { cx } from "@/components/ui";

/**
 * Abre el chat de WhatsApp con el mensaje ya escrito. Se apoya en wa.me, que
 * funciona igual en el celular y en WhatsApp Web.
 */
export function BotonWhatsApp({
  numero,
  mensaje,
  texto,
  className,
}: {
  numero: string | null | undefined;
  mensaje?: string;
  texto?: string;
  className?: string;
}) {
  const enlace = enlaceWhatsApp(numero, mensaje);
  if (!enlace) return null;

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      title="Escribir por WhatsApp"
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
