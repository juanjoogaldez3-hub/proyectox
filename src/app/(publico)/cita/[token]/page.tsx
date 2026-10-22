import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Insignia } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { diaLargo, hora } from "@/lib/gt";
import {
  ESTADOS_CITA,
  citaVigente,
  cuandoYConQuien,
  enlaceGoogleCalendar,
  enlacePublicoCita,
  primerNombre,
} from "@/lib/citas";
import { RespuestaPaciente } from "./respuesta";
import { calificarDesdeEnlace, cancelarDesdeEnlace, confirmarDesdeEnlace } from "./acciones";
import { Calificar } from "./calificar";

// La abre el paciente: nunca debe quedar cacheada ni indexada.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Su cita",
  robots: { index: false, follow: false },
};

export default async function PaginaCitaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const cita = await prisma.cita.findUnique({
    where: { tokenPublico: token },
    include: {
      empresa: {
        select: { nombre: true, telefono: true, direccion: true, municipio: true, departamento: true },
      },
      contacto: { select: { nombre: true } },
      profesional: { select: { nombre: true, especialidad: true } },
    },
  });
  if (!cita) notFound();

  const { empresa } = cita;
  const lugar = [empresa.direccion, empresa.municipio, empresa.departamento].filter(Boolean).join(", ");
  const yaPaso = cita.inicio.getTime() <= Date.now();
  const puedeResponder = citaVigente(cita.estado) && !yaPaso;
  const estado = ESTADOS_CITA[cita.estado];
  const enlace = enlacePublicoCita(token);

  const evento = {
    titulo: `Cita en ${empresa.nombre}${cita.profesional ? ` con ${cita.profesional.nombre}` : ""}`,
    inicio: cita.inicio,
    fin: cita.fin,
    detalle: `${cita.motivo}\n\nConfirmar o cancelar: ${enlace}`,
    lugar,
  };

  return (
    <div className="min-h-screen bg-tinta-50 py-6">
      <div className="mx-auto max-w-lg space-y-4 px-4">
        <div>
          <p className="text-sm text-tinta-500">{empresa.nombre}</p>
          <h1 className="text-xl font-semibold text-tinta-900">
            Hola {primerNombre(cita.contacto.nombre)}, esta es su cita
          </h1>
        </div>

        <div className="tarjeta overflow-hidden">
          <div className="bg-marca-600 px-5 py-4 text-white">
            <p className="text-sm opacity-90 first-letter:uppercase">{diaLargo(cita.inicio)}</p>
            <p className="text-3xl font-semibold">{hora(cita.inicio)}</p>
          </div>
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-tinta-500">Estado</dt>
              <dd>
                <Insignia tono={estado.tono}>{yaPaso && citaVigente(cita.estado) ? "Pasada" : estado.texto}</Insignia>
              </dd>
            </div>
            {cita.profesional && (
              <div className="flex justify-between gap-2">
                <dt className="text-tinta-500">Le atiende</dt>
                <dd className="text-right text-tinta-900">
                  {cita.profesional.nombre}
                  {cita.profesional.especialidad && (
                    <span className="block text-xs text-tinta-500">{cita.profesional.especialidad}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-tinta-500">Motivo</dt>
              <dd className="text-right text-tinta-900">{cita.motivo}</dd>
            </div>
            {lugar && (
              <div className="flex justify-between gap-2">
                <dt className="text-tinta-500">Dirección</dt>
                <dd className="text-right">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${empresa.nombre}, ${lugar}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-marca-600 hover:underline"
                  >
                    {lugar}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {cita.estado === "CONFIRMADA" && !yaPaso && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            ¡Gracias! Su asistencia está confirmada. Le esperamos el {cuandoYConQuien({ inicio: cita.inicio })}.
          </div>
        )}
        {cita.estado === "CANCELADA" && (
          <div className="rounded-xl border border-tinta-200 bg-white p-4 text-sm text-tinta-600">
            Esta cita fue cancelada. Si desea una nueva, escríbale a {empresa.nombre}.
          </div>
        )}

        {cita.estado === "COMPLETADA" &&
          (cita.calificacion ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              ¡Gracias por calificar su atención!
            </div>
          ) : (
            <Calificar accion={calificarDesdeEnlace.bind(null, token)} />
          ))}

        {puedeResponder && (
          <RespuestaPaciente
            confirmar={confirmarDesdeEnlace.bind(null, token)}
            cancelar={cancelarDesdeEnlace.bind(null, token)}
            yaConfirmada={cita.estado === "CONFIRMADA"}
          />
        )}

        {puedeResponder && (
          <div className="tarjeta space-y-2 p-5">
            <h2 className="text-sm font-semibold text-tinta-900">Agréguela a su calendario</h2>
            <p className="text-sm text-tinta-500">Así su teléfono también le avisa antes de la cita.</p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <a
                href={enlaceGoogleCalendar(evento)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-tinta-300 bg-white px-3.5 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
              >
                <Icono nombre="calendario" /> Google Calendar
              </a>
              <a
                href={`/cita/${token}/ics`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-tinta-300 bg-white px-3.5 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
              >
                <Icono nombre="calendario" /> iPhone / Outlook (.ics)
              </a>
            </div>
          </div>
        )}

        {empresa.telefono && (
          <div className="flex justify-center">
            <BotonWhatsApp
              numero={empresa.telefono}
              mensaje={`Hola, le escribo por mi cita del ${cuandoYConQuien({ inicio: cita.inicio })}.`}
              texto={`Escribirle a ${empresa.nombre}`}
              className="px-3 py-2 text-sm"
            />
          </div>
        )}

        <p className="text-center text-xs text-tinta-400">Agenda gestionada con CRM Chapín</p>
      </div>
    </div>
  );
}
