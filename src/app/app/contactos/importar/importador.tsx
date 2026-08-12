"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Boton, Tarjeta, cx } from "@/components/ui";
import {
  CAMPOS_CONTACTO,
  adivinarColumnas,
  leerCsv,
  type CampoContacto,
} from "@/lib/csv";
import { mostrarTelefono, normalizarTelefono } from "@/lib/gt";
import { importarContactos, type ResultadoImportacion } from "../acciones";

const FILAS_VISTA_PREVIA = 5;
const MAXIMO_FILAS = 5000;

type Etapa = "archivo" | "mapeo" | "listo";

export function Importador({ contactosActuales }: { contactosActuales: number }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("archivo");
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filas, setFilas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<Record<CampoContacto, number>>(
    {} as Record<CampoContacto, number>,
  );
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [enviando, iniciar] = useTransition();

  async function cargarArchivo(archivo: File) {
    setError(null);
    try {
      const texto = await archivo.text();
      const tabla = leerCsv(texto);
      if (tabla.encabezados.length === 0 || tabla.filas.length === 0) {
        setError("El archivo no trae filas que podamos leer. ¿Está vacío o tiene solo títulos?");
        return;
      }
      setNombreArchivo(archivo.name);
      setEncabezados(tabla.encabezados);
      setFilas(tabla.filas.slice(0, MAXIMO_FILAS));
      setMapeo(adivinarColumnas(tabla.encabezados));
      setEtapa("mapeo");
    } catch {
      setError("No pudimos leer ese archivo. Guardalo como CSV desde Excel y volvé a probar.");
    }
  }

  function valor(fila: string[], campo: CampoContacto): string {
    const i = mapeo[campo];
    return i >= 0 ? (fila[i] ?? "").trim() : "";
  }

  const conNombre = filas.filter((f) => valor(f, "nombre").length >= 2).length;

  function importar() {
    setError(null);
    iniciar(async () => {
      const datos = filas.map((f) => {
        const registro: Record<string, string> = {};
        for (const { clave } of CAMPOS_CONTACTO) {
          const v = valor(f, clave);
          if (v) registro[clave] = v;
        }
        return registro;
      });

      const r = await importarContactos(datos);
      if (r.error) {
        setError(r.error);
        return;
      }
      setResultado(r);
      setEtapa("listo");
      router.refresh();
    });
  }

  if (etapa === "listo" && resultado) {
    return (
      <Tarjeta className="p-6">
        <h2 className="text-lg font-semibold text-tinta-900">
          {resultado.importados > 0 ? "¡Listo!" : "No se agregó ningún contacto"}
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-tinta-700">
          <li>
            <strong>{resultado.importados}</strong> contacto
            {resultado.importados === 1 ? "" : "s"} agregado
            {resultado.importados === 1 ? "" : "s"}.
          </li>
          {resultado.repetidos > 0 && (
            <li>
              {resultado.repetidos} ya estaban en tu lista (mismo teléfono o NIT) y se dejaron
              como estaban.
            </li>
          )}
          {resultado.sinNombre > 0 && (
            <li>{resultado.sinNombre} filas se saltaron por no traer nombre.</li>
          )}
        </ul>

        {resultado.cortadoPorPlan && (
          <div className="mt-4">
            <Aviso tono="alerta">
              Se llenó el cupo de contactos de tu plan, así que la importación se detuvo ahí.{" "}
              <Link href="/app/configuracion/plan" className="font-medium underline">
                Mejorá tu plan
              </Link>{" "}
              para subir el resto.
            </Aviso>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/contactos"
            className="inline-flex items-center rounded-lg bg-marca-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-marca-700"
          >
            Ver mis contactos
          </Link>
          <button
            type="button"
            onClick={() => {
              setEtapa("archivo");
              setResultado(null);
              setFilas([]);
            }}
            className="text-sm text-tinta-500 hover:text-tinta-900"
          >
            Subir otro archivo
          </button>
        </div>
      </Tarjeta>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Aviso tono="peligro">{error}</Aviso>}

      {etapa === "archivo" ? (
        <Tarjeta className="p-6">
          <h2 className="text-sm font-semibold text-tinta-900">1. Subí tu archivo</h2>
          <p className="mt-1 text-sm text-tinta-500">
            Un archivo CSV con una fila por cliente. Si tenés la lista en Excel, usá
            <em> Archivo → Guardar como → CSV</em>. Reconocemos el separador solo, sea coma o
            punto y coma.
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-tinta-300 px-6 py-10 text-center hover:border-marca-400 hover:bg-marca-50/40">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void cargarArchivo(archivo);
              }}
            />
            <span className="text-sm font-medium text-marca-700">Elegí tu archivo CSV</span>
            <span className="mt-1 text-xs text-tinta-500">
              Hasta {MAXIMO_FILAS.toLocaleString("es-GT")} filas por archivo
            </span>
          </label>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-tinta-500 hover:text-tinta-800">
              ¿Cómo tiene que verse el archivo?
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-tinta-50 p-3 text-xs text-tinta-700">
{`nombre,negocio,telefono,nit,municipio
María López,Tienda La Bendición,5551-2233,1234567,Mixco
Carlos Barrientos,Cafetería El Portal,4119-8877,7654321,Antigua`}
            </pre>
            <p className="mt-2 text-xs text-tinta-500">
              Solo el nombre es obligatorio. Si tus columnas se llaman distinto no importa: en
              el siguiente paso las emparejás a mano.
            </p>
          </details>
        </Tarjeta>
      ) : (
        <>
          <Tarjeta className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-tinta-900">2. Emparejá las columnas</h2>
              <span className="text-xs text-tinta-500">
                {nombreArchivo} · {filas.length} fila{filas.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-sm text-tinta-500">
              Ya adivinamos lo que pudimos. Revisá que cada dato esté en su lugar.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAMPOS_CONTACTO.map((campo) => (
                <label key={campo.clave} className="block">
                  <span className="etiqueta-campo">
                    {campo.etiqueta}
                    {"obligatorio" in campo && campo.obligatorio && " *"}
                  </span>
                  <select
                    value={mapeo[campo.clave] ?? -1}
                    onChange={(e) =>
                      setMapeo((m) => ({ ...m, [campo.clave]: Number(e.target.value) }))
                    }
                    className="campo"
                  >
                    <option value={-1}>— No está en el archivo —</option>
                    {encabezados.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Columna ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta className="p-6">
            <h2 className="text-sm font-semibold text-tinta-900">3. Así van a quedar</h2>
            <p className="mt-1 text-sm text-tinta-500">
              Vista previa de las primeras {Math.min(FILAS_VISTA_PREVIA, filas.length)} filas.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-tinta-200 text-left text-xs uppercase tracking-wide text-tinta-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Nombre</th>
                    <th className="py-2 pr-3 font-medium">Negocio</th>
                    <th className="py-2 pr-3 font-medium">Teléfono</th>
                    <th className="py-2 font-medium">NIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tinta-100">
                  {filas.slice(0, FILAS_VISTA_PREVIA).map((f, i) => {
                    const nombre = valor(f, "nombre");
                    const tel = normalizarTelefono(valor(f, "telefono"));
                    return (
                      <tr key={i} className={cx(nombre.length < 2 && "opacity-50")}>
                        <td className="py-2 pr-3 text-tinta-800">
                          {nombre || <span className="text-red-600">sin nombre — se salta</span>}
                        </td>
                        <td className="py-2 pr-3 text-tinta-600">{valor(f, "negocio") || "—"}</td>
                        <td className="py-2 pr-3 text-tinta-600">
                          {tel ? mostrarTelefono(tel) : valor(f, "telefono") || "—"}
                        </td>
                        <td className="py-2 text-tinta-600">{valor(f, "nit") || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-tinta-600">
              Se van a agregar hasta <strong>{conNombre}</strong> contacto
              {conNombre === 1 ? "" : "s"}. Hoy tenés {contactosActuales}. Los que ya existan
              con el mismo teléfono o NIT se saltan.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Boton type="button" onClick={importar} disabled={enviando || conNombre === 0}>
                {enviando ? "Importando…" : `Importar ${conNombre} contactos`}
              </Boton>
              <button
                type="button"
                onClick={() => setEtapa("archivo")}
                className="text-sm text-tinta-500 hover:text-tinta-900"
              >
                Cambiar archivo
              </button>
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
