import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Bitácora del expediente: quién lo abrió y quién escribió. Las aperturas se
 * anotan una vez cada 15 minutos por persona para que recargar la página no
 * llene la bitácora; lo que se escribe se anota siempre.
 */
export async function registrarAccesoExpediente(
  empresaId: string,
  contactoId: string,
  usuarioId: string,
  accion: string,
  siempre = false,
): Promise<void> {
  if (!siempre) {
    const reciente = await prisma.accesoExpediente.findFirst({
      where: {
        empresaId,
        contactoId,
        usuarioId,
        creadoEl: { gt: new Date(Date.now() - 15 * 60_000) },
      },
      select: { id: true },
    });
    if (reciente) return;
  }
  await prisma.accesoExpediente.create({ data: { empresaId, contactoId, usuarioId, accion } });
}
