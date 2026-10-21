import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Aviso, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { esAdmin } from "@/lib/roles";
import { guardarHorarios } from "../../acciones";
import { FormularioHorario } from "./horario";

export const metadata: Metadata = { title: "Horario de atención" };

export default async function PaginaHorario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { empresa, usuario } = await requerirSesion();
  const profesional = await prisma.profesional.findFirst({
    where: { id, empresaId: empresa.id },
    include: { horarios: { orderBy: [{ diaSemana: "asc" }, { desde: "asc" }] } },
  });
  if (!profesional) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/app/configuracion/profesionales"
        className="inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900"
      >
        <Icono nombre="atras" /> Profesionales
      </Link>
      <Tarjeta className="p-5">
        <h2 className="text-sm font-semibold text-tinta-900">Horario de {profesional.nombre}</h2>
        <p className="mb-4 mt-1 text-sm text-tinta-500">
          La agenda solo ofrece horas dentro de este horario y no deja agendar fuera de él (salvo
          sobreturno). Las reservas en línea solo funcionan para profesionales con horario.
        </p>
        {esAdmin(usuario.rol) ? (
          <FormularioHorario
            accion={guardarHorarios.bind(null, profesional.id)}
            tramos={profesional.horarios.map((h) => ({ diaSemana: h.diaSemana, desde: h.desde, hasta: h.hasta }))}
          />
        ) : (
          <Aviso tono="marca">Solo el propietario o un administrador puede cambiar horarios.</Aviso>
        )}
      </Tarjeta>
    </div>
  );
}
