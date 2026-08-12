"use client";

import { Boton } from "@/components/ui";
import { Icono } from "@/components/iconos";

/**
 * Imprime la vista actual. El navegador ofrece "Guardar como PDF", que es la
 * forma mas simple de mandar el documento sin depender de un servicio externo.
 */
export function BotonImprimir({ texto = "Imprimir / PDF" }: { texto?: string }) {
  return (
    <Boton type="button" variante="secundario" onClick={() => window.print()}>
      <Icono nombre="imprimir" />
      {texto}
    </Boton>
  );
}
