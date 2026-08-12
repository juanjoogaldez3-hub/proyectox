import Link from "next/link";
import { BotonEnlace, Insignia, Tarjeta } from "@/components/ui";
import { DIAS_DE_PRUEBA, PLANES, formatoLimite } from "@/lib/planes";
import { quetzales } from "@/lib/gt";
import { sesionActual } from "@/lib/auth";

const FUNCIONES = [
  {
    titulo: "Todos tus clientes en un solo lugar",
    texto:
      "Se acabó buscar el número entre chats, cuadernos y hojas de Excel. Cada cliente con su teléfono, NIT, historial y quién lo está atendiendo.",
  },
  {
    titulo: "Seguimiento por WhatsApp",
    texto:
      "Un clic y se abre el chat con el mensaje ya escrito. Guardá cada llamada, visita o mensaje para saber exactamente en qué quedaste.",
  },
  {
    titulo: "Embudo de ventas visual",
    texto:
      "Mirá en qué etapa va cada negocio: contacto, cotización, negociación, cerrado. Nada se queda olvidado a medio camino.",
  },
  {
    titulo: "Cotizaciones con IVA en quetzales",
    texto:
      "Armá la cotización, el sistema calcula el 12% de IVA y el total. Se manda por WhatsApp o se imprime en PDF con tus datos.",
  },
  {
    titulo: "Inventario que cuadra",
    texto:
      "Cada venta descuenta existencias solo. Te avisa cuando un producto llega al mínimo, antes de que te quedes sin nada que vender.",
  },
  {
    titulo: "Reportes que sí se entienden",
    texto:
      "Cuánto vendiste este mes, qué está por cerrarse, quién del equipo va adelante y qué clientes tienen tiempo de no comprar.",
  },
];

const PREGUNTAS = [
  {
    p: "¿Necesito saber de sistemas para usarlo?",
    r: "No. Si sabés usar WhatsApp, sabés usar el CRM. Está en español, con quetzales, NIT e IVA ya configurados para Guatemala.",
  },
  {
    p: "¿Cómo pago?",
    r: "Por depósito o transferencia bancaria, que es lo que la mayoría usa acá. Registrás el pago en el sistema y te activamos el plan.",
  },
  {
    p: "¿Y si somos varios vendedores?",
    r: "Cada quien tiene su usuario y sus clientes asignados. El dueño ve todo, incluyendo cuánto está vendiendo cada uno.",
  },
  {
    p: "¿Qué pasa si dejo de pagar?",
    r: "Tu información no se borra. La cuenta baja al plan Gratis y podés seguir trabajando con menos contactos hasta que te acomodés.",
  },
];

export default async function PaginaInicio() {
  const sesion = await sesionActual();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-tinta-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-tinta-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-600 text-sm font-bold text-white">
              CC
            </span>
            CRM Chapín
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="#precios"
              className="hidden px-3 py-2 text-sm text-tinta-600 hover:text-tinta-900 sm:block"
            >
              Precios
            </Link>
            {sesion ? (
              <BotonEnlace href="/app">Ir a mi CRM</BotonEnlace>
            ) : (
              <>
                <BotonEnlace href="/ingresar" variante="secundario">
                  Ingresar
                </BotonEnlace>
                <BotonEnlace href="/registro">Probar gratis</BotonEnlace>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20">
        <div className="max-w-2xl">
          <Insignia tono="marca">Hecho en Guatemala, para Guatemala 🇬🇹</Insignia>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-tinta-900 sm:text-5xl">
            Dejá de perder ventas por no darle seguimiento a tus clientes
          </h1>
          <p className="mt-4 text-lg text-tinta-600">
            CRM Chapín ordena tus clientes, te recuerda a quién tenés que escribirle,
            arma tus cotizaciones con IVA y lleva tu inventario. Todo en quetzales y
            conectado a WhatsApp.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <BotonEnlace href="/registro" tamano="lg">
              Empezar gratis
            </BotonEnlace>
            <BotonEnlace href="#precios" variante="secundario" tamano="lg">
              Ver precios
            </BotonEnlace>
          </div>
          <p className="mt-3 text-sm text-tinta-500">
            {DIAS_DE_PRUEBA} días de prueba del plan Emprendedor. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      <section className="border-y border-tinta-200 bg-tinta-50">
        <div className="mx-auto grid grid-cols-1 max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map((f) => (
            <Tarjeta key={f.titulo} className="p-5">
              <h3 className="text-base font-semibold text-tinta-900">{f.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta-600">{f.texto}</p>
            </Tarjeta>
          ))}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-tinta-900 sm:text-3xl">
            Precios que sí puede pagar un emprendedor
          </h2>
          <p className="mt-3 text-tinta-600">
            Sin contratos, sin instalación y sin cobros en dólares. Cancelás cuando querrás.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Object.values(PLANES).map((plan) => {
            const destacado = plan.id === "EMPRENDEDOR";
            return (
              <Tarjeta
                key={plan.id}
                className={
                  destacado
                    ? "relative border-marca-300 p-6 ring-2 ring-marca-500"
                    : "p-6"
                }
              >
                {destacado && (
                  <span className="absolute -top-3 left-6 rounded-full bg-marca-600 px-3 py-1 text-xs font-semibold text-white">
                    El más pedido
                  </span>
                )}
                <h3 className="text-lg font-semibold text-tinta-900">{plan.nombre}</h3>
                <p className="mt-1 text-sm text-tinta-500">{plan.descripcion}</p>
                <p className="mt-4">
                  <span className="text-3xl font-bold text-tinta-900">
                    {plan.precioMensual === 0 ? "Q0" : quetzales(plan.precioMensual)}
                  </span>
                  <span className="text-sm text-tinta-500"> / mes</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-tinta-600">
                  {plan.beneficios.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden className="text-marca-600">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs text-tinta-400">
                  Hasta {formatoLimite(plan.limites.contactos)} contactos ·{" "}
                  {formatoLimite(plan.limites.usuarios)} usuarios
                </p>
                <BotonEnlace
                  href="/registro"
                  variante={destacado ? "primario" : "secundario"}
                  className="mt-5 w-full"
                >
                  {plan.precioMensual === 0 ? "Crear cuenta gratis" : "Probar 14 días"}
                </BotonEnlace>
              </Tarjeta>
            );
          })}
        </div>
      </section>

      <section className="border-t border-tinta-200 bg-tinta-50">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-bold text-tinta-900">Preguntas frecuentes</h2>
          <dl className="mt-8 space-y-6">
            {PREGUNTAS.map((item) => (
              <div key={item.p}>
                <dt className="font-medium text-tinta-900">{item.p}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-tinta-600">{item.r}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="border-t border-tinta-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-tinta-500">
          <p>© {new Date().getFullYear()} CRM Chapín · Guatemala</p>
          <div className="flex gap-4">
            <Link href="/ingresar" className="hover:text-tinta-900">
              Ingresar
            </Link>
            <Link href="/registro" className="hover:text-tinta-900">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
