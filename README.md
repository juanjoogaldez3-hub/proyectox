# CRM Chapín

CRM para emprendedores, pequeñas empresas y clínicas médicas de Guatemala.
Ordena clientes y pacientes, lleva la agenda de citas sincronizada con Google
Calendar, manda recordatorios automáticos por WhatsApp, arma cotizaciones con
IVA en quetzales y lleva el inventario. Multi-tenant desde el primer día para
venderse por suscripción.

## Qué incluye

**Modo clínica**
- Al registrarse (o en Configuración) se elige *Clínica o consultorio*: el menú
  pasa a Agenda, Pacientes, Pendientes, Cobros y Reportes, y desaparecen
  Embudo y Cotizaciones. No se borra nada al cambiar.
- Roles: propietario, administrador, recepción y **médico**. El médico ve solo
  su agenda y sus pacientes, y es quien escribe en el expediente.

**Pacientes**
- Lista con búsqueda por nombre, WhatsApp, DPI o correo, con última visita y
  próxima cita.
- Ficha con fecha de nacimiento (edad), DPI, sexo, tipo de sangre, seguro,
  alergias (en rojo), antecedentes, contacto de emergencia y autorización del
  manejo de datos de salud.
- **Historial completo de citas** de cada paciente con estado, profesional,
  cobro y calificación, más contadores de atendidas e inasistencias.
- **Expediente clínico** (solo médicos y administradores): notas por consulta
  con signos vitales, diagnóstico, tratamiento y receta imprimible con los
  datos de la clínica. Cada apertura queda en una bitácora.

**Agenda para clínicas y consultorios**
- Vista de día en cuadrícula, con una columna por profesional, su horario en
  blanco y los bloqueos rayados; tocar un hueco abre la cita con todo puesto.
  También vista de lista y de semana.
- Horario semanal por profesional (mañana y tarde) y bloqueos por vacaciones,
  almuerzo o feriado, de un profesional o de toda la clínica.
- Al agendar se ofrecen las horas libres. No deja agendar encima de otra
  cita, de un bloqueo, fuera de horario ni sobre algo que el médico tenga en
  su Google Calendar, salvo que se marque *sobreturno*.
- Servicios con duración y precio; el precio se propone al cobrar.
- Estados: programada, confirmada, atendida, no asistió y cancelada. Cada cambio
  queda anotado en el historial del paciente.
- **Google Calendar para la clínica y para el paciente.** La clínica conecta su
  cuenta de Google una vez (OAuth) y elige el calendario; cada profesional
  puede ir a un calendario propio. Las citas se crean, mueven y borran solas en
  Google. Si el paciente tiene correo, se le agrega como invitado y Google le
  manda la invitación: la cita aparece en **su** Google Calendar y se actualiza
  si se reprograma o cancela.
- **Enlace del paciente** (`/cita/<token>`): ve su cita desde el celular sin
  cuenta, la confirma o cancela de un clic, abre la dirección en Maps y la
  agrega a Google Calendar o a iPhone/Outlook (`.ics`), aunque no tenga correo.
- **Recordatorios automáticos por WhatsApp** con la API oficial de WhatsApp
  Business (Cloud API de Meta), desde el número de cada clínica: confirmación
  al agendar y dos recordatorios configurables (por defecto 24 h y 2 h antes).
  Se ve si cada mensaje se envió, entregó o leyó, y los fallos se reintentan.
- **Respuestas del paciente por WhatsApp:** si responde "1" (o "confirmo") la
  cita queda confirmada; si responde "2" (o "cancelar") se cancela, se borra de
  Google Calendar y se le contesta automáticamente. Cualquier otro mensaje queda
  en su historial para que la recepción lo lea.
- Citas de hoy en el tablero de resumen y en la ficha de cada paciente.

**Reservas en línea, cobros y seguimiento**
- `/reservar/<slug>`: el paciente elige servicio, profesional (o "con quien
  tenga espacio"), día y hora, y recibe su confirmación por WhatsApp. El
  espacio se vuelve a validar al reservar; hay campo trampa contra robots y un
  tope de dos reservas en línea por número.
- **Cobro de la consulta** desde la cita: queda como venta (con el IVA
  desglosado) y sale en Cobros y en Reportes.
- **Aviso de control**: al atender, se programa "le toca su control en 3
  meses"; ese día sale un WhatsApp para que vuelva a agendar y queda una tarea
  para la recepción.
- El paciente **califica la atención** desde su enlace.
- Reportes de clínica: cobrado, asistencia, ingresos e inasistencia por
  médico, servicios más pedidos, reservas en línea y calificación promedio.
- Tope de mensajes de WhatsApp por plan, aviso en el resumen y correo al
  propietario cuando un recordatorio no se pudo mandar.

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
- **Clínica (agenda, pacientes, expediente, cobros):**
  `clinica@crmchapin.gt` / `demo1234`
- **Médico de la clínica:** `medico@crmchapin.gt` / `demo1234`
- **Reservas en línea de la clínica:** `/reservar/clinica-san-rafael`

`npm run db:seed` borra y recrea las empresas demo, así que no lo corras contra
una base con información real.

### Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL. |
| `AUTH_SECRET` | Llave para firmar la sesión. Generala con `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app, como respaldo para armar enlaces. |
| `SMTP_*` | Correo saliente para recuperar contraseñas. Si lo dejás vacío, el enlace se escribe en el log del servidor en vez de enviarse. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth de Google para conectar Google Calendar. |
| `WHATSAPP_APP_SECRET` | App Secret de la app de Meta; con él se verifica la firma de cada envío al webhook. |
| `WHATSAPP_VERIFY_TOKEN` | Texto libre que se pone en Meta al registrar el webhook. |
| `CRON_SECRET` | Protege `/api/cron/recordatorios`. |
| `CIFRADO_SECRETO` | Opcional. Llave para cifrar los tokens de Google y WhatsApp; si falta se deriva de `AUTH_SECRET`. |

`NEXT_PUBLIC_APP_URL` es obligatoria si se usa la agenda: los enlaces que
recibe el paciente por WhatsApp y la URL de retorno de Google se arman con ella,
y como Next la incrusta al compilar, hay que definirla antes de `npm run build`.

El servidor puede correr en cualquier zona horaria: los cortes de día y de mes
se calculan siempre en hora de Guatemala (UTC-6, sin horario de verano).

### Conectar Google Calendar

1. En [Google Cloud Console](https://console.cloud.google.com/) creá un proyecto,
   habilitá **Google Calendar API** y configurá la pantalla de consentimiento
   OAuth (tipo externo; mientras esté "en prueba" agregá las cuentas que vayan
   a conectar como usuarios de prueba).
2. En Credenciales creá un **ID de cliente OAuth** de tipo aplicación web con la
   URL de redireccionamiento `https://tu-dominio/api/google/callback`.
3. Poné el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
4. Cada clínica entra a **Configuración → Google y WhatsApp → Conectar con
   Google** y elige en qué calendario caen las citas.

El permiso que se pide es `calendar` (leer la lista de calendarios y escribir
eventos). El refresh token se guarda cifrado con AES-256-GCM.

### Conectar WhatsApp

Cada clínica usa su propio número de WhatsApp Business:

1. En Meta for Developers creá una app de tipo Empresa con el producto
   WhatsApp y registrá el número.
2. En WhatsApp Manager creá la plantilla `recordatorio_cita` (categoría
   *Utilidad*, español) con este cuerpo:

   ```
   Hola {{1}}, le recordamos su cita en {{2}} el {{3}}.

   Confirme, cancele o agréguela a su calendario aquí: {{4}}

   También puede responder 1 para confirmar o 2 para cancelar.
   ```

   `{{1}}` nombre del paciente · `{{2}}` clínica · `{{3}}` fecha, hora y
   profesional · `{{4}}` enlace del paciente. Opcionalmente, una segunda
   plantilla con los mismos parámetros para la confirmación al agendar, y
   una `aviso_control` para el seguimiento:

   ```
   Hola {{1}}, le escribimos de {{2}}. Ya le toca su {{3}}.

   Puede agendar aquí: {{4}}
   ```
3. Generá un token permanente de un usuario del sistema con permiso
   `whatsapp_business_messaging` y cargalo, junto con el *Phone Number ID*, en
   **Configuración → Google y WhatsApp**. Al guardar se verifica contra Meta.
4. Para recibir confirmaciones y estados de entrega, registrá el webhook
   `https://tu-dominio/api/whatsapp/webhook` con `WHATSAPP_VERIFY_TOKEN` y
   suscribí el campo `messages`. Los envíos sin la firma de `WHATSAPP_APP_SECRET`
   se rechazan.

Mientras WhatsApp no esté conectado, cada cita tiene un botón para mandar el
recordatorio a mano por `wa.me`.

### Tarea programada de recordatorios

Los recordatorios se envían cuando alguien llama a `/api/cron/recordatorios`
con `Authorization: Bearer $CRON_SECRET`. Programalo cada 5 minutos:

```bash
# crontab
*/5 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://tu-dominio/api/cron/recordatorios
```

Sirve igual cron-job.org, un workflow programado de GitHub Actions o Vercel
Cron (que manda solo ese encabezado si `CRON_SECRET` está definido). Cada
recordatorio se reserva antes de enviarse, así que dos ejecuciones simultáneas
no duplican mensajes. La confirmación al agendar no espera al cron: sale en el
momento.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Genera el cliente de Prisma y compila para producción. |
| `npm start` | Sirve la compilación de producción. |
| `npm run typecheck` | Revisa tipos sin compilar. |
| `npm test` | Corre las pruebas automáticas (horas, disponibilidad, calendario, WhatsApp). |
| `npm run db:migrate` | Crea y aplica migraciones en desarrollo. |
| `npm run db:deploy` | Aplica las migraciones pendientes en producción (usa `DIRECT_URL` si existe). |
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
    (publico)/       enlaces sin cuenta: cotización (/c) y cita del paciente (/cita)
    api/             cron de recordatorios, webhook de WhatsApp, OAuth de Google
    app/             la aplicación, protegida por requerirSesion()
      citas/  contactos/  embudo/  actividades/
      cotizaciones/  ventas/  productos/  configuracion/
  components/        UI compartida (botones, tarjetas, líneas de documento…)
  lib/
    agenda.ts        recordatorios, respuestas del paciente, cron y webhook
    citas.ts         estados, enlaces, .ics y textos de la agenda
    google.ts        OAuth y sincronización con Google Calendar
    whatsapp.ts      cliente de la API de WhatsApp Business
    cifrado.ts       cifrado de los tokens de las integraciones
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

## Publicar

La guía paso a paso para dejarlo en línea con Vercel y Supabase, conectar
Google Calendar y WhatsApp y activar los recordatorios está en
[`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Antes de salir a producción

Esto es un MVP funcional; para cobrarle a clientes reales conviene sumar:

- **HTTPS obligatorio.** La cookie de sesión se marca `secure` en producción, así
  que la app necesita servirse por HTTPS.
- **Cobro automático.** El vencimiento sí es automático, pero el pago se
  registra a mano tras un depósito o transferencia; falta conectar una pasarela.
- **Un proveedor de correo conectado.** Sin `SMTP_*` configurado, los enlaces de
  recuperación quedan en el log del servidor en vez de llegarle al usuario.
- **Respaldos de la base** y un plan de restauración.
- **La tarea programada de recordatorios** corriendo cada pocos minutos (ver
  arriba); sin ella solo sale la confirmación al agendar.
- **Verificación de la app de Google.** Mientras la pantalla de consentimiento
  esté "en prueba", solo las cuentas agregadas como usuarios de prueba pueden
  conectar su calendario.
- **Facturación electrónica (FEL).** El comprobante de venta es interno; no
  sustituye a la factura autorizada por la SAT.
