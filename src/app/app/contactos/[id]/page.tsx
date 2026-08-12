import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import {
  aNumero,
  fecha,
  fechaHora,
  mostrarNit,
  mostrarTelefono,
  nitValido,
  quetzales,
  tiempoRelativo,
} from "@/lib/gt";
import { FormularioNota } from "./nota";
import { agregarNota } from "../acciones";

export const metadata: Metadata = { title: "Contacto" };

const ORIGEN_TEXTO: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  REFERIDO: "Referido",
  SITIO_WEB: "Sitio web",
  LLAMADA: "Llamada",
  VISITA: "Visita",
  FERIA: "Feria o evento",
  OTRO: "Otro",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-tinta-800">{valor}</dd>
    </div>
  );
}

export default async function PaginaContacto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const contacto = await prisma.contacto.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      responsable: { select: { nombre: true } },
      oportunidades: {
        orderBy: { creadoEl: "desc" },
        include: { etapa: { select: { nombre: true, color: true } } },
      },
      actividades: { orderBy: [{ completada: "asc" }, { venceEl: "asc" }], take: 15 },
      notasRel: {
        orderBy: { creadoEl: "desc" },
        take: 20,
        include: { usuario: { select: { nombre: true } } },
      },
      cotizaciones: { orderBy: { creadoEl: "desc" }, take: 10 },
    },
  });

  if (!contacto) notFound();

  const nitSospechoso = contacto.nit ? !nitValido(contacto.nit) : false;
  const saludo = `Hola ${contacto.nombre.split(" ")[0]}, le escribo de ${empresa.nombre}.`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/app/contactos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Contactos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">{contacto.nombre}</h1>
          <p className="mt-1 text-sm text-tinta-500">
            {contacto.negocio ? `${contacto.negocio} · ` : ""}
            {ORIGEN_TEXTO[contacto.origen] ?? contacto.origen}
            {contacto.responsable && ` · atiende ${contacto.responsable.nombre}`}
          </p>
          {contacto.etiquetas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contacto.etiquetas.map((e) => (
                <Insignia key={e}>{e}</Insignia>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonWhatsApp
            numero={contacto.whatsapp}
            mensaje={saludo}
            className="px-3 py-2 text-sm"
            contactoId={contacto.id}
            resumen="Le escribiste por WhatsApp desde su ficha"
          />
          <BotonEnlace
            href={`/app/cotizaciones/nueva?contacto=${contacto.id}`}
            variante="secundario"
          >
            Cotizar
          </BotonEnlace>
          <BotonEnlace href={`/app/contactos/${contacto.id}/editar`} variante="secundario">
            Editar
          </BotonEnlace>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Oportunidades</h2>
            {contacto.oportunidades.length === 0 ? (
              <p className="text-sm text-tinta-500">
                No hay negocios abiertos con este contacto.{" "}
                <Link href="/app/embudo" className="text-marca-600 hover:underline">
                  Crear una oportunidad
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-tinta-100">
                {contacto.oportunidades.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/app/embudo/${o.id}`}
                        className="truncate text-sm font-medium text-tinta-800 hover:text-marca-600"
                      >
                        {o.titulo}
                      </Link>
                      <p className="flex items-center gap-1.5 text-xs text-tinta-500">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: o.etapa.color }}
                        />
                        {o.etapa.nombre}
                        {o.fechaCierre && ` · cierra ${fecha(o.fechaCierre)}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-tinta-900">
                      {quetzales(aNumero(o.monto))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tinta-900">Actividades</h2>
              <Link
                href={`/app/actividades/nueva?contacto=${contacto.id}`}
                className="text-sm text-marca-600 hover:underline"
              >
                Agendar
              </Link>
            </div>
            {contacto.actividades.length === 0 ? (
              <p className="text-sm text-tinta-500">
                Todavía no hay llamadas ni mensajes registrados.
              </p>
            ) : (
              <ul className="divide-y divide-tinta-100">
                {contacto.actividades.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p
                        className={
                          a.completada
                            ? "truncate text-sm text-tinta-400 line-through"
                            : "truncate text-sm text-tinta-800"
                        }
                      >
                        {a.titulo}
                      </p>
                      <p className="text-xs capitalize text-tinta-500">
                        {a.tipo.toLowerCase()}
                        {a.venceEl && ` · ${fecha(a.venceEl)}`}
                      </p>
                    </div>
                    {a.completada ? (
                      <Insignia tono="exito">Hecho</Insignia>
                    ) : (
                      a.venceEl && (
                        <Insignia
                          tono={a.venceEl.getTime() < Date.now() ? "peligro" : "neutro"}
                        >
                          {tiempoRelativo(a.venceEl)}
                        </Insignia>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Notas</h2>
            <FormularioNota accion={agregarNota.bind(null, contacto.id)} />
            {contacto.notasRel.length > 0 && (
              <ul className="mt-4 space-y-3">
                {contacto.notasRel.map((n) => (
                  <li key={n.id} className="rounded-lg bg-tinta-50 px-3 py-2">
                    <p className="whitespace-pre-wrap text-sm text-tinta-800">{n.contenido}</p>
                    <p className="mt-1 text-xs text-tinta-500">
                      {n.usuario.nombre} · {fechaHora(n.creadoEl)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-4">
          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Información</h2>
            <dl className="space-y-3">
              <Dato etiqueta="Teléfono" valor={mostrarTelefono(contacto.telefono)} />
              <Dato etiqueta="WhatsApp" valor={mostrarTelefono(contacto.whatsapp)} />
              <Dato
                etiqueta="Correo"
                valor={
                  contacto.email && (
                    <a href={`mailto:${contacto.email}`} className="hover:underline">
                      {contacto.email}
                    </a>
                  )
                }
              />
              <Dato
                etiqueta="NIT"
                valor={
                  contacto.nit && (
                    <span className="flex items-center gap-1.5">
                      {mostrarNit(contacto.nit)}
                      {nitSospechoso && (
                        <span
                          title="El dígito verificador no cuadra. Revisalo antes de facturar."
                          className="text-amber-600"
                        >
                          <Icono nombre="alerta" className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  )
                }
              />
              <Dato
                etiqueta="Dirección"
                valor={
                  [contacto.direccion, contacto.municipio, contacto.departamento]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
              <Dato etiqueta="Cliente desde" valor={fecha(contacto.creadoEl)} />
            </dl>
            {contacto.notas && (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-tinta-50 px-3 py-2 text-sm text-tinta-700">
                {contacto.notas}
              </p>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Cotizaciones</h2>
            {contacto.cotizaciones.length === 0 ? (
              <p className="text-sm text-tinta-500">Sin cotizaciones todavía.</p>
            ) : (
              <ul className="space-y-2">
                {contacto.cotizaciones.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/app/cotizaciones/${c.id}`}
                      className="text-tinta-700 hover:text-marca-600"
                    >
                      #{c.numero} · {fecha(c.fecha)}
                    </Link>
                    <span className="font-medium text-tinta-900">
                      {quetzales(aNumero(c.total))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
