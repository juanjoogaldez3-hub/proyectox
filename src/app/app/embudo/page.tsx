import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EncabezadoPagina, EstadoVacio, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, quetzales } from "@/lib/gt";
import { Tablero, type ColumnaEtapa } from "./tablero";

export const metadata: Metadata = { title: "Embudo" };

export default async function PaginaEmbudo() {
  const { empresa } = await requerirSesion();

  const etapas = await prisma.etapaEmbudo.findMany({
    where: { empresaId: empresa.id },
    orderBy: { orden: "asc" },
    include: {
      oportunidades: {
        // Las etapas de cierre solo muestran lo reciente para no cargar todo el historial.
        orderBy: { actualizadoEl: "desc" },
        take: 50,
        include: {
          contacto: { select: { id: true, nombre: true } },
          responsable: { select: { nombre: true } },
        },
      },
    },
  });

  const columnas: ColumnaEtapa[] = etapas.map((etapa) => {
    const tarjetas = etapa.oportunidades.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      monto: aNumero(o.monto),
      contactoId: o.contacto.id,
      contactoNombre: o.contacto.nombre,
      responsable: o.responsable?.nombre ?? null,
    }));
    return {
      id: etapa.id,
      nombre: etapa.nombre,
      color: etapa.color,
      total: tarjetas.reduce((acc, t) => acc + t.monto, 0),
      tarjetas,
    };
  });

  const abiertas = await prisma.oportunidad.aggregate({
    where: { empresaId: empresa.id, estado: "ABIERTA" },
    _sum: { monto: true },
    _count: true,
  });

  const hayOportunidades = columnas.some((c) => c.tarjetas.length > 0);

  return (
    <>
      <EncabezadoPagina
        titulo="Embudo de ventas"
        descripcion={`${abiertas._count} oportunidad${
          abiertas._count === 1 ? "" : "es"
        } abierta${abiertas._count === 1 ? "" : "s"} por ${quetzales(
          aNumero(abiertas._sum.monto),
        )}`}
        acciones={
          <BotonEnlace href="/app/embudo/nueva">
            <Icono nombre="mas" /> Nueva oportunidad
          </BotonEnlace>
        }
      />

      {etapas.length === 0 ? (
        <Tarjeta className="p-5">
          <p className="text-sm text-tinta-600">
            Tu embudo no tiene etapas configuradas. Creálas en{" "}
            <a href="/app/configuracion/embudo" className="text-marca-600 hover:underline">
              Configuración → Embudo
            </a>
            .
          </p>
        </Tarjeta>
      ) : !hayOportunidades ? (
        <EstadoVacio
          titulo="Tu embudo está vacío"
          descripcion="Cada negocio que estés trabajando va acá. Movelo de etapa conforme avanza y vas a ver de un vistazo qué está por cerrarse."
          accion={<BotonEnlace href="/app/embudo/nueva">Crear la primera oportunidad</BotonEnlace>}
        />
      ) : (
        <Tablero columnas={columnas} />
      )}
    </>
  );
}
