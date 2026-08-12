import type { ReactNode } from "react";
import { Tarjeta, cx } from "@/components/ui";
import { numero, quetzales } from "@/lib/gt";

/**
 * Gráficas en HTML y CSS, sin librerías. Reglas que se respetan en todas:
 * una sola serie por gráfica con un solo color (nunca una rampa sobre
 * categorías sin orden), marcas delgadas, rejilla de un tono, etiquetas
 * selectivas y una tabla equivalente para leer todos los valores.
 */

const ALTO_TRAZO = 176; // px del área de dibujo, sin contar el eje

/** Redondea el tope del eje a un número "limpio" (1, 2, 2.5 o 5 × 10^n). */
function topeLimpio(maximo: number): number {
  if (maximo <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const normalizado = maximo / magnitud;
  const paso = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10;
  return paso * magnitud;
}

function Etiqueta({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-tinta-500">{children}</p>;
}

/** Globo que aparece al pasar el mouse o al enfocar con el teclado. */
function Globo({ children }: { children: ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-tinta-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block"
    >
      {children}
    </span>
  );
}

export function VistaTabla({
  encabezados,
  filas,
}: {
  encabezados: string[];
  filas: (string | number)[][];
}) {
  return (
    <details className="mt-4 border-t border-tinta-100 pt-3">
      <summary className="cursor-pointer text-xs text-tinta-500 hover:text-tinta-800">
        Ver los datos en tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-tinta-500">
            <tr>
              {encabezados.map((h, i) => (
                <th key={h} className={cx("py-1.5 font-medium", i > 0 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tinta-100">
            {filas.map((fila, i) => (
              <tr key={i}>
                {fila.map((celda, j) => (
                  <td
                    key={j}
                    className={cx(
                      "py-1.5 text-tinta-700",
                      j > 0 && "text-right tabular-nums",
                    )}
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------

export function TarjetaEstadistica({
  etiqueta,
  valor,
  detalle,
  destacada = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  destacada?: boolean;
}) {
  return (
    <Tarjeta className="p-4">
      <Etiqueta>{etiqueta}</Etiqueta>
      {/* Cifras proporcionales: `tabular-nums` afloja los números grandes. */}
      <p
        className={cx(
          "mt-2 font-semibold text-tinta-900",
          destacada ? "text-3xl sm:text-4xl" : "text-2xl",
        )}
      >
        {valor}
      </p>
      {detalle && <p className="mt-1 text-xs text-tinta-500">{detalle}</p>}
    </Tarjeta>
  );
}

/** Barra de avance para una razón contra su total (aceptadas / enviadas). */
export function Medidor({
  etiqueta,
  parte,
  total,
  detalle,
}: {
  etiqueta: string;
  parte: number;
  total: number;
  detalle?: string;
}) {
  const porcentaje = total > 0 ? Math.round((parte / total) * 100) : 0;
  return (
    <Tarjeta className="viz p-4">
      <Etiqueta>{etiqueta}</Etiqueta>
      <p className="mt-2 text-2xl font-semibold text-tinta-900">{porcentaje}%</p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--viz-riel)" }}
        role="img"
        aria-label={`${porcentaje}% (${parte} de ${total})`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${porcentaje}%`, backgroundColor: "var(--viz-serie)" }}
        />
      </div>
      <p className="mt-2 text-xs text-tinta-500">
        {detalle ?? `${numero(parte).replace(".00", "")} de ${numero(total).replace(".00", "")}`}
      </p>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------

export function ColumnasPorMes({
  titulo,
  descripcion,
  puntos,
}: {
  titulo: string;
  descripcion?: string;
  puntos: { clave: string; etiqueta: string; total: number; ventas: number }[];
}) {
  const maximo = Math.max(...puntos.map((p) => p.total), 0);
  const tope = topeLimpio(maximo);
  // Se etiqueta solo el mes más alto: un número sobre cada columna no se lee.
  const indiceMaximo = maximo > 0 ? puntos.findIndex((p) => p.total === maximo) : -1;
  const marcas = [tope, tope / 2, 0];

  return (
    <Tarjeta className="viz p-5">
      <h2 className="font-semibold text-tinta-900">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-tinta-500">{descripcion}</p>}

      <div className="mt-5 flex gap-3">
        <div
          className="flex w-16 shrink-0 flex-col justify-between text-right text-xs tabular-nums text-tinta-400"
          style={{ height: ALTO_TRAZO }}
          aria-hidden="true"
        >
          {marcas.map((m) => (
            <span key={m} className="-translate-y-1/2 first:translate-y-0 last:-translate-y-full">
              {m >= 1000 ? `${Math.round(m / 1000)}k` : Math.round(m)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: ALTO_TRAZO }}>
            {/* Rejilla: líneas sólidas de un tono, nunca punteadas. */}
            {marcas.map((m) => (
              <span
                key={m}
                className="absolute inset-x-0 border-t"
                style={{ bottom: `${(m / tope) * 100}%`, borderColor: "var(--viz-rejilla)" }}
                aria-hidden="true"
              />
            ))}

            <ul className="absolute inset-0 flex items-end gap-2">
              {puntos.map((p, i) => (
                <li key={p.clave} className="group relative flex h-full flex-1 items-end justify-center">
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={`${p.etiqueta}: ${quetzales(p.total)} en ${p.ventas} ventas`}
                    className="w-full max-w-6 rounded-t"
                    style={{
                      height: `${tope > 0 ? Math.max((p.total / tope) * 100, p.total > 0 ? 1.5 : 0) : 0}%`,
                      backgroundColor: "var(--viz-serie)",
                    }}
                  />
                  <Globo>
                    {p.etiqueta}: {quetzales(p.total)} · {p.ventas} venta
                    {p.ventas === 1 ? "" : "s"}
                  </Globo>
                  {i === indiceMaximo && (
                    <span
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-tinta-700"
                      style={{ bottom: `calc(${(p.total / tope) * 100}% + 4px)` }}
                    >
                      {quetzales(p.total)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-2 flex gap-2">
            {puntos.map((p) => (
              <li key={p.clave} className="flex-1 truncate text-center text-xs text-tinta-500">
                {p.etiqueta}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <VistaTabla
        encabezados={["Mes", "Ventas", "Total"]}
        filas={puntos.map((p) => [p.etiqueta, p.ventas, quetzales(p.total)])}
      />
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------

export function BarrasRanking({
  titulo,
  descripcion,
  filas,
  etiquetaCantidad,
  vacio,
}: {
  titulo: string;
  descripcion?: string;
  filas: { id: string; nombre: string; total: number; cantidad: number }[];
  etiquetaCantidad: string;
  vacio: string;
}) {
  const maximo = Math.max(...filas.map((f) => f.total), 0);

  return (
    <Tarjeta className="viz p-5">
      <h2 className="font-semibold text-tinta-900">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-tinta-500">{descripcion}</p>}

      {filas.length === 0 ? (
        <p className="mt-4 text-sm text-tinta-500">{vacio}</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {filas.map((f) => (
              <li key={f.id} className="group relative">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-tinta-700">{f.nombre}</span>
                  <span className="shrink-0 font-medium tabular-nums text-tinta-900">
                    {quetzales(f.total)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--viz-riel)" }}
                >
                  <div
                    tabIndex={0}
                    role="img"
                    aria-label={`${f.nombre}: ${quetzales(f.total)}`}
                    className="h-full rounded-full"
                    style={{
                      width: `${maximo > 0 ? Math.max((f.total / maximo) * 100, 2) : 0}%`,
                      backgroundColor: "var(--viz-serie)",
                    }}
                  />
                </div>
                <Globo>
                  {f.nombre}: {quetzales(f.total)} · {numero(f.cantidad).replace(".00", "")}{" "}
                  {etiquetaCantidad}
                </Globo>
              </li>
            ))}
          </ul>

          <VistaTabla
            encabezados={["Nombre", etiquetaCantidad, "Total"]}
            filas={filas.map((f) => [
              f.nombre,
              numero(f.cantidad).replace(".00", ""),
              quetzales(f.total),
            ])}
          />
        </>
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------

const PASOS_EMBUDO = [
  "var(--viz-paso-1)",
  "var(--viz-paso-2)",
  "var(--viz-paso-3)",
  "var(--viz-paso-4)",
  "var(--viz-paso-5)",
  "var(--viz-paso-6)",
];

export function Embudo({
  titulo,
  descripcion,
  pasos,
}: {
  titulo: string;
  descripcion?: string;
  pasos: { nombre: string; cantidad: number; monto: number }[];
}) {
  const maximo = Math.max(...pasos.map((p) => p.monto), 0);
  const totalAbierto = pasos.reduce((acc, p) => acc + p.monto, 0);

  return (
    <Tarjeta className="viz p-5">
      <h2 className="font-semibold text-tinta-900">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-tinta-500">{descripcion}</p>}

      {totalAbierto === 0 ? (
        <p className="mt-4 text-sm text-tinta-500">
          No hay oportunidades abiertas con monto en el embudo.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {pasos.map((p, i) => (
              <li key={p.nombre} className="group relative">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-tinta-700">{p.nombre}</span>
                  <span className="shrink-0 text-xs text-tinta-500">
                    {p.cantidad} oportunidad{p.cantidad === 1 ? "" : "es"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-2.5 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--viz-riel)" }}
                  >
                    <div
                      tabIndex={0}
                      role="img"
                      aria-label={`${p.nombre}: ${quetzales(p.monto)} en ${p.cantidad} oportunidades`}
                      className="h-full rounded-full"
                      style={{
                        width: `${maximo > 0 ? Math.max((p.monto / maximo) * 100, 2) : 0}%`,
                        // Rampa de un solo tono: las etapas SÍ tienen orden.
                        backgroundColor: PASOS_EMBUDO[Math.min(i, PASOS_EMBUDO.length - 1)],
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-tinta-900">
                    {quetzales(p.monto)}
                  </span>
                </div>
                <Globo>
                  {p.nombre}: {quetzales(p.monto)} · {p.cantidad} oportunidad
                  {p.cantidad === 1 ? "" : "es"}
                </Globo>
              </li>
            ))}
          </ul>

          <VistaTabla
            encabezados={["Etapa", "Oportunidades", "Monto"]}
            filas={pasos.map((p) => [p.nombre, p.cantidad, quetzales(p.monto)])}
          />
        </>
      )}
    </Tarjeta>
  );
}
