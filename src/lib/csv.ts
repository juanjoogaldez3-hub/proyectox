/**
 * Lector de CSV chiquito y sin dependencias. Se corre en el navegador para
 * mostrar la vista previa antes de mandar nada al servidor.
 *
 * Contempla lo que de verdad sale de un Excel guatemalteco: separador `;`
 * (que es lo que usa Excel en español), BOM al inicio, saltos de línea de
 * Windows y campos entre comillas con comas adentro.
 */

const SEPARADORES = [",", ";", "\t", "|"] as const;

/** Adivina el separador contando cuál aparece más en la primera línea. */
export function detectarSeparador(texto: string): string {
  const primeraLinea = texto.slice(0, 5000).split(/\r?\n/)[0] ?? "";
  let mejor = ",";
  let mayor = 0;
  for (const sep of SEPARADORES) {
    // Se cuentan solo los separadores fuera de comillas.
    let cuenta = 0;
    let enComillas = false;
    for (let i = 0; i < primeraLinea.length; i++) {
      const c = primeraLinea[i];
      if (c === '"') enComillas = !enComillas;
      else if (c === sep && !enComillas) cuenta++;
    }
    if (cuenta > mayor) {
      mayor = cuenta;
      mejor = sep;
    }
  }
  return mejor;
}

export type TablaCsv = { encabezados: string[]; filas: string[][] };

export function leerCsv(textoCrudo: string, separador?: string): TablaCsv {
  // El BOM de Excel se cuela en el primer encabezado y rompe el mapeo.
  const texto = textoCrudo.replace(/^\ufeff/, "");
  const sep = separador ?? detectarSeparador(texto);

  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'; // comilla escapada
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      enComillas = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }

  // Lo que quedó pendiente al terminar el archivo.
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  const utiles = filas.filter((f) => f.some((c) => c.trim() !== ""));
  if (utiles.length === 0) return { encabezados: [], filas: [] };

  const encabezados = utiles[0].map((h) => h.trim());
  return { encabezados, filas: utiles.slice(1) };
}

// ---------------------------------------------------------------------------
// Adivinar qué columna es cuál
// ---------------------------------------------------------------------------

export const CAMPOS_CONTACTO = [
  { clave: "nombre", etiqueta: "Nombre", obligatorio: true },
  { clave: "negocio", etiqueta: "Negocio" },
  { clave: "telefono", etiqueta: "Teléfono" },
  { clave: "whatsapp", etiqueta: "WhatsApp" },
  { clave: "email", etiqueta: "Correo" },
  { clave: "nit", etiqueta: "NIT" },
  { clave: "direccion", etiqueta: "Dirección" },
  { clave: "departamento", etiqueta: "Departamento" },
  { clave: "municipio", etiqueta: "Municipio" },
  { clave: "etiquetas", etiqueta: "Etiquetas" },
  { clave: "notas", etiqueta: "Notas" },
] as const;

export type CampoContacto = (typeof CAMPOS_CONTACTO)[number]["clave"];

/** Nombres de columna que suelen traer los archivos, por campo. */
const PISTAS: Record<CampoContacto, string[]> = {
  nombre: ["nombre", "cliente", "contacto", "name", "nombres", "nombre completo"],
  negocio: ["negocio", "empresa", "comercio", "tienda", "razon social", "company"],
  telefono: ["telefono", "tel", "celular", "movil", "phone", "numero"],
  whatsapp: ["whatsapp", "wasap", "whats", "wa"],
  email: ["email", "correo", "mail", "e-mail"],
  nit: ["nit", "nit cliente", "tax id"],
  direccion: ["direccion", "domicilio", "address", "dir"],
  departamento: ["departamento", "depto", "depa", "state"],
  municipio: ["municipio", "muni", "ciudad", "city"],
  etiquetas: ["etiquetas", "tags", "categoria", "categorias", "tipo"],
  notas: ["notas", "observaciones", "comentarios", "nota", "detalle"],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Empareja cada campo con la columna cuyo encabezado más se le parece.
 * Una columna no se usa dos veces: el usuario puede corregir después.
 */
export function adivinarColumnas(encabezados: string[]): Record<CampoContacto, number> {
  const normalizados = encabezados.map(normalizar);
  const usadas = new Set<number>();
  const mapeo = {} as Record<CampoContacto, number>;

  for (const { clave } of CAMPOS_CONTACTO) {
    const pistas = PISTAS[clave];
    let elegida = -1;

    // Primero coincidencia exacta, después "contiene".
    for (const pista of pistas) {
      const i = normalizados.findIndex((h, idx) => h === pista && !usadas.has(idx));
      if (i !== -1) { elegida = i; break; }
    }
    if (elegida === -1) {
      for (const pista of pistas) {
        const i = normalizados.findIndex((h, idx) => h.includes(pista) && !usadas.has(idx));
        if (i !== -1) { elegida = i; break; }
      }
    }

    mapeo[clave] = elegida;
    if (elegida !== -1) usadas.add(elegida);
  }

  return mapeo;
}
