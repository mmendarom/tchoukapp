# Spec: Resiliencia del backend de licencias

## Estado

In progress — **Paso 1 (keep-alive, P2) implementado el 2026-10-19**. Pasos 2 a 7 (P1 y P3) pendientes.

## Contexto

Incidente del 2026-10-18: el proyecto de Supabase estaba pausado (capa gratuita, ~7 días de inactividad) y hubo que reanudarlo a mano. Mientras estuvo pausado, la lista de Administración no cargaba y ningún usuario podía registrarse. Ver `docs/decisions/010-acceso-con-backend-licencias-inalcanzable.md` para el análisis completo y las decisiones de producto que esta spec implementa.

Cubre tres frentes del mismo problema (P1, P2 y P3 del relevamiento):

- **P1**: la app trata "no pude verificar" como "no tenés licencia", y el mensaje que muestra es falso.
- **P2**: nada evita que el proyecto se vuelva a pausar.
- **P3**: si la sesión de Supabase muere, la app no se entera ni lo informa.

## Problema

1. `App.tsx:55-59` descarta en silencio cualquier error de `fetchEntitlement`. Una sesión muerta o un proyecto pausado son invisibles hasta que se vence la gracia y la app bloquea.
2. Pasados 14 días sin verificar, `evaluateAccess` devuelve `expired` y bloquea, sin distinguir si el servidor dijo "no tenés acceso" o si no se lo pudo contactar.
3. Los copys de `expired` (`AccessBlockedScreen.tsx:24`) y de error de red (`accountService.ts:5`) culpan a la conexión del usuario cuando el problema es del servidor.
4. `WelcomeScreen.tsx:352` no ofrece modo local con backend configurado, así que "Cerrar sesión" desde el bloqueo deja al usuario sin ningún camino de vuelta mientras el proyecto esté caído.
5. `supabaseClient.ts:16-24` usa `autoRefreshToken: true` sin engancharlo a `AppState`, que es lo que la guía de supabase-js pide para React Native. Con la app en background el timer de refresh se suspende y el refresh token puede quedar vencido o marcado como ya usado; supabase-js desloguea del lado del cliente y **nadie escucha ese evento** (no hay `onAuthStateChange` en el proyecto).
6. `fetchEntitlement` mapea cualquier fallo de `supabase.auth.getUser()` a `NO_SESSION_ERROR` ("No hay una sesión activa en el servidor"). `getUser()` hace red, así que con el proyecto pausado el usuario ve un mensaje de sesión cuando el problema es de alcance. Diagnóstico equivocado.
7. `App.tsx:68` recalcula el corte de acceso a mano (`access !== 'local' && access !== 'active'`) en vez de usar `hasActiveAccess`, que la constitution define como el único punto de corte. Dos fuentes de verdad que hay que mantener en sincronía.

## Objetivos

- Distinguir, en todo el stack, **servidor inalcanzable** de **respuesta autoritativa de no-acceso** y de **sesión inválida**.
- No bloquear a un usuario ya aprobado y verificado porque el servidor esté caído, dentro de una ventana acotada (fail-open acotado, decisión 010).
- Decir la verdad en pantalla: nunca culpar a la conexión del usuario por un fallo del servidor.
- Que la sesión muerta sea visible y recuperable (reloguear) en vez de silenciosa.
- Evitar que el proyecto de Supabase se pause, y enterarse por email si se cae.
- Mantener `evaluateAccess` / `hasActiveAccess` como único punto de corte, y puro.

## No objetivos

- Ofrecer modo local cuando el backend está configurado. Descartado explícitamente por Mauro: autenticarse y tener licencia es obligatorio (decisión 010, punto 4).
- Aflojar el bloqueo de `pending`, `revoked` o `lapsed`. El fail-open aplica **solo** a licencia `active`.
- Pasar a un plan pago de Supabase.
- Sync de datos deportivos, notificaciones push o cualquier otro uso de red. Sigue siendo solo licencias.
- Resolver el vencimiento masivo del 1/1/2027 de las cortesías (registrado como riesgo en la decisión 010).
- Reintentos automáticos con backoff. Un intento por arranque + reintento manual alcanza.

## Reglas de dominio

### Motivo de fallo tipado

`src/backend` deja de devolver solo strings y pasa a devolver un motivo que el dominio pueda interpretar:

```ts
export type AccountFailureKind =
  | 'backend-unavailable' // sin env vars: modo local, no es un fallo
  | 'unreachable'         // red, DNS, timeout, proyecto pausado, 5xx
  | 'no-session'          // no hay sesión guardada en el dispositivo
  | 'auth'                // refresh rechazado o JWT inválido: hay que reloguear
  | 'server'              // el servidor respondió con error (RLS, SQL, 4xx)
  | 'invalid-code';       // OTP incorrecto o vencido
```

El tipo vive en `src/domain/session.ts` (es dominio, no infraestructura) y `AccountResult` lo incluye en el caso de error. Los strings de UI en español se siguen armando en `accountService.ts`.

Mapeo: `unreachable` es el **único** motivo que activa el fail-open. `auth` y `no-session` implican que el servidor está vivo, así que el arreglo está en manos del usuario (reloguear) y no extienden nada.

### Campo `unreachableSince`

`AccountEntitlement` gana un campo opcional:

```ts
unreachableSince?: string; // ISO: primer fallo unreachable desde la ultima verificacion exitosa
```

- Se setea **solo si está ausente**, en el primer fallo `unreachable`. Los fallos siguientes no lo pisan (si lo pisaran, el techo nunca vencería).
- Se limpia en toda verificación exitosa, junto con el nuevo `verifiedAt`.
- Es opcional, así que un perfil persistido viejo sin el campo se lee como "nunca falló". No hace falta subir `SESSION_STORE_DATA_VERSION`.

### Cambios en `evaluateAccess`

Se agrega `UNREACHABLE_CEILING_DAYS = 21` y un estado nuevo `unreachable`. El orden de evaluación queda:

1. Sin perfil → `none`.
2. Sin `accountId` → `local` (modo local de la spec 014; sin cambios).
3. Status `revoked` → `revoked`. **Autoritativo, nunca se afloja.**
4. `expiresAt` cumplido → `lapsed`. **Autoritativo, nunca se afloja.**
5. Sin entitlement o status `pending` → `pending`. **Nunca se afloja**: quien no fue aprobado no entra aprovechando que el servidor está caído.
6. Status `active` y `now - verifiedAt <= 14 días` → `active`.
7. Status `active`, gracia vencida, `unreachableSince` presente y `now - unreachableSince <= 21 días` → `unreachable` (acceso concedido, con aviso).
8. Resto → `expired` → bloquea.

`hasActiveAccess` devuelve `true` para `local`, `active` y `unreachable`.

Los pasos 3, 4 y 5 van **antes** del 6 y 7 a propósito: es lo que garantiza que el fail-open no abra ninguna puerta nueva.

### Avisos escalonados

`getGraceDaysLeft` se mantiene. Se agrega una función pura que decide el aviso a mostrar en Inicio y Perfil, para no poner esa lógica en los componentes:

```ts
getAccessNotice(profile, nowIso): { level: 'none' | 'info' | 'warning' | 'critical'; daysLeft?: number }
```

- `none`: gracia normal corriendo con margen → sin aviso visible (equivale a hoy).
- `warning`: quedan `GRACE_WARNING_DAYS` o menos de gracia normal.
- `critical`: estado `unreachable` → el servidor no responde y hay un techo corriendo; se muestran los días restantes.

## Estado y persistencia

- `useSessionStore`: `updateEntitlement` ya existe y se reutiliza para el caso exitoso (debe limpiar `unreachableSince`).
- Acción nueva `recordVerificationFailure(kind, atIso)`: setea `unreachableSince` si corresponde y guarda el último motivo/fecha de fallo para la UI de diagnóstico. No toca status ni `verifiedAt`.
- Acción nueva `markSessionInvalid()`: marca que hay que reloguear (motivos `auth` / `no-session`). No borra el perfil ni los datos deportivos.
- Nada de esto toca `useMatchStore`, `usePracticeStore` ni `useTrainingStore`: los datos deportivos siguen 100% locales e intactos.

## UI esperada

Todo el texto visible en español.

### `AccessBlockedScreen`

- Mensaje nuevo para sesión inválida: título "Sesión vencida", copy "Tu sesión en el servidor venció. Volvé a iniciar sesión con tu email para seguir usando la app.", con acción principal que lleva al login por OTP (no a un reintento que va a fallar igual).
- Se corrige el copy de `expired` para que no culpe a la conexión cuando el último fallo fue `unreachable`: "No pudimos contactar el servidor de licencias. No es un problema de tu conexión. Avisale a Mauro."
- El botón "Reintentar verificación" muestra el motivo real del fallo en vez de "Revisá tu conexión" genérico.

### `HomeScreen`

- El aviso existente de gracia pasa a usar `getAccessNotice`. En nivel `critical` el texto dice que el servidor no responde y cuántos días quedan antes de que la app se bloquee.

### `ProfileScreen`

- Sección "Licencia": fila nueva "Servidor" con el estado de la última verificación — "verificada hoy", "sin contacto desde el 12/10 (quedan 9 días)" o "sesión vencida: volvé a iniciar sesión". Es el diagnóstico que hoy no existe y que habría explicado el incidente en el momento.

### `WelcomeScreen`

- Sin cambios de flujo (no se agrega modo local). Solo el mensaje de error del OTP pasa a distinguir "no se pudo contactar el servidor" de "el código no es válido".

## Backend e infraestructura

### `src/backend/supabaseClient.ts`

- Enganchar `AppState` a `startAutoRefresh()` / `stopAutoRefresh()` una sola vez, al crear el cliente. Guardar la suscripción para poder limpiarla; no suscribirse en cada `getSupabaseClient()`.

### `src/backend/accountService.ts`

- `fetchEntitlement`: usar `getSession()` (lectura local, sin red) para detectar ausencia de sesión, y reservar `unreachable` para los fallos de red reales. Hoy cualquier fallo de `getUser()` se reporta como "no hay sesión", que es un diagnóstico equivocado con el proyecto pausado.
- Clasificar errores de Supabase en `AccountFailureKind` con una función pura y testeable (por `error.status` / forma del mensaje), no inline en cada llamada.
- `subscribeToAuthState(cb)`: envuelve `onAuthStateChange` y emite eventos **de dominio** (`signed-out`, `token-refreshed`), sin filtrar tipos de `@supabase/supabase-js` hacia afuera de `src/backend` (constitution).

### `.github/workflows/supabase-keepalive.yml` (nuevo)

- `schedule` dos veces por semana (lunes y jueves) + `workflow_dispatch` para correrlo a mano.
- Un `curl` a `/rest/v1/entitlements?select=user_id&limit=1` con header `apikey`. Con RLS anónima devuelve una lista vacía, pero igual toca la base, que es lo que cuenta como actividad.
- El job **falla** si el HTTP no es 200. Así GitHub manda email automáticamente: monitoreo gratis, sin servicios nuevos.
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` como secrets del repo. La publishable key ya está commiteada en `eas.json` y es pública por diseño, pero igual va como secret para no acoplar el workflow a ese archivo.

**Caveat a documentar**: GitHub deshabilita los workflows programados en repos sin actividad por 60 días. Si el repo queda quieto dos meses, el keep-alive se apaga solo y hay que reactivarlo desde la pestaña Actions. Hay que anotarlo en `supabase/README.md`.

**A verificar en la práctica**: que los requests REST cuenten como actividad para la política de pausado de la capa gratuita. Confirmar en el dashboard después de dos o tres semanas de cron corriendo. Si no alcanzara, la alternativa es un request que escriba (por ejemplo una tabla `heartbeat` con una fila), que requiere su propia migración.

## Testing plan

Dominio (puro, Vitest):

- `evaluateAccess`: un caso por rama. Críticos: `pending` + `unreachableSince` reciente sigue dando `pending`; `revoked` + inalcanzable sigue dando `revoked`; `lapsed` + inalcanzable sigue dando `lapsed`; `active` + gracia vencida + inalcanzable dentro del techo da `unreachable`; `active` + gracia vencida + techo vencido da `expired`; `active` + gracia vencida **sin** `unreachableSince` da `expired`.
- `hasActiveAccess`: `unreachable` concede acceso; `pending`, `revoked`, `lapsed` y `expired` no.
- `getAccessNotice`: los niveles, incluidos los bordes (`GRACE_WARNING_DAYS` exacto, techo en el último día).
- Clasificador de errores: cada `AccountFailureKind` desde su forma de error típica.
- Perfil viejo sin `unreachableSince` se comporta como antes (no concede fail-open).

Store:

- `recordVerificationFailure`: setea `unreachableSince` la primera vez y **no** lo pisa en fallos siguientes.
- `updateEntitlement`: limpia `unreachableSince`.
- Ninguna de las dos toca los datos deportivos.

Manual:

- Con el proyecto pausado a propósito (o apuntando a una URL inexistente): abrir la app con licencia activa y `verifiedAt` viejo debe entrar, con aviso crítico y días restantes. Con `verifiedAt` viejo y status `pending` debe seguir bloqueada.
- Reanudar el proyecto: la verificación limpia el aviso.
- Dejar la app en background varias horas y volver: la sesión sigue viva (verifica el fix de `AppState`).
- Correr el workflow con `workflow_dispatch` contra el proyecto despierto (debe pasar) y con una URL mala (debe fallar y mandar email).

## Riesgos

- El techo se mide con el reloj del dispositivo: atrasarlo extiende el acceso. Ya pasaba con la gracia de 14 días; aceptado en la decisión 010.
- Si el keep-alive falla en silencio (workflow deshabilitado por los 60 días de inactividad del repo) volvemos al escenario de pausa. Mitigado porque el fail-open acotado da 21 días de aire.
- `AppState` + `startAutoRefresh` cambia el comportamiento del refresh de tokens: hay que probarlo en dispositivo real, no solo en web o Expo Go.
- Agregar una rama al corte de acceso es el código más sensible de la app. Se mitiga con tests de dominio exhaustivos y manteniendo `evaluateAccess` puro.

## Preguntas abiertas

- ¿21 días de techo es el número correcto? Elegido para cubrir un torneo completo más margen para que Mauro reaccione. Ajustable con una constante.
- ¿Conviene que el aviso crítico aparezca también como banner en la pantalla de partido en vivo? Probablemente no (no interrumpir el registro en vivo), pero queda planteado.

## Plan de implementación

Ver `docs/plans/021-resiliencia-backend-licencias-plan.md`.

## Checklist de aceptación

- [ ] `AccountFailureKind` en `src/domain/session.ts` y `AccountResult` devolviendo el motivo.
- [ ] Clasificador de errores puro con tests.
- [ ] `unreachableSince` en `AccountEntitlement`, con semántica de "no pisar".
- [ ] `UNREACHABLE_CEILING_DAYS`, estado `unreachable` y `getAccessNotice` con tests por rama.
- [ ] `App.tsx` usa `hasActiveAccess` como único corte y registra los fallos en vez de descartarlos.
- [ ] `AppState` enganchado a `startAutoRefresh` / `stopAutoRefresh`.
- [ ] `subscribeToAuthState` con eventos de dominio, sin filtrar tipos de Supabase.
- [ ] `fetchEntitlement` distingue sesión ausente de servidor inalcanzable.
- [ ] Copys corregidos en `AccessBlockedScreen`, `HomeScreen` y `ProfileScreen`; ninguno culpa a la conexión del usuario por un fallo del servidor.
- [x] Workflow de keep-alive escrito con falla ruidosa y pre-flight de secrets, validado a mano en los tres caminos (200 con apikey, `000` con host inalcanzable, error distinto con secrets ausentes). **Pendiente de Mauro**: cargar los dos secrets y mergear a `main` — los crons solo corren en la rama default.
- [x] Caveat de los 60 días anotado en `supabase/README.md`.
- [ ] `npx tsc --noEmit` y `npm test` en verde.
