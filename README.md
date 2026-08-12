# CRM Chapín

CRM para emprendedores y pequeñas empresas de Guatemala. Ordena clientes, da
seguimiento por WhatsApp, arma cotizaciones con IVA en quetzales y lleva el
inventario. Multi-tenant desde el primer día para venderse por suscripción.

## Qué incluye

**Núcleo CRM**
- Contactos con teléfono, NIT, departamento, municipio, origen y etiquetas.
- Embudo de ventas visual (kanban con arrastre en escritorio y selector en celular).
- Actividades: llamadas, mensajes, visitas y tareas, con vencimiento y filtros
  (pendientes, para hoy, vencidas, completadas).
- Notas por contacto y por oportunidad.
- Tablero de resumen: vendido en el mes, embudo, pendientes del día y alertas
  de stock mínimo.

**WhatsApp y cotizaciones**
- Botón de WhatsApp en contactos, oportunidades y cotizaciones, con el mensaje
  ya redactado (usa `wa.me`, funciona en celular y en WhatsApp Web).
- Cotizaciones con líneas de producto, descuento, IVA calculado y totales en vivo.
- Documento imprimible (el navegador lo guarda como PDF) con los datos fiscales
  del negocio y del cliente.
- **Enlace público para el cliente**: se genera un enlace con token que el
  cliente abre desde su celular, sin cuenta ni instalación, y acepta o rechaza
  de un clic. El vendedor ve cuándo lo abrió y quién lo aceptó. El enlace se
  puede revocar.
- Estados: borrador, enviada, aceptada, rechazada, vencida. Al aceptarla se crea
  la venta y, si venía de una oportunidad, se marca como ganada.

**Reportes**
- Ventas por mes, ranking por vendedor y por producto, embudo abierto por etapa.
- Tarjetas de resumen: vendido, ticket promedio, pendiente de cobro, tasa de
  aceptación de cotizaciones y tasa de cierre de oportunidades.
- Gráficas en HTML y CSS, sin librerías, con tabla equivalente en cada una.

**Importar contactos**
- Carga desde CSV con vista previa y emparejado de columnas. Reconoce solo el
  separador (coma o punto y coma, que es lo que exporta Excel en español), el
  BOM, los saltos de Windows y los campos entre comillas.
- Los contactos repetidos (mismo teléfono o NIT) se saltan y se reportan, sin
  pisar lo que ya estaba guardado.

**Inventario y ventas**
- Productos con precio, costo, margen, unidad, SKU y stock mínimo.
- Movimientos de inventario: entradas, salidas y ajustes, con historial completo.
- Ventas directas o generadas desde una cotización; descuentan existencias en la
  misma transacción y las devuelven si la venta se anula.
- Comprobante de venta imprimible con NIT y nombre para factura.

**Multi-tenant y suscripciones**
- Cada empresa es un tenant aislado; todas las consultas se filtran por `empresaId`.
- Roles: propietario, administrador y vendedor.
- Planes Gratis / Emprendedor / Negocio con límites por recurso, verificados antes
  de crear cada registro.
- 14 días de prueba del plan Emprendedor. Al vencer —igual que al vencerse un
  periodo pagado— la cuenta baja sola a los límites del plan Gratis sin perder
  información, y avisa cinco días antes.
- Registro de pagos por depósito o transferencia, que es como paga la mayoría acá.
- Recuperación de contraseña por correo, con enlace de un solo uso que vence en
  una hora.

## Detalles de Guatemala

Todo lo local vive en `src/lib/gt.ts`:

- Quetzales con formato `es-GT` y fechas en `America/Guatemala`.
- IVA del 12% por defecto, configurable por empresa y congelado en cada documento
  emitido para que el histórico no cambie.
- NIT: normalización, formato `1234567-8`, soporte de `CF` (consumidor final) y
  verificación del dígito por módulo 11. La verificación **avisa pero no bloquea**,
  porque hay NITs antiguos y casos especiales que igual conviene poder guardar.
- Teléfonos: se guardan como `502XXXXXXXX` para armar enlaces de WhatsApp y se
  muestran como `5555-5555`.
- Los 22 departamentos del país en los selectores.

## Puesta en marcha

Requisitos: Node 20+ y PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # poné tu DATABASE_URL y generá AUTH_SECRET
npx prisma migrate deploy     # o `npm run db:migrate` en desarrollo
npm run db:seed               # datos de demostración (opcional)
npm run dev
```

Abrí http://localhost:3000.

Con los datos de demostración podés entrar como:

- **Propietaria:** `demo@crmchapin.gt` / `demo1234`
- **Vendedor:** `vendedor@crmchapin.gt` / `demo1234`

`npm run db:seed` borra y recrea la empresa demo, así que no lo corras contra una
base con información real.

### Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL. |
| `AUTH_SECRET` | Llave para firmar la sesión. Generala con `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app, como respaldo para armar enlaces. |
| `SMTP_*` | Correo saliente para recuperar contraseñas. Si lo dejás vacío, el enlace se escribe en el log del servidor en vez de enviarse. |

El servidor puede correr en cualquier zona horaria: los cortes de día y de mes
se calculan siempre en hora de Guatemala (UTC-6, sin horario de verano).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Genera el cliente de Prisma y compila para producción. |
| `npm start` | Sirve la compilación de producción. |
| `npm run typecheck` | Revisa tipos sin compilar. |
| `npm run db:migrate` | Crea y aplica migraciones en desarrollo. |
| `npm run db:seed` | Carga los datos de demostración. |
| `npm run db:studio` | Abre Prisma Studio. |

## Cómo está armado

- **Next.js 16** (App Router) con React 19 y Server Actions; no hay API REST
  aparte: cada mutación es una acción de servidor tipada.
- **Prisma + PostgreSQL**. El esquema está en `prisma/schema.prisma`.
- **Tailwind CSS 4** con tokens propios (`marca`, `tinta`) en `globals.css`.
- **Sesión propia**: JWT firmado con `jose` en una cookie `httpOnly`, contraseñas
  con `bcrypt`. Sin dependencias de terceros para autenticación.

```
src/
  app/
    (auth)/          registro, ingreso y cierre de sesión
    app/             la aplicación, protegida por requerirSesion()
      contactos/  embudo/  actividades/
      cotizaciones/  ventas/  productos/  configuracion/
  components/        UI compartida (botones, tarjetas, líneas de documento…)
  lib/
    auth.ts          sesión, hash de contraseñas, roles
    gt.ts            quetzales, IVA, NIT, teléfonos, departamentos
    limites.ts       límites por plan
    planes.ts        definición de los planes
    prisma.ts        cliente de Prisma
```

### Aislamiento entre empresas

Cada consulta y cada mutación filtra por `empresaId` tomado de la sesión, nunca
del formulario. Las actualizaciones usan `updateMany` con `where: { id, empresaId }`
para que un id de otra empresa no afecte nada. Está verificado con dos cuentas
distintas: la segunda no ve ni un solo registro de la primera.

## Antes de salir a producción

Esto es un MVP funcional; para cobrarle a clientes reales conviene sumar:

- **HTTPS obligatorio.** La cookie de sesión se marca `secure` en producción, así
  que la app necesita servirse por HTTPS.
- **Cobro automático.** El vencimiento sí es automático, pero el pago se
  registra a mano tras un depósito o transferencia; falta conectar una pasarela.
- **Un proveedor de correo conectado.** Sin `SMTP_*` configurado, los enlaces de
  recuperación quedan en el log del servidor en vez de llegarle al usuario.
- **Respaldos de la base** y un plan de restauración.
- **Facturación electrónica (FEL).** El comprobante de venta es interno; no
  sustituye a la factura autorizada por la SAT.
