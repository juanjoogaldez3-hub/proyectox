import { Plan } from "@prisma/client";

export type DefinicionPlan = {
  id: Plan;
  nombre: string;
  precioMensual: number;
  descripcion: string;
  limites: {
    usuarios: number;
    contactos: number;
    productos: number;
    cotizacionesPorMes: number;
  };
  beneficios: string[];
};

/** `null` no sirve como "ilimitado" en comparaciones; usamos Infinity. */
export const ILIMITADO = Number.POSITIVE_INFINITY;

export const PLANES: Record<Plan, DefinicionPlan> = {
  GRATIS: {
    id: "GRATIS",
    nombre: "Gratis",
    precioMensual: 0,
    descripcion: "Para empezar a ordenar tus clientes sin pagar nada.",
    limites: { usuarios: 1, contactos: 100, productos: 25, cotizacionesPorMes: 10 },
    beneficios: [
      "1 usuario",
      "Hasta 100 contactos",
      "Embudo de ventas completo",
      "Cotizaciones con IVA y envío por WhatsApp",
      "Control básico de inventario",
    ],
  },
  EMPRENDEDOR: {
    id: "EMPRENDEDOR",
    nombre: "Emprendedor",
    precioMensual: 99,
    descripcion: "Para el negocio que ya vende todos los días.",
    limites: { usuarios: 3, contactos: 2000, productos: 500, cotizacionesPorMes: 200 },
    beneficios: [
      "3 usuarios",
      "Hasta 2,000 contactos",
      "Cotizaciones y ventas ilimitadas en la práctica",
      "Inventario con alertas de stock mínimo",
      "Reportes de ventas por mes y por vendedor",
    ],
  },
  NEGOCIO: {
    id: "NEGOCIO",
    nombre: "Negocio",
    precioMensual: 249,
    descripcion: "Para equipos de venta que necesitan control y reportes.",
    limites: {
      usuarios: 10,
      contactos: ILIMITADO,
      productos: ILIMITADO,
      cotizacionesPorMes: ILIMITADO,
    },
    beneficios: [
      "Hasta 10 usuarios",
      "Contactos y productos ilimitados",
      "Historial completo de actividades",
      "Reportes por vendedor y por etapa",
      "Soporte prioritario por WhatsApp",
    ],
  },
};

export const DIAS_DE_PRUEBA = 14;

export type Recurso = keyof DefinicionPlan["limites"];

export function limiteDe(plan: Plan, recurso: Recurso): number {
  return PLANES[plan].limites[recurso];
}

export type SuscripcionDeEmpresa = {
  plan: Plan;
  estadoSuscripcion: string;
  pruebaTermina: Date | null;
  planRenuevaEl: Date | null;
};

/** Un plan de paga solo vale mientras el periodo pagado siga vigente. */
export function suscripcionVigente(empresa: SuscripcionDeEmpresa): boolean {
  if (empresa.estadoSuscripcion !== "ACTIVA") return false;
  // Sin fecha de renovacion la tratamos como vigente: es una cuenta que alguien
  // activo a mano y no queremos cortarle el servicio por un dato faltante.
  if (!empresa.planRenuevaEl) return true;
  return empresa.planRenuevaEl.getTime() > Date.now();
}

export function pruebaVigente(empresa: SuscripcionDeEmpresa): boolean {
  return (
    empresa.estadoSuscripcion === "PRUEBA" &&
    empresa.pruebaTermina !== null &&
    empresa.pruebaTermina.getTime() > Date.now()
  );
}

/**
 * Plan con el que realmente trabaja la cuenta hoy. La prueba da acceso al plan
 * Emprendedor y, cuando la prueba o el periodo pagado se vencen, la empresa cae
 * a los limites del plan Gratis en lugar de quedarse sin acceso.
 */
export function planEfectivo(empresa: SuscripcionDeEmpresa): Plan {
  if (suscripcionVigente(empresa)) return empresa.plan;
  if (pruebaVigente(empresa)) {
    return empresa.plan === "GRATIS" ? "EMPRENDEDOR" : empresa.plan;
  }
  return "GRATIS";
}

/** true cuando la cuenta pagó pero el periodo ya pasó y hay que renovar. */
export function suscripcionSeVencio(empresa: SuscripcionDeEmpresa): boolean {
  if (empresa.estadoSuscripcion === "VENCIDA") return true;
  return empresa.estadoSuscripcion === "ACTIVA" && !suscripcionVigente(empresa);
}

export function diasRestantesDePrueba(pruebaTermina: Date | null): number {
  return diasRestantesHasta(pruebaTermina);
}

export function diasRestantesHasta(fecha: Date | null): number {
  if (!fecha) return 0;
  const ms = fecha.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function formatoLimite(valor: number): string {
  return valor === ILIMITADO ? "Ilimitado" : valor.toLocaleString("es-GT");
}
