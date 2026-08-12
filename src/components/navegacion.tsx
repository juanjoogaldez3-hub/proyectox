"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icono, type NombreIcono } from "@/components/iconos";
import { cx } from "@/components/ui";

const SECCIONES: { href: string; texto: string; icono: NombreIcono }[] = [
  { href: "/app", texto: "Resumen", icono: "resumen" },
  { href: "/app/contactos", texto: "Contactos", icono: "contactos" },
  { href: "/app/embudo", texto: "Embudo", icono: "embudo" },
  { href: "/app/actividades", texto: "Actividades", icono: "actividades" },
  { href: "/app/cotizaciones", texto: "Cotizaciones", icono: "cotizaciones" },
  { href: "/app/ventas", texto: "Ventas", icono: "ventas" },
  { href: "/app/productos", texto: "Productos", icono: "productos" },
  { href: "/app/reportes", texto: "Reportes", icono: "reportes" },
  { href: "/app/configuracion", texto: "Configuración", icono: "configuracion" },
];

function estaActiva(pathname: string, href: string): boolean {
  // "/app" solo se marca en la raíz; el resto también con sus subrutas.
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function Enlaces({ alNavegar }: { alNavegar?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {SECCIONES.map((s) => {
        const activa = estaActiva(pathname, s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            onClick={alNavegar}
            aria-current={activa ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              activa
                ? "bg-marca-50 font-medium text-marca-700"
                : "text-tinta-600 hover:bg-tinta-100 hover:text-tinta-900",
            )}
          >
            <Icono nombre={s.icono} />
            {s.texto}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavegacionLateral() {
  return (
    <div className="hidden w-60 shrink-0 border-r border-tinta-200 bg-white lg:block">
      <div className="sticky top-0 p-3">
        <Link
          href="/app"
          className="mb-4 flex items-center gap-2 px-2 py-1 font-semibold text-tinta-900"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-600 text-xs font-bold text-white">
            CC
          </span>
          CRM Chapín
        </Link>
        <Enlaces />
      </div>
    </div>
  );
}

export function NavegacionMovil() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Abrir menú"
        className="rounded-lg border border-tinta-300 p-2 text-tinta-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-tinta-200 bg-white p-3 shadow-lg">
          <Enlaces alNavegar={() => setAbierto(false)} />
        </div>
      )}
    </div>
  );
}
