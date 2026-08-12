import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth";
import { EncabezadoPagina } from "@/components/ui";
import { FormularioProducto } from "../formulario";
import { crearProducto } from "../acciones";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function PaginaNuevoProducto() {
  await requerirSesion();

  return (
    <div className="mx-auto max-w-3xl">
      <EncabezadoPagina
        titulo="Nuevo producto"
        descripcion="Puede ser un producto físico o un servicio."
      />
      <FormularioProducto accion={crearProducto} esNuevo />
    </div>
  );
}
