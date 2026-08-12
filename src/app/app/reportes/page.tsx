import type { Metadata } from "next";
import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { EncabezadoPagina, cx } from "@/components/ui";
import {
  BarrasRanking,
  ColumnasPorMes,
  Embudo,
  Medidor,
  TarjetaEstadistica,
} from "@/components/graficas";
import { quetzales, quetzalesCorto } from "@/lib/gt";
import {
  RANGOS,
  embudoActual,
  productosMasVendidos,
  rangoValido,
  resumenDelRango,
  ventasPorMes,
  ventasPorVendedor,
} from "@/lib/reportes";

export const metadata: Metadata = { title: "Reportes" };

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { rango: rangoCrudo } = await searchParams;
  const rango = rangoValido(rangoCrudo);

  const [resumen, porMes, porVendedor, porProducto, embudo] = await Promise.all([
    resumenDelRango(empresa.id, rango),
    ventasPorMes(empresa.id, rango),
    ventasPorVendedor(empresa.id, rango),
    productosMasVendidos(empresa.id, rango),
    embudoActual(empresa.id),
  ]);

  const nombreRango = RANGOS.find((r) => r.valor === rango)!.texto.toLowerCase();
  const cerradas = resumen.oportunidadesGanadas + resumen.oportunidadesPerdidas;

  return (
    <>
      <EncabezadoPagina
        titulo="Reportes"
        descripcion="Cómo va tu negocio, con los números que sí se usan para decidir."
      />

      {/* Un solo filtro arriba: todas las gráficas responden al mismo rango. */}
      <div className="mb-5 flex flex-wrap gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.valor}
            href={`/app/reportes?rango=${r.valor}`}
            aria-current={rango === r.valor ? "true" : undefined}
            className={cx(
              "rounded-lg border px-3 py-1.5 text-sm",
              rango === r.valor
                ? "border-marca-300 bg-marca-50 font-medium text-marca-700"
                : "border-tinta-200 bg-white text-tinta-600 hover:bg-tinta-50",
            )}
          >
            {r.texto}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaEstadistica
          etiqueta={`Vendido · ${nombreRango}`}
          valor={quetzalesCorto(resumen.vendido)}
          detalle={`${resumen.ventas} venta${resumen.ventas === 1 ? "" : "s"}`}
          destacada
        />
        <TarjetaEstadistica
          etiqueta="Ticket promedio"
          valor={quetzalesCorto(resumen.ticketPromedio)}
          detalle="Lo que deja cada venta en promedio"
        />
        <TarjetaEstadistica
          etiqueta="Pendiente de cobro"
          valor={quetzalesCorto(resumen.porCobrar)}
          detalle="Ventas registradas y todavía sin pagar"
        />
        <Medidor
          etiqueta="Cotizaciones aceptadas"
          parte={resumen.cotizacionesAceptadas}
          total={resumen.cotizacionesEnviadas}
          detalle={`${resumen.cotizacionesAceptadas} de ${resumen.cotizacionesEnviadas} enviadas`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <ColumnasPorMes
          titulo="Ventas por mes"
          descripcion="Total facturado cada mes, sin contar las ventas anuladas."
          puntos={porMes}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarrasRanking
            titulo="Ventas por vendedor"
            descripcion={`Quién está cerrando en los ${nombreRango.replace("últimos ", "")}.`}
            filas={porVendedor}
            etiquetaCantidad="ventas"
            vacio="Todavía no hay ventas en este rango."
          />
          <BarrasRanking
            titulo="Productos más vendidos"
            descripcion="Lo que más te deja, por monto vendido."
            filas={porProducto}
            etiquetaCantidad="unidades"
            vacio="Todavía no hay ventas en este rango."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Embudo
              titulo="Embudo abierto hoy"
              descripcion="Lo que está vivo ahora mismo, por etapa. No depende del rango."
              pasos={embudo}
            />
          </div>
          <div className="grid grid-cols-1 content-start gap-4">
            <Medidor
              etiqueta="Oportunidades ganadas"
              parte={resumen.oportunidadesGanadas}
              total={cerradas}
              detalle={
                cerradas === 0
                  ? "Todavía no cerrás oportunidades en este rango"
                  : `${resumen.oportunidadesGanadas} ganadas y ${resumen.oportunidadesPerdidas} perdidas`
              }
            />
            <TarjetaEstadistica
              etiqueta="En el embudo"
              valor={quetzalesCorto(embudo.reduce((acc, p) => acc + p.monto, 0))}
              detalle={`${embudo.reduce((acc, p) => acc + p.cantidad, 0)} oportunidades abiertas`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
