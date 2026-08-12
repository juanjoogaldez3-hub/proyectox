/**
 * Utilidades especificas de Guatemala: quetzales, IVA, NIT, telefonos y
 * division politica. Todo lo que sea "local" vive aqui para no regarlo
 * por toda la app.
 */

export const CODIGO_PAIS = "502";
export const IVA_GUATEMALA = 12;

const formatoQuetzales = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Q1,234.56 */
export function quetzales(monto: number | string | null | undefined): string {
  return formatoQuetzales.format(aNumero(monto));
}

const formatoQuetzalesEnteros = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Q21,063 — para cifras de resumen, donde los centavos no aportan y en cambio
 * hacen que el número se salga de su tarjeta. El monto exacto siempre queda
 * en la tabla o en el documento.
 */
export function quetzalesCorto(monto: number | string | null | undefined): string {
  const n = aNumero(monto);
  return Math.abs(n) >= 1000 ? formatoQuetzalesEnteros.format(n) : formatoQuetzales.format(n);
}

/** 1,234.56 (sin simbolo, para tablas y PDFs) */
export function numero(monto: number | string | null | undefined): string {
  return formatoNumero.format(aNumero(monto));
}

/** Prisma devuelve Decimal; los componentes solo pueden recibir numeros planos. */
export function aNumero(valor: unknown): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const n = Number(valor.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Redondea a centavos para que las sumas no arrastren decimales fantasma. */
export function redondear(monto: number): number {
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}

export function calcularTotales(
  lineas: { cantidad: number; precioUnitario: number }[],
  opciones: { descuento?: number; ivaPorcentaje?: number } = {},
) {
  const { descuento = 0, ivaPorcentaje = IVA_GUATEMALA } = opciones;
  const subtotal = redondear(
    lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0),
  );
  const descuentoAplicado = redondear(Math.min(Math.max(descuento, 0), subtotal));
  const base = redondear(subtotal - descuentoAplicado);
  const iva = redondear((base * ivaPorcentaje) / 100);
  return { subtotal, descuento: descuentoAplicado, iva, total: redondear(base + iva) };
}

// ---------------------------------------------------------------------------
// Telefonos y WhatsApp
// ---------------------------------------------------------------------------

/**
 * Deja el numero en formato internacional sin signos (502XXXXXXXX), que es lo
 * que necesita wa.me. Acepta "5555-5555", "+502 5555 5555", "50255555555".
 */
export function normalizarTelefono(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length === 8) return `${CODIGO_PAIS}${digitos}`;
  if (digitos.length === 11 && digitos.startsWith(CODIGO_PAIS)) return digitos;
  // Numeros de otros paises se guardan tal cual si traen largo razonable.
  if (digitos.length >= 10 && digitos.length <= 15) return digitos;
  return null;
}

/** 5555-5555 para numeros locales; el resto se muestra con + adelante. */
export function mostrarTelefono(numeroTel: string | null | undefined): string {
  if (!numeroTel) return "";
  const digitos = numeroTel.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith(CODIGO_PAIS)) {
    const local = digitos.slice(3);
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  if (digitos.length === 8) return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
  return `+${digitos}`;
}

export function enlaceWhatsApp(
  numeroTel: string | null | undefined,
  mensaje?: string,
): string | null {
  const normalizado = normalizarTelefono(numeroTel);
  if (!normalizado) return null;
  const base = `https://wa.me/${normalizado}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

// ---------------------------------------------------------------------------
// NIT
// ---------------------------------------------------------------------------

/** Quita guiones y espacios y pasa la K a mayuscula. */
export function normalizarNit(nit: string | null | undefined): string | null {
  if (!nit) return null;
  const limpio = nit.replace(/[\s-]/g, "").toUpperCase();
  return limpio || null;
}

/**
 * Verifica el digito verificador del NIT con el modulo 11 que usa la SAT.
 * Se usa como advertencia en la interfaz, nunca para bloquear: hay NITs
 * antiguos y casos especiales que conviene poder guardar igual.
 */
export function nitValido(nit: string | null | undefined): boolean {
  const limpio = normalizarNit(nit);
  if (!limpio) return false;
  if (limpio === "CF") return true; // consumidor final
  if (!/^\d+[\dK]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const verificador = limpio.slice(-1);
  let suma = 0;
  let factor = cuerpo.length + 1;
  for (const digito of cuerpo) {
    suma += Number(digito) * factor;
    factor -= 1;
  }
  const resto = (11 - (suma % 11)) % 11;
  const esperado = resto === 10 ? "K" : String(resto);
  return esperado === verificador;
}

/** 1234567-8 */
export function mostrarNit(nit: string | null | undefined): string {
  const limpio = normalizarNit(nit);
  if (!limpio) return "";
  if (limpio === "CF") return "CF";
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

// ---------------------------------------------------------------------------
// Division politica
// ---------------------------------------------------------------------------

export const DEPARTAMENTOS = [
  "Alta Verapaz",
  "Baja Verapaz",
  "Chimaltenango",
  "Chiquimula",
  "El Progreso",
  "Escuintla",
  "Guatemala",
  "Huehuetenango",
  "Izabal",
  "Jalapa",
  "Jutiapa",
  "Petén",
  "Quetzaltenango",
  "Quiché",
  "Retalhuleu",
  "Sacatepéquez",
  "San Marcos",
  "Santa Rosa",
  "Sololá",
  "Suchitepéquez",
  "Totonicapán",
  "Zacapa",
] as const;

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Guatemala",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Guatemala",
});

export function fecha(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  return formatoFecha.format(new Date(valor));
}

/**
 * Guatemala está en UTC-6 y no cambia de hora: no hay horario de verano desde
 * 2006. Eso permite calcular los cortes de día y de mes con aritmética simple
 * en vez de arrastrar una librería de zonas horarias.
 *
 * Importa porque el servidor casi siempre corre en UTC: sin esto, "este mes"
 * empieza a las 6 de la tarde del último día del mes anterior, hora local.
 */
export const HORAS_DETRAS_DE_UTC = 6;

export const ZONA_GT = "America/Guatemala";

const partesGT = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_GT,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Año, mes (0-11) y día que son "hoy" en Guatemala, sin importar el servidor. */
export function hoyEnGuatemala(referencia: Date = new Date()): {
  ano: number;
  mes: number;
  dia: number;
} {
  const [ano, mes, dia] = partesGT.format(referencia).split("-").map(Number);
  return { ano, mes: mes - 1, dia };
}

/** Instante exacto en que empieza ese día en Guatemala. */
export function inicioDelDiaGT(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes, dia, HORAS_DETRAS_DE_UTC, 0, 0, 0));
}

/** Instante en que arrancó el mes actual en Guatemala. */
export function inicioDelMesGT(referencia: Date = new Date()): Date {
  const { ano, mes } = hoyEnGuatemala(referencia);
  return inicioDelDiaGT(ano, mes, 1);
}

/** Instante en que arrancó el día de hoy en Guatemala. */
export function inicioDeHoyGT(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = hoyEnGuatemala(referencia);
  return inicioDelDiaGT(ano, mes, dia);
}

/** Último instante del día de hoy en Guatemala. */
export function finDeHoyGT(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = hoyEnGuatemala(referencia);
  return new Date(inicioDelDiaGT(ano, mes, dia + 1).getTime() - 1);
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Nombre corto de un mes a partir de sus componentes de calendario. No pasa por
 * una zona horaria porque un mes es una casilla del calendario, no un instante:
 * convertirlo lo correría de casilla.
 */
export function nombreDeMes(mes: number): string {
  return MESES_CORTOS[((mes % 12) + 12) % 12];
}

export function fechaHora(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  return formatoFechaHora.format(new Date(valor));
}

/** "hace 3 días", "en 2 horas" — para listas de actividades. */
export function tiempoRelativo(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  const destino = new Date(valor).getTime();
  const diffMs = destino - Date.now();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const minutos = Math.round(diffMs / 60000);
  if (Math.abs(minutos) < 60) return rtf.format(minutos, "minute");
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return rtf.format(horas, "hour");
  const dias = Math.round(horas / 24);
  if (Math.abs(dias) < 30) return rtf.format(dias, "day");
  return rtf.format(Math.round(dias / 30), "month");
}
