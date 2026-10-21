import "server-only";

import { prisma } from "@/lib/prisma";
import { descifrar } from "@/lib/cifrado";
import { normalizarTelefono } from "@/lib/gt";

/**
 * Cliente mínimo de la API oficial de WhatsApp (Cloud API de Meta).
 *
 * Cada empresa conecta su propio número de WhatsApp Business: el Phone Number
 * ID y un token de acceso permanente (usuario del sistema) de su cuenta de
 * Meta. Los mensajes que inicia el negocio tienen que usar una plantilla
 * aprobada; el texto libre solo se puede mandar dentro de las 24 horas
 * siguientes a que el paciente escribió.
 */

const VERSION_API = process.env.WHATSAPP_API_VERSION || "v23.0";

export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly codigo?: number,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export type ConfigWhatsApp = {
  phoneNumberId: string;
  token: string;
  plantillaRecordatorio: string;
  plantillaConfirmacion: string | null;
  idiomaPlantilla: string;
  enviarConfirmacion: boolean;
  horasPrimero: number;
  horasSegundo: number;
};

/** Configuración vigente de la empresa, o null si no tiene WhatsApp activo. */
export async function configWhatsApp(empresaId: string): Promise<ConfigWhatsApp | null> {
  const integracion = await prisma.integracionWhatsApp.findUnique({ where: { empresaId } });
  if (!integracion || !integracion.activa) return null;
  return {
    phoneNumberId: integracion.phoneNumberId,
    token: descifrar(integracion.accessTokenCifrado),
    plantillaRecordatorio: integracion.plantillaRecordatorio,
    plantillaConfirmacion: integracion.plantillaConfirmacion,
    idiomaPlantilla: integracion.idiomaPlantilla,
    enviarConfirmacion: integracion.enviarConfirmacion,
    horasPrimero: integracion.horasPrimero,
    horasSegundo: integracion.horasSegundo,
  };
}

type RespuestaMensajes = {
  messages?: { id: string }[];
  error?: { message?: string; code?: number; error_data?: { details?: string } };
};

async function enviar(
  config: Pick<ConfigWhatsApp, "phoneNumberId" | "token">,
  cuerpo: Record<string, unknown>,
): Promise<string> {
  const respuesta = await fetch(
    `https://graph.facebook.com/${VERSION_API}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...cuerpo }),
      cache: "no-store",
    },
  );

  let datos: RespuestaMensajes = {};
  try {
    datos = (await respuesta.json()) as RespuestaMensajes;
  } catch {
    // Respuesta sin JSON: se reporta con el código HTTP.
  }
  if (!respuesta.ok || datos.error) {
    const detalle = datos.error?.error_data?.details ?? datos.error?.message;
    throw new WhatsAppError(
      detalle ? `WhatsApp: ${detalle}` : `WhatsApp respondió ${respuesta.status}`,
      datos.error?.code,
    );
  }
  const id = datos.messages?.[0]?.id;
  if (!id) throw new WhatsAppError("WhatsApp no devolvió el identificador del mensaje.");
  return id;
}

function destino(telefono: string): string {
  const numero = normalizarTelefono(telefono);
  if (!numero) throw new WhatsAppError("El número de WhatsApp del paciente no es válido.");
  return numero;
}

/** Envía una plantilla aprobada con parámetros de texto en el cuerpo. Devuelve el wamid. */
export async function enviarPlantilla(
  config: Pick<ConfigWhatsApp, "phoneNumberId" | "token">,
  datos: { para: string; plantilla: string; idioma: string; parametros: string[] },
): Promise<string> {
  return enviar(config, {
    to: destino(datos.para),
    type: "template",
    template: {
      name: datos.plantilla,
      language: { code: datos.idioma },
      components: datos.parametros.length
        ? [
            {
              type: "body",
              // WhatsApp rechaza saltos de línea y tabulaciones en los parámetros.
              parameters: datos.parametros.map((p) => ({
                type: "text",
                text: p.replace(/[\n\t]+/g, " ").replace(/ {5,}/g, "    "),
              })),
            },
          ]
        : [],
    },
  });
}

/** Texto libre: solo vale dentro de la ventana de 24 h de atención al cliente. */
export async function enviarTexto(
  config: Pick<ConfigWhatsApp, "phoneNumberId" | "token">,
  datos: { para: string; texto: string },
): Promise<string> {
  return enviar(config, {
    to: destino(datos.para),
    type: "text",
    text: { body: datos.texto, preview_url: true },
  });
}

/**
 * Comprueba que el Phone Number ID y el token sirvan, antes de guardarlos.
 * Devuelve el número tal como lo muestra Meta y el nombre verificado.
 */
export async function verificarNumero(
  config: Pick<ConfigWhatsApp, "phoneNumberId" | "token">,
): Promise<{ numero: string | null; nombre: string | null }> {
  const respuesta = await fetch(
    `https://graph.facebook.com/${VERSION_API}/${encodeURIComponent(config.phoneNumberId)}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${config.token}` }, cache: "no-store" },
  );
  const datos = (await respuesta.json().catch(() => ({}))) as {
    display_phone_number?: string;
    verified_name?: string;
    error?: { message?: string };
  };
  if (!respuesta.ok || datos.error) {
    throw new WhatsAppError(
      `Meta rechazó los datos: ${datos.error?.message ?? `respuesta ${respuesta.status}`}`,
    );
  }
  return { numero: datos.display_phone_number ?? null, nombre: datos.verified_name ?? null };
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export type EventoEstado = {
  phoneNumberId: string;
  mensajeId: string;
  estado: "sent" | "delivered" | "read" | "failed" | string;
  error?: string;
};

export type EventoMensaje = {
  phoneNumberId: string;
  de: string;
  texto: string;
  // wamid del mensaje al que el paciente respondió (si usó "Responder").
  respondeA?: string;
};

type CuerpoWebhook = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: {
          id: string;
          status: string;
          errors?: { title?: string; message?: string; error_data?: { details?: string } }[];
        }[];
        messages?: {
          from: string;
          type: string;
          text?: { body?: string };
          button?: { text?: string; payload?: string };
          interactive?: {
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
          context?: { id?: string };
        }[];
      };
    }[];
  }[];
};

/** Aplana el JSON anidado del webhook de Meta en eventos simples. */
export function leerWebhook(cuerpo: unknown): { estados: EventoEstado[]; mensajes: EventoMensaje[] } {
  const estados: EventoEstado[] = [];
  const mensajes: EventoMensaje[] = [];

  for (const entrada of (cuerpo as CuerpoWebhook)?.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value;
      const phoneNumberId = valor?.metadata?.phone_number_id;
      if (!valor || !phoneNumberId) continue;

      for (const s of valor.statuses ?? []) {
        const e = s.errors?.[0];
        estados.push({
          phoneNumberId,
          mensajeId: s.id,
          estado: s.status,
          error: e ? (e.error_data?.details ?? e.message ?? e.title) : undefined,
        });
      }

      for (const m of valor.messages ?? []) {
        const texto =
          m.text?.body ??
          m.button?.payload ??
          m.button?.text ??
          m.interactive?.button_reply?.id ??
          m.interactive?.button_reply?.title ??
          m.interactive?.list_reply?.title ??
          "";
        mensajes.push({ phoneNumberId, de: m.from, texto, respondeA: m.context?.id });
      }
    }
  }

  return { estados, mensajes };
}

/**
 * Interpreta la respuesta del paciente al recordatorio. Se queda en lo obvio
 * a propósito: ante la duda, no se toca la cita y el mensaje queda en el
 * historial para que la recepción lo lea.
 */
export function interpretarRespuesta(texto: string): "confirmar" | "cancelar" | null {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpio) return null;
  if (["1", "si", "confirmo", "confirmar", "confirmada", "confirmado", "si confirmo"].includes(limpio)) {
    return "confirmar";
  }
  if (/^(si )?confirm/.test(limpio) || limpio === "ok" || limpio === "si asistire") return "confirmar";
  if (["2", "cancelar", "cancelo", "cancela", "no puedo", "no asistire"].includes(limpio)) {
    return "cancelar";
  }
  if (/^cancel/.test(limpio)) return "cancelar";
  return null;
}
