import Link from "next/link";
import { requerirSesion } from "@/lib/auth";
import { NavegacionLateral, NavegacionMovil } from "@/components/navegacion";
import { Icono } from "@/components/iconos";
import { Instalar } from "@/components/instalar";
import { PLANES, diasRestantesDePrueba, diasRestantesHasta } from "@/lib/planes";
import { salir } from "../(auth)/acciones";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { usuario, empresa, plan } = await requerirSesion();
  const diasPrueba =
    empresa.estadoSuscripcion === "PRUEBA"
      ? diasRestantesDePrueba(empresa.pruebaTermina)
      : 0;
  // Aviso de renovación para planes de paga que están por vencerse.
  const diasDePlan =
    empresa.estadoSuscripcion === "ACTIVA"
      ? diasRestantesHasta(empresa.planRenuevaEl)
      : 0;
  // Distinguimos "se acabó la prueba" de "se venció lo que pagaste": el mensaje
  // y lo que tiene que hacer el usuario son distintos.
  const nuncaPago = empresa.planRenuevaEl === null;

  return (
    <div className="flex min-h-screen bg-tinta-50">
      <NavegacionLateral />

      <div className="flex min-w-0 flex-1 flex-col">
        <Instalar />
        <header className="no-imprimir relative flex items-center justify-between gap-3 border-b border-tinta-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-3">
            <NavegacionMovil />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-tinta-900">{empresa.nombre}</p>
              <p className="text-xs text-tinta-500">
                Plan {PLANES[plan].nombre}
                {diasPrueba > 0 && ` · prueba: ${diasPrueba} día${diasPrueba === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-tinta-600 sm:block">{usuario.nombre}</span>
            <form action={salir}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-tinta-500 hover:bg-tinta-100 hover:text-tinta-900"
              >
                <Icono nombre="salir" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </header>

        {diasPrueba > 0 && diasPrueba <= 5 && (
          <div className="no-imprimir border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Tu prueba termina en {diasPrueba} día{diasPrueba === 1 ? "" : "s"}.{" "}
            <Link href="/app/configuracion/plan" className="font-medium underline">
              Activá tu plan
            </Link>{" "}
            para no perder funciones.
          </div>
        )}

        {diasDePlan > 0 && diasDePlan <= 5 && (
          <div className="no-imprimir border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Tu plan vence en {diasDePlan} día{diasDePlan === 1 ? "" : "s"}.{" "}
            <Link href="/app/configuracion/plan" className="font-medium underline">
              Registrá tu pago
            </Link>{" "}
            para no quedarte sin las funciones que estás usando.
          </div>
        )}

        {empresa.estadoSuscripcion === "VENCIDA" && (
          <div className="no-imprimir border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {nuncaPago
              ? "Se acabó tu prueba gratis. La cuenta sigue trabajando con los límites del plan Gratis y no se borró nada."
              : "Tu suscripción venció y la cuenta trabaja con los límites del plan Gratis."}{" "}
            <Link href="/app/configuracion/plan" className="font-medium underline">
              {nuncaPago ? "Activá tu plan" : "Renová tu plan"}
            </Link>
            .
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
