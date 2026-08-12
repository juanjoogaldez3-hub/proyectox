import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { opcionesDeFormulario } from "@/lib/consultas";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioOportunidad } from "../formulario";
import { crearOportunidad } from "../acciones";

export const metadata: Metadata = { title: "Nueva oportunidad" };

export default async function PaginaNuevaOportunidad({
  searchParams,
}: {
  searchParams: Promise<{ contacto?: string }>;
}) {
  const { empresa } = await requerirSesion();
  const { contacto } = await searchParams;
  const { contactos, etapas, usuarios } = await opcionesDeFormulario(empresa.id);

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Nueva oportunidad"
        descripcion="Un negocio que estás trabajando con un cliente."
      />
      <FormularioOportunidad
        accion={crearOportunidad}
        contactos={contactos}
        etapas={etapas}
        usuarios={usuarios}
        valores={
          contacto
            ? {
                titulo: "",
                contactoId: contacto,
                etapaId: etapas[0]?.id ?? "",
                monto: 0,
                fechaCierre: null,
                responsableId: null,
              }
            : undefined
        }
      />
    </div>
  );
}
