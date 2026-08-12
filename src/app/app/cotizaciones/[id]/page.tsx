import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { BotonImprimir } from "@/components/imprimir";
import { DocumentoCotizacion } from "@/components/documento-cotizacion";
import { aNumero, fecha, fechaHora, numero, quetzales } from "@/lib/gt";
import { AccionesEstado } from "./estado";
import { PanelCompartir } from "./compartir";

export const metadata: Metadata = { title: "Cotización" };

const TONO_ESTADO = {
  BORRADOR: "neutro",
  ENVIADA: "marca",
  ACEPTADA: "exito",
  RECHAZADA: "peligro",
  VENCIDA: "alerta",
} as const;

export default async function PaginaCotizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const cotizacion = await prisma.cotizacion.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      contacto: true,
      items: { orderBy: { orden: "asc" } },
      creadaPor: { select: { nombre: true, telefono: true } },
      ventas: { select: { id: true, numero: true } },
    },
  });

  if (!cotizacion) notFound();

  const total = aNumero(cotizacion.total);
  const mensajeWhatsApp = [
    `Buen día ${cotizacion.contacto.nombre.split(" ")[0]}, le comparto la cotización #${cotizacion.numero} de ${empresa.nombre}.`,
    "",
    ...cotizacion.items.map(
      (i) => `• ${i.descripcion} (${numero(aNumero(i.cantidad))}) — ${quetzales(aNumero(i.total))}`,
    ),
    "",
    `Total con IVA: ${quetzales(total)}`,
    cotizacion.validaHasta ? `Válida hasta el ${fecha(cotizacion.validaHasta)}.` : "",
    "",
    "Quedo atento a cualquier duda.",
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-imprimir">
        <Link
          href="/app/cotizaciones"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
        >
          <Icono nombre="atras" /> Cotizaciones
        </Link>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900">
              Cotización #{cotizacion.numero}
            </h1>
            <Insignia tono={TONO_ESTADO[cotizacion.estado]}>{cotizacion.estado}</Insignia>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotonWhatsApp
              numero={cotizacion.contacto.whatsapp}
              mensaje={mensajeWhatsApp}
              texto="Enviar el detalle"
              className="px-3 py-2 text-sm"
            />
            <BotonImprimir />
            {cotizacion.estado !== "ACEPTADA" && (
              <BotonEnlace
                href={`/app/cotizaciones/${cotizacion.id}/editar`}
                variante="secundario"
              >
                Editar
              </BotonEnlace>
            )}
          </div>
        </div>

        {cotizacion.aceptadaEl && (
          <div className="mb-3">
            <Tarjeta className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              El cliente la aceptó desde el enlace
              {cotizacion.aceptadaPor && ` (${cotizacion.aceptadaPor})`} el{" "}
              {fechaHora(cotizacion.aceptadaEl)}.
            </Tarjeta>
          </div>
        )}

        <AccionesEstado
          id={cotizacion.id}
          estado={cotizacion.estado}
          ventaId={cotizacion.ventas[0]?.id ?? null}
          ventaNumero={cotizacion.ventas[0]?.numero ?? null}
        />

        <div className="mt-3">
          <PanelCompartir
            id={cotizacion.id}
            token={cotizacion.tokenPublico}
            numero={cotizacion.numero}
            total={quetzales(total)}
            whatsappCliente={cotizacion.contacto.whatsapp}
            nombreCliente={cotizacion.contacto.nombre}
            nombreEmpresa={empresa.nombre}
            vistaEl={cotizacion.vistaEl ? fechaHora(cotizacion.vistaEl) : null}
          />
        </div>
      </div>

      <div className="mt-4">
        <DocumentoCotizacion empresa={empresa} cotizacion={cotizacion} />
      </div>
    </div>
  );
}
