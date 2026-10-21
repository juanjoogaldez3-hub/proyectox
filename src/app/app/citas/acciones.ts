"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EstadoCita } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { instanteGT } from "@/lib/gt";
import { citaVigente, rangoHoras } from "@/lib/citas";
import { sincronizarCitaConGoogle } from "@/lib/google";
import {
  anotarEnHistorial,
  cancelarRecordatorios,
  procesarRecordatorios,
  programarRecordatorios,
} from "@/lib/agenda";

const esquema = z.object({
  contactoId: z.string().trim().min(1, "Elegí al paciente."),
  profesionalId: textoOpcional,
  fecha: z.string().trim().min(1, "Elegí la fecha."),
  hora: z.string().trim().min(1, "Elegí la hora."),
  duracionMin: z.coerce
    .number()
    .int()
    .min(5, "La cita tiene que durar al menos 5 minutos.")
    .max(600, "La cita no puede durar más de 10 horas."),
  motivo: z.string().trim().min(2, "Escribí el motivo de la cita."),
  notas: textoOpcional,
  invitarPaciente: z.boolean(),
  avisarAhora: z.boolean(),
});

function leerFormulario(datos: FormData) {
  return esquema.parse({
    contactoId: datos.get("contactoId") ?? "",
    profesionalId: datos.get("profesionalId") ?? "",
    fecha: datos.get("fecha") ?? "",
    hora: datos.get("hora") ?? "",
    duracionMin: (datos.get("duracionMin") as string) || "30",
    motivo: datos.get("motivo") ?? "",
    notas: datos.get("notas") ?? "",
    invitarPaciente: datos.get("invitarPaciente") === "on",
    avisarAhora: datos.get("avisarAhora") === "on",
  });
}

/**
 * Valida lo relacionado con la cita (que todo sea de esta empresa) y que el
 * profesional no tenga otra cita encima. Devuelve el rango ya calculado.
 */
async function validarCita(
  empresaId: string,
  entrada: z.infer<typeof esquema>,
  excluirId?: string,
): Promise<{ inicio: Date; fin: Date }> {
  const inicio = instanteGT(entrada.fecha, entrada.hora);
  if (!inicio) throw new Error("La fecha u hora no es válida.");
  const fin = new Date(inicio.getTime() + entrada.duracionMin * 60_000);

  const contacto = await prisma.contacto.findFirst({
    where: { id: entrada.contactoId, empresaId },
    select: { id: true },
  });
  if (!contacto) throw new Error("No encontramos a ese paciente.");

  if (entrada.profesionalId) {
    const profesional = await prisma.profesional.findFirst({
      where: { id: entrada.profesionalId, empresaId },
      select: { id: true, nombre: true },
    });
    if (!profesional) throw new Error("No encontramos a ese profesional.");

    const choque = await prisma.cita.findFirst({
      where: {
        empresaId,
        profesionalId: profesional.id,
        estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
        inicio: { lt: fin },
        fin: { gt: inicio },
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { inicio: true, fin: true, contacto: { select: { nombre: true } } },
    });
    if (choque) {
      throw new Error(
        `${profesional.nombre} ya tiene cita de ${rangoHoras(choque.inicio, choque.fin)} con ${choque.contacto.nombre}.`,
      );
    }
  }

  return { inicio, fin };
}

/**
 * Lo que pasa después de guardar: recordatorios, Google Calendar y, si tocaba,
 * la confirmación inmediata por WhatsApp. Ninguno de estos pasos puede tumbar
 * la cita ya guardada; los errores quedan anotados en la propia cita.
 */
async function despuesDeGuardar(citaId: string, avisarAhora: boolean): Promise<void> {
  await programarRecordatorios(citaId, { avisarAhora });
  await sincronizarCitaConGoogle(citaId);
  if (avisarAhora) {
    await procesarRecordatorios({ citaId }).catch((e) =>
      console.error("No se pudo mandar la confirmación inmediata:", e),
    );
  }
}

function revalidarAgenda(citaId?: string, contactoId?: string) {
  revalidatePath("/app/citas");
  revalidatePath("/app");
  if (citaId) revalidatePath(`/app/citas/${citaId}`);
  if (contactoId) revalidatePath(`/app/contactos/${contactoId}`);
}

export async function crearCita(_estado: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  let citaId: string;
  try {
    const { empresa, usuario, plan } = await requerirSesion();
    await verificarLimite(empresa.id, plan, "citasPorMes");
    const entrada = leerFormulario(datos);
    const { inicio, fin } = await validarCita(empresa.id, entrada);

    const cita = await prisma.cita.create({
      data: {
        empresaId: empresa.id,
        contactoId: entrada.contactoId,
        profesionalId: entrada.profesionalId ?? null,
        inicio,
        fin,
        motivo: entrada.motivo,
        notas: entrada.notas ?? null,
        invitarPaciente: entrada.invitarPaciente,
        tokenPublico: randomBytes(18).toString("base64url"),
        creadaPorId: usuario.id,
      },
    });
    citaId = cita.id;

    await despuesDeGuardar(cita.id, entrada.avisarAhora);
    revalidarAgenda(cita.id, cita.contactoId);
  } catch (e) {
    return comoError(e);
  }

  redirect(`/app/citas/${citaId}`);
}

export async function actualizarCita(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const actual = await prisma.cita.findFirst({ where: { id, empresaId: empresa.id } });
    if (!actual) return { error: "No encontramos esa cita." };
    if (!citaVigente(actual.estado)) {
      return { error: "Solo se pueden editar citas programadas o confirmadas." };
    }

    const entrada = leerFormulario(datos);
    const { inicio, fin } = await validarCita(empresa.id, entrada, id);
    const cambioHora = inicio.getTime() !== actual.inicio.getTime();

    await prisma.cita.update({
      where: { id: actual.id },
      data: {
        contactoId: entrada.contactoId,
        profesionalId: entrada.profesionalId ?? null,
        inicio,
        fin,
        motivo: entrada.motivo,
        notas: entrada.notas ?? null,
        invitarPaciente: entrada.invitarPaciente,
        // Si se movió de hora, la confirmación anterior ya no vale.
        ...(cambioHora
          ? { estado: "PROGRAMADA" as const, confirmadaEl: null, confirmadaPor: null }
          : {}),
      },
    });

    await despuesDeGuardar(actual.id, cambioHora && entrada.avisarAhora);
    revalidarAgenda(actual.id, entrada.contactoId);
  } catch (e) {
    return comoError(e);
  }

  redirect(`/app/citas/${id}`);
}

const TEXTO_ESTADO: Partial<Record<EstadoCita, string>> = {
  CONFIRMADA: "Confirmó su cita",
  COMPLETADA: "Asistió a su cita",
  NO_ASISTIO: "No se presentó a su cita",
  CANCELADA: "Se canceló su cita",
};

export async function cambiarEstadoCita(id: string, nuevo: EstadoCita): Promise<EstadoAccion> {
  try {
    const { empresa, usuario } = await requerirSesion();
    const cita = await prisma.cita.findFirst({ where: { id, empresaId: empresa.id } });
    if (!cita) return { error: "No encontramos esa cita." };
    if (cita.estado === nuevo) return { ok: true };

    await prisma.cita.update({
      where: { id: cita.id },
      data: {
        estado: nuevo,
        ...(nuevo === "CONFIRMADA"
          ? { confirmadaEl: new Date(), confirmadaPor: usuario.nombre }
          : {}),
        ...(nuevo === "CANCELADA"
          ? { canceladaEl: new Date(), motivoCancelacion: `Cancelada por ${usuario.nombre}` }
          : {}),
        ...(nuevo === "PROGRAMADA"
          ? { canceladaEl: null, motivoCancelacion: null, confirmadaEl: null, confirmadaPor: null }
          : {}),
      },
    });

    if (citaVigente(nuevo)) {
      // Reactivada o confirmada: los recordatorios siguen (o vuelven) en pie.
      await programarRecordatorios(cita.id, { avisarAhora: false });
    } else {
      await cancelarRecordatorios(cita.id);
    }
    await sincronizarCitaConGoogle(cita.id);

    const texto = TEXTO_ESTADO[nuevo];
    if (texto) {
      await anotarEnHistorial(empresa.id, cita.contactoId, `${texto} (${usuario.nombre})`, usuario.id);
    }
    revalidarAgenda(cita.id, cita.contactoId);
  } catch (e) {
    return comoError(e);
  }
  return { ok: true };
}

/** Manda ya mismo el recordatorio por WhatsApp, sin esperar al programado. */
export async function enviarRecordatorioAhora(id: string): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const cita = await prisma.cita.findFirst({
      where: { id, empresaId: empresa.id },
      select: { id: true, contactoId: true, estado: true, contacto: { select: { whatsapp: true } } },
    });
    if (!cita) return { error: "No encontramos esa cita." };
    if (!citaVigente(cita.estado)) return { error: "La cita ya no está vigente." };
    if (!cita.contacto.whatsapp) return { error: "El paciente no tiene WhatsApp registrado." };

    const whatsapp = await prisma.integracionWhatsApp.findUnique({
      where: { empresaId: empresa.id },
      select: { activa: true },
    });
    if (!whatsapp?.activa) {
      return { error: "Conectá WhatsApp en Configuración → Google y WhatsApp para enviar automático." };
    }

    await prisma.recordatorio.upsert({
      where: { citaId_tipo: { citaId: cita.id, tipo: "CONFIRMACION" } },
      create: {
        empresaId: empresa.id,
        citaId: cita.id,
        tipo: "CONFIRMACION",
        programadoPara: new Date(),
      },
      update: {
        programadoPara: new Date(),
        estado: "PENDIENTE",
        intentos: 0,
        error: null,
        enviadoEl: null,
        mensajeId: null,
      },
    });
    const resultado = await procesarRecordatorios({ citaId: cita.id });
    revalidarAgenda(cita.id);

    if (resultado.enviados === 0) {
      const ultimo = await prisma.recordatorio.findUnique({
        where: { citaId_tipo: { citaId: cita.id, tipo: "CONFIRMACION" } },
        select: { error: true },
      });
      return { error: ultimo?.error ?? "No se pudo enviar el mensaje." };
    }
  } catch (e) {
    return comoError(e);
  }
  return { ok: true };
}

export async function reintentarGoogle(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  const cita = await prisma.cita.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true },
  });
  if (!cita) return;
  await sincronizarCitaConGoogle(cita.id);
  revalidatePath(`/app/citas/${cita.id}`);
}
