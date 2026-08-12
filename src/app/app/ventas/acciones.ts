"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { comoError, textoOpcional, type EstadoAccion } from "@/lib/acciones";
import { IVA_GUATEMALA, aNumero, calcularTotales, normalizarNit, redondear } from "@/lib/gt";

type LineaVenta = {
  productoId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

async function siguienteNumero(
  tx: Prisma.TransactionClient,
  empresaId: string,
): Promise<number> {
  const ultima = await tx.venta.aggregate({ where: { empresaId }, _max: { numero: true } });
  return (ultima._max.numero ?? 0) + 1;
}

/**
 * Descuenta existencias y deja el movimiento correspondiente. Si no alcanza el
 * inventario corta la operacion: preferimos que el usuario corrija su stock a
 * quedarnos con existencias en negativo que despues nadie entiende.
 */
async function descontarInventario(
  tx: Prisma.TransactionClient,
  empresaId: string,
  usuarioId: string,
  referencia: string,
  lineas: LineaVenta[],
): Promise<void> {
  const porProducto = new Map<string, number>();
  for (const linea of lineas) {
    if (!linea.productoId) continue;
    porProducto.set(
      linea.productoId,
      (porProducto.get(linea.productoId) ?? 0) + linea.cantidad,
    );
  }

  for (const [productoId, cantidad] of porProducto) {
    const producto = await tx.producto.findFirst({
      where: { id: productoId, empresaId },
      select: { id: true, nombre: true, stock: true, controlaInventario: true },
    });
    if (!producto || !producto.controlaInventario) continue;

    const unidades = Math.ceil(cantidad);
    const stockFinal = producto.stock - unidades;
    if (stockFinal < 0) {
      throw new Error(
        `No alcanza el inventario de "${producto.nombre}": tenés ${producto.stock} y la venta lleva ${unidades}. Registrá la entrada antes de vender.`,
      );
    }

    await tx.producto.update({ where: { id: producto.id }, data: { stock: stockFinal } });
    await tx.movimientoInventario.create({
      data: {
        empresaId,
        productoId: producto.id,
        tipo: "SALIDA",
        cantidad: unidades,
        stockFinal,
        motivo: "Venta",
        referencia,
        usuarioId,
      },
    });
  }
}

/** Devuelve al inventario lo que salió con la venta. */
async function devolverInventario(
  tx: Prisma.TransactionClient,
  empresaId: string,
  usuarioId: string,
  referencia: string,
  lineas: { productoId: string | null; cantidad: Prisma.Decimal | number }[],
): Promise<void> {
  const porProducto = new Map<string, number>();
  for (const linea of lineas) {
    if (!linea.productoId) continue;
    porProducto.set(
      linea.productoId,
      (porProducto.get(linea.productoId) ?? 0) + aNumero(linea.cantidad),
    );
  }

  for (const [productoId, cantidad] of porProducto) {
    const producto = await tx.producto.findFirst({
      where: { id: productoId, empresaId },
      select: { id: true, stock: true, controlaInventario: true },
    });
    if (!producto || !producto.controlaInventario) continue;

    const unidades = Math.ceil(cantidad);
    const stockFinal = producto.stock + unidades;
    await tx.producto.update({ where: { id: producto.id }, data: { stock: stockFinal } });
    await tx.movimientoInventario.create({
      data: {
        empresaId,
        productoId: producto.id,
        tipo: "ENTRADA",
        cantidad: unidades,
        stockFinal,
        motivo: "Venta anulada",
        referencia,
        usuarioId,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Convertir una cotizacion en venta
// ---------------------------------------------------------------------------

export async function convertirEnVenta(cotizacionId: string): Promise<void> {
  const { empresa, usuario } = await requerirSesion();

  const ventaId = await prisma.$transaction(async (tx) => {
    const cotizacion = await tx.cotizacion.findFirst({
      where: { id: cotizacionId, empresaId: empresa.id },
      include: { items: { orderBy: { orden: "asc" } }, ventas: { select: { id: true } } },
    });
    if (!cotizacion) throw new Error("No encontramos esa cotización.");
    if (cotizacion.ventas.length > 0) return cotizacion.ventas[0].id;

    const numero = await siguienteNumero(tx, empresa.id);
    const venta = await tx.venta.create({
      data: {
        empresaId: empresa.id,
        numero,
        contactoId: cotizacion.contactoId,
        cotizacionId: cotizacion.id,
        ivaPorcentaje: cotizacion.ivaPorcentaje,
        subtotal: cotizacion.subtotal,
        descuento: cotizacion.descuento,
        iva: cotizacion.iva,
        total: cotizacion.total,
        nitCliente: null,
        creadaPorId: usuario.id,
        items: {
          create: cotizacion.items.map((item, orden) => ({
            productoId: item.productoId,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            total: item.total,
            orden,
          })),
        },
      },
    });

    await descontarInventario(
      tx,
      empresa.id,
      usuario.id,
      `Venta #${numero}`,
      cotizacion.items.map((i) => ({
        productoId: i.productoId,
        descripcion: i.descripcion,
        cantidad: aNumero(i.cantidad),
        precioUnitario: aNumero(i.precioUnitario),
      })),
    );

    await tx.cotizacion.update({
      where: { id: cotizacion.id },
      data: { estado: "ACEPTADA" },
    });

    // Si venía de una oportunidad, la movemos a la etapa ganada.
    if (cotizacion.oportunidadId) {
      const etapaGanada = await tx.etapaEmbudo.findFirst({
        where: { empresaId: empresa.id, esGanada: true },
        select: { id: true },
      });
      await tx.oportunidad.update({
        where: { id: cotizacion.oportunidadId },
        data: {
          estado: "GANADA",
          cerradaEl: new Date(),
          ...(etapaGanada && { etapaId: etapaGanada.id }),
        },
      });
    }

    return venta.id;
  });

  revalidatePath("/app/ventas");
  revalidatePath("/app/cotizaciones");
  revalidatePath("/app/embudo");
  revalidatePath("/app");
  redirect(`/app/ventas/${ventaId}`);
}

// ---------------------------------------------------------------------------
// Venta directa
// ---------------------------------------------------------------------------

const esquemaItem = z.object({
  productoId: z.string().nullish(),
  descripcion: z.string().trim().min(1, "Cada línea necesita una descripción."),
  cantidad: z.number().positive("La cantidad tiene que ser mayor que cero."),
  precioUnitario: z.number().min(0, "El precio no puede ser negativo."),
});

const esquemaVenta = z.object({
  contactoId: z.string().trim().min(1, "Elegí a quién le vendiste."),
  metodoPago: z.string().trim().default("Efectivo"),
  estado: z.enum(["PENDIENTE", "PAGADA"]).default("PAGADA"),
  nitCliente: textoOpcional,
  nombreFactura: textoOpcional,
  descuento: z.number().min(0, "El descuento no puede ser negativo."),
  notas: textoOpcional,
  items: z.array(esquemaItem).min(1, "Agregá al menos un producto."),
});

export async function crearVenta(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  let destino: string;
  try {
    const { empresa, usuario } = await requerirSesion();

    let items: unknown;
    try {
      items = JSON.parse((datos.get("items") as string) || "[]");
    } catch {
      return { error: "No pudimos leer las líneas de la venta." };
    }

    const entrada = esquemaVenta.parse({
      contactoId: datos.get("contactoId") ?? "",
      metodoPago: (datos.get("metodoPago") as string) || "Efectivo",
      estado: (datos.get("estado") as string) || "PAGADA",
      nitCliente: datos.get("nitCliente") ?? "",
      nombreFactura: datos.get("nombreFactura") ?? "",
      descuento: Number((datos.get("descuento") as string) || 0),
      notas: datos.get("notas") ?? "",
      items,
    });

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

    const venta = await prisma.$transaction(async (tx) => {
      const numero = await siguienteNumero(tx, empresa.id);
      const creada = await tx.venta.create({
        data: {
          empresaId: empresa.id,
          numero,
          contactoId: entrada.contactoId,
          estado: entrada.estado,
          metodoPago: entrada.metodoPago,
          nitCliente: normalizarNit(entrada.nitCliente) ?? "CF",
          nombreFactura: entrada.nombreFactura ?? null,
          ivaPorcentaje,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          iva: totales.iva,
          total: totales.total,
          notas: entrada.notas ?? null,
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

      await descontarInventario(
        tx,
        empresa.id,
        usuario.id,
        `Venta #${numero}`,
        entrada.items.map((i) => ({
          productoId: i.productoId ?? null,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      );

      return creada;
    });

    destino = `/app/ventas/${venta.id}`;
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/ventas");
  revalidatePath("/app");
  redirect(destino);
}

export async function marcarVentaPagada(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  await prisma.venta.updateMany({
    where: { id, empresaId: empresa.id, estado: "PENDIENTE" },
    data: { estado: "PAGADA" },
  });
  revalidatePath("/app/ventas");
  revalidatePath(`/app/ventas/${id}`);
}

export async function anularVenta(id: string): Promise<void> {
  const { empresa, usuario } = await requerirSesion();

  await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id, empresaId: empresa.id },
      include: { items: true },
    });
    if (!venta || venta.estado === "ANULADA") return;

    await tx.venta.update({ where: { id: venta.id }, data: { estado: "ANULADA" } });
    await devolverInventario(tx, empresa.id, usuario.id, `Venta #${venta.numero}`, venta.items);
  });

  revalidatePath("/app/ventas");
  revalidatePath(`/app/ventas/${id}`);
  revalidatePath("/app");
}
