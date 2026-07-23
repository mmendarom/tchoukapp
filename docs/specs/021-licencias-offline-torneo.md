# Spec 021 - Licencias vigentes hasta 2027 y uso offline en torneo

## Estado

Implemented

## Contexto

Durante un torneo, el cuerpo técnico usa la app en un iPad **sin conexión a
internet en ningún momento**. El sistema de licencias (specs 015/016) corre en
modo backend cuando están configuradas las variables de Supabase (es el caso del
APK/EAS): el login es solo online (email + código OTP) y el acceso offline dura
apenas `ACCESS_GRACE_DAYS = 14` días desde la última verificación online.

Dos problemas para el torneo:

1. No hay forma de entrar sin conexión: el login con backend configurado solo
   muestra el ingreso por email+código, sin el login local de la spec 014.
2. Aunque se entre una vez online, a los 14 días offline la app bloquea.

Además, el admin quiere que todas las licencias (activas y nuevas) queden
vigentes hasta el año que viene sin tener que aprobarlas a mano.

## Problema

La app se bloquea en uso 100% offline y las licencias vencen antes de tiempo /
requieren activación manual, lo que no sirve para un torneo sin internet.

## Objetivos

- Permitir entrar **sin conexión** aunque el backend esté configurado (perfil
  local, acceso completo offline).
- Que una licencia de cuenta ya verificada dure offline hasta su fecha de
  vencimiento real, no 14 días.
- Extender el vencimiento de todas las licencias a fin de 2027.
- Que las altas nuevas queden **activas automáticamente** (sin aprobación manual).

## No objetivos

- No se agregan pagos, sync de datos ni dependencias.
- No se cambia el flujo de partido/estadísticas.
- No se toca el modelo asimétrico ni la persistencia deportiva.

## Usuarios / Casos de uso

- Admin (Mauro) en iPad sin internet: entra en "modo sin conexión" y usa todo.
- Staff con cuenta que se conecta una vez y luego queda offline semanas/meses.
- Alta nueva de un colaborador: queda activa al registrarse, vigente hasta 2027.

## Flujo esperado

- Login (con backend configurado): además de "Enviar código", aparece **"Entrar
  sin conexión"** → formulario local (nombre + email opcional) → "Comenzar" →
  perfil local (`evaluateAccess` = `local`) → acceso completo offline. Link
  "Entrar con email" para volver al ingreso online.
- Cuenta online que ya verificó: sigue activa offline hasta `expiresAt`.

## Requisitos funcionales

- `WelcomeScreen`: toggle `offlineMode` que muestra el `localForm` aun con
  backend configurado; enlaces de ida ("Entrar sin conexión") y vuelta ("Entrar
  con email").
- `ACCESS_GRACE_DAYS` extendido para que el límite efectivo sea `expiresAt`.
- SQL: extender `expires_at` a 2027-12-31 para todas las filas, activar las
  `pending`, y cambiar el trigger de alta para que nazcan `active`.

## Requisitos no funcionales

- Offline-first, sin red para el modo local.
- Texto en español.

## Impacto en modelo de datos

- Sin cambios de tipos. `ACCESS_GRACE_DAYS`: 14 → 730 (`src/domain/session.ts`).
- Backend: `migrations/0004_autoactivate_and_extend_2027.sql` (re-ejecutable).

## Impacto en UI

- `WelcomeScreen`: nuevo modo local accesible con backend configurado.
- `AccessBlockedScreen`: copy de "expired" sin el "14 días" hardcodeado y con
  mención a entrar sin conexión.

## Impacto en estado/persistencia

- El perfil local (sin `accountId`) ya existía; ahora es alcanzable con backend
  configurado. `evaluateAccess` sin cambios de lógica (solo la constante).

## Testing plan

- `session.test.ts`: límites de gracia derivados de `ACCESS_GRACE_DAYS` (dentro
  de la gracia → active; pasada → expired; `getGraceDaysLeft` completo/parcial/0).

## Riesgos

- Auto-activar altas nuevas abre el acceso a cualquiera que se registre con un
  email. Mitigación: revocar individualmente desde el Perfil (spec 016). Ver
  decisión 010.
- Gracia larga (730 días) debilita la reverificación periódica; es intencional
  para torneos offline y queda acotada por `expiresAt`.

## Preguntas abiertas

- A futuro, si se lanza la suscripción, revisar si conviene acortar la gracia y
  volver a activación manual.

## Plan de implementación

Ver `docs/plans/021-licencias-offline-torneo-plan.md`.

## Checklist de aceptación

- [x] Se puede entrar sin conexión con backend configurado.
- [x] Licencia de cuenta dura offline hasta `expiresAt`.
- [x] SQL extiende vigencia a 2027-12-31 y activa pendientes.
- [x] Altas nuevas nacen activas.
- [x] `npx tsc --noEmit` y `npm test` en verde.
