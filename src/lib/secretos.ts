import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/** Compara secretos sin filtrar por tiempo de respuesta cuántos caracteres acertó. */
export function mismoSecreto(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
