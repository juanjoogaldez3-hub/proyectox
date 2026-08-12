import { Tarjeta } from "@/components/ui";
import { aNumero, fecha, mostrarNit, mostrarTelefono, numero, quetzales } from "@/lib/gt";

/**
 * La cotizacion como documento. La usan la pantalla interna y el enlace
 * publico que ve el cliente, para que ambos muestren exactamente lo mismo.
 */

export type EmpresaDocumento = {
  nombre: string;
  nit: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio: string | null;
  departamento: string | null;
};

export type CotizacionDocumento = {
  numero: number;
  fecha: Date;
  validaHasta: Date | null;
  ivaPorcentaje: unknown;
  subtotal: unknown;
  descuento: unknown;
  iva: unknown;
  total: unknown;
  notas: string | null;
  condiciones: string | null;
  contacto: {
    nombre: string;
    negocio: string | null;
    nit: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  items: {
    id: string;
    descripcion: string;
    cantidad: unknown;
    precioUnitario: unknown;
    total: unknown;
  }[];
  creadaPor?: { nombre: string; telefono: string | null } | null;
};

export function DocumentoCotizacion({
  empresa,
  cotizacion,
}: {
  empresa: EmpresaDocumento;
  cotizacion: CotizacionDocumento;
}) {
  return (
    <Tarjeta className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-tinta-200 pb-5">
        <div>
          <h2 className="text-lg font-bold text-tinta-900">{empresa.nombre}</h2>
          <div className="mt-1 space-y-0.5 text-xs text-tinta-600">
            {empresa.nit && <p>NIT: {mostrarNit(empresa.nit)}</p>}
            {empresa.telefono && <p>Tel: {mostrarTelefono(empresa.telefono)}</p>}
            {empresa.direccion && <p>{empresa.direccion}</p>}
            {(empresa.municipio || empresa.departamento) && (
              <p>{[empresa.municipio, empresa.departamento].filter(Boolean).join(", ")}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide text-tinta-500">
            Cotización
          </p>
          <p className="text-xl font-bold text-tinta-900">#{cotizacion.numero}</p>
          <p className="mt-1 text-xs text-tinta-600">Fecha: {fecha(cotizacion.fecha)}</p>
          {cotizacion.validaHasta && (
            <p className="text-xs text-tinta-600">
              Válida hasta: {fecha(cotizacion.validaHasta)}
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-tinta-200 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-tinta-500">Cliente</p>
        <p className="mt-1 font-medium text-tinta-900">{cotizacion.contacto.nombre}</p>
        <div className="mt-0.5 space-y-0.5 text-xs text-tinta-600">
          {cotizacion.contacto.negocio && <p>{cotizacion.contacto.negocio}</p>}
          {cotizacion.contacto.nit && <p>NIT: {mostrarNit(cotizacion.contacto.nit)}</p>}
          {cotizacion.contacto.telefono && (
            <p>Tel: {mostrarTelefono(cotizacion.contacto.telefono)}</p>
          )}
          {cotizacion.contacto.direccion && <p>{cotizacion.contacto.direccion}</p>}
        </div>
      </div>

      <div className="overflow-x-auto py-5">
        <table className="w-full text-sm">
          <thead className="border-b border-tinta-300 text-left text-xs uppercase tracking-wide text-tinta-500">
            <tr>
              <th className="pb-2 font-medium">Descripción</th>
              <th className="pb-2 text-right font-medium">Cant.</th>
              <th className="pb-2 text-right font-medium">P. unitario</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tinta-100">
            {cotizacion.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 pr-3 text-tinta-800">{item.descripcion}</td>
                <td className="py-2.5 text-right text-tinta-600">
                  {numero(aNumero(item.cantidad))}
                </td>
                <td className="py-2.5 text-right text-tinta-600">
                  {quetzales(aNumero(item.precioUnitario))}
                </td>
                <td className="py-2.5 text-right font-medium text-tinta-900">
                  {quetzales(aNumero(item.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-tinta-200 pt-4">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-600">Subtotal</dt>
            <dd className="text-tinta-900">{quetzales(aNumero(cotizacion.subtotal))}</dd>
          </div>
          {aNumero(cotizacion.descuento) > 0 && (
            <div className="flex justify-between">
              <dt className="text-tinta-600">Descuento</dt>
              <dd className="text-tinta-900">−{quetzales(aNumero(cotizacion.descuento))}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-tinta-600">IVA {numero(aNumero(cotizacion.ivaPorcentaje))}%</dt>
            <dd className="text-tinta-900">{quetzales(aNumero(cotizacion.iva))}</dd>
          </div>
          <div className="flex justify-between border-t border-tinta-300 pt-2 text-base font-bold">
            <dt className="text-tinta-900">Total</dt>
            <dd className="text-tinta-900">{quetzales(aNumero(cotizacion.total))}</dd>
          </div>
        </dl>
      </div>

      {(cotizacion.notas || cotizacion.condiciones) && (
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-tinta-200 pt-5 text-xs text-tinta-600 sm:grid-cols-2">
          {cotizacion.notas && (
            <div>
              <p className="font-semibold uppercase tracking-wide text-tinta-500">Notas</p>
              <p className="mt-1 whitespace-pre-wrap">{cotizacion.notas}</p>
            </div>
          )}
          {cotizacion.condiciones && (
            <div>
              <p className="font-semibold uppercase tracking-wide text-tinta-500">Condiciones</p>
              <p className="mt-1 whitespace-pre-wrap">{cotizacion.condiciones}</p>
            </div>
          )}
        </div>
      )}

      {cotizacion.creadaPor && (
        <p className="mt-6 text-xs text-tinta-500">
          Atendido por {cotizacion.creadaPor.nombre}
          {cotizacion.creadaPor.telefono && ` · ${mostrarTelefono(cotizacion.creadaPor.telefono)}`}
        </p>
      )}
    </Tarjeta>
  );
}
