"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Boton, Campo, Tarjeta, cx } from "@/components/ui";
import { espaciosParaReservar, reservar, type EspacioPublico, type ResultadoReserva } from "./acciones";

type Servicio = { id: string; nombre: string; duracionMin: number; precio: string | null; profesionalIds: string[] };
type Profesional = { id: string; nombre: string; especialidad: string | null };
type Dia = { fecha: string; corto: string; numero: string; mes: string };

function Paso({ n, titulo, children, listo }: { n: number; titulo: string; children: React.ReactNode; listo?: boolean }) {
  return (
    <Tarjeta className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-tinta-900">
        <span
          className={cx(
            "grid h-6 w-6 place-items-center rounded-full text-xs",
            listo ? "bg-emerald-500 text-white" : "bg-marca-50 text-marca-700",
          )}
        >
          {listo ? "✓" : n}
        </span>
        {titulo}
      </h2>
      {children}
    </Tarjeta>
  );
}

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cx(
        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        activa ? "border-marca-500 bg-marca-50 text-marca-800" : "border-tinta-200 bg-white text-tinta-700 hover:border-marca-300",
      )}
    >
      {children}
    </button>
  );
}

export function Reserva({
  slug,
  servicios,
  profesionales,
  dias,
}: {
  slug: string;
  servicios: Servicio[];
  profesionales: Profesional[];
  dias: Dia[];
}) {
  const router = useRouter();
  const [servicioId, setServicioId] = useState(servicios.length === 1 ? servicios[0].id : "");
  const [profesionalId, setProfesionalId] = useState(profesionales.length === 1 ? profesionales[0].id : "");
  const [fecha, setFecha] = useState("");
  const [espacio, setEspacio] = useState<EspacioPublico | null>(null);
  const [espacios, setEspacios] = useState<EspacioPublico[] | null>(null);
  const [buscando, iniciar] = useTransition();
  const [resultado, enviar, enviando] = useActionState<ResultadoReserva, FormData>(reservar.bind(null, slug), null);

  const servicio = servicios.find((s) => s.id === servicioId);
  const profesionalesDelServicio = profesionales.filter(
    (p) => !servicio || servicio.profesionalIds.length === 0 || servicio.profesionalIds.includes(p.id),
  );
  const listoServicio = servicios.length === 0 || Boolean(servicioId);
  // Los pasos se numeran según los que realmente se muestran.
  const conServicio = servicios.length > 0;
  const conProfesional = listoServicio && profesionalesDelServicio.length > 1;
  const nDia = 1 + Number(conServicio) + Number(conProfesional);

  useEffect(() => {
    setEspacio(null);
    if (!fecha || !listoServicio) {
      setEspacios(null);
      return;
    }
    let vigente = true;
    iniciar(async () => {
      const libres = await espaciosParaReservar(slug, servicioId, profesionalId, fecha);
      if (vigente) setEspacios(libres);
    });
    return () => {
      vigente = false;
    };
  }, [slug, servicioId, profesionalId, fecha, listoServicio]);

  useEffect(() => {
    if (resultado?.token) router.push(`/cita/${resultado.token}`);
  }, [resultado, router]);

  return (
    <div className="space-y-3">
      {servicios.length > 0 && (
        <Paso n={1} titulo="¿Qué necesita?" listo={Boolean(servicioId)}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {servicios.map((s) => (
              <Opcion
                key={s.id}
                activa={servicioId === s.id}
                onClick={() => {
                  setServicioId(s.id);
                  if (profesionalId && s.profesionalIds.length > 0 && !s.profesionalIds.includes(profesionalId)) setProfesionalId("");
                }}
              >
                <span className="block font-medium">{s.nombre}</span>
                <span className="text-xs text-tinta-500">
                  {s.duracionMin} min{s.precio ? ` · ${s.precio}` : ""}
                </span>
              </Opcion>
            ))}
          </div>
        </Paso>
      )}

      {listoServicio && profesionalesDelServicio.length > 1 && (
        <Paso n={1 + Number(conServicio)} titulo="¿Con quién?" listo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Opcion activa={profesionalId === ""} onClick={() => setProfesionalId("")}>
              <span className="block font-medium">Con quien tenga espacio</span>
              <span className="text-xs text-tinta-500">Más horarios disponibles</span>
            </Opcion>
            {profesionalesDelServicio.map((p) => (
              <Opcion key={p.id} activa={profesionalId === p.id} onClick={() => setProfesionalId(p.id)}>
                <span className="block font-medium">{p.nombre}</span>
                {p.especialidad && <span className="text-xs text-tinta-500">{p.especialidad}</span>}
              </Opcion>
            ))}
          </div>
        </Paso>
      )}

      {listoServicio && (
        <Paso n={nDia} titulo="¿Qué día y a qué hora?" listo={Boolean(espacio)}>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
            {dias.map((d) => (
              <button
                key={d.fecha}
                type="button"
                onClick={() => setFecha(d.fecha)}
                aria-pressed={fecha === d.fecha}
                className={cx(
                  "flex w-14 shrink-0 flex-col items-center rounded-lg border py-1.5 text-xs",
                  fecha === d.fecha ? "border-marca-500 bg-marca-600 text-white" : "border-tinta-200 bg-white text-tinta-700",
                )}
              >
                <span className="capitalize">{d.corto}</span>
                <span className="text-lg font-semibold leading-tight">{d.numero}</span>
                <span className="capitalize opacity-80">{d.mes}</span>
              </button>
            ))}
          </div>
          {fecha &&
            (buscando && espacios === null ? (
              <p className="text-sm text-tinta-500">Buscando horarios…</p>
            ) : espacios && espacios.length > 0 ? (
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {espacios.map((e) => (
                  <button
                    key={e.hora}
                    type="button"
                    onClick={() => setEspacio(e)}
                    aria-pressed={espacio?.hora === e.hora}
                    className={cx(
                      "rounded-md border py-1.5 text-sm tabular-nums",
                      espacio?.hora === e.hora
                        ? "border-marca-500 bg-marca-600 font-medium text-white"
                        : "border-tinta-200 bg-white text-tinta-700 hover:border-marca-300",
                    )}
                  >
                    {e.hora}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tinta-500">No quedan horarios ese día. Pruebe otro.</p>
            ))}
        </Paso>
      )}

      {espacio && (
        <Paso n={nDia + 1} titulo="Sus datos">
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const datos = new FormData(ev.currentTarget);
              startTransition(() => enviar(datos));
            }}
            className="space-y-3"
          >
            {resultado?.error && <Aviso tono="peligro">{resultado.error}</Aviso>}
            <input type="hidden" name="tipoId" value={servicioId} />
            <input type="hidden" name="profesionalId" value={espacio.profesionalId} />
            <input type="hidden" name="fecha" value={fecha} />
            <input type="hidden" name="hora" value={espacio.hora} />
            {/* Trampa para robots: no se ve ni se puede enfocar. */}
            <input type="text" name="sitio" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <Campo etiqueta="Nombre completo *">
              <input name="nombre" required minLength={3} autoComplete="name" className="campo" />
            </Campo>
            <Campo etiqueta="WhatsApp *" ayuda="Ahí le llega la confirmación y el recordatorio.">
              <input name="whatsapp" type="tel" required autoComplete="tel" className="campo" placeholder="5555-5555" />
            </Campo>
            <Campo etiqueta="Correo (opcional)" ayuda="Para recibir la cita en su Google Calendar.">
              <input name="email" type="email" autoComplete="email" className="campo" />
            </Campo>
            <label className="flex items-start gap-2 text-xs text-tinta-600">
              <input type="checkbox" name="consentimiento" required className="mt-0.5" />
              Autorizo a la clínica a guardar mis datos para gestionar mis citas y mi atención.
            </label>
            <Boton type="submit" tamano="lg" className="w-full" disabled={enviando}>
              {enviando ? "Reservando…" : `Reservar a las ${espacio.hora}`}
            </Boton>
          </form>
        </Paso>
      )}
    </div>
  );
}
