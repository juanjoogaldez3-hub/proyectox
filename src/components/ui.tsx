import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------

const VARIANTES_BOTON = {
  primario: "bg-marca-600 text-white hover:bg-marca-700 border-transparent",
  secundario: "bg-white text-tinta-700 hover:bg-tinta-50 border-tinta-300",
  peligro: "bg-[--color-peligro] text-white hover:opacity-90 border-transparent",
  fantasma: "bg-transparent text-tinta-600 hover:bg-tinta-100 border-transparent",
} as const;

const TAMANOS_BOTON = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

type BotonProps = ComponentProps<"button"> & {
  variante?: keyof typeof VARIANTES_BOTON;
  tamano?: keyof typeof TAMANOS_BOTON;
};

const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Boton({
  variante = "primario",
  tamano = "md",
  className,
  ...props
}: BotonProps) {
  return (
    <button
      className={cx(BASE_BOTON, VARIANTES_BOTON[variante], TAMANOS_BOTON[tamano], className)}
      {...props}
    />
  );
}

type BotonEnlaceProps = ComponentProps<typeof Link> & {
  variante?: keyof typeof VARIANTES_BOTON;
  tamano?: keyof typeof TAMANOS_BOTON;
};

export function BotonEnlace({
  variante = "primario",
  tamano = "md",
  className,
  ...props
}: BotonEnlaceProps) {
  return (
    <Link
      className={cx(BASE_BOTON, VARIANTES_BOTON[variante], TAMANOS_BOTON[tamano], className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------

export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("tarjeta", className)} {...props} />;
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-tinta-500">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

const TONOS_INSIGNIA = {
  neutro: "bg-tinta-100 text-tinta-700",
  marca: "bg-marca-50 text-marca-700",
  exito: "bg-emerald-50 text-emerald-700",
  alerta: "bg-amber-50 text-amber-700",
  peligro: "bg-red-50 text-red-700",
} as const;

export function Insignia({
  tono = "neutro",
  children,
  className,
}: {
  tono?: keyof typeof TONOS_INSIGNIA;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONOS_INSIGNIA[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function Campo({
  etiqueta,
  ayuda,
  children,
  className,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="etiqueta-campo">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-400">{ayuda}</span>}
    </label>
  );
}

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-tinta-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-tinta-700">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-sm text-tinta-500">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Aviso({
  tono = "alerta",
  children,
}: {
  tono?: "alerta" | "peligro" | "exito" | "marca";
  children: ReactNode;
}) {
  const tonos = {
    alerta: "border-amber-200 bg-amber-50 text-amber-800",
    peligro: "border-red-200 bg-red-50 text-red-800",
    exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
    marca: "border-marca-200 bg-marca-50 text-marca-800",
  } as const;
  return (
    <div className={cx("rounded-lg border px-3 py-2 text-sm", tonos[tono])}>{children}</div>
  );
}
