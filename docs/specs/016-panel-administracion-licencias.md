# Spec: Panel de administracion minimo de licencias

## Estado

Implemented

## Contexto

Deriva de `docs/specs/015-backend-cuentas-licencias.md`, que dejo explicitamente fuera un panel de administracion ("la lista de cortesia se gestiona directo en la base"). Pedido explicito de Mauro: poder activar/revocar usuarios desde su perfil en la app, sin entrar al SQL editor de Supabase. Ver `docs/decisions/008-panel-administracion-licencias-rpc.md`.

## Problema

Cada vez que un companero se registra, su licencia queda `pending` (decision 007) y Mauro tiene que abrir el dashboard de Supabase y correr un `UPDATE` a mano para activarla o revocarla. Eso es friccion durante un torneo o cuando Mauro solo tiene el celular a mano.

## Objetivos

- Ver, desde la pantalla Perfil, la lista de usuarios ya registrados con su email, plan y estado de licencia.
- Poder activar o revocar la licencia de cualquiera de esos usuarios con un boton, sin SQL.
- Mantener la RLS de `entitlements` intacta (nada de policies de escritura para clientes).

## No objetivos

- Pre-aprobar o invitar emails que todavia no se registraron (allowlist / alta anticipada). Confirmado explicitamente fuera de alcance por Mauro.
- Multiples administradores o roles: sigue habiendo un unico admin hardcodeado (`mauromendaro@gmail.com`), igual que la decision 007.
- Cambiar `expires_at` desde la app: sigue siendo SQL editor.
- Pagos o cambios al modelo de planes.

## Usuarios / Casos de uso

- Mauro, logueado con `mauromendaro@gmail.com`, abre Perfil durante o fuera de un torneo y activa la cortesia de un companero que acaba de registrarse.
- Mauro revoca acceso a alguien que ya no deberia tenerlo.

## Flujo esperado

1. Mauro entra a Perfil. Si su email coincide con el admin y el backend esta configurado, ve la seccion "Administración".
2. La app pide la lista de usuarios via RPC (`admin_list_entitlements`).
3. Por cada fila: email, plan, estado y botones "Activar" / "Revocar" (deshabilitado el que ya corresponde al estado actual).
4. Al tocar un boton, la app llama `admin_set_entitlement_status(email, status)` y refresca la lista.

## Requisitos funcionales

- La seccion solo se muestra si `isAdminProfile(profile)` y `isBackendConfigured()`.
- Errores de red o de autorizacion se muestran en espanol sin romper el resto de la pantalla.

## Requisitos no funcionales

- La autorizacion real vive en la funcion SQL (`security definer` + chequeo de email), no en la UI: ocultar la seccion es una comodidad, no el limite de seguridad.
- No se agrega `@supabase/supabase-js` fuera de `src/backend/*`.

## Impacto en modelo de datos

- Nuevas funciones Postgres (`supabase/migrations/0003_admin_entitlements.sql`): `public.is_admin()`, `public.admin_list_entitlements()`, `public.admin_set_entitlement_status(text, text)`. Sin cambios de columnas ni de RLS existente.

## Impacto en UI

- `ProfileScreen`: nueva seccion "Administración" con lista de usuarios y acciones Activar/Revocar.

## Impacto en estado/persistencia

- Sin cambios en `useSessionStore` ni en el perfil local persistido. La lista de admin se pide on-demand (no se persiste).

## Testing plan

- Dominio: tests de `isAdminProfile` (case-insensitive, sin perfil, sin email).
- Manual: con la migracion corrida y logueado como admin, activar y revocar un usuario de prueba y confirmar que el cambio se refleja al refrescar. Confirmar que un usuario no-admin no ve la seccion.

## Riesgos

- El chequeo de admin en la UI es solo cosmetico; si se olvida ocultar la seccion en algun lado no es un problema de seguridad porque el server igual rechaza la llamada, pero conviene no depender de eso para la UX.

## Preguntas abiertas

- Ninguna pendiente para esta fase.

## Plan de implementación

Ver `docs/plans/016-panel-administracion-licencias-plan.md`.

## Checklist de aceptación

- [x] Migracion SQL con funciones admin.
- [x] `accountService.ts` expone `adminListEntitlements` / `adminSetEntitlementStatus`.
- [x] `ProfileScreen` muestra la seccion solo al admin.
- [x] Tests de dominio para `isAdminProfile`.
- [x] `npx tsc --noEmit` y `npm test` en verde.
