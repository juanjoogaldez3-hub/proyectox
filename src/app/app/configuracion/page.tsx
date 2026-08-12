import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { Aviso } from "@/components/ui";
import { aNumero } from "@/lib/gt";
import { FormularioEmpresa, FormularioPassword } from "./formularios";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  const { empresa, usuario } = await requerirSesion();
  const esAdmin = usuario.rol !== "VENDEDOR";

  return (
    <div className="space-y-6">
      {esAdmin ? (
        <FormularioEmpresa
          valores={{
            nombre: empresa.nombre,
            nit: empresa.nit,
            telefono: empresa.telefono,
            direccion: empresa.direccion,
            departamento: empresa.departamento,
            municipio: empresa.municipio,
            ivaPorcentaje: aNumero(empresa.ivaPorcentaje),
          }}
        />
      ) : (
        <Aviso tono="marca">
          Solo el propietario o un administrador puede cambiar los datos del negocio.
        </Aviso>
      )}

      <FormularioPassword nombre={usuario.nombre} email={usuario.email} />
    </div>
  );
}
