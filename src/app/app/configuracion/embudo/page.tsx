import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Insignia, Tarjeta } from "@/components/ui";
import { FormularioEtapa, BotonEliminarEtapa } from "./formulario";

export const metadata: Metadata = { title: "Embudo" };

export default async function PaginaEmbudoConfig() {
  const { empresa, usuario } = await requerirSesion();
  const esAdmin = usuario.rol !== "VENDEDOR";

  const etapas = await prisma.etapaEmbudo.findMany({
    where: { empresaId: empresa.id },
    orderBy: { orden: "asc" },
    include: { _count: { select: { oportunidades: true } } },
  });

  return (
    <div className="space-y-6">
      <Tarjeta className="overflow-hidden">
        <div className="border-b border-tinta-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-tinta-900">Etapas de tu embudo</h2>
          <p className="mt-0.5 text-xs text-tinta-500">
            El orden es el recorrido que sigue un negocio hasta cerrarse.
          </p>
        </div>

        <ul className="divide-y divide-tinta-100">
          {etapas.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color }}
                />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-tinta-900">
                    {e.nombre}
                    {e.esGanada && <Insignia tono="exito">Cierre ganado</Insignia>}
                    {e.esPerdida && <Insignia tono="peligro">Cierre perdido</Insignia>}
                  </p>
                  <p className="text-xs text-tinta-500">
                    {e.probabilidad}% de probabilidad · {e._count.oportunidades} oportunidad
                    {e._count.oportunidades === 1 ? "" : "es"}
                  </p>
                </div>
              </div>
              {esAdmin && !e.esGanada && !e.esPerdida && <BotonEliminarEtapa id={e.id} />}
            </li>
          ))}
        </ul>
      </Tarjeta>

      {esAdmin ? (
        <FormularioEtapa />
      ) : (
        <Aviso tono="marca">Solo el propietario o un administrador cambia el embudo.</Aviso>
      )}
    </div>
  );
}
