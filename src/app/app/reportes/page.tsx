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
  asistenciaPorProfesional,
  citasPorServicio,
  ingresosPorProfesional,
  resumenClinica,
} from "@/lib/reportes";
import { Tarjeta } from "@/components/ui";

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

  if (empresa.giro === "CLINICA") {
    const [porMedico, asistencia, porServicio, clinica] = await Promise.all([
      ingresosPorProfesional(empresa.id, rango),
      asistenciaPorProfesional(empresa.id, rango),
      citasPorServicio(empresa.id, rango),
      resumenClinica(empresa.id, rango),
    ]);
    const atendidas = asistencia.reduce((a, f) => a + f.atendidas, 0);
    const faltas = asistencia.reduce((a, f) => a + f.faltas, 0);
    return (
      <>
        <EncabezadoPagina titulo="Reportes" descripcion="Cobros, asistencia y lo que más piden tus pacientes." />
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
            etiqueta={`Cobrado · ${nombreRango}`}
            valor={quetzalesCorto(resumen.vendido)}
            detalle={`${resumen.ventas} cobro${resumen.ventas === 1 ? "" : "s"}`}
            destacada
          />
          <Medidor
            etiqueta="Asistencia"
            parte={atendidas}
            total={atendidas + faltas}
            detalle={`${atendidas} atendidas · ${faltas} no se presentaron`}
          />
          <TarjetaEstadistica
            etiqueta="Reservas en línea"
            valor={String(clinica.reservasEnLinea)}
            detalle="Citas que el paciente agendó solo"
          />
          <TarjetaEstadistica
            etiqueta="Calificación"
            valor={clinica.calificacionPromedio ? `${clinica.calificacionPromedio.toFixed(1)} ★` : "—"}
            detalle={`${clinica.calificaciones} opinion${clinica.calificaciones === 1 ? "" : "es"} de pacientes`}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <ColumnasPorMes titulo="Cobros por mes" descripcion="Consultas y ventas cobradas, sin las anuladas." puntos={porMes} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarrasRanking
              titulo="Ingresos por médico"
              descripcion="Lo cobrado por las consultas de cada profesional."
              filas={porMedico}
              etiquetaCantidad="consultas"
              vacio="Todavía no hay consultas cobradas en este rango."
            />
            <BarrasRanking
              titulo="Lo más pedido"
              descripcion="Citas por servicio (sin las canceladas)."
              filas={porServicio}
              etiquetaCantidad="citas"
              vacio="Todavía no hay citas en este rango."
              enQuetzales={false}
            />
          </div>
          <Tarjeta className="overflow-x-auto p-5">
            <h2 className="font-semibold text-tinta-900">Asistencia por médico</h2>
            <p className="mb-3 text-sm text-tinta-500">Citas que ya pasaron en el rango.</p>
            {asistencia.length === 0 ? (
              <p className="text-sm text-tinta-500">Todavía no hay citas pasadas en este rango.</p>
            ) : (
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-tinta-200 text-left text-xs uppercase tracking-wide text-tinta-500">
                    <th className="py-2 font-medium">Profesional</th>
                    <th className="py-2 text-right font-medium">Atendidas</th>
                    <th className="py-2 text-right font-medium">No asistió</th>
                    <th className="py-2 text-right font-medium">Canceladas</th>
                    <th className="py-2 text-right font-medium">Inasistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tinta-100 tabular-nums">
                  {asistencia.map((f) => {
                    const base = f.atendidas + f.faltas;
                    return (
                      <tr key={f.id}>
                        <td className="py-2 text-tinta-800">{f.nombre}</td>
                        <td className="py-2 text-right">{f.atendidas}</td>
                        <td className="py-2 text-right">{f.faltas}</td>
                        <td className="py-2 text-right">{f.canceladas}</td>
                        <td className="py-2 text-right">{base > 0 ? `${Math.round((f.faltas / base) * 100)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Tarjeta>
        </div>
      </>
    );
  }
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
