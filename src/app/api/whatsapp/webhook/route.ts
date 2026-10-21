import { createHmac } from "node:crypto";
import { procesarWebhookWhatsApp } from "@/lib/agenda";
import { mismoSecreto } from "@/lib/secretos";

/**
 * Webhook de la app de Meta. Recibe los avisos de entregado/leído de cada
 * recordatorio y las respuestas de los pacientes ("1" confirma, "2" cancela).
 *
 * En la app de Meta: WhatsApp → Configuración → Webhook
 *   URL:              https://tu-dominio/api/whatsapp/webhook
 *   Token de verificación: el valor de WHATSAPP_VERIFY_TOKEN
 *   Campos:           messages
 */

export const dynamic = "force-dynamic";

/** Verificación inicial que hace Meta al registrar el webhook. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const reto = url.searchParams.get("hub.challenge");

  if (modo === "subscribe" && mismoSecreto(token, process.env.WHATSAPP_VERIFY_TOKEN) && reto) {
    return new Response(reto, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Token de verificación inválido", { status: 403 });
}

export async function POST(request: Request) {
  const crudo = await request.text();

  // Meta firma cada envío con el App Secret. Sin firma válida no se procesa:
  // cualquiera podría confirmar o cancelar citas mandando JSON a esta URL.
  const secretoApp = process.env.WHATSAPP_APP_SECRET;
  if (!secretoApp) {
    console.error("WhatsApp webhook: falta WHATSAPP_APP_SECRET; se ignoró el envío.");
    return new Response("Webhook sin configurar", { status: 503 });
  }
  const firma = request.headers.get("x-hub-signature-256");
  const esperada = `sha256=${createHmac("sha256", secretoApp).update(crudo).digest("hex")}`;
  if (!mismoSecreto(firma, esperada)) {
    return new Response("Firma inválida", { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  try {
    await procesarWebhookWhatsApp(cuerpo);
  } catch (e) {
    // Respondemos 200 igual: si devolvemos error, Meta reintenta el mismo
    // envío durante horas y el problema no se arregla reintentando.
    console.error("WhatsApp webhook:", e);
  }
  return new Response("ok", { status: 200 });
}
