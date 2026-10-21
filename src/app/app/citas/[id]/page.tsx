import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EstadoRecordatorio, TipoRecordatorio } from "@prisma/client";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Boton, BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { diaLargo, fechaHora, mostrarTelefono, partesLocalesGT } from "@/lib/gt";
import {
  ESTADOS_CITA,
  citaVigente,
  enlaceGoogleCalendar,
  enlacePublicoCita,
  mensajeRecordatorio,
  rangoHoras,
} from "@/lib/citas";
import { reintentarGoogle } from "../acciones";
import { AccionesCita, BotonEnviarRecordatorio, EnlacePaciente } from "./acciones-cita";

export const metadata: Metadata = { title: "Cita" };

const TIPO_RECORDATORIO: Record<TipoRecordatorio, string> = {
  CONFIRMACION: "Confirmación",
  PRIMERO: "Primer recordatorio",
  SEGUNDO: "Segundo recordatorio",
};

const ESTADO_RECORDATORIO: Record<
  EstadoRecordatorio,
  { texto: string; tono: "neutro" | "marca" | "exito" | "alerta" | "peligro" }
> = {
  PENDIENTE: { texto: "Programado", tono: "neutro" },
  ENVIANDO: { texto: "Enviando", tono: "marca" },
  ENVIADO: { texto: "Enviado", tono: "marca" },
  ENTREGADO: { texto: "Entregado", tono: "exito" },
  LEIDO: { texto: "Leído", tono: "exito" },
  FALLIDO: { texto: "Falló", tono: "peligro" },
  CANCELADO: { texto: "Cancelado", tono: "neutro" },
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

export default async function PaginaCita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const cita = await prisma.cita.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      contacto: { select: { id: true, nombre: true, whatsapp: true, telefono: true, email: true } },
      profesional: { select: { nombre: true, especialidad: true, color: true } },
      creadaPor: { select: { nombre: true } },
      recordatorios: { orderBy: { programadoPara: "asc" } },
    },
  });
  if (!cita) notFound();

  const [google, whatsapp] = await Promise.all([
    prisma.integracionGoogle.findUnique({
      where: { empresaId: empresa.id },
      select: { email: true, error: true },
    }),
    prisma.integracionWhatsApp.findUnique({
      where: { empresaId: empresa.id },
      select: { activa: true },
    }),
  ]);

  const estado = ESTADOS_CITA[cita.estado];
  const vigente = citaVigente(cita.estado);
  const duracion = Math.round((cita.fin.getTime() - cita.inicio.getTime()) / 60_000);
  const enlace = enlacePublicoCita(cita.tokenPublico);
  const lugar = [empresa.direccion, empresa.municipio, empresa.departamento].filter(Boolean).join(", ");
  const enlaceGoogle = enlaceGoogleCalendar({
    titulo: `Cita en ${empresa.nombre}: ${cita.motivo}`,
    inicio: cita.inicio,
    fin: cita.fin,
    detalle: `Confirmar o cancelar: ${enlace}`,
    lugar,
  });
  const mensaje = mensajeRecordatorio({
    inicio: cita.inicio,
    paciente: cita.contacto.nombre,
    clinica: empresa.nombre,
    profesional: cita.profesional?.nombre,
    token: cita.tokenPublico,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/app/citas?fecha=${partesLocalesGT(cita.inicio).fecha}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Agenda
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">{cita.contacto.nombre}</h1>
            <Insignia tono={estado.tono}>{estado.texto}</Insignia>
          </div>
          <p className="mt-1 text-sm text-tinta-600 first-letter:uppercase">
            {diaLargo(cita.inicio)} · {rangoHoras(cita.inicio, cita.fin)}
          </p>
          <p className="text-sm text-tinta-500">
            {cita.motivo}
            {cita.profesional && ` · ${cita.profesional.nombre}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vigente && (
            <BotonWhatsApp
              numero={cita.contacto.whatsapp}
              mensaje={mensaje}
              texto="Escribirle"
              className="px-3 py-2 text-sm"
              contactoId={cita.contacto.id}
              resumen="Le escribiste por WhatsApp sobre su cita"
            />
          )}
          {vigente && (
            <BotonEnlace href={`/app/citas/${cita.id}/editar`} variante="secundario">
              Reprogramar
            </BotonEnlace>
          )}
        </div>
      </div>

      <div className="mb-4">
        <AccionesCita id={cita.id} estado={cita.estado} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-tinta-900">Recordatorios por WhatsApp</h2>
              {vigente && whatsapp?.activa && cita.contacto.whatsapp && (
                <BotonEnviarRecordatorio id={cita.id} />
              )}
            </div>
            {!whatsapp?.activa ? (
              <p className="text-sm text-tinta-500">
                Los recordatorios automáticos necesitan el WhatsApp de la clínica conectado.{" "}
                <Link href="/app/configuracion/integraciones" className="text-marca-600 hover:underline">
                  Conectarlo
                </Link>
                . Mientras tanto podés mandarlo a mano con el botón “Escribirle”.
              </p>
            ) : !cita.contacto.whatsapp ? (
              <p className="text-sm text-tinta-500">
                El paciente no tiene WhatsApp registrado.{" "}
                <Link href={`/app/contactos/${cita.contacto.id}/editar`} className="text-marca-600 hover:underline">
                  Agregalo en su ficha
                </Link>{" "}
                y reprogramá para activar los recordatorios.
              </p>
            ) : cita.recordatorios.length === 0 ? (
              <p className="text-sm text-tinta-500">
                No hay recordatorios programados para esta cita.
              </p>
            ) : (
              <ul className="divide-y divide-tinta-100">
                {cita.recordatorios.map((r) => {
                  const e = ESTADO_RECORDATORIO[r.estado];
                  return (
                    <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-tinta-800">{TIPO_RECORDATORIO[r.tipo]}</p>
                        <p className="text-xs text-tinta-500">
                          {r.enviadoEl ? `Enviado ${fechaHora(r.enviadoEl)}` : `Programado ${fechaHora(r.programadoPara)}`}
                          {r.intentos > 1 && ` · ${r.intentos} intentos`}
                        </p>
                        {r.error && r.estado !== "CANCELADO" && (
                          <p className="mt-0.5 text-xs text-red-600">{r.error}</p>
                        )}
                      </div>
                      <Insignia tono={e.tono}>{e.texto}</Insignia>
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-tinta-900">Enlace del paciente</h2>
            <p className="mb-3 text-sm text-tinta-500">
              Ahí ve su cita, la confirma o cancela y la agrega a su Google Calendar o al
              calendario de su celular. Va incluido en cada recordatorio.
            </p>
            <EnlacePaciente enlace={enlace} enlaceGoogle={enlaceGoogle} />
          </Tarjeta>
        </div>

        <div className="space-y-4">
          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Detalle</h2>
            <dl className="space-y-3">
              <Dato
                etiqueta="Paciente"
                valor={
                  <Link href={`/app/contactos/${cita.contacto.id}`} className="hover:text-marca-600">
                    {cita.contacto.nombre}
                  </Link>
                }
              />
              <Dato etiqueta="WhatsApp" valor={mostrarTelefono(cita.contacto.whatsapp)} />
              <Dato etiqueta="Correo" valor={cita.contacto.email} />
              <Dato
                etiqueta="Profesional"
                valor={
                  cita.profesional &&
                  `${cita.profesional.nombre}${cita.profesional.especialidad ? ` · ${cita.profesional.especialidad}` : ""}`
                }
              />
              <Dato etiqueta="Duración" valor={`${duracion} minutos`} />
              <Dato
                etiqueta="Confirmada"
                valor={cita.confirmadaEl && `${fechaHora(cita.confirmadaEl)} · ${cita.confirmadaPor ?? ""}`}
              />
              <Dato
                etiqueta="Cancelada"
                valor={cita.canceladaEl && `${fechaHora(cita.canceladaEl)} · ${cita.motivoCancelacion ?? ""}`}
              />
              <Dato
                etiqueta="Agendada"
                valor={`${fechaHora(cita.creadoEl)}${cita.creadaPor ? ` por ${cita.creadaPor.nombre}` : ""}`}
              />
            </dl>
            {cita.notas && (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-tinta-50 px-3 py-2 text-sm text-tinta-700">
                {cita.notas}
              </p>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-tinta-900">
              <Icono nombre="calendario" /> Google Calendar
            </h2>
            {!google ? (
              <p className="text-sm text-tinta-500">
                <Link href="/app/configuracion/integraciones" className="text-marca-600 hover:underline">
                  Conectá el calendario de la clínica
                </Link>{" "}
                para que cada cita aparezca sola y el paciente reciba la invitación.
              </p>
            ) : cita.googleError ? (
              <div className="space-y-2">
                <p className="text-sm text-red-700">No se pudo sincronizar: {cita.googleError}</p>
                <form action={reintentarGoogle.bind(null, cita.id)}>
                  <Boton type="submit" variante="secundario" tamano="sm">
                    Reintentar
                  </Boton>
                </form>
              </div>
            ) : cita.googleEventoId ? (
              <p className="text-sm text-tinta-600">
                En el calendario de {google.email}
                {cita.googleSincronizadaEl && ` · actualizado ${fechaHora(cita.googleSincronizadaEl)}`}.
                {cita.invitarPaciente && cita.contacto.email && (
                  <span className="mt-1 block text-xs text-tinta-500">
                    Invitación enviada a {cita.contacto.email}.
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-tinta-500">
                {cita.estado === "CANCELADA" ? "Se quitó del calendario." : "Todavía no está en el calendario."}
              </p>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
