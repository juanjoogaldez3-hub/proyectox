import "server-only";

import { z } from "zod";
import { LimitePlanError } from "@/lib/limites";

export type EstadoAccion = { error?: string; ok?: boolean } | null;

/**
 * Traduce cualquier falla a un mensaje que el usuario pueda entender.
 * `redirect()` de Next lanza una excepcion propia: hay que dejarla pasar.
 */
export function comoError(e: unknown): EstadoAccion {
  if (
    e &&
    typeof e === "object" &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_")
  ) {
    throw e;
  }
  if (e instanceof LimitePlanError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues[0].message };
  if (e instanceof Error) return { error: e.message };
  return { error: "No se pudo completar la operación. Intentá de nuevo." };
}

/** Convierte "" en undefined para que los campos opcionales no guarden vacíos. */
export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const numeroDeFormulario = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  });

export const fechaOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : new Date(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "La fecha no es válida.");
