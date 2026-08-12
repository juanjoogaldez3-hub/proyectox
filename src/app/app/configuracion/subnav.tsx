"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const SECCIONES = [
  { href: "/app/configuracion", texto: "Mi negocio" },
  { href: "/app/configuracion/usuarios", texto: "Usuarios" },
  { href: "/app/configuracion/embudo", texto: "Embudo" },
  { href: "/app/configuracion/plan", texto: "Plan y pagos" },
];

export function SubnavConfiguracion() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-tinta-200 pb-3">
      {SECCIONES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm",
            pathname === s.href
              ? "bg-marca-50 font-medium text-marca-700"
              : "text-tinta-600 hover:bg-tinta-100",
          )}
        >
          {s.texto}
        </Link>
      ))}
    </nav>
  );
}
