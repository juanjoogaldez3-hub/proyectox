"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Plan, Prisma, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, requerirAdmin, requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, numeroDeFormulario, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { normalizarNit, normalizarTelefono } from "@/lib/gt";
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
      },
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/configuracion");
  return { ok: true };
}

// --- Usuarios del equipo ----------------------------------------------------

const esquemaUsuario = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre."),
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  telefono: textoOpcional,
  rol: z.nativeEnum(Rol).default("VENDEDOR"),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres."),
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
    });

    await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: entrada.nombre,
        email: entrada.email,
        telefono: normalizarTelefono(entrada.telefono),
        // PROPIETARIO es único: quien invita reparte ADMIN o VENDEDOR.
        rol: entrada.rol === "PROPIETARIO" ? "ADMIN" : entrada.rol,
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
