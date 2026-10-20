# Plan 022 - Panel de administración: altas incompletas y refresco

Spec: `docs/specs/022-panel-admin-altas-incompletas.md`

Independiente del plan 021: se puede implementar antes, después o en paralelo. No comparten archivos salvo `src/domain/session.ts` (tipos distintos dentro del mismo archivo, conflicto improbable).

## Paso 0 - Diagnóstico previo

Antes de tocar nada, correr en el SQL editor la query de usuarios huérfanos de la spec (usuarios en `auth.users` sin fila en `entitlements`). Dos motivos: saber si el caso ya existe en producción, y tener el antes/después para validar el paso 2.

Si devuelve filas, anotarlas en el log de implementación: son los usuarios que el panel no podía ver.

## Paso 1 - Migración SQL

1. Crear `supabase/migrations/0004_admin_altas_incompletas.sql`, re-ejecutable de punta a punta:
   - Cabecera con el porqué y la nota de que hay que correrla entera (por el `drop function`).
   - `handle_new_user`: `on conflict (user_id) do nothing` + `exception when others then return new`, con comentario explicando el intercambio (mejor usuario sin licencia que alta fallida).
   - `drop function if exists public.admin_list_entitlements();` y luego el `create` con left join desde `auth.users`, columnas `has_entitlement`, `registered_at`, `email_confirmed_at`, los `coalesce` y el orden "acción primero". Mantener `u.email::text`.
   - `admin_set_entitlement_status` como `insert ... select ... on conflict (user_id) do update`, sin tocar `expires_at` en el update, conservando el chequeo de `is_admin()`, la validación de `new_status` y el `raise` de usuario inexistente.
   - Regrabar los `grant execute ... to authenticated` (el `drop function` se lleva los grants).
2. Correrla en el SQL editor del proyecto (tiene que estar despierto).
3. Verificar en SQL antes de tocar la app: `select * from public.admin_list_entitlements();` logueado como admin debe listar también los huérfanos del paso 0.

Verificación: el paso 0 vuelve a correr y los huérfanos ahora aparecen en el resultado del RPC.

## Paso 2 - Dominio

1. `src/domain/session.ts`: agregar `hasEntitlement`, `registeredAt` y `emailConfirmedAt` a `AdminEntitlementRow`. **No** tocar `EntitlementStatus`.
2. Función pura nueva para el orden de la lista (filas sin licencia y `pending` primero, resto por fecha descendente).
3. Función pura para la leyenda de antigüedad de la lista.
4. Tests en `src/domain/session.test.ts` de las dos funciones, incluidos los bordes (fechas iguales, lista vacía).

Verificación: `npm test`.

## Paso 3 - Backend

1. `src/backend/accountService.ts`, `adminListEntitlements`: mapear las columnas nuevas. `has_entitlement` a booleano estricto, `email_confirmed_at` a `undefined` cuando viene nulo, `registered_at` con fallback.
2. Aplicar el orden del paso 2 al resultado antes de devolverlo (o dejarlo en la UI; preferible acá, para que el orden sea una propiedad del dato y se pueda testear).

Verificación: `npx tsc --noEmit`.

## Paso 4 - UI

`src/screens/ProfileScreen.tsx`:

1. Cambiar el `useEffect` de carga por `useFocusEffect` + `useCallback` (import de `@react-navigation/native`). Cuidar que no se dispare en loop: las deps tienen que ser estables.
2. Leyenda de antigüedad bajo el título de la sección, alimentada por la función pura. Guardar el timestamp de la última carga exitosa en estado local.
3. En el fallo del fetch: **no** limpiar `adminRows`. Mostrar el error y dejar que la leyenda delate la antigüedad.
4. `AdminUserRow`: etiqueta "Sin licencia creada" cuando `!hasEntitlement` (con "Activar" habilitado) y "Email sin confirmar" cuando falta `emailConfirmedAt`.

Verificación: recorrido manual completo de la spec, incluido el caso del usuario huérfano y el de revocar/reactivar sin perder `expires_at`.

## Paso 5 - Cierre

1. `npx tsc --noEmit` y `npm test`.
2. `supabase/README.md`: actualizar la sección de administración (el panel ahora alcanza a usuarios sin fila; la 0004 es re-ejecutable pero hay que correrla entera).
3. `docs/implementation-log.md`: entrada con archivos cambiados, resultado del paso 0 y QA manual sugerida.
4. Marcar la checklist de la spec 022 y pasar su estado a `Implemented`.
5. Nota en la spec 016 apuntando a la 022 (igual que se hizo con la 011 en el plan 020).

## Riesgos del plan

- El paso 1 corre a mano en producción y tiene un `drop function`: si se corta a mitad, el panel queda sin listar hasta completarla. Correrla entera de una vez.
- El `useFocusEffect` mal memoizado genera un loop de pedidos al RPC. Verificar contando requests en el dashboard de Supabase durante la prueba manual.
- La migración cambia el trigger de altas, que es código en el camino crítico del registro. Probar un alta nueva de punta a punta después de correrla.
