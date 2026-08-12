"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EstadoCotizacion, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import { comoError, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { IVA_GUATEMALA, aNumero, calcularTotales, redondear } from "@/lib/gt";

const esquemaItem = z.object({
  productoId: z.string().nullish(),
  descripcion: z.string().trim().min(1, "Cada línea necesita una descripción."),
  cantidad: z.number().positive("La cantidad tiene que ser mayor que cero."),
  precioUnitario: z.number().min(0, "El precio no puede ser negativo."),
});

const esquema = z.object({
  contactoId: z.string().trim().min(1, "Elegí a quién le vas a cotizar."),
  oportunidadId: textoOpcional,
  validaHasta: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : new Date(v)))
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "La fecha no es válida."),
  descuento: z.number().min(0, "El descuento no puede ser negativo."),
  notas: textoOpcional,
  condiciones: textoOpcional,
  items: z.array(esquemaItem).min(1, "Agregá al menos un producto o servicio."),
});

function leer(datos: FormData) {
  let items: unknown;
  try {
    items = JSON.parse((datos.get("items") as string) || "[]");
  } catch {
    throw new Error("No pudimos leer las líneas de la cotización.");
  }

  return esquema.parse({
    contactoId: datos.get("contactoId") ?? "",
    oportunidadId: datos.get("oportunidadId") ?? "",
    validaHasta: datos.get("validaHasta") ?? "",
    descuento: Number((datos.get("descuento") as string) || 0),
    notas: datos.get("notas") ?? "",
    condiciones: datos.get("condiciones") ?? "",
    items,
  });
}

/**
 * Correlativo por empresa. El unique (empresaId, numero) es la garantia real:
 * si dos usuarios guardan al mismo tiempo, uno choca y reintentamos.
 */
async function siguienteNumero(
  tx: Prisma.TransactionClient,
  empresaId: string,
): Promise<number> {
  const ultima = await tx.cotizacion.aggregate({
    where: { empresaId },
    _max: { numero: true },
  });
  return (ultima._max.numero ?? 0) + 1;
}

function esChoqueDeNumero(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function crearCotizacion(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  let destino: string;
  try {
    const { empresa, plan, usuario } = await requerirSesion();
    await verificarLimite(empresa.id, plan, "cotizacionesPorMes");
    const entrada = leer(datos);

    const contacto = await prisma.contacto.findFirst({
      where: { id: entrada.contactoId, empresaId: empresa.id },
      select: { id: true },
    });
    if (!contacto) return { error: "No encontramos ese contacto." };

    const ivaPorcentaje = aNumero(empresa.ivaPorcentaje) || IVA_GUATEMALA;
    const totales = calcularTotales(entrada.items, {
      descuento: entrada.descuento,
      ivaPorcentaje,
    });

    let cotizacionId = "";
    for (let intento = 0; intento < 3; intento++) {
      try {
        const creada = await prisma.$transaction(async (tx) => {
          const numero = await siguienteNumero(tx, empresa.id);
          return tx.cotizacion.create({
            data: {
              empresaId: empresa.id,
              numero,
              contactoId: entrada.contactoId,
              oportunidadId: entrada.oportunidadId ?? null,
              validaHasta: entrada.validaHasta ?? null,
              ivaPorcentaje,
              subtotal: totales.subtotal,
              descuento: totales.descuento,
              iva: totales.iva,
              total: totales.total,
              notas: entrada.notas ?? null,
              condiciones: entrada.condiciones ?? null,
              creadaPorId: usuario.id,
              items: {
                create: entrada.items.map((item, orden) => ({
                  productoId: item.productoId || null,
                  descripcion: item.descripcion,
                  cantidad: item.cantidad,
                  precioUnitario: item.precioUnitario,
                  total: redondear(item.cantidad * item.precioUnitario),
                  orden,
                })),
              },
            },
          });
        });
        cotizacionId = creada.id;
        break;
      } catch (e) {
        if (esChoqueDeNumero(e) && intento < 2) continue;
        throw e;
      }
    }

    destino = `/app/cotizaciones/${cotizacionId}`;
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/cotizaciones");
  redirect(destino);
}

export async function actualizarCotizacion(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const entrada = leer(datos);

    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id, empresaId: empresa.id },
      select: { id: true, estado: true, ivaPorcentaje: true },
    });
    if (!cotizacion) return { error: "No encontramos esa cotización." };
    if (cotizacion.estado === "ACEPTADA") {
      return { error: "Esta cotización ya fue aceptada; no se puede modificar." };
    }

    const ivaPorcentaje = aNumero(cotizacion.ivaPorcentaje);
    const totales = calcularTotales(entrada.items, {
      descuento: entrada.descuento,
      ivaPorcentaje,
    });

    await prisma.$transaction([
      prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } }),
      prisma.cotizacion.update({
        where: { id },
        data: {
          contactoId: entrada.contactoId,
          oportunidadId: entrada.oportunidadId ?? null,
          validaHasta: entrada.validaHasta ?? null,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          iva: totales.iva,
          total: totales.total,
          notas: entrada.notas ?? null,
          condiciones: entrada.condiciones ?? null,
          items: {
            create: entrada.items.map((item, orden) => ({
              productoId: item.productoId || null,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              total: redondear(item.cantidad * item.precioUnitario),
              orden,
            })),
          },
        },
      }),
    ]);
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/cotizaciones");
  revalidatePath(`/app/cotizaciones/${id}`);
  redirect(`/app/cotizaciones/${id}`);
}

export async function cambiarEstadoCotizacion(
  id: string,
  estado: EstadoCotizacion,
): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.cotizacion.updateMany({
    where: { id, empresaId: empresa.id },
    data: {
      estado,
      ...(estado === "ENVIADA" && { enviadaEl: new Date() }),
    },
  });
  revalidatePath("/app/cotizaciones");
  revalidatePath(`/app/cotizaciones/${id}`);
}

export async function eliminarCotizacion(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.cotizacion.deleteMany({ where: { id, empresaId: empresa.id } });
  revalidatePath("/app/cotizaciones");
  redirect("/app/cotizaciones");
}
