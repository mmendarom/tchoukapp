# Plan 016 - Panel de administracion minimo de licencias

Derivado de `docs/specs/016-panel-administracion-licencias.md`.

## Stage 1 - Backend (Supabase)

- `supabase/migrations/0003_admin_entitlements.sql`: `public.is_admin()`, `public.admin_list_entitlements()`, `public.admin_set_entitlement_status(target_email, new_status)`. Security definer, sin tocar RLS existente.
- `supabase/README.md`: instrucciones para correr la migracion y nota de que el flujo diario pasa a ser la app, con el SQL como respaldo.

## Stage 2 - Dominio

- `src/domain/session.ts`: `ADMIN_EMAIL`, `isAdminProfile`, `AdminEntitlementRow`. Tests en `session.test.ts`.

## Stage 3 - Backend app

- `src/backend/accountService.ts`: `adminListEntitlements`, `adminSetEntitlementStatus` via `supabase.rpc(...)`, mismo patron `AccountResult` que el resto del archivo.

## Stage 4 - UI

- `src/screens/ProfileScreen.tsx`: seccion "Administración" (gate `isAdminProfile(profile) && isBackendConfigured()`), carga la lista al entrar, botones Activar/Revocar por fila, boton "Actualizar lista".

## Stage 5 - Docs

- `docs/decisions/008-panel-administracion-licencias-rpc.md`.
- `docs/constitution.md`: boundary de escritura en `entitlements` actualizado con la excepcion de las funciones admin.
- `docs/implementation-log.md`.

## Pendiente de configuracion (fuera del codigo)

- Correr `0003_admin_entitlements.sql` en el SQL editor del proyecto Supabase existente.
- QA manual: activar/revocar un usuario de prueba logueado como `mauromendaro@gmail.com`.

## Riesgos

- Igual que spec 015: `@supabase/supabase-js` no debe importarse desde modulos testeados por vitest.
