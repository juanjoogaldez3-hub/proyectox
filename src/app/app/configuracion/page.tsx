import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, fechaHora } from "@/lib/gt";
import { googleConfigurado, listarCalendarios } from "@/lib/google";
import { FormularioEmpresa, FormularioPassword } from "./formularios";
import { AccionesMiGoogle, ElegirMiCalendario } from "./mi-google-formularios";
import { esAdmin } from "@/lib/roles";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { empresa, usuario } = await requerirSesion();
  const { google: mensajeGoogle } = await searchParams;
  const puedeAdministrar = esAdmin(usuario.rol);
  const esMedico = usuario.rol === "MEDICO" && Boolean(usuario.profesionalId);

  return (
    <div className="space-y-6">
      {esMedico && usuario.profesionalId && (
        <MiGoogleCalendar profesionalId={usuario.profesionalId} empresaId={empresa.id} mensaje={mensajeGoogle} />
      )}

      {esMedico ? null : puedeAdministrar ? (
        <FormularioEmpresa
          valores={{
            nombre: empresa.nombre,
            nit: empresa.nit,
            telefono: empresa.telefono,
            direccion: empresa.direccion,
            departamento: empresa.departamento,
            municipio: empresa.municipio,
            ivaPorcentaje: aNumero(empresa.ivaPorcentaje),
            giro: empresa.giro,
          }}
        />
      ) : (
        <Aviso tono="marca">
          Solo el propietario o un administrador puede cambiar los datos del negocio.
        </Aviso>
      )}

      <FormularioPassword nombre={usuario.nombre} email={usuario.email} />
    </div>
  );
}

/** El médico conecta su propio Google Calendar: sus citas caen ahí y la agenda respeta sus compromisos. */
async function MiGoogleCalendar({
  profesionalId,
  empresaId,
  mensaje,
}: {
  profesionalId: string;
  empresaId: string;
  mensaje?: string;
}) {
  const conexion = await prisma.googleProfesional.findUnique({ where: { profesionalId } });
  let calendarios: Awaited<ReturnType<typeof listarCalendarios>> = [];
  let errorCalendarios: string | null = null;
  if (conexion && !conexion.error) {
    try {
      calendarios = await listarCalendarios(empresaId, { tipo: "profesional", profesionalId });
    } catch (e) {
      errorCalendarios = e instanceof Error ? e.message : "No se pudo leer tu lista de calendarios.";
    }
  }

  return (
    <Tarjeta className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta-900">
            <Icono nombre="calendario" /> Mi Google Calendar
          </h2>
          <p className="mt-1 text-sm text-tinta-500">
            Tus citas aparecen solas en tu calendario y se actualizan si se mueven o cancelan. Además, la
            agenda no ofrece las horas en que ya tenés algo en tu calendario.
          </p>
        </div>
        {conexion && !conexion.error && <Insignia tono="exito">Conectado</Insignia>}
        {conexion?.error && <Insignia tono="peligro">Requiere reconectar</Insignia>}
      </div>

      {mensaje === "ok" && <Aviso tono="exito">¡Tu Google Calendar quedó conectado! Tus próximas citas ya están ahí.</Aviso>}
      {mensaje && mensaje !== "ok" && <Aviso tono="peligro">{mensaje}</Aviso>}

      {!googleConfigurado() ? (
        <Aviso>La clínica todavía no tiene activada la conexión con Google. Pedíselo a quien administra el sistema.</Aviso>
      ) : !conexion || conexion.error ? (
        <div className="space-y-2">
          {conexion?.error && <Aviso tono="peligro">{conexion.error}</Aviso>}
          <a
            href="/api/google/conectar?para=medico"
            className="inline-flex items-center gap-2 rounded-lg border border-tinta-300 bg-white px-3.5 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
          >
            <Icono nombre="calendario" />
            {conexion ? "Reconectar mi Google" : "Conectar mi Google Calendar"}
          </a>
          <p className="text-xs text-tinta-500">
            Mientras no lo conectes, tus citas van al calendario de la clínica.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-tinta-700">
            Cuenta: <strong>{conexion.email}</strong>
            <span className="text-tinta-500"> · desde {fechaHora(conexion.conectadaEl)}</span>
          </p>
          {errorCalendarios && <Aviso tono="peligro">{errorCalendarios}</Aviso>}
          {calendarios.length > 0 && <ElegirMiCalendario calendarios={calendarios} actual={conexion.calendarioId} />}
          <AccionesMiGoogle />
        </div>
      )}
    </Tarjeta>
  );
}
