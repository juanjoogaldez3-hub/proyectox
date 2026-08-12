import type { MetadataRoute } from "next";

/**
 * Manifiesto de la aplicacion instalable. Con esto Android ofrece "Instalar
 * aplicacion" desde Chrome y el CRM queda con su icono en la pantalla de
 * inicio, a pantalla completa y sin barra de direcciones.
 *
 * Tambien es la base para publicarla en Play Store: tanto un TWA como una
 * envoltura con Capacitor parten de este archivo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "CRM Chapín — clientes, cotizaciones e inventario",
    short_name: "CRM Chapín",
    description:
      "Ordená tus clientes, dales seguimiento por WhatsApp, mandá cotizaciones con IVA y controlá tu inventario.",
    lang: "es-GT",
    dir: "ltr",
    // Abre directo en el CRM; si no hay sesión, la app manda a ingresar.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f8fa",
    theme_color: "#1f47e0",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/iconos/icono-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/iconos/icono-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android recorta el ícono según la forma del launcher; estos traen
      // margen de sobra para que no se coma las letras.
      {
        src: "/iconos/icono-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/iconos/icono-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nueva cotización",
        short_name: "Cotizar",
        url: "/app/cotizaciones/nueva",
      },
      {
        name: "Nuevo contacto",
        short_name: "Contacto",
        url: "/app/contactos/nuevo",
      },
      {
        name: "Registrar venta",
        short_name: "Vender",
        url: "/app/ventas/nueva",
      },
    ],
  };
}
