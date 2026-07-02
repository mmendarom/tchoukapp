# Spec 015 - Backend minimo de cuentas y licencias (sin pagos)

- Estado: approved (en implementacion)
- Fecha: 2026-07-01
- Relacionada con: `docs/specs/014-tchoukapp-rebrand-login.md`, `docs/decisions/006-tchoukapp-rebrand-local-login-monetization.md`, `docs/decisions/007-supabase-licencias-modo-local.md`, `docs/plans/015-backend-cuentas-licencias-plan.md`

> Aprobada el 2026-07-01 por pedido explicito de Mauro ("haz todo el desarrollo que se necesite para crear el BE"). Los boundaries de `docs/constitution.md` se actualizan junto con esta spec.

## 1. Problema

TCHOUKAPP tiene login local sin verificacion: cualquiera con el dispositivo entra, y no hay forma de controlar quien usa la app ni de distinguir usuarios de cortesia de futuros suscriptores. Para el camino de lanzamiento publico (decision 006) falta la pieza de identidad real y licencias por usuario. Los pagos se difieren deliberadamente: primero se valida cuentas + licencias con el grupo de cortesia en torneos reales.

## 2. Objetivos

- Cuentas reales verificables por email (OTP o magic link, sin contraseñas propias).
- Entitlements por usuario en el backend: `plan` (`cortesia` | `suscripcion`) y estado, leidos por la app.
- Todos los usuarios de esta etapa quedan como `cortesia`; el alta la administra Mauro (sin panel: filas en la DB alcanzan al principio).
- `hasActiveAccess` (`src/domain/session.ts`) pasa a evaluar el entitlement cacheado con **periodo de gracia offline** (propuesta: 14 dias sin reverificar antes de bloquear), para no romper torneos sin conexion.
- Vincular el perfil local existente a la cuenta real en el primer login online, sin perder datos deportivos.

## 3. No objetivos

- **Pagos, suscripciones de tienda (IAP), RevenueCat, Mercado Pago**: diferidos a una spec futura. Nada de esta etapa debe encerrarnos en un proveedor de pagos.
- Sync de datos deportivos en la nube: los partidos, jugadores y entrenamientos siguen locales con backup JSON.
- Panel de administracion: la lista de cortesia se gestiona directo en la base.
- Multi-dispositivo con datos compartidos.

## 4. Decisiones tomadas (antes abiertas)

1. Proveedor: **Supabase** (auth por email OTP + Postgres, capa gratis). Ver decision 007.
2. Gracia offline: **14 dias** desde la ultima verificacion online exitosa. Al vencer, la app bloquea en el arranque, salvo que haya un partido en vivo activo: en ese caso deja entrar (nunca se bloquea un partido iniciado).
3. Usuarios sin email: el **modo local sigue existiendo** cuando el backend no esta configurado (sin variables de entorno la app funciona exactamente como hoy). Con backend configurado, el login es por email + codigo y el nombre se pide en el mismo formulario.
4. Cuentas de developer de Apple/Google y politica de privacidad: siguen pendientes; no bloquean esta fase, si el lanzamiento en tiendas.
5. Alta de licencias: al registrarse, un trigger crea la fila en `entitlements` con `status: 'pending'` (sin acceso). Mauro activa por SQL (`status: 'active'`). La app muestra "acceso pendiente" hasta la activacion.

## 5. Esquema de datos (backend)

- `auth.users` (Supabase Auth): id, email verificado.
- `public.entitlements`: user_id (PK, FK a auth.users), plan (`cortesia` | `suscripcion`), status (`pending` | `active` | `revoked`), granted_by, created_at, updated_at.
- RLS: cada usuario solo puede LEER su propia fila; escrituras solo por service role / SQL editor.
- Trigger `on_auth_user_created`: crea la fila `pending` al registrarse.
- La app cachea `{ plan, status, verifiedAt }` dentro del perfil local persistido; `hasActiveAccess` = entitlement `active` verificado dentro de la gracia offline (o perfil de modo local).

SQL versionado en `supabase/migrations/`; instrucciones de setup y snippets de administracion (activar/revocar por email) en `supabase/README.md`.

## 6. Fases

1. Backend con auth por email + tabla de entitlements; alta manual de cortesias.
2. App: pantalla de login real (reemplaza/extiende la portada 014), cache del entitlement, gracia offline en `hasActiveAccess`.
3. Prueba con el grupo de cortesia en torneo real (validar offline).
4. (Spec futura) Pagos: decision IAP+RevenueCat vs pago web; solo cambia como un usuario obtiene `plan: suscripcion`.

## 7. Pruebas

- Dominio: `hasActiveAccess` con entitlement activo, revocado, vencido dentro/fuera de gracia (funciones puras, testeables sin red).
- Store: cache y expiracion del entitlement; migracion del perfil local.
- QA manual: login con OTP, avion durante 14 dias simulados, revocacion de cortesia.

## 8. Limitaciones conocidas

- Sin pagos, el `plan: suscripcion` existe en el modelo pero nadie puede obtenerlo aun.
- La app queda con una dependencia de red nueva (solo para licencias); todo lo demas sigue offline-first.
