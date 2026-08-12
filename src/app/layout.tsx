import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CRM Chapín — el CRM para emprendedores de Guatemala",
    template: "%s · CRM Chapín",
  },
  description:
    "Ordená tus clientes, dales seguimiento por WhatsApp, mandá cotizaciones con IVA y controlá tu inventario. Hecho para emprendedores y pequeñas empresas de Guatemala.",
  keywords: [
    "CRM Guatemala",
    "CRM para emprendedores",
    "sistema de ventas Guatemala",
    "cotizaciones con IVA",
    "CRM WhatsApp",
  ],
  openGraph: {
    title: "CRM Chapín — el CRM para emprendedores de Guatemala",
    description:
      "Seguimiento de clientes por WhatsApp, cotizaciones en quetzales e inventario. Desde Q0 al mes.",
    locale: "es_GT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f47e0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <body>{children}</body>
    </html>
  );
}
