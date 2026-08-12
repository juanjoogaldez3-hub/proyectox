"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion } from "@/lib/auth";
import { verificarLimite } from "@/lib/limites";
import {
  comoError,
  numeroDeFormulario,
  textoOpcional,
  type EstadoAccion,
} from "@/lib/acciones";

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre del producto."),
  sku: textoOpcional,
  descripcion: textoOpcional,
  precio: numeroDeFormulario.refine((v) => v >= 0, "El precio no puede ser negativo."),
  costo: numeroDeFormulario.refine((v) => v >= 0, "El costo no puede ser negativo."),
  unidad: z.string().trim().default("unidad"),
  controlaInventario: z.coerce.boolean().default(true),
  stock: numeroDeFormulario.transform((v) => Math.trunc(v)),
  stockMinimo: numeroDeFormulario.transform((v) => Math.max(0, Math.trunc(v))),
});

function leer(datos: FormData) {
  return esquema.parse({
    nombre: datos.get("nombre") ?? "",
    sku: datos.get("sku") ?? "",
    descripcion: datos.get("descripcion") ?? "",
    precio: (datos.get("precio") as string) || "0",
    costo: (datos.get("costo") as string) || "0",
    unidad: (datos.get("unidad") as string) || "unidad",
    controlaInventario: datos.get("controlaInventario") === "on",
    stock: (datos.get("stock") as string) || "0",
    stockMinimo: (datos.get("stockMinimo") as string) || "0",
  });
}

function errorDeSku(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    String(e.meta?.target ?? "").includes("sku")
  );
}

export async function crearProducto(
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  let destino: string;
  try {
    const { empresa, plan, usuario } = await requerirSesion();
    await verificarLimite(empresa.id, plan, "productos");
    const entrada = leer(datos);

    const producto = await prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({
        data: {
          empresaId: empresa.id,
          nombre: entrada.nombre,
          sku: entrada.sku ?? null,
          descripcion: entrada.descripcion ?? null,
          precio: entrada.precio,
          costo: entrada.costo,
          unidad: entrada.unidad,
          controlaInventario: entrada.controlaInventario,
          stock: entrada.controlaInventario ? entrada.stock : 0,
          stockMinimo: entrada.stockMinimo,
        },
      });

      // El stock inicial queda como movimiento para que el historial cuadre.
      if (creado.controlaInventario && creado.stock !== 0) {
        await tx.movimientoInventario.create({
          data: {
            empresaId: empresa.id,
            productoId: creado.id,
            tipo: "ENTRADA",
            cantidad: creado.stock,
            stockFinal: creado.stock,
            motivo: "Existencia inicial",
            usuarioId: usuario.id,
          },
        });
      }
      return creado;
    });

    destino = `/app/productos/${producto.id}`;
  } catch (e) {
    if (errorDeSku(e)) return { error: "Ya tenés otro producto con ese código (SKU)." };
    return comoError(e);
  }

  revalidatePath("/app/productos");
  redirect(destino);
}

export async function actualizarProducto(
  id: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa } = await requerirSesion();
    const entrada = leer(datos);

    // El stock no se edita acá: se mueve con entradas, salidas y ajustes.
    const { count } = await prisma.producto.updateMany({
      where: { id, empresaId: empresa.id },
      data: {
        nombre: entrada.nombre,
        sku: entrada.sku ?? null,
        descripcion: entrada.descripcion ?? null,
        precio: entrada.precio,
        costo: entrada.costo,
        unidad: entrada.unidad,
        controlaInventario: entrada.controlaInventario,
        stockMinimo: entrada.stockMinimo,
      },
    });
    if (count === 0) return { error: "No encontramos ese producto." };
  } catch (e) {
    if (errorDeSku(e)) return { error: "Ya tenés otro producto con ese código (SKU)." };
    return comoError(e);
  }

  revalidatePath("/app/productos");
  revalidatePath(`/app/productos/${id}`);
  redirect(`/app/productos/${id}`);
}

const esquemaMovimiento = z.object({
  tipo: z.nativeEnum(TipoMovimiento),
  cantidad: numeroDeFormulario.transform((v) => Math.trunc(v)),
  motivo: textoOpcional,
});

/**
 * ENTRADA suma, SALIDA resta y AJUSTE fija el stock en la cantidad indicada.
 * Todo pasa por una transaccion para que el movimiento y el stock no se
 * desincronicen si algo falla a medias.
 */
export async function registrarMovimiento(
  productoId: string,
  _estado: EstadoAccion,
  datos: FormData,
): Promise<EstadoAccion> {
  try {
    const { empresa, usuario } = await requerirSesion();
    const entrada = esquemaMovimiento.parse({
      tipo: datos.get("tipo") ?? "ENTRADA",
      cantidad: (datos.get("cantidad") as string) || "0",
      motivo: datos.get("motivo") ?? "",
    });

    if (entrada.tipo !== "AJUSTE" && entrada.cantidad <= 0) {
      return { error: "La cantidad tiene que ser mayor que cero." };
    }
    if (entrada.cantidad < 0) {
      return { error: "La cantidad no puede ser negativa." };
    }

    await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findFirst({
        where: { id: productoId, empresaId: empresa.id },
        select: { id: true, stock: true, controlaInventario: true },
      });
      if (!producto) throw new Error("No encontramos ese producto.");
      if (!producto.controlaInventario) {
        throw new Error("Este producto no controla inventario.");
      }

      const stockFinal =
        entrada.tipo === "ENTRADA"
          ? producto.stock + entrada.cantidad
          : entrada.tipo === "SALIDA"
            ? producto.stock - entrada.cantidad
            : entrada.cantidad;

      if (stockFinal < 0) {
        throw new Error(
          `No alcanza el inventario: tenés ${producto.stock} y querés sacar ${entrada.cantidad}.`,
        );
      }

      await tx.producto.update({ where: { id: producto.id }, data: { stock: stockFinal } });
      await tx.movimientoInventario.create({
        data: {
          empresaId: empresa.id,
          productoId: producto.id,
          tipo: entrada.tipo,
          cantidad: entrada.cantidad,
          stockFinal,
          motivo: entrada.motivo ?? null,
          usuarioId: usuario.id,
        },
      });
    });
  } catch (e) {
    return comoError(e);
  }

  revalidatePath("/app/productos");
  revalidatePath(`/app/productos/${productoId}`);
  return { ok: true };
}

export async function alternarActivo(id: string): Promise<void> {
  const { empresa } = await requerirSesion();
  const producto = await prisma.producto.findFirst({
    where: { id, empresaId: empresa.id },
    select: { id: true, activo: true },
  });
  if (!producto) return;

  await prisma.producto.update({
    where: { id: producto.id },
    data: { activo: !producto.activo },
  });
  revalidatePath("/app/productos");
  revalidatePath(`/app/productos/${id}`);
}
