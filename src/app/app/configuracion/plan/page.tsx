import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumenDeUso } from "@/lib/limites";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { ILIMITADO, PLANES, diasRestantesDePrueba, formatoLimite } from "@/lib/planes";
import { aNumero, fecha, quetzales } from "@/lib/gt";
import { FormularioPago } from "./formulario";

export const metadata: Metadata = { title: "Plan y pagos" };

export default async function PaginaPlan() {
  const { empresa, usuario, plan } = await requerirSesion();
  const esAdmin = usuario.rol !== "VENDEDOR";

  const [uso, pagos] = await Promise.all([
    resumenDeUso(empresa.id, plan),
    prisma.pagoSuscripcion.findMany({
      where: { empresaId: empresa.id },
      orderBy: { creadoEl: "desc" },
      take: 12,
    }),
  ]);

  const diasPrueba = diasRestantesDePrueba(empresa.pruebaTermina);

  return (
    <div className="space-y-6">
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-tinta-900">Tu plan</h2>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-tinta-900">
              {PLANES[plan].nombre}
              {empresa.estadoSuscripcion === "PRUEBA" && diasPrueba > 0 && (
                <Insignia tono="alerta">Prueba · {diasPrueba} días</Insignia>
              )}
              {empresa.estadoSuscripcion === "ACTIVA" && <Insignia tono="exito">Activo</Insignia>}
              {empresa.estadoSuscripcion === "VENCIDA" && (
                <Insignia tono="peligro">Vencido</Insignia>
              )}
            </p>
            <p className="mt-1 text-sm text-tinta-500">
              {PLANES[plan].precioMensual === 0
                ? "Sin costo"
                : `${quetzales(PLANES[plan].precioMensual)} al mes`}
              {empresa.planRenuevaEl && ` · vence el ${fecha(empresa.planRenuevaEl)}`}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {uso.map((u) => (
            <div key={u.recurso}>
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-tinta-600">{u.etiqueta}</span>
                <span className="text-tinta-500">
                  {u.usado} / {formatoLimite(u.limite)}
                </span>
              </div>
              {u.limite !== ILIMITADO && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tinta-100">
                  <div
                    className={
                      u.porcentaje >= 90
                        ? "h-full bg-red-500"
                        : u.porcentaje >= 70
                          ? "h-full bg-amber-500"
                          : "h-full bg-marca-500"
                    }
                    style={{ width: `${u.porcentaje}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Tarjeta>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(PLANES).map((definicion) => (
          <Tarjeta
            key={definicion.id}
            className={
              definicion.id === plan ? "border-marca-300 p-4 ring-2 ring-marca-500" : "p-4"
            }
          >
            <h3 className="font-semibold text-tinta-900">{definicion.nombre}</h3>
            <p className="mt-1 text-xl font-bold text-tinta-900">
              {definicion.precioMensual === 0 ? "Q0" : quetzales(definicion.precioMensual)}
              <span className="text-xs font-normal text-tinta-500"> / mes</span>
            </p>
            <ul className="mt-3 space-y-1 text-xs text-tinta-600">
              {definicion.beneficios.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </Tarjeta>
        ))}
      </div>

      {esAdmin ? (
        <FormularioPago planActual={plan} />
      ) : (
        <Aviso tono="marca">Solo el propietario o un administrador maneja el plan.</Aviso>
      )}

      {pagos.length > 0 && (
        <Tarjeta className="overflow-hidden">
          <h2 className="border-b border-tinta-200 px-4 py-3 text-sm font-semibold text-tinta-900">
            Pagos registrados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tinta-50 text-left text-xs uppercase tracking-wide text-tinta-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Método</th>
                  <th className="px-4 py-2 font-medium">Cubre hasta</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-tinta-600">{fecha(p.creadoEl)}</td>
                    <td className="px-4 py-2 text-tinta-700">{PLANES[p.plan].nombre}</td>
                    <td className="px-4 py-2 text-tinta-600">
                      {p.metodo}
                      {p.referencia && (
                        <span className="block text-xs text-tinta-400">Ref. {p.referencia}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-tinta-600">{fecha(p.cubreHasta)}</td>
                    <td className="px-4 py-2 text-right font-medium text-tinta-900">
                      {quetzales(aNumero(p.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
