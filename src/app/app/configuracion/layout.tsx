import { EncabezadoPagina } from "@/components/ui";
import { SubnavConfiguracion } from "./subnav";

export default function LayoutConfiguracion({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina titulo="Configuración" />
      <SubnavConfiguracion />
      {children}
    </div>
  );
}
