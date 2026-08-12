/*
 * Service worker mínimo y deliberadamente conservador.
 *
 * El CRM se dibuja en el servidor y guarda con Server Actions, así que aquí NO
 * se toca nada que pueda devolver datos viejos o perder una operación:
 *
 *   - Solo se atienden peticiones GET del mismo origen.
 *   - Los envíos de formulario y las Server Actions (POST) pasan de largo.
 *   - Las cargas de datos de navegación (`?_rsc=`) tampoco se guardan: servir
 *     una versión vieja mostraría saldos o inventarios que ya cambiaron.
 *
 * Lo que sí se guarda son los archivos con huella (`/_next/static/`) y los
 * íconos, que nunca cambian sin cambiar de nombre. Con eso la app abre rápido
 * y, sin señal, muestra una pantalla que lo explica en vez de un error del
 * navegador.
 */

const VERSION = "v1";
const CACHE_ESTATICOS = `crm-estaticos-${VERSION}`;
const SIN_CONEXION = "/sin-conexion";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_ESTATICOS).then((cache) => cache.addAll([SIN_CONEXION])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((n) => n.startsWith("crm-") && n !== CACHE_ESTATICOS)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function esEstaticoConHuella(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/");
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  // Datos de navegación de Next: siempre frescos.
  if (url.searchParams.has("_rsc")) return;

  if (esEstaticoConHuella(url)) {
    evento.respondWith(
      caches.match(peticion).then(
        (guardado) =>
          guardado ??
          fetch(peticion).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(CACHE_ESTATICOS).then((cache) => cache.put(peticion, copia));
            }
            return respuesta;
          }),
      ),
    );
    return;
  }

  // Páginas: siempre de la red; si no hay señal, la pantalla de sin conexión.
  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion).catch(() =>
        caches.match(SIN_CONEXION).then((r) => r ?? Response.error()),
      ),
    );
  }
});
