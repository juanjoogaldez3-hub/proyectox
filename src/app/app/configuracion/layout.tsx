import { EncabezadoPagina } from "@/components/ui";
import { requerirSesion } from "@/lib/auth";
import { SubnavConfiguracion } from "./subnav";

export default async function LayoutConfiguracion({
  children,
}: {
  children: React.ReactNode;
}) {
  const { empresa, usuario } = await requerirSesion();
  const esMedico = usuario.rol === "MEDICO";
  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo={esMedico ? "Mi cuenta" : "Configuración"} />
      <SubnavConfiguracion giro={empresa.giro} esMedico={esMedico} />
      {children}
    </div>
  );
}
