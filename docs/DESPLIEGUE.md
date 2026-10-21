# Publicar el CRM (Vercel + Supabase)

Esta app no puede ir en GitHub Pages como el sistema de SEFE: SEFE es una
página estática que habla directo con Supabase, mientras que este CRM necesita
un servidor encendido para la sesión, las acciones de servidor, el webhook de
WhatsApp y el OAuth de Google. Por eso:

```
GitHub    código + tarea de recordatorios cada 5 min (Actions)
Vercel    corre la app (se publica solo con cada cambio en GitHub)
Supabase  base de datos PostgreSQL (la misma cuenta que usa SEFE)
```

## 1. Base de datos en Supabase (10 min)

1. En supabase.com → **New project** (uno nuevo, no el de SEFE). Región: la más
   cercana (us-east-1). Guardá la contraseña de la base.
2. Botón **Connect** → pestaña **ORMs → Prisma**. Copiá las dos cadenas:
   - `DATABASE_URL`: la del *pooler* (puerto **6543**). Agregale al final
     `?pgbouncer=true&connection_limit=1` si no lo trae.
   - `DIRECT_URL`: la conexión directa o *session pooler* (puerto **5432**).
     Se usa solo para aplicar las migraciones al publicar.

La app no usa la API de Supabase ni sus políticas RLS: se conecta como
PostgreSQL normal y aísla a cada clínica por `empresaId` en el servidor.

## 2. App en Vercel (10 min)

1. vercel.com → **Add New → Project** → importá `proyectox` desde GitHub.
2. Framework: Next.js (lo detecta solo). No cambies los comandos: Vercel usa
   el script `vercel-build`, que aplica las migraciones y compila.
3. En **Environment Variables** cargá:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | cadena del pooler (6543) |
| `DIRECT_URL` | cadena directa (5432) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | la dirección final, ej. `https://clinicas.vercel.app` o tu subdominio |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | paso 3 |
| `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` | paso 4 |
| `SMTP_*` | opcional, para recuperar contraseñas |

4. **Deploy**. Si después cambiás `NEXT_PUBLIC_APP_URL`, hay que volver a
   publicar (Deployments → Redeploy) porque se incrusta al compilar.
5. Dominio propio (opcional): Settings → Domains → por ejemplo
   `clinicas.se-fe.com`, y en tu DNS un CNAME a `cname.vercel-dns.com`.

Con esto ya funcionan la agenda, el enlace del paciente y el envío manual por
WhatsApp. Entrá a `/registro` y creá la cuenta de la clínica.

## 3. Google Calendar (20–30 min)

1. console.cloud.google.com → proyecto nuevo → **APIs y servicios → Biblioteca**
   → habilitá **Google Calendar API**.
2. **Pantalla de consentimiento OAuth**: tipo *Externo*, nombre de la app,
   correo de soporte. En *Usuarios de prueba* agregá las cuentas de Google de
   las clínicas que van a conectar su calendario (hasta 100 mientras la app
   esté en prueba; para más hay que pedir la verificación a Google).
3. **Credenciales → Crear → ID de cliente OAuth → Aplicación web**. En
   *URI de redireccionamiento autorizados*:
   `https://TU-DOMINIO/api/google/callback`
4. Copiá el ID y el secreto a Vercel y redeploy.
5. En la app: Configuración → Google y WhatsApp → **Conectar con Google**.

## 4. WhatsApp Business (1 h + aprobación de Meta)

1. developers.facebook.com → **Crear app → Empresa** → agregá **WhatsApp**.
   Meta da un número de prueba que puede escribirle hasta a 5 números
   verificados: sirve para probar hoy mismo.
2. WhatsApp Manager → **Plantillas** → crear `recordatorio_cita`, categoría
   *Utilidad*, idioma español, con el texto que aparece en la app
   (Configuración → Google y WhatsApp → "Cómo conectar").
3. Business Settings → **Usuarios del sistema** → crear uno con permiso
   `whatsapp_business_messaging` → generar token permanente.
4. En la app: pegar el **Phone Number ID** y el token → Guardar → Mandar prueba.
5. Webhook (para que "1"/"2" confirmen o cancelen): en la app de Meta →
   WhatsApp → Configuración:
   - URL: `https://TU-DOMINIO/api/whatsapp/webhook`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN`
   - Suscribir el campo `messages`
   - `WHATSAPP_APP_SECRET` = App Settings → Basic → App Secret
6. Para usar el número real de la clínica: agregarlo en WhatsApp Manager.
   Meta puede pedir verificar el negocio (tarda de horas a días).

## 5. Recordatorios automáticos (5 min)

En GitHub → `proyectox` → Settings → Secrets and variables → Actions → crear:

- `APP_URL`: la dirección de la app
- `CRON_SECRET`: el mismo valor que en Vercel

El workflow `.github/workflows/recordatorios.yml` corre cada 5 minutos desde
la rama principal. Se puede lanzar a mano desde la pestaña **Actions** para
probarlo. (El cron de Vercel en el plan gratis corre una sola vez al día, por
eso se usa GitHub.)
