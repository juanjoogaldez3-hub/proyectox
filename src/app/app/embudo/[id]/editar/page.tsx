import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { opcionesDeFormulario } from "@/lib/consultas";
import { EncabezadoPagina } from "@/components/ui";
import { aNumero } from "@/lib/gt";
import { FormularioOportunidad } from "../../formulario";
import { actualizarOportunidad } from "../../acciones";

export const metadata: Metadata = { title: "Editar oportunidad" };

export default async function PaginaEditarOportunidad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { empresa } = await requerirSesion();

  const [oportunidad, opciones] = await Promise.all([
    prisma.oportunidad.findFirst({ where: { id, empresaId: empresa.id } }),
    opcionesDeFormulario(empresa.id),
  ]);

  if (!oportunidad) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo="Editar oportunidad" />
      <FormularioOportunidad
        accion={actualizarOportunidad.bind(null, oportunidad.id)}
        valores={{
          titulo: oportunidad.titulo,
          contactoId: oportunidad.contactoId,
          etapaId: oportunidad.etapaId,
          monto: aNumero(oportunidad.monto),
          fechaCierre: oportunidad.fechaCierre,
          responsableId: oportunidad.responsableId,
        }}
        contactos={opciones.contactos}
        etapas={opciones.etapas}
        usuarios={opciones.usuarios}
        cancelarHref={`/app/embudo/${oportunidad.id}`}
      />
    </div>
  );
}
