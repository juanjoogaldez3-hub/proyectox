import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Insignia } from "@/components/ui";
import { BotonImprimir } from "@/components/imprimir";
import { BotonWhatsApp } from "@/components/whatsapp";
import { DocumentoCotizacion } from "@/components/documento-cotizacion";
import { fecha, quetzales, aNumero } from "@/lib/gt";
import { RespuestaCliente } from "./respuesta";
import { aceptarDesdeEnlace, rechazarDesdeEnlace } from "./acciones";

// El enlace lo abre el cliente final: nunca debe quedar cacheado ni indexado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cotización",
  robots: { index: false, follow: false },
};

export default async function PaginaCotizacionPublica({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { tokenPublico: token },
    include: {
      empresa: {
        select: {
          nombre: true,
          nit: true,
          telefono: true,
          direccion: true,
          municipio: true,
          departamento: true,
        },
      },
      contacto: {
        select: {
          nombre: true,
          negocio: true,
          nit: true,
          telefono: true,
          direccion: true,
        },
      },
      items: { orderBy: { orden: "asc" } },
      creadaPor: { select: { nombre: true, telefono: true } },
    },
  });

  if (!cotizacion) notFound();

  // Deja constancia de que el cliente la abrió, sin bloquear el render.
  if (!cotizacion.vistaEl) {
    await prisma.cotizacion.update({
      where: { id: cotizacion.id },
      data: { vistaEl: new Date() },
    });
  }

  const vencida =
    cotizacion.validaHasta !== null && cotizacion.validaHasta.getTime() < Date.now();
  const cerrada = cotizacion.estado === "ACEPTADA" || cotizacion.estado === "RECHAZADA";

  return (
    <div className="min-h-screen bg-tinta-50 py-6">
      <div className="mx-auto max-w-3xl px-4">
        <div className="no-imprimir mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-tinta-500">Cotización de</p>
            <p className="font-semibold text-tinta-900">{cotizacion.empresa.nombre}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cotizacion.estado === "ACEPTADA" && <Insignia tono="exito">Aceptada</Insignia>}
            {cotizacion.estado === "RECHAZADA" && <Insignia tono="peligro">Rechazada</Insignia>}
            {!cerrada && vencida && <Insignia tono="alerta">Vencida</Insignia>}
            <BotonImprimir texto="Guardar en PDF" />
          </div>
        </div>

        <DocumentoCotizacion empresa={cotizacion.empresa} cotizacion={cotizacion} />

        <div className="no-imprimir mt-4">
          {cotizacion.estado === "ACEPTADA" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-medium">¡Gracias! Ya recibimos tu aceptación.</p>
              <p className="mt-1">
                {cotizacion.aceptadaPor && `Aceptada por ${cotizacion.aceptadaPor}`}
                {cotizacion.aceptadaEl && ` el ${fecha(cotizacion.aceptadaEl)}`}. En{" "}
                {cotizacion.empresa.nombre} se están preparando para atenderte.
              </p>
              {cotizacion.empresa.telefono && (
                <div className="mt-3">
                  <BotonWhatsApp
                    numero={cotizacion.empresa.telefono}
                    mensaje={`Hola, acabo de aceptar la cotización #${cotizacion.numero} por ${quetzales(
                      aNumero(cotizacion.total),
                    )}.`}
                    texto="Escribirles por WhatsApp"
                  />
                </div>
              )}
            </div>
          ) : cotizacion.estado === "RECHAZADA" ? (
            <div className="rounded-xl border border-tinta-200 bg-white p-4 text-sm text-tinta-600">
              Marcaste esta cotización como no aceptada. Si cambiás de opinión, escribile
              directamente a {cotizacion.empresa.nombre}.
            </div>
          ) : vencida ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Esta cotización venció el {fecha(cotizacion.validaHasta)}. Pedile una
              actualizada a {cotizacion.empresa.nombre}.
            </div>
          ) : (
            <RespuestaCliente
              aceptar={aceptarDesdeEnlace.bind(null, token)}
              rechazar={rechazarDesdeEnlace.bind(null, token)}
              total={quetzales(aNumero(cotizacion.total))}
              nombreSugerido={cotizacion.contacto.nombre}
            />
          )}
        </div>

        <p className="no-imprimir mt-6 text-center text-xs text-tinta-400">
          Documento generado con CRM Chapín
        </p>
      </div>
    </div>
  );
}
