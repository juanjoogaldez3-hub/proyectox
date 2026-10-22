import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { Icono } from "@/components/iconos";
import { BotonWhatsApp } from "@/components/whatsapp";
import { aNumero, edad, fecha, fechaHora, mostrarTelefono, quetzales } from "@/lib/gt";
import { ESTADOS_CITA } from "@/lib/citas";
import { esAdmin, puedeVerExpediente } from "@/lib/roles";
import { registrarAccesoExpediente } from "@/lib/expediente";
import { crearNotaClinica } from "../acciones";
import { FormularioNotaClinica } from "./nota-clinica";

export const metadata: Metadata = { title: "Paciente" };

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-500">{etiqueta}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-tinta-800">{valor}</dd>
    </div>
  );
}

function Cifra({ valor, texto, tono }: { valor: number; texto: string; tono?: string }) {
  return (
    <div className="rounded-lg border border-tinta-100 px-3 py-2">
      <p className={`text-xl font-semibold tabular-nums ${tono ?? "text-tinta-900"}`}>{valor}</p>
      <p className="text-xs text-tinta-500">{texto}</p>
    </div>
  );
}

export default async function PaginaPaciente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cita?: string }>;
}) {
  const { id } = await params;
  const { cita: citaParaNota } = await searchParams;
  const { empresa, usuario } = await requerirSesion();
  const verExpediente = puedeVerExpediente(usuario.rol);

  const paciente = await prisma.contacto.findFirst({
    where: { id, empresaId: empresa.id },
    include: {
      citas: {
        orderBy: { inicio: "desc" },
        include: {
          profesional: { select: { nombre: true, color: true } },
          venta: { select: { id: true, total: true, estado: true } },
          recordatorios: { where: { tipo: "SEGUIMIENTO" }, select: { programadoPara: true, estado: true } },
        },
      },
    },
  });
  if (!paciente) notFound();

  const [notas, accesos] = verExpediente
    ? await Promise.all([
        prisma.notaClinica.findMany({
          where: { contactoId: paciente.id, empresaId: empresa.id },
          orderBy: { creadoEl: "desc" },
          include: {
            usuario: { select: { nombre: true } },
            profesional: { select: { nombre: true } },
            cita: { select: { inicio: true, motivo: true } },
          },
        }),
        esAdmin(usuario.rol)
          ? prisma.accesoExpediente.findMany({
              where: { contactoId: paciente.id, empresaId: empresa.id },
              orderBy: { creadoEl: "desc" },
              take: 8,
              include: { usuario: { select: { nombre: true } } },
            })
          : Promise.resolve([]),
      ])
    : [[], []];
  if (verExpediente) {
    await registrarAccesoExpediente(empresa.id, paciente.id, usuario.id, "Abrió el expediente");
  }

  const ahora = Date.now();
  const proxima = [...paciente.citas]
    .reverse()
    .find((c) => (c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA") && c.inicio.getTime() >= ahora);
  const conteo = (estado: string) => paciente.citas.filter((c) => c.estado === estado).length;
  const atendidas = conteo("COMPLETADA");
  const faltas = conteo("NO_ASISTIO");
  const pagado = paciente.citas.reduce(
    (s, c) => s + (c.venta && c.venta.estado !== "ANULADA" ? aNumero(c.venta.total) : 0),
    0,
  );
  const seguimiento = paciente.citas
    .flatMap((c) => c.recordatorios)
    .filter((r) => r.estado === "PENDIENTE")
    .sort((a, b) => a.programadoPara.getTime() - b.programadoPara.getTime())[0];
  const anos = edad(paciente.fechaNacimiento);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app/pacientes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-tinta-500 hover:text-tinta-900">
        <Icono nombre="atras" /> Pacientes
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900 sm:text-2xl">{paciente.nombre}</h1>
          <p className="mt-1 text-sm text-tinta-500">
            {[anos !== null && `${anos} años`, paciente.sexo, paciente.tipoSangre && `Sangre ${paciente.tipoSangre}`, paciente.seguroMedico]
              .filter(Boolean)
              .join(" · ") || "Sin datos médicos todavía"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonWhatsApp
            numero={paciente.whatsapp}
            mensaje={`Hola ${paciente.nombre.split(" ")[0]}, le escribimos de ${empresa.nombre}.`}
            className="px-3 py-2 text-sm"
            contactoId={paciente.id}
            resumen="Le escribiste por WhatsApp desde su ficha"
          />
          <BotonEnlace href={`/app/citas/nueva?paciente=${paciente.id}`}>
            <Icono nombre="calendario" /> Agendar cita
          </BotonEnlace>
          <BotonEnlace href={`/app/pacientes/${paciente.id}/editar`} variante="secundario">
            Editar
          </BotonEnlace>
        </div>
      </div>

      {paciente.alergias && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <Icono nombre="alerta" /> <strong>Alergias:</strong> {paciente.alergias}
        </div>
      )}
      {!paciente.consentimientoEl && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Falta registrar que el paciente autorizó el manejo de sus datos de salud.{" "}
          <Link href={`/app/pacientes/${paciente.id}/editar`} className="font-medium underline">
            Registrarlo
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Cifra valor={paciente.citas.length} texto="citas en total" />
            <Cifra valor={atendidas} texto="atendidas" tono="text-emerald-700" />
            <Cifra valor={faltas} texto="no asistió" tono={faltas > 0 ? "text-amber-700" : undefined} />
            <Cifra valor={conteo("CANCELADA")} texto="canceladas" />
          </div>

          {(proxima || seguimiento) && (
            <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4">
              {proxima ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-tinta-500">Próxima cita</p>
                  <Link href={`/app/citas/${proxima.id}`} className="font-medium text-tinta-900 hover:text-marca-600">
                    {fechaHora(proxima.inicio)} · {proxima.motivo}
                  </Link>
                </div>
              ) : null}
              {seguimiento && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-tinta-500">Control programado</p>
                  <p className="text-sm text-tinta-800">Aviso por WhatsApp el {fecha(seguimiento.programadoPara)}</p>
                </div>
              )}
            </Tarjeta>
          )}

          <Tarjeta className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-tinta-900">Historial de citas</h2>
              <Link href={`/app/citas/nueva?paciente=${paciente.id}`} className="text-sm text-marca-600 hover:underline">
                Agendar
              </Link>
            </div>
            {paciente.citas.length === 0 ? (
              <p className="text-sm text-tinta-500">Este paciente todavía no tiene citas.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-tinta-200 pl-4">
                {paciente.citas.map((c) => {
                  const estado = ESTADOS_CITA[c.estado];
                  return (
                    <li key={c.id} className="relative pb-4 last:pb-0">
                      <span
                        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: c.profesional?.color ?? "var(--color-tinta-300)" }}
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/app/citas/${c.id}`} className="text-sm font-medium text-tinta-900 hover:text-marca-600">
                            {fechaHora(c.inicio)}
                          </Link>
                          <p className="text-xs text-tinta-500">
                            {c.motivo}
                            {c.profesional && ` · ${c.profesional.nombre}`}
                            {c.origen === "EN_LINEA" && " · reservó en línea"}
                          </p>
                          {c.calificacion && (
                            <p className="mt-0.5 text-xs text-amber-600" title={c.comentarioPaciente ?? undefined}>
                              {"★".repeat(c.calificacion)}
                              {"☆".repeat(5 - c.calificacion)}
                              {c.comentarioPaciente && <span className="text-tinta-500"> “{c.comentarioPaciente}”</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {c.venta && c.venta.estado !== "ANULADA" && (
                            <Link href={`/app/ventas/${c.venta.id}`} className="text-xs tabular-nums text-tinta-600 hover:text-marca-600">
                              {quetzales(aNumero(c.venta.total))}
                            </Link>
                          )}
                          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Tarjeta>

          {verExpediente ? (
            <Tarjeta className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-tinta-900">Expediente clínico</h2>
              <p className="mb-3 text-xs text-tinta-500">
                Solo lo ven médicos y administradores. Cada apertura queda registrada.
              </p>
              <FormularioNotaClinica
                accion={crearNotaClinica.bind(null, paciente.id)}
                citaInicial={citaParaNota}
                citas={paciente.citas
                  .filter((c) => c.estado !== "CANCELADA")
                  .slice(0, 20)
                  .map((c) => ({ id: c.id, texto: `${fecha(c.inicio)} · ${c.motivo}` }))}
              />
              {notas.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {notas.map((n) => (
                    <li key={n.id} className="rounded-lg border border-tinta-100 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-tinta-900">
                          {fecha(n.cita?.inicio ?? n.creadoEl)} · {n.motivo ?? n.cita?.motivo ?? "Consulta"}
                        </p>
                        {n.receta && (
                          <Link
                            href={`/app/pacientes/${paciente.id}/receta/${n.id}`}
                            className="inline-flex items-center gap-1 text-xs text-marca-600 hover:underline"
                          >
                            <Icono nombre="imprimir" className="h-3.5 w-3.5" /> Receta
                          </Link>
                        )}
                      </div>
                      {(n.presion || n.pesoKg || n.tallaCm || n.temperatura) && (
                        <p className="mt-1 text-xs tabular-nums text-tinta-600">
                          {[
                            n.presion && `PA ${n.presion}`,
                            n.pesoKg && `${n.pesoKg} kg`,
                            n.tallaCm && `${n.tallaCm} cm`,
                            n.temperatura && `${n.temperatura} °C`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <dl className="mt-2 space-y-1.5 text-sm">
                        {n.diagnostico && (
                          <div>
                            <dt className="text-xs text-tinta-500">Diagnóstico</dt>
                            <dd className="whitespace-pre-wrap text-tinta-800">{n.diagnostico}</dd>
                          </div>
                        )}
                        {n.tratamiento && (
                          <div>
                            <dt className="text-xs text-tinta-500">Tratamiento</dt>
                            <dd className="whitespace-pre-wrap text-tinta-800">{n.tratamiento}</dd>
                          </div>
                        )}
                        {n.receta && (
                          <div>
                            <dt className="text-xs text-tinta-500">Receta</dt>
                            <dd className="whitespace-pre-wrap font-mono text-xs text-tinta-800">{n.receta}</dd>
                          </div>
                        )}
                      </dl>
                      <p className="mt-2 text-xs text-tinta-400">
                        {n.profesional?.nombre ?? n.usuario.nombre} · escrita {fechaHora(n.creadoEl)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          ) : (
            <Tarjeta className="p-5 text-sm text-tinta-500">
              El expediente clínico solo lo ven los médicos y los administradores.
            </Tarjeta>
          )}
        </div>

        <div className="space-y-4">
          <Tarjeta className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-tinta-900">Datos</h2>
            <dl className="space-y-3">
              <Dato etiqueta="Nacimiento" valor={paciente.fechaNacimiento && `${fecha(paciente.fechaNacimiento)}${anos !== null ? ` (${anos} años)` : ""}`} />
              <Dato etiqueta="DPI" valor={paciente.dpi && paciente.dpi.replace(/^(\d{4})(\d{5})(\d{4})$/, "$1 $2 $3")} />
              <Dato etiqueta="WhatsApp" valor={mostrarTelefono(paciente.whatsapp)} />
              <Dato etiqueta="Correo" valor={paciente.email} />
              <Dato
                etiqueta="Dirección"
                valor={[paciente.direccion, paciente.municipio, paciente.departamento].filter(Boolean).join(", ") || null}
              />
              <Dato
                etiqueta="Emergencias"
                valor={
                  paciente.contactoEmergenciaNombre &&
                  `${paciente.contactoEmergenciaNombre}${paciente.contactoEmergenciaTelefono ? ` · ${mostrarTelefono(paciente.contactoEmergenciaTelefono)}` : ""}`
                }
              />
              <Dato etiqueta="Antecedentes" valor={paciente.antecedentes} />
              <Dato etiqueta="Notas" valor={paciente.notas} />
              <Dato etiqueta="Pagado en total" valor={pagado > 0 ? quetzales(pagado) : null} />
              <Dato etiqueta="Autorizó sus datos" valor={paciente.consentimientoEl && fecha(paciente.consentimientoEl)} />
              <Dato etiqueta="Paciente desde" valor={fecha(paciente.creadoEl)} />
            </dl>
          </Tarjeta>

          {accesos.length > 0 && (
            <Tarjeta className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-tinta-900">Quién abrió el expediente</h2>
              <ul className="space-y-1.5 text-xs text-tinta-600">
                {accesos.map((a) => (
                  <li key={a.id}>
                    <span className="text-tinta-800">{a.usuario.nombre}</span> · {a.accion.toLowerCase()} ·{" "}
                    {fechaHora(a.creadoEl)}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  );
}
