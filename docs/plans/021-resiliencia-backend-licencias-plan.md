# Plan 021 - Resiliencia del backend de licencias

Spec: `docs/specs/021-resiliencia-backend-licencias.md`
Decisión: `docs/decisions/010-acceso-con-backend-licencias-inalcanzable.md`

Orden pensado para que lo más valioso y barato entre primero, y para que cada paso quede verificable por separado. Los pasos 1 y 2 no dependen entre sí: el 1 se puede mergear solo.

## Paso 1 - Keep-alive del proyecto (P2, entregable solo)

Independiente del resto. Es media hora de trabajo y saca el riesgo de encima hoy.

1. Crear `.github/workflows/supabase-keepalive.yml`:
   - `on: schedule` con cron lunes y jueves (por ejemplo `0 12 * * 1,4`, margen cómodo bajo los ~7 días) + `workflow_dispatch`.
   - Un solo job con un step de `curl`: `GET ${{ secrets.SUPABASE_URL }}/rest/v1/entitlements?select=user_id&limit=1` con headers `apikey` y `Authorization: Bearer`.
   - Capturar el código HTTP (`curl -s -o /dev/null -w "%{http_code}"`) y salir con error si no es 200, para que GitHub mande el email.
   - `timeout-minutes: 5` y sin `continue-on-error`: el fallo tiene que ser ruidoso.
2. Cargar los secrets del repo `mmendarom/tchoukapp`: `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3. Correrlo a mano con `workflow_dispatch` y confirmar que pasa con el proyecto despierto.
4. `supabase/README.md`: sección nueva "Mantener el proyecto activo" con el porqué (capa gratuita pausa a los ~7 días), el caveat de que GitHub deshabilita crons en repos sin actividad por 60 días, y cómo reactivarlo desde la pestaña Actions.

Verificación: el run manual pasa; un run apuntado a una URL inválida falla y llega el email.

## Paso 2 - Motivo de fallo tipado (P3, base de todo lo demás)

Sin esto, P1 no puede distinguir "inalcanzable" de "sesión muerta". Es refactor puro, sin cambios de comportamiento observables todavía.

1. `src/domain/session.ts`: agregar `AccountFailureKind`.
2. `src/backend/accountService.ts`:
   - Extender `AccountResult` para que el caso de error lleve `kind: AccountFailureKind` además del string en español.
   - Nueva función pura exportada (clasificador) que mapee un error de Supabase a `AccountFailureKind` por `error.status` y forma del mensaje. Debe ser testeable sin red.
   - Reemplazar los `catch {}` que hoy devuelven `NETWORK_ERROR` a ciegas por el clasificador.
   - `fetchEntitlement`: usar `getSession()` (local, sin red) para decidir `no-session`, y dejar `unreachable` para fallos de red reales. Corrige el diagnóstico equivocado del punto 6 de la spec.
3. Tests nuevos del clasificador: un caso por `AccountFailureKind`.

Verificación: `npm test` y `npx tsc --noEmit`. Los call sites existentes siguen compilando porque solo se agrega un campo.

## Paso 3 - Refresh de tokens y eventos de auth (P3)

1. `src/backend/supabaseClient.ts`: al crear el cliente (una sola vez, no en cada `getSupabaseClient()`), suscribir `AppState` y llamar `startAutoRefresh()` cuando pasa a `active` y `stopAutoRefresh()` cuando sale. Guardar la suscripción en el módulo.
2. `src/backend/accountService.ts`: `subscribeToAuthState(cb)` que envuelve `onAuthStateChange` y emite solo eventos de dominio (`signed-out`, `token-refreshed`). Devuelve una función de desuscripción. **No** exportar tipos de `@supabase/supabase-js` (constitution).
3. Tests: el envoltorio se puede testear con un doble del cliente; si queda muy acoplado, documentar que esta parte se valida a mano en dispositivo.

Verificación: en dispositivo real, dejar la app en background varias horas y confirmar que al volver la verificación sigue funcionando sin reloguear.

## Paso 4 - Fail-open acotado en el dominio (P1, núcleo)

El código más sensible de la app. Va solo, con tests antes que UI.

1. `src/domain/session.ts`:
   - `UNREACHABLE_CEILING_DAYS = 21`.
   - `unreachableSince?: string` en `AccountEntitlement`.
   - `unreachable` en `AccessEvaluation`.
   - Reescribir `evaluateAccess` siguiendo el orden exacto de la spec (autoritativos **antes** del fail-open).
   - `hasActiveAccess`: agregar `unreachable`.
   - `getAccessNotice(profile, nowIso)` como función pura.
2. `src/domain/session.test.ts`: los casos de la spec, con énfasis en los negativos (`pending`, `revoked`, `lapsed` + inalcanzable siguen bloqueando) y en el perfil viejo sin `unreachableSince`.

Verificación: `npm test`. Los 25 tests existentes de `session.test.ts` deben seguir pasando sin tocarse — si alguno rompe, es señal de un cambio de semántica no intencional.

## Paso 5 - Store y arranque (P1 + P3)

1. `src/store/useSessionStore.ts`:
   - `updateEntitlement`: limpiar `unreachableSince` al guardar una verificación exitosa.
   - `recordVerificationFailure(kind, atIso)`: setear `unreachableSince` **solo si está ausente** y guardar último motivo/fecha de fallo.
   - `markSessionInvalid()`: marcar que hace falta reloguear, sin borrar el perfil.
2. `App.tsx`:
   - Reemplazar el cálculo manual de `isBlocked` por `hasActiveAccess(profile)`, dejando la excepción de partido en vivo. Un solo punto de corte (constitution).
   - En el `useEffect` de arranque, dejar de descartar el error: llamar `recordVerificationFailure` o `markSessionInvalid` según el `kind`.
   - Suscribirse a `subscribeToAuthState` y llamar `markSessionInvalid()` en `signed-out`.
3. `src/store/useSessionStore.test.ts`: tests de las dos acciones nuevas, incluido el caso "segundo fallo no pisa `unreachableSince`".

Verificación: `npm test`, `npx tsc --noEmit`.

## Paso 6 - UI y copys (P1)

1. `src/screens/AccessBlockedScreen.tsx`: mensaje de sesión vencida con acción de relogueo; copy de `expired` que no culpe a la conexión cuando el motivo fue `unreachable`; mostrar el motivo real en el error del reintento.
2. `src/screens/HomeScreen.tsx`: migrar el aviso de gracia a `getAccessNotice`, con nivel crítico para `unreachable`.
3. `src/screens/ProfileScreen.tsx`: fila "Servidor" en la sección Licencia con el diagnóstico de la última verificación.
4. `src/screens/WelcomeScreen.tsx`: distinguir en el error del OTP "no se pudo contactar el servidor" de "código inválido". Sin cambios de flujo.

Verificación manual: apuntar `EXPO_PUBLIC_SUPABASE_URL` a una URL inexistente y recorrer los tres escenarios (licencia activa con gracia vencida, `pending`, sesión vencida).

## Paso 7 - Cierre

1. `npx tsc --noEmit` y `npm test`.
2. `docs/implementation-log.md`: entrada con archivos cambiados y QA manual sugerida.
3. Marcar la checklist de la spec 021 y pasar su estado a `Implemented`.

## Riesgos del plan

- El paso 4 toca el corte de acceso: un error ahí deja gente afuera o adentro de más. Mitigación: tests primero, y los tests existentes como red de seguridad.
- El paso 3 no se puede validar bien en Expo Go web; necesita dispositivo real.
- El paso 1 depende de que los requests REST cuenten como actividad para la política de pausado. Hay que confirmarlo en el dashboard a las dos o tres semanas; si no alcanza, la alternativa (tabla `heartbeat`) requiere migración y vuelve a pasar por spec.
