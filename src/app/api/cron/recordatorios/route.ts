import { procesarRecordatorios } from "@/lib/agenda";
import { mismoSecreto } from "@/lib/secretos";

/**
 * Envía los recordatorios de WhatsApp que ya tocan. Hay que llamarlo cada 5 o
 * 10 minutos desde un cron externo (Vercel Cron, cron-job.org, crontab):
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/recordatorios
 *
 * Vercel Cron manda ese encabezado solo cuando CRON_SECRET está definido.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function ejecutar(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json({ error: "Falta configurar CRON_SECRET." }, { status: 503 });
  }
  const encabezado = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!mismoSecreto(encabezado, secreto)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const resumen = await procesarRecordatorios();
  return Response.json({ ok: true, ...resumen });
}

export const GET = ejecutar;
export const POST = ejecutar;
