# Spec: Panel de administración - altas incompletas y refresco de la lista

## Estado

Draft

## Contexto

Deriva de la spec `016-panel-administracion-licencias` y de la decisión `008-panel-administracion-licencias-rpc`. Surge del relevamiento posterior al incidente del 2026-10-18 (ver `docs/decisions/010-acceso-con-backend-licencias-inalcanzable.md`): además de la pausa del proyecto, la revisión del panel encontró dos defectos reales e independientes (P4 y P5 del relevamiento).

La causa del incidente fue la pausa del proyecto, no estos defectos. Pero los dos siguen latentes y el segundo es exactamente lo que hizo parecer que el panel estaba roto.

## Problema

### P4 - Un usuario sin fila en `entitlements` es invisible y no se puede aprobar

`supabase/migrations/0003_admin_entitlements.sql:39` hace `join auth.users u on u.id = e.user_id`: un **inner join** partiendo de `entitlements`. Quien existe en `auth.users` pero no tiene fila en `entitlements` no aparece en la lista del panel.

Peor: `admin_set_entitlement_status` (línea 64) hace `UPDATE ... if not found then raise exception 'user not found'`. Entonces tampoco se puede activar a esa persona conociendo su email. Queda fuera del alcance del panel por completo, y el único camino es el SQL editor.

Que ese estado existe no es hipotético: `src/backend/accountService.ts:98` ya lo contempla del lado del cliente con el comentario *"Fila ausente (registro anterior al trigger): tratar como pendiente"*. El cliente sabe convivir con el caso; el panel de administración no lo puede ver ni resolver.

Y hay un camino que lo produce: `supabase/migrations/0001_entitlements.sql:31` inserta en `entitlements` sin `on conflict`. El trigger `on_auth_user_created` es `after insert` sobre `auth.users`, o sea que corre en la misma transacción del alta: **si ese insert falla, falla el alta entera del usuario en `auth.users`**. Un trigger de conveniencia puede hacer fracasar un registro.

### P5 - La lista se pide una sola vez y los errores no se distinguen de datos viejos

- `src/screens/ProfileScreen.tsx:56-60` carga la lista con `useEffect` y dep `[isAdmin]`, no con `useFocusEffect`. Con native-stack la pantalla queda montada, así que entrar a Perfil, volver a Inicio y entrar de nuevo **no vuelve a pedir la lista**: se ve la copia vieja. Hay botón "Actualizar lista", pero el reflejo natural es salir y entrar, que es justo lo que no funciona.
- `ProfileScreen.tsx:48-51`: si el fetch falla, se setea `adminError` pero **no se limpian ni se marcan** las filas viejas. Quedan en pantalla, idénticas a datos frescos, arriba del mensaje de error. Parece una lista cargada que simplemente no cambió — que es exactamente lo que se percibió durante el incidente.

## Objetivos

- Que el panel muestre a **todos** los usuarios registrados, tengan o no fila en `entitlements`, y permita activarlos.
- Que un fallo del trigger de alta no pueda hacer fracasar el registro de un usuario.
- Que la lista se refresque al volver a la pantalla.
- Que nunca se confundan datos frescos con datos viejos: que la antigüedad de la lista sea visible.
- Poder distinguir a quien se registró y nunca confirmó el email de quien está esperando aprobación.

## No objetivos

- Alta anticipada de emails que todavía no se registraron (allowlist / invitaciones). Sigue fuera de alcance, igual que en la spec 016. El upsert de esta spec solo alcanza a usuarios **que ya existen en `auth.users`**, así que no es una allowlist.
- Múltiples administradores o tabla de roles. Sigue siendo el email único de la decisión 008.
- Editar `expires_at` desde la app. Sigue siendo SQL editor (spec 016).
- Cambiar la RLS de `entitlements`. No se agregan policies de escritura para clientes: la elevación sigue viviendo solo en las funciones `security definer`.
- Paginación o búsqueda en la lista. Con el tamaño actual del grupo no hace falta; si crece, es spec nueva.

## Reglas de dominio

### `AdminEntitlementRow`

Gana tres campos:

```ts
hasEntitlement: boolean;   // false = registrado en auth.users, sin fila en entitlements
registeredAt: string;      // auth.users.created_at
emailConfirmedAt?: string; // undefined = pidió el código y nunca lo confirmó
```

Decisión de modelado: **no** se amplía `EntitlementStatus` con un valor `missing`. Ese tipo lo consume `evaluateAccess`, que es el punto de corte del acceso; ensancharlo haría que un estado puramente administrativo se filtre al cálculo de acceso. Se usa un booleano aparte y `status` se mantiene con los tres valores de siempre (para las filas sin licencia llega como `pending`, que es además el tratamiento correcto a efectos de acceso).

### Orden de la lista

El trabajo real de Mauro es aprobar gente nueva, así que la lista se ordena por utilidad y no por fecha:

1. Primero los que requieren acción: sin fila en `entitlements`, o `status = pending`.
2. Después el resto, por fecha de actualización descendente.

## Impacto en modelo de datos

Migración nueva `supabase/migrations/0004_admin_altas_incompletas.sql`, re-ejecutable como la 0003. Sin cambios de columnas ni de RLS.

### `handle_new_user` - que no pueda romper un alta

- `insert ... on conflict (user_id) do nothing`.
- Envolver en un bloque con `exception when others then return new`, para que ningún fallo de `entitlements` haga fracasar el insert en `auth.users`. El panel ya va a poder resolver una fila faltante, así que degradar es preferible a rechazar el registro.

### `admin_list_entitlements` - left join desde `auth.users`

- `from auth.users u left join public.entitlements e on e.user_id = u.id`.
- Columnas nuevas: `has_entitlement boolean`, `registered_at timestamptz`, `email_confirmed_at timestamptz`.
- `coalesce(e.plan, 'cortesia')`, `coalesce(e.status, 'pending')`, `coalesce(e.updated_at, u.created_at)`.
- Orden según la regla de dominio de arriba.
- **Importante**: cambiar las columnas de retorno exige `drop function if exists public.admin_list_entitlements();` antes del `create`. `create or replace` falla al cambiar la firma de salida. Va en la migración, y conviene anotarlo porque es el tipo de detalle que rompe el deploy manual.
- Mantener el `::text` en `u.email` (el comentario de la 0003 ya explica el 42804 si falta).

### `admin_set_entitlement_status` - upsert

```sql
insert into public.entitlements (user_id, plan, status, granted_by, expires_at)
select u.id, 'cortesia', new_status, auth.jwt() ->> 'email', '2027-01-01T00:00:00Z'
from auth.users u
where lower(u.email) = lower(target_email)
on conflict (user_id) do update
  set status = excluded.status, granted_by = excluded.granted_by;
```

- En el `do update` **no** se toca `expires_at`: pisarlo borraría un vencimiento puesto a mano desde el SQL editor.
- Si ningún usuario matchea el email, `if not found then raise exception 'user not found: %'` (se conserva).
- Se mantienen el chequeo de `is_admin()` y la validación de `new_status`.
- Limitación conocida: el `expires_at` del alta nueva repite el literal `2027-01-01` del trigger de la migración 0002. Dos lugares con el mismo dato. Se acepta por ahora y queda ligado al riesgo de calendario registrado en la decisión 010.

## Impacto en UI

Todo el texto visible en español.

`src/screens/ProfileScreen.tsx`, sección "Administración":

- Cargar con `useFocusEffect` (envuelto en `useCallback`) en vez de `useEffect`, para refrescar al volver a la pantalla.
- Leyenda "Actualizada hace X" / "Actualizada hoy a las HH:MM" debajo del título. En vez de borrar las filas cuando el fetch falla, se mantienen y la leyenda delata que son viejas, junto con el mensaje de error. Es más útil que una lista vacía en medio de un torneo, y elimina la ambigüedad que generó el reporte original.
- Fila sin licencia: etiqueta "Sin licencia creada" y botón "Activar" habilitado (el upsert la crea).
- Usuario con `emailConfirmedAt` ausente: etiqueta "Email sin confirmar", para distinguir "pidió el código y lo abandonó" de "espera aprobación".

## Impacto en estado/persistencia

Ninguno. La lista se sigue pidiendo on-demand y no se persiste (igual que en la spec 016). No se toca `useSessionStore` ni los stores deportivos.

## Testing plan

Dominio (puro, Vitest):

- Función de orden de la lista: filas sin licencia y `pending` primero; el resto por fecha descendente; estabilidad con fechas iguales.
- Mapeo de fila del RPC a `AdminEntitlementRow`: `has_entitlement` false, `plan` y `status` nulos que caen a los coalesce, `email_confirmed_at` ausente.
- Formato de la leyenda de antigüedad.

Manual (con la migración 0004 corrida y el proyecto despierto):

- Crear a mano un usuario en `auth.users` sin fila en `entitlements` (o borrarle la fila a uno de prueba) y confirmar que aparece en el panel como "Sin licencia creada" y que "Activar" le crea la licencia.
- Activar y revocar un usuario normal y confirmar que `expires_at` puesto a mano **no** se pierde al revocar y volver a activar.
- Pedir un código con un email nuevo y no confirmarlo: debe aparecer como "Email sin confirmar".
- Entrar a Perfil, salir a Inicio, volver: la lista se vuelve a pedir.
- Con el proyecto pausado: las filas viejas siguen visibles con la leyenda de antigüedad y el mensaje de error.
- Confirmar que un usuario no admin sigue sin ver la sección y que el RPC lo rechaza.

Query de diagnóstico para correr una vez, antes de la migración, y ver si el caso ya existe en producción:

```sql
select u.id, u.email, u.created_at, u.email_confirmed_at
from auth.users u
left join public.entitlements e on e.user_id = u.id
where e.user_id is null
order by u.created_at desc;
```

## Riesgos

- El `drop function` de `admin_list_entitlements` deja el panel sin listar entre el drop y el create si la migración se corre a medias. Correrla entera de una sola vez en el SQL editor.
- El `exception when others` en `handle_new_user` esconde errores reales del trigger: un alta puede quedar sin licencia sin aviso. Es el intercambio deliberado (mejor usuario sin licencia que registro fallido) y el panel ahora lo hace visible y resoluble.
- Partir el listado desde `auth.users` expone en la lista a cualquier cuenta de `auth.users`, incluidas las de prueba. Esperado y deseable: justamente son las que hoy no se ven.

## Preguntas abiertas

- ¿Conviene un botón para eliminar una cuenta de prueba desde el panel? Fuera de alcance acá; implicaría borrar en `auth.users`, que es bastante más delicado y merece su propia decisión.

## Plan de implementación

Ver `docs/plans/022-panel-admin-altas-incompletas-plan.md`.

## Checklist de aceptación

- [ ] `0004_admin_altas_incompletas.sql` re-ejecutable, con `drop function` antes del create.
- [ ] `handle_new_user` con `on conflict do nothing` y sin poder hacer fracasar un alta.
- [ ] `admin_list_entitlements` con left join desde `auth.users` y columnas nuevas.
- [ ] `admin_set_entitlement_status` como upsert que no pisa `expires_at`.
- [ ] `AdminEntitlementRow` con `hasEntitlement`, `registeredAt`, `emailConfirmedAt`; `EntitlementStatus` sin ensanchar.
- [ ] Orden "lo que requiere acción primero" como función pura con tests.
- [ ] `useFocusEffect` + leyenda de antigüedad + filas viejas marcadas en vez de borradas.
- [ ] Etiquetas "Sin licencia creada" y "Email sin confirmar".
- [ ] `npx tsc --noEmit` y `npm test` en verde.
