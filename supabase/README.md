# Backend de licencias (Supabase)

Backend minimo de cuentas y licencias de la spec 015. Sin pagos, sin sync de datos deportivos: solo identifica usuarios y dice si tienen acceso (`cortesia` o, en el futuro, `suscripcion`).

Si la app corre **sin** las variables de entorno, funciona en modo local (login de la spec 014, sin red). Nada de esto es necesario para desarrollar.

## Setup (una sola vez)

1. Crear un proyecto en [supabase.com](https://supabase.com) (capa gratis alcanza).
2. En el **SQL editor**, correr `migrations/0001_entitlements.sql`.
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

## Administrar licencias (SQL editor)

Los registros nuevos quedan `pending` (sin acceso) hasta que los actives.

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

## Como funciona el acceso en la app

- Login por email + codigo OTP (6 a 10 digitos segun la config del proyecto). El nombre se pide en el mismo formulario.
- La app cachea la licencia con la fecha de la ultima verificacion online y la refresca en background al abrir.
- **Gracia offline: 14 dias.** Con licencia activa verificada, la app funciona sin conexion hasta 14 dias; despues bloquea en el arranque hasta reverificar (salvo partido en vivo activo, que nunca se bloquea).
- `pending` y `revoked` bloquean con mensaje y boton de reintento.

## Pendiente (etapas futuras)

- Pagos/suscripciones: cuando exista, un webhook actualizara `entitlements` a `plan = 'suscripcion'`; la app no cambia.
- Personalizar remitente/dominio de los emails de OTP.
