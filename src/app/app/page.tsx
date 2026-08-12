import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, EstadoVacio, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { aNumero, quetzales, tiempoRelativo } from "@/lib/gt";

export const metadata: Metadata = { title: "Resumen" };

function inicioDelMes(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelDia(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function Metrica({
  titulo,
  valor,
  detalle,
  href,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  href: string;
}) {
  return (
    <Link href={href} className="tarjeta block p-4 transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-tinta-500">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-tinta-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-tinta-500">{detalle}</p>}
    </Link>
  );
}

export default async function PaginaResumen() {
  const { empresa, usuario } = await requerirSesion();
  const empresaId = empresa.id;
  const desde = inicioDelMes();

  const [
    ventasMes,
    oportunidadesAbiertas,
    pendientesHoy,
    vencidas,
    contactosMes,
    bajoStock,
    proximasActividades,
    porEtapa,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where: { empresaId, estado: { not: "ANULADA" }, fecha: { gte: desde } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.oportunidad.aggregate({
      where: { empresaId, estado: "ABIERTA" },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.actividad.count({
      where: { empresaId, completada: false, venceEl: { lte: finDelDia() } },
    }),
    prisma.actividad.count({
      where: { empresaId, completada: false, venceEl: { lt: new Date() } },
    }),
    prisma.contacto.count({ where: { empresaId, creadoEl: { gte: desde } } }),
    prisma.$queryRaw<{ conteo: bigint }[]>`
      SELECT COUNT(*)::bigint AS conteo
      FROM "Producto"
      WHERE "empresaId" = ${empresaId}
        AND "activo" = true
        AND "controlaInventario" = true
        AND "stock" <= "stockMinimo"
    `,
    prisma.actividad.findMany({
      where: { empresaId, completada: false },
      orderBy: [{ venceEl: "asc" }, { creadoEl: "asc" }],
      take: 8,
      include: { contacto: { select: { id: true, nombre: true } } },
    }),
    prisma.etapaEmbudo.findMany({
      where: { empresaId, esGanada: false, esPerdida: false },
      orderBy: { orden: "asc" },
      include: {
        _count: { select: { oportunidades: { where: { estado: "ABIERTA" } } } },
      },
    }),
  ]);

  const productosBajoStock = Number(bajoStock[0]?.conteo ?? 0);
  const hayDatos =
    ventasMes._count > 0 || oportunidadesAbiertas._count > 0 || contactosMes > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">
            Hola, {usuario.nombre.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-tinta-500">Así va tu negocio este mes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonEnlace href="/app/contactos/nuevo" variante="secundario">
            <Icono nombre="mas" /> Contacto
          </BotonEnlace>
          <BotonEnlace href="/app/cotizaciones/nueva">
            <Icono nombre="mas" /> Cotización
          </BotonEnlace>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          titulo="Vendido este mes"
          valor={quetzales(aNumero(ventasMes._sum.total))}
          detalle={`${ventasMes._count} venta${ventasMes._count === 1 ? "" : "s"}`}
          href="/app/ventas"
        />
        <Metrica
          titulo="En el embudo"
          valor={quetzales(aNumero(oportunidadesAbiertas._sum.monto))}
          detalle={`${oportunidadesAbiertas._count} oportunidad${
            oportunidadesAbiertas._count === 1 ? "" : "es"
          } abierta${oportunidadesAbiertas._count === 1 ? "" : "s"}`}
          href="/app/embudo"
        />
        <Metrica
          titulo="Pendientes para hoy"
          valor={String(pendientesHoy)}
          detalle={vencidas > 0 ? `${vencidas} ya vencida${vencidas === 1 ? "" : "s"}` : "Al día"}
          href="/app/actividades"
        />
        <Metrica
          titulo="Contactos nuevos"
          valor={String(contactosMes)}
          detalle="Agregados este mes"
          href="/app/contactos"
        />
      </div>

      {productosBajoStock > 0 && (
        <Link
          href="/app/productos?filtro=bajo-stock"
          className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
        >
          <Icono nombre="alerta" />
          {productosBajoStock} producto{productosBajoStock === 1 ? "" : "s"} llegó al stock
          mínimo. Revisá qué necesitás pedir.
        </Link>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Tarjeta className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-tinta-900">Lo que sigue</h2>
            <Link href="/app/actividades" className="text-sm text-marca-600 hover:underline">
              Ver todo
            </Link>
          </div>

          {proximasActividades.length === 0 ? (
            <EstadoVacio
              titulo="No tenés pendientes"
              descripcion="Agendá una llamada o un mensaje de seguimiento para que no se te pase ningún cliente."
              accion={
                <BotonEnlace href="/app/actividades" tamano="sm">
                  Agendar seguimiento
                </BotonEnlace>
              }
            />
          ) : (
            <ul className="divide-y divide-tinta-100">
              {proximasActividades.map((a) => {
                const atrasada = a.venceEl ? a.venceEl.getTime() < Date.now() : false;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-tinta-800">{a.titulo}</p>
                      <p className="truncate text-xs text-tinta-500">
                        {a.tipo.toLowerCase()}
                        {a.contacto && (
                          <>
                            {" · "}
                            <Link
                              href={`/app/contactos/${a.contacto.id}`}
                              className="hover:underline"
                            >
                              {a.contacto.nombre}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    {a.venceEl && (
                      <Insignia tono={atrasada ? "peligro" : "neutro"}>
                        {tiempoRelativo(a.venceEl)}
                      </Insignia>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-tinta-900">Embudo</h2>
            <Link href="/app/embudo" className="text-sm text-marca-600 hover:underline">
              Abrir
            </Link>
          </div>
          {porEtapa.length === 0 ? (
            <p className="text-sm text-tinta-500">Todavía no hay etapas configuradas.</p>
          ) : (
            <ul className="space-y-2">
              {porEtapa.map((etapa) => (
                <li key={etapa.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: etapa.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-tinta-700">{etapa.nombre}</span>
                  <span className="font-medium text-tinta-900">
                    {etapa._count.oportunidades}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {!hayDatos && (
        <Tarjeta className="mt-6 p-5">
          <h2 className="font-semibold text-tinta-900">Empezá en 3 pasos</h2>
          <ol className="mt-3 space-y-2 text-sm text-tinta-600">
            <li>
              1. <Link href="/app/contactos/nuevo" className="text-marca-600 hover:underline">
                Agregá tus primeros clientes
              </Link>{" "}
              (o los que te escriben por WhatsApp).
            </li>
            <li>
              2. <Link href="/app/productos/nuevo" className="text-marca-600 hover:underline">
                Cargá tus productos o servicios
              </Link>{" "}
              con precio en quetzales.
            </li>
            <li>
              3. <Link href="/app/cotizaciones/nueva" className="text-marca-600 hover:underline">
                Mandá tu primera cotización
              </Link>{" "}
              por WhatsApp.
            </li>
          </ol>
        </Tarjeta>
      )}
    </>
  );
}
