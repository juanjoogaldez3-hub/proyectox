"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/auth";

/**
 * Deja constancia de que se le escribió al cliente por WhatsApp.
 *
 * Hoy el mensaje sale por wa.me, es decir en la app de WhatsApp del vendedor:
 * el CRM no ve el chat. Pero sí sabe el momento exacto en que se abrió y con
 * quién, y eso ya es lo que hace falta para no volver a preguntar "¿a este
 * cliente ya le escribimos?".
 *
 * Cuando conectemos la API oficial, esta misma actividad se enriquece con el
 * contenido real de la conversación en lugar de reemplazarse.
 */
export async function registrarMensajeWhatsApp(
  contactoId: string,
  oportunidadId: string | null,
  resumen: string,
): Promise<void> {
  const sesion = await sesionActual();
  if (!sesion) return;
  const { empresa, usuario } = sesion;

  const contacto = await prisma.contacto.findFirst({
    where: { id: contactoId, empresaId: empresa.id },
    select: { id: true },
  });
  if (!contacto) return;

  // Se guarda ya completada: la acción ocurrió, no es un pendiente.
  await prisma.actividad.create({
    data: {
      empresaId: empresa.id,
      usuarioId: usuario.id,
      tipo: "WHATSAPP",
      titulo: resumen.slice(0, 140),
      completada: true,
      completadaEl: new Date(),
      contactoId,
      oportunidadId: oportunidadId ?? null,
    },
  });

  revalidatePath(`/app/contactos/${contactoId}`);
  if (oportunidadId) revalidatePath(`/app/embudo/${oportunidadId}`);
}
