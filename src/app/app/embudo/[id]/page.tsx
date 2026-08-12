import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { aNumero, fecha, fechaHora, quetzales } from "@/lib/gt";
import { FormularioPerdida } from "./perdida";
import { marcarPerdida } from "../acciones";

export const metadata: Metadata = { title: "Oportunidad" };

export default async function PaginaOportunidad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const oportunidad = await prisma.oportunidad.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      contacto: true,
      etapa: true,
      responsable: { select: { nombre: true } },
      actividades: { orderBy: [{ completada: "asc" }, { venceEl: "asc" }], take: 10 },
      cotizaciones: { orderBy: { creadoEl: "desc" } },
      notasRel: {
        orderBy: { creadoEl: "desc" },
        take: 10,
        include: { usuario: { select: { nombre: true } } },
      },
    },
  });

  if (!oportunidad) notFound();

  const tono =
    oportunidad.estado === "GANADA"
      ? "exito"
      : oportunidad.estado === "PERDIDA"
        ? "peligro"
        : "marca";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app/embudo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Embudo
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">
              {oportunidad.titulo}
            </h1>
            <Insignia tono={tono}>
              {oportunidad.estado === "ABIERTA" ? oportunidad.etapa.nombre : oportunidad.estado}
            </Insignia>
          </div>
          <p className="mt-1 text-sm text-tinta-500">
            <Link
              href={`/app/contactos/${oportunidad.contacto.id}`}
              className="hover:text-marca-600"
            >
              {oportunidad.contacto.nombre}
            </Link>
            {oportunidad.responsable && ` · ${oportunidad.responsable.nombre}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonWhatsApp
            numero={oportunidad.contacto.whatsapp}
            mensaje={`Hola ${oportunidad.contacto.nombre.split(" ")[0]}, le escribo de ${
              empresa.nombre
            } sobre ${oportunidad.titulo}.`}
            className="px-3 py-2 text-sm"
          />
          <BotonEnlace
            href={`/app/cotizaciones/nueva?contacto=${oportunidad.contacto.id}&oportunidad=${oportunidad.id}`}
            variante="secundario"
          >
            Cotizar
          </BotonEnlace>
          <BotonEnlace href={`/app/embudo/${oportunidad.id}/editar`} variante="secundario">
            Editar
          </BotonEnlace>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Monto</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">
                {quetzales(aNumero(oportunidad.monto))}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Probabilidad</dt>
              <dd className="mt-0.5 text-lg font-semibold text-tinta-900">
                {oportunidad.etapa.probabilidad}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-tinta-500">Cierre estimado</dt>
              <dd className="mt-0.5 text-sm text-tinta-800">
                {oportunidad.fechaCierre ? fecha(oportunidad.fechaCierre) : "Sin fecha"}
              </dd>
            </div>
          </dl>

          {oportunidad.motivoPerdida && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <strong>Motivo de la pérdida:</strong> {oportunidad.motivoPerdida}
            </p>
          )}

          {oportunidad.estado === "ABIERTA" && (
            <div className="mt-5 border-t border-tinta-100 pt-4">
              <h2 className="text-sm font-semibold text-tinta-900">¿Se cayó el negocio?</h2>
              <p className="mt-1 text-sm text-tinta-500">
                Anotá por qué se perdió. Con el tiempo eso te dice qué cambiar.
              </p>
              <FormularioPerdida accion={marcarPerdida.bind(null, oportunidad.id)} />
            </div>
          )}
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Actividades</h2>
            {oportunidad.actividades.length === 0 ? (
              <p className="text-sm text-tinta-500">
                <Link
                  href={`/app/actividades/nueva?oportunidad=${oportunidad.id}`}
                  className="text-marca-600 hover:underline"
                >
                  Agendá un seguimiento
                </Link>{" "}
                para no perder el hilo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {oportunidad.actividades.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2">
                    <span className={a.completada ? "text-tinta-400 line-through" : "text-tinta-700"}>
                      {a.titulo}
                    </span>
                    {a.venceEl && (
                      <span className="shrink-0 text-xs text-tinta-400">{fecha(a.venceEl)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Cotizaciones</h2>
            {oportunidad.cotizaciones.length === 0 ? (
              <p className="text-sm text-tinta-500">Sin cotizaciones.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {oportunidad.cotizaciones.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/app/cotizaciones/${c.id}`}
                      className="text-tinta-700 hover:text-marca-600"
                    >
                      #{c.numero}
                    </Link>
                    <span className="font-medium">{quetzales(aNumero(c.total))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          {oportunidad.notasRel.length > 0 && (
            <Tarjeta className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-tinta-900">Notas</h2>
              <ul className="space-y-3">
                {oportunidad.notasRel.map((n) => (
                  <li key={n.id}>
                    <p className="whitespace-pre-wrap text-sm text-tinta-700">{n.contenido}</p>
                    <p className="mt-0.5 text-xs text-tinta-400">
                      {n.usuario.nombre} · {fechaHora(n.creadoEl)}
                    </p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  );
}
