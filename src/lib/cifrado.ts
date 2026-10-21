import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado simétrico para los tokens de Google y de WhatsApp que guardamos en la
 * base. Si alguien obtiene un respaldo de la base no puede usarlos sin la llave.
 *
 * La llave sale de CIFRADO_SECRETO o, si no está, de AUTH_SECRET. Cambiar esa
 * variable deja ilegibles los tokens guardados: habría que reconectar Google y
 * volver a pegar el token de WhatsApp.
 */

const VERSION = "v1";

function llave(): Buffer {
  const secreto = process.env.CIFRADO_SECRETO || process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error("Falta CIFRADO_SECRETO o AUTH_SECRET para cifrar las integraciones.");
  }
  return createHash("sha256").update(`crm-chapin:cifrado:${secreto}`).digest();
}

/** AES-256-GCM. Devuelve "v1.iv.etiqueta.datos" en base64url. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", llave(), iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return [VERSION, iv, etiqueta, datos]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function descifrar(paquete: string): string {
  const [version, iv, etiqueta, datos] = paquete.split(".");
  if (version !== VERSION || !iv || !etiqueta || !datos) {
    throw new Error("El dato cifrado no tiene el formato esperado.");
  }
  const descifrador = createDecipheriv("aes-256-gcm", llave(), Buffer.from(iv, "base64url"));
  descifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));
  return Buffer.concat([
    descifrador.update(Buffer.from(datos, "base64url")),
    descifrador.final(),
  ]).toString("utf8");
}
