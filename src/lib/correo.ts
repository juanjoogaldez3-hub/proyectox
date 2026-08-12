import "server-only";

import nodemailer from "nodemailer";

/**
 * Envio de correo por SMTP. Si la cuenta no tiene SMTP configurado, el correo
 * no se pierde en silencio: se escribe en el log del servidor con el enlace
 * completo, para que quien administra la instalacion pueda pasarlo a mano
 * mientras conecta su proveedor.
 */

export type Correo = {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
};

function configuracion() {
  const host = process.env.SMTP_HOST;
  const puerto = Number(process.env.SMTP_PORT ?? 587);
  const usuario = process.env.SMTP_USUARIO;
  const password = process.env.SMTP_PASSWORD;
  const remitente = process.env.SMTP_REMITENTE;

  if (!host || !usuario || !password || !remitente) return null;
  return { host, puerto, usuario, password, remitente };
}

export function hayCorreoConfigurado(): boolean {
  return configuracion() !== null;
}

export async function enviarCorreo(correo: Correo): Promise<{ enviado: boolean }> {
  const config = configuracion();

  if (!config) {
    console.warn(
      [
        "",
        "── Correo no enviado: falta configurar SMTP ──",
        `Para:   ${correo.para}`,
        `Asunto: ${correo.asunto}`,
        correo.texto,
        "──────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { enviado: false };
  }

  const transporte = nodemailer.createTransport({
    host: config.host,
    port: config.puerto,
    // El 465 es SMTP sobre TLS directo; el resto negocia STARTTLS.
    secure: config.puerto === 465,
    auth: { user: config.usuario, pass: config.password },
  });

  await transporte.sendMail({
    from: config.remitente,
    to: correo.para,
    subject: correo.asunto,
    text: correo.texto,
    html: correo.html,
  });

  return { enviado: true };
}
