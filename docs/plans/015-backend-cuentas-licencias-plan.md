# Plan 015 - Backend minimo de cuentas y licencias (sin pagos)

Derivado de `docs/specs/015-backend-cuentas-licencias.md`.

## Stage 1 - Backend (Supabase)

- `supabase/migrations/0001_entitlements.sql`: tabla `public.entitlements` (plan `cortesia`/`suscripcion`, status `pending`/`active`/`revoked`), RLS de solo lectura propia, trigger de alta `pending` al registrarse, trigger de `updated_at`.
- `supabase/README.md`: pasos de setup (crear proyecto, correr SQL, habilitar OTP por email, copiar URL y anon key) y snippets de administracion (activar/revocar por email, listar licencias).

## Stage 2 - Capa backend en la app

- Dependencias: `@supabase/supabase-js`, `react-native-url-polyfill`.
- `src/backend/config.ts`: lee `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; `isBackendConfigured()`. Sin variables -> modo local (la app funciona como hoy, offline-first intacto).
- `src/backend/supabaseClient.ts`: cliente lazy con AsyncStorage como storage de auth.
- `src/backend/accountService.ts`: `requestEmailOtp`, `verifyEmailOtp`, `fetchEntitlement`, `signOut`; resultados `{ success, error }` con mensajes en espanol; sin dependencias de UI.

## Stage 3 - Dominio y store

- `src/domain/session.ts`: `EntitlementStatus`, `AccountEntitlement { plan, status, verifiedAt }`, `UserProfile` + `accountId?` + `entitlement?`; `ACCESS_GRACE_DAYS = 14`; `evaluateAccess(profile, nowIso)` -> `'local' | 'active' | 'pending' | 'revoked' | 'expired' | 'none'`; `hasActiveAccess` = `local` o `active`. Tests.
- `src/store/useSessionStore.ts`: version 2 (migracion passthrough de perfiles locales v1), `loginWithAccount`, `updateEntitlement`. Tests.

## Stage 4 - UI y gate

- `WelcomeScreen`: con backend configurado, flujo en dos pasos (nombre + email -> enviar codigo; codigo -> entrar); sin backend, formulario local actual.
- Nueva `AccessBlockedScreen`: estados pendiente/revocado/vencido, boton `Reintentar verificacion` y `Cerrar sesion`.
- `App.tsx`: gate `sin perfil -> Welcome`, `perfil bloqueado -> AccessBlocked` (salvo partido en vivo activo), `resto -> stack`; refresh de licencia en background al abrir con cuenta.
- `HomeScreen`: logout tambien cierra la sesion remota (fire and forget).

## Stage 5 - Config y docs

- `.env.example` con las dos variables publicas; `.env` ya esta gitignoreado.
- `docs/constitution.md`: backend de licencias como excepcion aprobada (spec 015), stack actualizado.
- `docs/implementation-log.md` + decision `007`.
- `npx tsc --noEmit` + `npm test`.

## Pendiente de configuracion (fuera del codigo)

- Crear el proyecto en Supabase, correr la migracion, configurar OTP y plantillas de email.
- Setear las variables en `.env` local y en EAS (env o secrets) para builds.
- QA manual del flujo OTP con un email real.

## Riesgos

- `@supabase/supabase-js` no debe importarse desde modulos testeados por vitest (dominio/store): la capa `src/backend/*` queda solo referenciada por pantallas y `App.tsx`.
- La gracia offline depende del reloj del dispositivo; aceptado para esta etapa.
