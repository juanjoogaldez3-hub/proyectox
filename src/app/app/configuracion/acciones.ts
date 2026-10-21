"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Plan, Prisma, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, requerirAdmin, requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, numeroDeFormulario, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { instanteGT, normalizarNit, normalizarTelefono } from "@/lib/gt";
import { DIAS_SEMANA, horaValida, minutosDelDia } from "@/lib/disponibilidad";
import { PLANES } from "@/lib/planes";

// --- Datos de la empresa ----------------------------------------------------

const esquemaEmpresa = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre de tu negocio."),
  nit: textoOpcional,
  telefono: textoOpcional,
  direccion: textoOpcional,
  departamento: textoOpcional,
  municipio: textoOpcional,
  ivaPorcentaje: numeroDeFormulario.refine(
    (v) => v >= 0 && v <= 100,
    "El IVA tiene que estar entre 0 y 100.",
  ),
  giro: z.enum(["GENERAL", "CLINICA"]).default("GENERAL"),
});

export async function actualizarEmpresa(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaEmpresa.parse({
      nombre: datos.get("nombre") ?? "",
      nit: datos.get("nit") ?? "",
      telefono: datos.get("telefono") ?? "",
      direccion: datos.get("direccion") ?? "",
      departamento: datos.get("departamento") ?? "",
      municipio: datos.get("municipio") ?? "",
      ivaPorcentaje: (datos.get("ivaPorcentaje") as string) || "12",
      giro: (datos.get("giro") as string) || "GENERAL",
    });

    await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        nombre: entrada.nombre,
        nit: normalizarNit(entrada.nit),
        telefono: normalizarTelefono(entrada.telefono),
        direccion: entrada.direccion ?? null,
        departamento: entrada.departamento ?? null,
        municipio: entrada.municipio ?? null,
        ivaPorcentaje: entrada.ivaPorcentaje,
        giro: entrada.giro,
      },
    });
  } catch (e) {
    return comoError(e);
  }

  // El menú cambia con el giro: hay que repintar todo el layout.
  revalidatePath("/app", "layout");
  return { ok: true };
}

// --- Usuarios del equipo ----------------------------------------------------

const esquemaUsuario = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre."),
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  telefono: textoOpcional,
  rol: z.nativeEnum(Rol).default("VENDEDOR"),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres."),
  profesionalId: textoOpcional,
});

export async function crearUsuario(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa, plan } = await requerirAdmin();
    await verificarLimite(empresa.id, plan, "usuarios");

    const entrada = esquemaUsuario.parse({
      nombre: datos.get("nombre") ?? "",
      email: datos.get("email") ?? "",
      telefono: datos.get("telefono") ?? "",
      rol: (datos.get("rol") as string) || "VENDEDOR",
      password: datos.get("password") ?? "",
      profesionalId: datos.get("profesionalId") ?? "",
    });

    let profesionalId: string | null = null;
    if (entrada.rol === "MEDICO") {
      const profesional = await prisma.profesional.findFirst({
        where: { id: entrada.profesionalId ?? "", empresaId: empresa.id },
        select: { id: true, usuario: { select: { id: true } } },
      });
      if (!profesional) return { error: "Elegí qué profesional de la agenda es este médico." };
      if (profesional.usuario) return { error: "Ese profesional ya tiene un usuario." };
      profesionalId = profesional.id;
    }

    await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        email: entrada.email,
        telefono: normalizarTelefono(entrada.telefono),
        // PROPIETARIO es único: quien invita reparte ADMIN o VENDEDOR.
        rol: entrada.rol === "PROPIETARIO" ? "ADMIN" : entrada.rol,
        profesionalId,
        passwordHash: await hashPassword(entrada.password),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    return comoError(e);
  }

  revalidatePath("/app/configuracion/usuarios");
  return { ok: true };
}

export async function alternarUsuario(id: string): Promise<void> {
  const { empresa, usuario: actual } = await requerirAdmin();
  if (id === actual.id) return; // nadie se desactiva a sí mismo

  const objetivo = await prisma.usuario.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true, activo: true, rol: true },
  });
  if (!objetivo || objetivo.rol === "PROPIETARIO") return;

  await prisma.usuario.update({
    where: { id: objetivo.id },
    data: { activo: !objetivo.activo },
  });
  revalidatePath("/app/configuracion/usuarios");
}

// --- Plan y pagos -----------------------------------------------------------

const esquemaPago = z.object({
  plan: z.nativeEnum(Plan),
  metodo: z.string().trim().min(2, "Indicá cómo pagaste."),
  referencia: textoOpcional,
  meses: numeroDeFormulario.transform((v) => Math.max(1, Math.trunc(v))),
});

/**
 * Registra el pago de la suscripcion. Los emprendedores pagan por deposito o
 * transferencia, asi que el cobro se confirma fuera del sistema: aca queda el
 * comprobante y la cuenta se activa por el periodo pagado.
 */
export async function registrarPago(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaPago.parse({
      plan: (datos.get("plan") as string) || "EMPRENDEDOR",
      metodo: (datos.get("metodo") as string) || "",
      referencia: datos.get("referencia") ?? "",
      meses: (datos.get("meses") as string) || "1",
    });

    const definicion = PLANES[entrada.plan];
    if (definicion.precioMensual === 0) {
      return { error: "El plan Gratis no necesita pago." };
    }

    const ahora = new Date();
    // Si la suscripción sigue vigente, el pago se encola a partir de esa fecha.
    const desde =
      empresa.planRenuevaEl && empresa.planRenuevaEl > ahora ? empresa.planRenuevaEl : ahora;
    const hasta = new Date(desde);
    hasta.setMonth(hasta.getMonth() + entrada.meses);

    await prisma.$transaction([
      prisma.pagoSuscripcion.create({
        data: {
          empresaId: empresa.id,
          plan: entrada.plan,
          monto: definicion.precioMensual * entrada.meses,
          metodo: entrada.metodo,
          referencia: entrada.referencia ?? null,
          cubreDesde: desde,
          cubreHasta: hasta,
        },
      }),
      prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          plan: entrada.plan,
          estadoSuscripcion: "ACTIVA",
          planRenuevaEl: hasta,
        },
      }),
    ]);
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion/plan");
  revalidatePath("/app");
  return { ok: true };
}

// --- Etapas del embudo ------------------------------------------------------

const esquemaEtapa = z.object({
  nombre: z.string().trim().min(2, "Ponele nombre a la etapa."),
  probabilidad: numeroDeFormulario.transform((v) => Math.min(100, Math.max(0, Math.trunc(v)))),
  color: z.string().trim().default("#3366f5"),
});

export async function crearEtapa(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaEtapa.parse({
      nombre: datos.get("nombre") ?? "",
      probabilidad: (datos.get("probabilidad") as string) || "0",
      color: (datos.get("color") as string) || "#3366f5",
    });

    // Las etapas nuevas entran antes de las de cierre (ganada/perdida).
    const ultimaAbierta = await prisma.etapaEmbudo.aggregate({
      where: { empresaId: empresa.id, esGanada: false, esPerdida: false },
      _max: { orden: true },
    });

    await prisma.etapaEmbudo.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        probabilidad: entrada.probabilidad,
        color: entrada.color,
        orden: (ultimaAbierta._max.orden ?? 0) + 1,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya tenés una etapa con ese nombre." };
    }
    return comoError(e);
  }

  revalidatePath("/app/configuracion/embudo");
  revalidatePath("/app/embudo");
  return { ok: true };
}

export async function eliminarEtapa(id: string): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const etapa = await prisma.etapaEmbudo.findFirst({
      where: { id, empresaId: empresa.id },
      include: { _count: { select: { oportunidades: true } } },
    });
    if (!etapa) return { error: "No encontramos esa etapa." };
    if (etapa.esGanada || etapa.esPerdida) {
      return { error: "Las etapas de cierre no se pueden eliminar." };
    }
    if (etapa._count.oportunidades > 0) {
      return {
        error: `Esa etapa tiene ${etapa._count.oportunidades} oportunidad(es). Movelas antes de eliminarla.`,
      };
    }

    await prisma.etapaEmbudo.delete({ where: { id: etapa.id } });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion/embudo");
  revalidatePath("/app/embudo");
  return { ok: true };
}

// --- Cuenta propia ----------------------------------------------------------

export async function cambiarPassword(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { usuario } = await requerirSesion();
    const nueva = z
      .string()
      .min(8, "La contraseña necesita al menos 8 caracteres.")
      .parse(datos.get("password") ?? "");

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: await hashPassword(nueva) },
    });
  } catch (e) {
    return comoError(e);
  }

  return { ok: true };
}

// --- Profesionales de la agenda ---------------------------------------------

const esquemaProfesional = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre del profesional."),
  especialidad: textoOpcional,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "El color no es válido.")
    .default("#3366f5"),
  duracionMin: numeroDeFormulario.transform((v) => Math.min(600, Math.max(5, Math.trunc(v) || 30))),
  calendarioId: textoOpcional,
});

function leerProfesional(datos: FormData) {
  return esquemaProfesional.parse({
    nombre: datos.get("nombre") ?? "",
    especialidad: datos.get("especialidad") ?? "",
    color: (datos.get("color") as string) || "#3366f5",
    duracionMin: (datos.get("duracionMin") as string) || "30",
    calendarioId: datos.get("calendarioId") ?? "",
  });
}

export async function crearProfesional(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = leerProfesional(datos);
    await prisma.profesional.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        especialidad: entrada.especialidad ?? null,
        color: entrada.color,
        duracionMin: entrada.duracionMin,
        calendarioId: entrada.calendarioId ?? null,
      },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
  return { ok: true };
}

export async function actualizarProfesional(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = leerProfesional(datos);
    const { count } = await prisma.profesional.updateMany({
      where: { id, empresaId: empresa.id },
      data: {
        nombre: entrada.nombre,
        especialidad: entrada.especialidad ?? null,
        color: entrada.color,
        duracionMin: entrada.duracionMin,
        calendarioId: entrada.calendarioId ?? null,
      },
    });
    if (count === 0) return { error: "No encontramos a ese profesional." };
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
  return { ok: true };
}

export async function alternarProfesional(id: string): Promise<void> {
  const { empresa } = await requerirAdmin();
  const profesional = await prisma.profesional.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true, activo: true },
  });
  if (!profesional) return;
  await prisma.profesional.update({
    where: { id: profesional.id },
    data: { activo: !profesional.activo },
  });
  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
}

// --- Horarios de atención y bloqueos ----------------------------------------

/**
 * Reemplaza el horario semanal del profesional. Cada día trae hasta dos tramos
 * (mañana y tarde) como campos d<dia>_<a|b>_<desde|hasta>.
 */
export async function guardarHorarios(
  profesionalId: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const profesional = await prisma.profesional.findFirst({
      where: { id: profesionalId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!profesional) return { error: "No encontramos a ese profesional." };

    const tramos: { diaSemana: number; desde: string; hasta: string }[] = [];
    for (let dia = 0; dia < 7; dia++) {
      if (datos.get(`d${dia}_atiende`) !== "on") continue;
      for (const t of ["a", "b"]) {
        const desde = ((datos.get(`d${dia}_${t}_desde`) as string) ?? "").trim();
        const hasta = ((datos.get(`d${dia}_${t}_hasta`) as string) ?? "").trim();
        if (!desde && !hasta) continue;
        if (!horaValida(desde) || !horaValida(hasta)) {
          return { error: `Revisá las horas del ${DIAS_SEMANA[dia].toLowerCase()}.` };
        }
        if (minutosDelDia(hasta) <= minutosDelDia(desde)) {
          return { error: `El ${DIAS_SEMANA[dia].toLowerCase()} la hora final tiene que ser después de la inicial.` };
        }
        tramos.push({ diaSemana: dia, desde, hasta });
      }
      const delDia = tramos.filter((t) => t.diaSemana === dia);
      if (delDia.length === 2 && minutosDelDia(delDia[1].desde) < minutosDelDia(delDia[0].hasta)) {
        return { error: `El ${DIAS_SEMANA[dia].toLowerCase()} los dos tramos se cruzan.` };
      }
    }

    await prisma.$transaction([
      prisma.horarioProfesional.deleteMany({ where: { profesionalId: profesional.id } }),
      prisma.horarioProfesional.createMany({
        data: tramos.map((t) => ({ ...t, profesionalId: profesional.id })),
      }),
    ]);
  } catch (e) {
    return comoError(e);
  }

  revalidatePath(`/app/configuracion/profesionales/${profesionalId}`);
  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
  return { ok: true };
}

const esquemaBloqueo = z.object({
  profesionalId: textoOpcional,
  desdeFecha: z.string().trim().min(1, "Elegí desde qué día."),
  desdeHora: z.string().trim().default(""),
  hastaFecha: z.string().trim().min(1, "Elegí hasta qué día."),
  hastaHora: z.string().trim().default(""),
  motivo: z.string().trim().min(2, "Escribí el motivo (vacaciones, almuerzo, congreso…)."),
});

export async function crearBloqueo(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaBloqueo.parse({
      profesionalId: datos.get("profesionalId") ?? "",
      desdeFecha: datos.get("desdeFecha") ?? "",
      desdeHora: datos.get("desdeHora") ?? "",
      hastaFecha: datos.get("hastaFecha") ?? "",
      hastaHora: datos.get("hastaHora") ?? "",
      motivo: datos.get("motivo") ?? "",
    });
    // Sin hora, el bloqueo cubre los días completos.
    const inicio = instanteGT(entrada.desdeFecha, entrada.desdeHora || "00:00");
    const finDia = instanteGT(entrada.hastaFecha, entrada.hastaHora || "00:00");
    if (!inicio || !finDia) return { error: "Revisá las fechas y horas." };
    const fin = entrada.hastaHora ? finDia : new Date(finDia.getTime() + 86_400_000);
    if (fin <= inicio) return { error: "El final tiene que ser después del inicio." };

    if (entrada.profesionalId) {
      const existe = await prisma.profesional.findFirst({
        where: { id: entrada.profesionalId, empresaId: empresa.id },
        select: { id: true },
      });
      if (!existe) return { error: "No encontramos a ese profesional." };
    }

    await prisma.bloqueoAgenda.create({
      data: {
        empresaId: empresa.id,
        profesionalId: entrada.profesionalId ?? null,
        inicio,
        fin,
        motivo: entrada.motivo,
      },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
  return { ok: true };
}

export async function eliminarBloqueo(id: string): Promise<void> {
  const { empresa } = await requerirAdmin();
  await prisma.bloqueoAgenda.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/app/configuracion/profesionales");
  revalidatePath("/app/citas");
}

// --- Servicios (tipos de consulta) y reservas en línea -----------------------

const esquemaServicio = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre del servicio."),
  duracionMin: numeroDeFormulario.transform((v) => Math.min(600, Math.max(5, Math.trunc(v) || 30))),
  precio: numeroDeFormulario.refine((v) => v >= 0, "El precio no puede ser negativo."),
  reservable: z.boolean(),
  profesionalIds: z.array(z.string()),
});

function leerServicio(datos: FormData) {
  return esquemaServicio.parse({
    nombre: datos.get("nombre") ?? "",
    duracionMin: (datos.get("duracionMin") as string) || "30",
    precio: (datos.get("precio") as string) || "0",
    reservable: datos.get("reservable") === "on",
    profesionalIds: datos.getAll("profesionalIds").map(String).filter(Boolean),
  });
}

async function profesionalesDeLaEmpresa(empresaId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const validos = await prisma.profesional.findMany({
    where: { empresaId, id: { in: ids } },
    select: { id: true },
  });
  return validos.map((p) => p.id);
}

export async function crearServicio(_estado: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = leerServicio(datos);
    await prisma.tipoConsulta.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        duracionMin: entrada.duracionMin,
        precio: entrada.precio,
        reservable: entrada.reservable,
        profesionalIds: await profesionalesDeLaEmpresa(empresa.id, entrada.profesionalIds),
      },
    });
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/configuracion/servicios");
  return { ok: true };
}

export async function actualizarServicio(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = leerServicio(datos);
    const { count } = await prisma.tipoConsulta.updateMany({
      where: { id, empresaId: empresa.id },
      data: {
        nombre: entrada.nombre,
        duracionMin: entrada.duracionMin,
        precio: entrada.precio,
        reservable: entrada.reservable,
        profesionalIds: await profesionalesDeLaEmpresa(empresa.id, entrada.profesionalIds),
      },
    });
    if (count === 0) return { error: "No encontramos ese servicio." };
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/configuracion/servicios");
  return { ok: true };
}

export async function alternarServicio(id: string): Promise<void> {
  const { empresa } = await requerirAdmin();
  const servicio = await prisma.tipoConsulta.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true, activo: true },
  });
  if (!servicio) return;
  await prisma.tipoConsulta.update({ where: { id: servicio.id }, data: { activo: !servicio.activo } });
  revalidatePath("/app/configuracion/servicios");
}

const esquemaReservas = z.object({
  reservasActivas: z.boolean(),
  reservasAnticipacionHoras: numeroDeFormulario.transform((v) => Math.min(168, Math.max(0, Math.trunc(v)))),
  reservasDiasMax: numeroDeFormulario.transform((v) => Math.min(180, Math.max(1, Math.trunc(v) || 30))),
});

export async function guardarReservas(_estado: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirAdmin();
    const entrada = esquemaReservas.parse({
      reservasActivas: datos.get("reservasActivas") === "on",
      reservasAnticipacionHoras: (datos.get("reservasAnticipacionHoras") as string) || "2",
      reservasDiasMax: (datos.get("reservasDiasMax") as string) || "30",
    });
    await prisma.empresa.update({ where: { id: empresa.id }, data: entrada });
  } catch (e) {
    return comoError(e);
  }
  revalidatePath("/app/configuracion/servicios");
  return { ok: true };
}
