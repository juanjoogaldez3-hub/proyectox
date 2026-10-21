"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, fechaDeInput, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { normalizarTelefono } from "@/lib/gt";
import { puedeVerExpediente } from "@/lib/roles";
import { registrarAccesoExpediente } from "@/lib/expediente";

/**
 * Pacientes de la clínica. Por dentro son contactos (la misma tabla), con los
 * datos de salud que solo tiene sentido pedir en una clínica.
 */

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre del paciente."),
  whatsapp: textoOpcional,
  telefono: textoOpcional,
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v.toLowerCase()))
    .optional()
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, "Ese correo no parece válido."),
  fechaNacimiento: fechaDeInput(),
  dpi: textoOpcional,
  sexo: textoOpcional,
  tipoSangre: textoOpcional,
  seguroMedico: textoOpcional,
  alergias: textoOpcional,
  antecedentes: textoOpcional,
  contactoEmergenciaNombre: textoOpcional,
  contactoEmergenciaTelefono: textoOpcional,
  direccion: textoOpcional,
  municipio: textoOpcional,
  departamento: textoOpcional,
  notas: textoOpcional,
  consentimiento: z.boolean(),
});

function leer(datos: FormData) {
  const campo = (n: string) => (datos.get(n) as string | null) ?? "";
  const e = esquema.parse({
    nombre: campo("nombre"),
    whatsapp: campo("whatsapp"),
    telefono: campo("telefono"),
    email: campo("email"),
    fechaNacimiento: campo("fechaNacimiento"),
    dpi: campo("dpi"),
    sexo: campo("sexo"),
    tipoSangre: campo("tipoSangre"),
    seguroMedico: campo("seguroMedico"),
    alergias: campo("alergias"),
    antecedentes: campo("antecedentes"),
    contactoEmergenciaNombre: campo("contactoEmergenciaNombre"),
    contactoEmergenciaTelefono: campo("contactoEmergenciaTelefono"),
    direccion: campo("direccion"),
    municipio: campo("municipio"),
    departamento: campo("departamento"),
    notas: campo("notas"),
    consentimiento: datos.get("consentimiento") === "on",
  });
  if (e.fechaNacimiento && e.fechaNacimiento > new Date()) {
    throw new Error("La fecha de nacimiento no puede ser en el futuro.");
  }
  const telefono = normalizarTelefono(e.telefono);
  const dpi = e.dpi ? e.dpi.replace(/\D/g, "") : null;
  if (dpi && dpi.length !== 13) throw new Error("El DPI tiene 13 dígitos.");
  return {
    datos: {
      nombre: e.nombre,
      whatsapp: normalizarTelefono(e.whatsapp) ?? telefono,
      telefono,
      email: e.email ?? null,
      fechaNacimiento: e.fechaNacimiento ?? null,
      dpi,
      sexo: e.sexo ?? null,
      tipoSangre: e.tipoSangre ?? null,
      seguroMedico: e.seguroMedico ?? null,
      alergias: e.alergias ?? null,
      antecedentes: e.antecedentes ?? null,
      contactoEmergenciaNombre: e.contactoEmergenciaNombre ?? null,
      contactoEmergenciaTelefono: normalizarTelefono(e.contactoEmergenciaTelefono),
      direccion: e.direccion ?? null,
      municipio: e.municipio ?? null,
      departamento: e.departamento ?? null,
      notas: e.notas ?? null,
    },
    consentimiento: e.consentimiento,
  };
}

/** Evita pacientes repetidos: mismo WhatsApp o mismo DPI. */
async function buscarDuplicado(
  empresaId: string,
  datos: { whatsapp: string | null; dpi: string | null },
  excluirId?: string,
) {
  const condiciones = [
    ...(datos.whatsapp ? [{ whatsapp: datos.whatsapp }] : []),
    ...(datos.dpi ? [{ dpi: datos.dpi }] : []),
  ];
  if (condiciones.length === 0) return null;
  return prisma.contacto.findFirst({
    where: { empresaId, OR: condiciones, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true, nombre: true },
  });
}

export async function crearPaciente(_estado: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  let id: string;
  try {
    const { empresa, usuario, plan } = await requerirSesion();
    await verificarLimite(empresa.id, plan, "contactos");
    const { datos: valores, consentimiento } = leer(datos);
    const repetido = await buscarDuplicado(empresa.id, valores);
    if (repetido) {
      return { error: `Ya existe un paciente con ese WhatsApp o DPI: ${repetido.nombre}.` };
    }
    const paciente = await prisma.contacto.create({
      data: {
        ...valores,
        empresaId: empresa.id,
        origen: "VISITA",
        etiquetas: ["paciente"],
        responsableId: usuario.id,
        consentimientoEl: consentimiento ? new Date() : null,
      },
    });
    id = paciente.id;
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/pacientes");
  redirect(`/app/pacientes/${id}`);
}

export async function actualizarPaciente(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const actual = await prisma.contacto.findFirst({
      where: { id, empresaId: empresa.id },
      select: { id: true, consentimientoEl: true },
    });
    if (!actual) return { error: "No encontramos a ese paciente." };
    const { datos: valores, consentimiento } = leer(datos);
    const repetido = await buscarDuplicado(empresa.id, valores, id);
    if (repetido) {
      return { error: `Ya existe un paciente con ese WhatsApp o DPI: ${repetido.nombre}.` };
    }
    await prisma.contacto.update({
      where: { id: actual.id },
      data: {
        ...valores,
        // Se conserva la fecha original en que autorizó.
        consentimientoEl: consentimiento ? (actual.consentimientoEl ?? new Date()) : null,
      },
    });
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/pacientes");
  revalidatePath(`/app/pacientes/${id}`);
  redirect(`/app/pacientes/${id}`);
}

// --- Expediente --------------------------------------------------------------

const esquemaNota = z.object({
  citaId: textoOpcional,
  motivo: textoOpcional,
  presion: textoOpcional,
  pesoKg: textoOpcional,
  tallaCm: textoOpcional,
  temperatura: textoOpcional,
  diagnostico: textoOpcional,
  tratamiento: textoOpcional,
  receta: textoOpcional,
});

export async function crearNotaClinica(
  contactoId: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa, usuario } = await requerirSesion();
    if (!puedeVerExpediente(usuario.rol)) {
      return { error: "Solo los médicos y administradores escriben en el expediente." };
    }
    const paciente = await prisma.contacto.findFirst({
      where: { id: contactoId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!paciente) return { error: "No encontramos a ese paciente." };

    const campo = (n: string) => (datos.get(n) as string | null) ?? "";
    const e = esquemaNota.parse(Object.fromEntries(Object.keys(esquemaNota.shape).map((k) => [k, campo(k)])));
    if (!e.motivo && !e.diagnostico && !e.tratamiento && !e.receta) {
      return { error: "Escribí al menos el motivo, el diagnóstico, el tratamiento o la receta." };
    }

    let profesionalId = usuario.profesionalId ?? null;
    if (e.citaId) {
      const cita = await prisma.cita.findFirst({
        where: { id: e.citaId, empresaId: empresa.id, contactoId: paciente.id },
        select: { id: true, profesionalId: true },
      });
      if (!cita) return { error: "Esa cita no es de este paciente." };
      profesionalId = profesionalId ?? cita.profesionalId;
    }

    await prisma.notaClinica.create({
      data: {
        empresaId: empresa.id,
        contactoId: paciente.id,
        citaId: e.citaId ?? null,
        profesionalId,
        usuarioId: usuario.id,
        motivo: e.motivo ?? null,
        presion: e.presion ?? null,
        pesoKg: e.pesoKg ?? null,
        tallaCm: e.tallaCm ?? null,
        temperatura: e.temperatura ?? null,
        diagnostico: e.diagnostico ?? null,
        tratamiento: e.tratamiento ?? null,
        receta: e.receta ?? null,
      },
    });
    await registrarAccesoExpediente(empresa.id, paciente.id, usuario.id, "Escribió una nota clínica", true);
  } catch (e) {
    return comoError(e);
  }
  revalidatePath(`/app/pacientes/${contactoId}`);
  return { ok: true };
}
