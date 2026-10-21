"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { planEfectivo } from "@/lib/planes";
import { verificarLimite } from "@/lib/limites";
import { comoError } from "@/lib/acciones";
import { espaciosDisponibles } from "@/lib/espacios";
import { sincronizarCitaConGoogle } from "@/lib/google";
import { anotarEnHistorial, procesarRecordatorios, programarRecordatorios } from "@/lib/agenda";
import { fechaDeCita, instanteGT, normalizarTelefono, partesLocalesGT } from "@/lib/gt";

/**
 * Lo que hace el paciente desde /reservar/<slug>, sin cuenta. Todo se vuelve a
 * validar en el servidor: el horario elegido tiene que seguir libre cuando
 * llega la reserva.
 */

async function empresaQueReserva(slug: string) {
  const empresa = await prisma.empresa.findUnique({ where: { slug } });
  if (!empresa || !empresa.reservasActivas) return null;
  return empresa;
}

async function servicioYProfesionales(empresaId: string, tipoId: string, profesionalId: string) {
  const tipo = tipoId
    ? await prisma.tipoConsulta.findFirst({
        where: { id: tipoId, empresaId, activo: true, reservable: true },
        select: { id: true, nombre: true, duracionMin: true, profesionalIds: true },
      })
    : null;
  if (tipoId && !tipo) return null;
  // Si el servicio lo atienden solo algunos, se respeta; si el paciente eligió a
  // alguien, tiene que ser de esos.
  const permitidos = tipo && tipo.profesionalIds.length > 0 ? tipo.profesionalIds : null;
  const ids = profesionalId
    ? permitidos && !permitidos.includes(profesionalId)
      ? []
      : [profesionalId]
    : permitidos;
  const profesionales = await prisma.profesional.findMany({
    where: {
      empresaId,
      activo: true,
      horarios: { some: {} },
      ...(ids ? { id: { in: ids } } : {}),
    },
    select: { id: true, duracionMin: true },
    orderBy: { nombre: "asc" },
  });
  return { tipo, profesionales };
}

function limitesDeFecha(empresa: { reservasAnticipacionHoras: number; reservasDiasMax: number }) {
  const noAntesDe = new Date(Date.now() + empresa.reservasAnticipacionHoras * 3_600_000);
  const hasta = new Date(Date.now() + empresa.reservasDiasMax * 86_400_000);
  return { noAntesDe, hasta };
}

export type EspacioPublico = { hora: string; profesionalId: string };

export async function espaciosParaReservar(
  slug: string,
  tipoId: string,
  profesionalId: string,
  fecha: string,
): Promise<EspacioPublico[]> {
  const empresa = await empresaQueReserva(slug);
  if (!empresa || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  const datos = await servicioYProfesionales(empresa.id, tipoId, profesionalId);
  if (!datos) return [];
  const { noAntesDe, hasta } = limitesDeFecha(empresa);
  const inicioDia = instanteGT(fecha, "00:00");
  if (!inicioDia || inicioDia > hasta) return [];

  // Con "cualquiera", cada hora se le asigna al primer profesional libre.
  const porHora = new Map<string, string>();
  for (const p of datos.profesionales) {
    const libres = await espaciosDisponibles({
      empresaId: empresa.id,
      profesionalId: p.id,
      fecha,
      duracionMin: datos.tipo?.duracionMin ?? p.duracionMin,
      pasoMin: datos.tipo?.duracionMin ?? p.duracionMin,
      noAntesDe,
      exigirHorario: true,
    });
    for (const l of libres) {
      const h = partesLocalesGT(l).hora;
      if (!porHora.has(h)) porHora.set(h, p.id);
    }
  }
  return [...porHora.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hora, id]) => ({ hora, profesionalId: id }));
}

const esquema = z.object({
  tipoId: z.string().trim(),
  profesionalId: z.string().trim().min(1, "Elegí la hora de nuevo."),
  fecha: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha."),
  hora: z.string().trim().regex(/^\d{2}:\d{2}$/, "Elegí la hora."),
  nombre: z.string().trim().min(3, "Escribí su nombre completo."),
  whatsapp: z.string().trim().min(8, "Escribí su número de WhatsApp."),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v.toLowerCase()))
    .optional()
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Ese correo no parece válido."),
  consentimiento: z.literal(true, { errorMap: () => ({ message: "Necesitamos su autorización para guardar sus datos." }) }),
});

export type ResultadoReserva = { error?: string; token?: string } | null;

export async function reservar(slug: string, _estado: ResultadoReserva, datos: FormData): Promise<ResultadoReserva> {
  try {
    // Campo trampa: las personas no lo ven, los robots lo llenan.
    if (((datos.get("sitio") as string) ?? "").trim()) return { error: "No se pudo completar la reserva." };

    const empresa = await empresaQueReserva(slug);
    if (!empresa) return { error: "Esta clínica no está recibiendo reservas en línea." };
    const campo = (n: string) => (datos.get(n) as string | null) ?? "";
    const e = esquema.parse({
      tipoId: campo("tipoId"),
      profesionalId: campo("profesionalId"),
      fecha: campo("fecha"),
      hora: campo("hora"),
      nombre: campo("nombre"),
      whatsapp: campo("whatsapp"),
      email: campo("email"),
      consentimiento: datos.get("consentimiento") === "on",
    });
    const whatsapp = normalizarTelefono(e.whatsapp);
    if (!whatsapp) return { error: "Ese número de WhatsApp no parece válido." };

    await verificarLimite(empresa.id, planEfectivo(empresa), "citasPorMes").catch(() => {
      throw new Error("En este momento no hay espacios en línea. Comuníquese con la clínica.");
    });

    const datosServicio = await servicioYProfesionales(empresa.id, e.tipoId, e.profesionalId);
    const profesional = datosServicio?.profesionales[0];
    if (!datosServicio || !profesional) return { error: "Ese profesional ya no está disponible. Elija otro." };
    const duracion = datosServicio.tipo?.duracionMin ?? profesional.duracionMin;

    const inicio = instanteGT(e.fecha, e.hora);
    if (!inicio) return { error: "La fecha u hora no es válida." };
    const { noAntesDe, hasta } = limitesDeFecha(empresa);
    if (inicio < noAntesDe || inicio > hasta) return { error: "Ese horario ya no se puede reservar. Elija otro." };

    const libres = await espaciosDisponibles({
      empresaId: empresa.id,
      profesionalId: profesional.id,
      fecha: e.fecha,
      duracionMin: duracion,
      pasoMin: duracion,
      noAntesDe,
      exigirHorario: true,
    });
    if (!libres.some((l) => l.getTime() === inicio.getTime())) {
      return { error: "Alguien acaba de tomar ese horario. Elija otro, por favor." };
    }

    // Un mismo número no acapara la agenda.
    let contacto = await prisma.contacto.findFirst({ where: { empresaId: empresa.id, whatsapp } });
    if (contacto) {
      const pendientes = await prisma.cita.count({
        where: {
          contactoId: contacto.id,
          origen: "EN_LINEA",
          estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
          inicio: { gt: new Date() },
        },
      });
      if (pendientes >= 2) {
        return { error: "Ya tiene dos citas reservadas en línea. Para otra, comuníquese con la clínica." };
      }
      if (!contacto.email && e.email) {
        contacto = await prisma.contacto.update({ where: { id: contacto.id }, data: { email: e.email } });
      }
      if (!contacto.consentimientoEl) {
        await prisma.contacto.update({ where: { id: contacto.id }, data: { consentimientoEl: new Date() } });
      }
    } else {
      await verificarLimite(empresa.id, planEfectivo(empresa), "contactos").catch(() => {
        throw new Error("En este momento no hay espacios en línea. Comuníquese con la clínica.");
      });
      contacto = await prisma.contacto.create({
        data: {
          empresaId: empresa.id,
          nombre: e.nombre,
          whatsapp,
          telefono: whatsapp,
          email: e.email ?? null,
          origen: "SITIO_WEB",
          etiquetas: ["paciente"],
          consentimientoEl: new Date(),
        },
      });
    }

    const cita = await prisma.cita.create({
      data: {
        empresaId: empresa.id,
        contactoId: contacto.id,
        profesionalId: profesional.id,
        tipoConsultaId: datosServicio.tipo?.id ?? null,
        inicio,
        fin: new Date(inicio.getTime() + duracion * 60_000),
        motivo: datosServicio.tipo?.nombre ?? "Consulta",
        origen: "EN_LINEA",
        invitarPaciente: true,
        tokenPublico: randomBytes(18).toString("base64url"),
      },
    });

    await anotarEnHistorial(empresa.id, contacto.id, `Reservó en línea para el ${fechaDeCita(inicio)}`);
    await programarRecordatorios(cita.id, { avisarAhora: true });
    await sincronizarCitaConGoogle(cita.id);
    await procesarRecordatorios({ citaId: cita.id }).catch((err) =>
      console.error("Reserva en línea: no salió la confirmación inmediata", err),
    );
    return { token: cita.tokenPublico };
  } catch (err) {
    return comoError(err);
  }
}
