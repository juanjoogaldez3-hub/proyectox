"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, Boton, Campo } from "@/components/ui";
import { useAccionFormulario } from "@/components/accion-formulario";
import type { EstadoAccion } from "@/lib/acciones";
import {
  desconectarGoogle,
  desconectarWhatsApp,
  elegirCalendario,
  guardarWhatsApp,
  probarWhatsApp,
  sincronizarProximas,
} from "./acciones";

function BotonEnviar({ texto, pendiente, variante = "primario" }: { texto: string; pendiente: string; variante?: "primario" | "secundario" }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" variante={variante} tamano="sm" disabled={pending}>
      {pending ? pendiente : texto}
    </Boton>
  );
}

function Resultado({ estado, exito }: { estado: EstadoAccion; exito: string }) {
  if (estado?.error) return <Aviso tono="peligro">{estado.error}</Aviso>;
  if (estado?.ok) return <Aviso tono="exito">{exito}</Aviso>;
  return null;
}

// --- Google -----------------------------------------------------------------

export function ElegirCalendario({
  calendarios,
  actual,
}: {
  calendarios: { id: string; nombre: string; principal: boolean }[];
  actual: string;
}) {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(elegirCalendario, null);
  // "primary" es el alias de Google para el calendario principal.
  const seleccion = actual === "primary" ? (calendarios.find((c) => c.principal)?.id ?? actual) : actual;

  return (
    <form action={enviar} className="space-y-2">
      <Resultado estado={estado} exito="Listo. Las próximas citas se movieron a ese calendario." />
      <Campo etiqueta="Calendario donde caen las citas">
        <div className="flex flex-wrap gap-2">
          <select name="calendarioId" defaultValue={seleccion} className="campo min-w-0 flex-1">
            {calendarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.principal ? " (principal)" : ""}
              </option>
            ))}
          </select>
          <BotonEnviar texto="Guardar" pendiente="Moviendo citas…" variante="secundario" />
        </div>
      </Campo>
    </form>
  );
}

export function AccionesGoogle() {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoAccion>(null);

  return (
    <div className="space-y-2">
      <Resultado estado={estado} exito="Las próximas citas ya están en Google Calendar." />
      <div className="flex flex-wrap gap-2">
        <Boton
          type="button"
          variante="secundario"
          tamano="sm"
          disabled={pendiente}
          onClick={() => iniciar(async () => setEstado(await sincronizarProximas()))}
        >
          {pendiente ? "Sincronizando…" : "Sincronizar próximas citas"}
        </Boton>
        <form action={desconectarGoogle}>
          <Boton
            type="submit"
            variante="fantasma"
            tamano="sm"
            onClick={(e) => {
              if (!confirm("Las citas nuevas dejarán de llegar a Google Calendar. ¿Desconectar?")) {
                e.preventDefault();
              }
            }}
          >
            Desconectar
          </Boton>
        </form>
      </div>
    </div>
  );
}

// --- WhatsApp ---------------------------------------------------------------

export type ValoresWhatsApp = {
  phoneNumberId: string;
  plantillaRecordatorio: string;
  plantillaConfirmacion: string | null;
  idiomaPlantilla: string;
  horasPrimero: number;
  horasSegundo: number;
  enviarConfirmacion: boolean;
  activa: boolean;
};

export function FormularioWhatsApp({ valores }: { valores: ValoresWhatsApp | null }) {
  const { estado, alEnviar, pendiente } = useAccionFormulario(guardarWhatsApp);

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <Resultado estado={estado} exito="Guardado. Los recordatorios de las próximas citas ya usan esta configuración." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Phone Number ID *" ayuda="En Meta: WhatsApp → Configuración de la API.">
          <input
            name="phoneNumberId"
            required
            inputMode="numeric"
            defaultValue={valores?.phoneNumberId}
            className="campo font-mono"
            placeholder="123456789012345"
          />
        </Campo>
        <Campo
          etiqueta={valores ? "Token de acceso" : "Token de acceso *"}
          ayuda={valores ? "Dejalo vacío para conservar el actual." : "Token permanente de un usuario del sistema."}
        >
          <input
            name="accessToken"
            type="password"
            required={!valores}
            autoComplete="off"
            className="campo font-mono"
            placeholder={valores ? "••••••••••••" : "EAAG…"}
          />
        </Campo>
        <Campo etiqueta="Plantilla de recordatorio *">
          <input
            name="plantillaRecordatorio"
            required
            defaultValue={valores?.plantillaRecordatorio ?? "recordatorio_cita"}
            className="campo font-mono"
          />
        </Campo>
        <Campo etiqueta="Plantilla de confirmación" ayuda="Opcional. Si la dejás vacía usa la de recordatorio.">
          <input
            name="plantillaConfirmacion"
            defaultValue={valores?.plantillaConfirmacion ?? ""}
            className="campo font-mono"
            placeholder="confirmacion_cita"
          />
        </Campo>
        <Campo etiqueta="Idioma de las plantillas">
          <select name="idiomaPlantilla" defaultValue={valores?.idiomaPlantilla ?? "es"} className="campo">
            <option value="es">Español (es)</option>
            <option value="es_MX">Español de México (es_MX)</option>
            <option value="es_ES">Español de España (es_ES)</option>
            <option value="es_AR">Español de Argentina (es_AR)</option>
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="1.er recordatorio" ayuda="Horas antes.">
            <input
              name="horasPrimero"
              type="number"
              min={0}
              max={168}
              defaultValue={valores?.horasPrimero ?? 24}
              className="campo"
            />
          </Campo>
          <Campo etiqueta="2.º recordatorio" ayuda="0 = no enviar.">
            <input
              name="horasSegundo"
              type="number"
              min={0}
              max={168}
              defaultValue={valores?.horasSegundo ?? 2}
              className="campo"
            />
          </Campo>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-tinta-700">
          <input type="checkbox" name="enviarConfirmacion" defaultChecked={valores?.enviarConfirmacion ?? true} />
          Mandar confirmación apenas se agenda la cita
        </label>
        <label className="flex items-center gap-2 text-sm text-tinta-700">
          <input type="checkbox" name="activa" defaultChecked={valores?.activa ?? true} />
          Envíos automáticos activos
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Boton type="submit" tamano="sm" disabled={pendiente}>
          {pendiente ? "Verificando con Meta…" : valores ? "Guardar cambios" : "Conectar WhatsApp"}
        </Boton>
      </div>
    </form>
  );
}

export function ProbarWhatsApp() {
  const [estado, enviar] = useActionState<EstadoAccion, FormData>(probarWhatsApp, null);
  return (
    <form action={enviar} className="space-y-2">
      <Resultado estado={estado} exito="Mensaje de prueba enviado. Revisá ese WhatsApp." />
      <div className="flex flex-wrap gap-2">
        <input
          name="numero"
          type="tel"
          required
          className="campo min-w-0 flex-1"
          placeholder="Tu número, ej. 5555-5555"
        />
        <BotonEnviar texto="Mandar prueba" pendiente="Enviando…" variante="secundario" />
      </div>
    </form>
  );
}

export function DesconectarWhatsApp() {
  return (
    <form action={desconectarWhatsApp}>
      <Boton
        type="submit"
        variante="fantasma"
        tamano="sm"
        onClick={(e) => {
          if (!confirm("Se borran las credenciales y se cancelan los recordatorios programados. ¿Seguir?")) {
            e.preventDefault();
          }
        }}
      >
        Desconectar WhatsApp
      </Boton>
    </form>
  );
}
