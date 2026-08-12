import "server-only";

import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ILIMITADO, PLANES, type Recurso, formatoLimite } from "@/lib/planes";

/** Error que la interfaz muestra como aviso de plan, no como falla del sistema. */
export class LimitePlanError extends Error {
  constructor(
    message: string,
    readonly recurso: Recurso,
  ) {
    super(message);
    this.name = "LimitePlanError";
  }
}

async function usoActual(empresaId: string, recurso: Recurso): Promise<number> {
  switch (recurso) {
    case "usuarios":
      return prisma.usuario.count({ where: { empresaId, activo: true } });
    case "contactos":
      return prisma.contacto.count({ where: { empresaId } });
    case "productos":
      return prisma.producto.count({ where: { empresaId, activo: true } });
    case "cotizacionesPorMes": {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      return prisma.cotizacion.count({
        where: { empresaId, creadoEl: { gte: inicioMes } },
      });
    }
  }
}

const ETIQUETA: Record<Recurso, string> = {
  usuarios: "usuarios",
  contactos: "contactos",
  productos: "productos",
  cotizacionesPorMes: "cotizaciones este mes",
};

/**
 * Se llama antes de crear el registro. Lanza `LimitePlanError` si la empresa
 * ya llego al tope de su plan.
 */
export async function verificarLimite(
  empresaId: string,
  plan: Plan,
  recurso: Recurso,
): Promise<void> {
  const limite = PLANES[plan].limites[recurso];
  if (limite === ILIMITADO) return;

  const usado = await usoActual(empresaId, recurso);
  if (usado >= limite) {
    throw new LimitePlanError(
      `Tu plan ${PLANES[plan].nombre} permite ${formatoLimite(limite)} ${ETIQUETA[recurso]}. ` +
        `Mejorá tu plan para seguir agregando.`,
      recurso,
    );
  }
}

export async function resumenDeUso(empresaId: string, plan: Plan) {
  const recursos: Recurso[] = ["usuarios", "contactos", "productos", "cotizacionesPorMes"];
  const conteos = await Promise.all(recursos.map((r) => usoActual(empresaId, r)));
  return recursos.map((recurso, i) => {
    const limite = PLANES[plan].limites[recurso];
    const usado = conteos[i];
    return {
      recurso,
      etiqueta: ETIQUETA[recurso],
      usado,
      limite,
      porcentaje: limite === ILIMITADO ? 0 : Math.min(100, Math.round((usado / limite) * 100)),
    };
  });
}
