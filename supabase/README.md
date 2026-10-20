# Backend de licencias (Supabase)

Backend minimo de cuentas y licencias de la spec 015. Sin pagos, sin sync de datos deportivos: solo identifica usuarios y dice si tienen acceso (`cortesia` o, en el futuro, `suscripcion`).

Si la app corre **sin** las variables de entorno, funciona en modo local (login de la spec 014, sin red). Nada de esto es necesario para desarrollar.

## Setup (una sola vez)

1. Crear un proyecto en [supabase.com](https://supabase.com) (capa gratis alcanza).
2. En el **SQL editor**, correr en orden `migrations/0001_entitlements.sql`, `migrations/0002_entitlement_expiry.sql` (vencimiento de cortesias: 1/1/2027) y `migrations/0003_admin_entitlements.sql` (RPCs de administracion, spec 016).
3. En **Authentication -> Sign In / Up -> Email**: dejar habilitado el login por email.
4. **Obligatorio: SMTP propio + plantillas con codigo.** La app usa codigo OTP, pero las plantillas default de Supabase mandan un enlace magico que apunta a localhost, y en el plan gratis **no se pueden editar sin SMTP propio**. Configurar primero el SMTP (gratis, con Gmail):
   - En Google ([myaccount.google.com](https://myaccount.google.com) -> Seguridad): activar verificacion en 2 pasos y crear una **contrasena de aplicacion** llamada `Supabase` (clave de 16 caracteres).
   - En **Authentication -> Emails -> SMTP Settings**: sender `mauromendaro@gmail.com`, nombre `TCHOUKAPP`, host `smtp.gmail.com`, puerto `465`, username el mismo gmail, password la clave de aplicacion. Gmail permite ~500 envios/dia.
   - En **Authentication -> Rate Limits**: subir el limite de emails (con SMTP propio se desbloquea; ej. 30/hora).

   Con el SMTP activo, en **Authentication -> Emails -> Templates** editar las plantillas **Confirm signup** (usuarios nuevos) y **Magic Link** (logins siguientes) para que muestren el codigo con la variable `{{ .Token }}` y no incluyan `{{ .ConfirmationURL }}`:

```html
<h2>Tu código para entrar a TCHOUKAPP</h2>
<p>Ingresá este código en la app:</p>
<h1>{{ .Token }}</h1>
<p>El código vence en 1 hora. Si no pediste este email, ignoralo.</p>
```
5. Copiar las credenciales (el dashboard nuevo las separa en dos secciones):
   - **Settings -> Data API**: `Project URL` (es `https://<project-id>.supabase.co`).
   - **Settings -> API Keys**: la `Publishable key` (`sb_publishable_...`) o, en la pestaña Legacy, la `anon public` (`eyJ...`). Cualquiera de las dos sirve como `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
6. En la raiz del repo, crear `.env` (ya gitignoreado) a partir de `.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

7. Reiniciar con `npx expo start -c` (las variables `EXPO_PUBLIC_*` se incrustan al arrancar). Para builds de EAS, setear las mismas variables en `eas.json` (`env`) o como EAS environment variables.

Nota: el SMTP default de Supabase permite ~2 emails por hora y no deja editar plantillas; por eso el paso 4 es obligatorio. Si algun dia hay dominio propio, migrar de Gmail a Resend/Brevo con dominio verificado es el upgrade natural.

## Administrar licencias (desde la app)

Con la migracion `0003_admin_entitlements.sql` corrida, la cuenta `mauromendaro@gmail.com` ve una seccion **Administración** en la pantalla Perfil de la app: lista todos los usuarios registrados con su plan/estado/vencimiento y permite Activar o Revocar con un boton. Reemplaza el flujo manual de abajo para el dia a dia; el SQL editor queda como respaldo y para cambiar `expires_at`.

La migracion 0003 es re-ejecutable (todo `create or replace`): si corriste una version anterior del archivo, correlo entero de nuevo para quedar en la version vigente.

Los registros nuevos quedan `pending` (sin acceso) hasta que los actives (desde la app o por SQL).

## Administrar licencias (SQL editor, respaldo)

Ver todas las licencias con email:

```sql
select u.email, e.plan, e.status, e.granted_by, e.updated_at
from public.entitlements e
join auth.users u on u.id = e.user_id
order by e.updated_at desc;
```

Activar la cortesia de un companero:

```sql
update public.entitlements e
set status = 'active', granted_by = 'mauro'
from auth.users u
where u.id = e.user_id and u.email = 'companero@email.com';
```

Revocar acceso:

```sql
update public.entitlements e
set status = 'revoked', granted_by = 'mauro'
from auth.users u
where u.id = e.user_id and u.email = 'companero@email.com';
```

Renovar o cambiar el vencimiento de una cortesia (null = sin vencimiento):

```sql
update public.entitlements e
set expires_at = '2028-01-01T00:00:00Z'
from auth.users u
where u.id = e.user_id and u.email = 'companero@email.com';
```

Extender todas las cortesias a la vez:

```sql
update public.entitlements
set expires_at = '2028-01-01T00:00:00Z'
where plan = 'cortesia';
```

## Mantener el proyecto activo (keep-alive)

**La capa gratuita de Supabase pausa los proyectos tras ~7 dias de inactividad.** Un proyecto pausado no responde nada: no se puede registrar nadie, el panel de administracion no lista y la verificacion de licencias falla. Hay que reanudarlo a mano desde el dashboard.

Esto es un riesgo ciclico, no un evento raro: el unico uso de red de la app es verificar licencias, asi que una semana entre torneos alcanza para que el proyecto se pause. Paso el 2026-10-18.

Para evitarlo hay un cron en `.github/workflows/supabase-keepalive.yml` que pinguea el proyecto **lunes y jueves 12:00 UTC** (brecha maxima de 4 dias). Hace un `GET` a `/rest/v1/entitlements?select=user_id&limit=1` con la anon key: la RLS devuelve `[]`, pero la query igual toca Postgres, que es lo que cuenta como actividad.

El job **falla a proposito** si no recibe un 200, asi que GitHub manda un email. Es tambien el monitoreo del backend: si llega ese email, el proyecto esta pausado o caido.

Setup (una sola vez), en **Settings > Secrets and variables > Actions**:

- `SUPABASE_URL`: mismo valor que `EXPO_PUBLIC_SUPABASE_URL`.
- `SUPABASE_ANON_KEY`: mismo valor que `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Ambos estan en `eas.json`. Hasta que se carguen, el workflow falla con un mensaje explicito de "secrets sin configurar", que es un fallo distinto de "el proyecto no responde".

Tres advertencias importantes:

- **Los workflows programados corren solo en la rama default.** Mientras el archivo viva en una rama de feature, el cron no se dispara: recien arranca cuando se mergea a `main`. Se puede probar antes con `workflow_dispatch` desde la pestana Actions (tambien solo en la rama default).
- **GitHub deshabilita los crons en repos sin actividad por 60 dias.** Si el repo queda quieto dos meses, el keep-alive se apaga solo y hay que reactivarlo desde la pestana Actions. **Hoy no hay red de seguridad detras de esto**: el fail-open acotado de 21 dias esta especificado en la spec 021 pero NO esta implementado, asi que lo unico que hay es la gracia offline de 14 dias desde la ultima verificacion de cada dispositivo. Actualizar esta linea cuando el paso 4 del plan 021 este en verde.
- **Falta confirmar en la practica** que los requests REST cuenten como actividad para la politica de pausado. Revisar el dashboard despues de dos o tres semanas de cron corriendo. Si no alcanzara, la alternativa es un ping que escriba (una tabla `heartbeat` con una fila), que necesita su propia migracion.

## Como funciona el acceso en la app

- Login por email + codigo OTP (6 a 10 digitos segun la config del proyecto). El nombre se pide en el mismo formulario.
- La app cachea la licencia con la fecha de la ultima verificacion online y la refresca en background al abrir.
- **Gracia offline: 14 dias.** Con licencia activa verificada, la app funciona sin conexion hasta 14 dias; despues bloquea en el arranque hasta reverificar (salvo partido en vivo activo, que nunca se bloquea).
- `pending` y `revoked` bloquean con mensaje y boton de reintento.
- Las licencias tienen `expires_at` (cortesias: 1/1/2027). Al vencer, la app bloquea con "Licencia vencida"; renovar es un `update` de `expires_at`. El vencimiento se muestra en la pantalla Perfil.

## Pendiente (etapas futuras)

- Pagos/suscripciones: cuando exista, un webhook actualizara `entitlements` a `plan = 'suscripcion'`; la app no cambia.
- Personalizar remitente/dominio de los emails de OTP.
