import { prisma } from "@/lib/prisma";
import { enlacePublicoCita, generarIcs } from "@/lib/citas";

export const dynamic = "force-dynamic";

/** Archivo de calendario para quien no usa Google (iPhone, Outlook…). */
export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const cita = await prisma.cita.findUnique({
    where: { tokenPublico: token },
    include: {
      empresa: { select: { nombre: true, direccion: true, municipio: true, departamento: true } },
      profesional: { select: { nombre: true } },
    },
  });
  if (!cita) return new Response("No encontramos esta cita.", { status: 404 });

  const { empresa } = cita;
  const ics = generarIcs({
    uid: `cita-${cita.id}@crm-chapin`,
    titulo: `Cita en ${empresa.nombre}${cita.profesional ? ` con ${cita.profesional.nombre}` : ""}`,
    inicio: cita.inicio,
    fin: cita.fin,
    detalle: `${cita.motivo}\n\nConfirmar o cancelar: ${enlacePublicoCita(token)}`,
    lugar: [empresa.direccion, empresa.municipio, empresa.departamento].filter(Boolean).join(", "),
    cancelada: cita.estado === "CANCELADA",
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita.ics"',
      "Cache-Control": "no-store",
    },
  });
}
