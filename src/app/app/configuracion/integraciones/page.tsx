import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { fechaHora } from "@/lib/gt";
import { urlBase } from "@/lib/citas";
import { googleConfigurado, listarCalendarios, urlRetornoGoogle } from "@/lib/google";
import {
  AccionesGoogle,
  DesconectarWhatsApp,
  ElegirCalendario,
  FormularioWhatsApp,
  ProbarWhatsApp,
} from "./formularios";
import { esAdmin } from "@/lib/roles";

export const metadata: Metadata = { title: "Google y WhatsApp" };

const TEXTO_SEGUIMIENTO =
  "Hola {{1}}, le escribimos de {{2}}. Ya le toca su {{3}}.\n\nPuede agendar aquí: {{4}}";

const TEXTO_PLANTILLA =
  "Hola {{1}}, le recordamos su cita en {{2}} el {{3}}.\n\nConfirme, cancele o agréguela a su calendario aquí: {{4}}\n\nTambién puede responder 1 para confirmar o 2 para cancelar.";

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-50 text-xs font-semibold text-marca-700">
        {n}
      </span>
      <div className="min-w-0 text-sm text-tinta-600">{children}</div>
    </li>
  );
}

function Codigo({ children }: { children: React.ReactNode }) {
  return <code className="break-all rounded bg-tinta-100 px-1.5 py-0.5 font-mono text-xs text-tinta-800">{children}</code>;
}

export default async function PaginaIntegraciones({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { empresa, usuario } = await requerirSesion();
  const { google: mensajeGoogle } = await searchParams;
  const puedeAdministrar = esAdmin(usuario.rol);

  const [google, whatsapp, enviados7Dias, fallidos7Dias] = await Promise.all([
    prisma.integracionGoogle.findUnique({ where: { empresaId: empresa.id } }),
    prisma.integracionWhatsApp.findUnique({ where: { empresaId: empresa.id } }),
    prisma.recordatorio.count({
      where: {
        empresaId: empresa.id,
        estado: { in: ["ENVIADO", "ENTREGADO", "LEIDO"] },
        enviadoEl: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
    prisma.recordatorio.count({
      where: {
        empresaId: empresa.id,
        estado: "FALLIDO",
        actualizadoEl: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
  ]);

  let calendarios: Awaited<ReturnType<typeof listarCalendarios>> = [];
  let errorCalendarios: string | null = null;
  if (google && !google.error) {
    try {
      calendarios = await listarCalendarios(empresa.id);
    } catch (e) {
      errorCalendarios = e instanceof Error ? e.message : "No se pudo leer la lista de calendarios.";
    }
  }

  return (
    <div className="space-y-6">
      {!puedeAdministrar && (
        <Aviso tono="marca">Solo el propietario o un administrador puede cambiar las integraciones.</Aviso>
      )}

      {/* ---------------------------------------------------------- Google */}
      <Tarjeta className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta-900">
              <Icono nombre="calendario" /> Google Calendar
            </h2>
            <p className="mt-1 text-sm text-tinta-500">
              Cada cita aparece en el calendario de la clínica y, si el paciente tiene correo, le llega
              la invitación a su propio Google Calendar. Si la movés o cancelás, se actualiza en los dos.
            </p>
          </div>
          {google && !google.error && <Insignia tono="exito">Conectado</Insignia>}
          {google?.error && <Insignia tono="peligro">Requiere reconectar</Insignia>}
        </div>

        {mensajeGoogle === "ok" && <Aviso tono="exito">¡Google Calendar quedó conectado!</Aviso>}
        {mensajeGoogle && mensajeGoogle !== "ok" && <Aviso tono="peligro">{mensajeGoogle}</Aviso>}

        {!googleConfigurado() ? (
          <Aviso>
            El servidor todavía no tiene credenciales de Google. Quien administra la instalación tiene
            que crear un cliente OAuth en Google Cloud y definir <Codigo>GOOGLE_CLIENT_ID</Codigo> y{" "}
            <Codigo>GOOGLE_CLIENT_SECRET</Codigo>, con la URL de retorno{" "}
            <Codigo>{urlRetornoGoogle()}</Codigo>.
          </Aviso>
        ) : !google || google.error ? (
          <div className="space-y-2">
            {google?.error && <Aviso tono="peligro">{google.error}</Aviso>}
            {puedeAdministrar && (
              <a
                href="/api/google/conectar"
                className="inline-flex items-center gap-2 rounded-lg border border-tinta-300 bg-white px-3.5 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
              >
                <Icono nombre="calendario" />
                {google ? "Reconectar con Google" : "Conectar con Google"}
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-tinta-700">
              Cuenta: <strong>{google.email}</strong>
              <span className="text-tinta-500"> · desde {fechaHora(google.conectadaEl)}</span>
            </p>
            {errorCalendarios && <Aviso tono="peligro">{errorCalendarios}</Aviso>}
            <p className="text-xs text-tinta-500">
              Los médicos con usuario pueden conectar su propio Google Calendar desde Mi cuenta: sus
              citas van a su calendario y la agenda respeta sus compromisos personales.
            </p>
            {puedeAdministrar && calendarios.length > 0 && (
              <ElegirCalendario calendarios={calendarios} actual={google.calendarioId} />
            )}
            {puedeAdministrar && <AccionesGoogle />}
          </div>
        )}
      </Tarjeta>

      {/* -------------------------------------------------------- WhatsApp */}
      <Tarjeta className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta-900">
              <Icono nombre="whatsapp" /> Recordatorios por WhatsApp
            </h2>
            <p className="mt-1 text-sm text-tinta-500">
              Salen solos desde el número de la clínica (API oficial de WhatsApp Business): una
              confirmación al agendar y recordatorios antes de la cita. El paciente responde 1 para
              confirmar o 2 para cancelar, y la agenda se actualiza.
            </p>
          </div>
          {whatsapp?.activa && <Insignia tono="exito">Activo</Insignia>}
          {whatsapp && !whatsapp.activa && <Insignia tono="alerta">Pausado</Insignia>}
        </div>

        {whatsapp && (
          <p className="text-sm text-tinta-700">
            Número: <strong>{whatsapp.numeroVisible ?? whatsapp.phoneNumberId}</strong>
            {whatsapp.nombreVerificado && <span className="text-tinta-500"> · {whatsapp.nombreVerificado}</span>}
            <span className="block text-xs text-tinta-500">
              Últimos 7 días: {enviados7Dias} enviado{enviados7Dias === 1 ? "" : "s"}
              {fallidos7Dias > 0 && `, ${fallidos7Dias} con error`}.
            </span>
          </p>
        )}

        {puedeAdministrar && (
          <FormularioWhatsApp
            valores={
              whatsapp && {
                phoneNumberId: whatsapp.phoneNumberId,
                plantillaRecordatorio: whatsapp.plantillaRecordatorio,
                plantillaConfirmacion: whatsapp.plantillaConfirmacion,
                plantillaSeguimiento: whatsapp.plantillaSeguimiento,
                idiomaPlantilla: whatsapp.idiomaPlantilla,
                horasPrimero: whatsapp.horasPrimero,
                horasSegundo: whatsapp.horasSegundo,
                enviarConfirmacion: whatsapp.enviarConfirmacion,
                activa: whatsapp.activa,
              }
            }
          />
        )}

        {puedeAdministrar && whatsapp?.activa && (
          <div className="border-t border-tinta-100 pt-4">
            <h3 className="mb-2 text-sm font-medium text-tinta-800">Probar la plantilla</h3>
            <ProbarWhatsApp />
          </div>
        )}

        <details className="rounded-lg border border-tinta-200 bg-tinta-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-tinta-800">
            Cómo conectar el WhatsApp de la clínica
          </summary>
          <ol className="mt-3 space-y-3">
            <Paso n={1}>
              En <Codigo>business.facebook.com</Codigo> creá una app de tipo Empresa, agregale el producto
              WhatsApp y registrá el número de la clínica.
            </Paso>
            <Paso n={2}>
              En WhatsApp Manager → Plantillas creá una de categoría <strong>Utilidad</strong>, idioma
              español, llamada <Codigo>recordatorio_cita</Codigo>, con este texto:
              <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 font-mono text-xs text-tinta-800">
                {TEXTO_PLANTILLA}
              </pre>
              <span className="mt-1 block text-xs">
                {"{{1}}"} nombre · {"{{2}}"} clínica · {"{{3}}"} fecha, hora y profesional · {"{{4}}"} enlace
                del paciente. Meta suele aprobarla en minutos.
              </span>
            </Paso>
            <Paso n={3}>
              Opcional: una segunda plantilla <Codigo>aviso_control</Codigo> para avisar que le toca su
              próximo control:
              <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 font-mono text-xs text-tinta-800">
                {TEXTO_SEGUIMIENTO}
              </pre>
            </Paso>
            <Paso n={4}>
              Creá un usuario del sistema con permiso <Codigo>whatsapp_business_messaging</Codigo>, generá
              un token permanente y pegalo arriba junto con el Phone Number ID.
            </Paso>
            <Paso n={5}>
              Para que las respuestas 1 / 2 actualicen la agenda, en la app de Meta → WhatsApp →
              Configuración → Webhook poné la URL <Codigo>{urlBase()}/api/whatsapp/webhook</Codigo>, el
              token de verificación que definió quien administra el servidor y suscribí el campo{" "}
              <Codigo>messages</Codigo>.
            </Paso>
          </ol>
        </details>

        {puedeAdministrar && whatsapp && (
          <div className="flex justify-end">
            <DesconectarWhatsApp />
          </div>
        )}
      </Tarjeta>

      <p className="text-xs text-tinta-400">
        Los recordatorios los dispara una tarea programada cada pocos minutos (
        <Codigo>/api/cron/recordatorios</Codigo>). Si no llegan, pedile a quien administra el servidor
        que revise que esté activa.
      </p>
    </div>
  );
}
