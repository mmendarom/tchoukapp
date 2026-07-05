# 008 - Panel de administracion de licencias via RPC security definer

- Estado: aceptada
- Fecha: 2026-07-05
- Contexto: spec `016-panel-administracion-licencias`

## Contexto

La spec 015 dejo el alta/activacion de licencias como SQL manual en el dashboard de Supabase, con un no objetivo explicito de panel de administracion. En la practica, Mauro es el unico admin y activar/revocar por SQL cada vez que alguien se registra es friccion evitable. Habia que decidir como exponer esa accion desde la app sin aflojar la RLS de `entitlements` (decision 007) ni meter una service role key en el cliente.

## Decision

1. **Funciones Postgres `security definer`**, no policies de RLS nuevas: `public.admin_list_entitlements()` y `public.admin_set_entitlement_status(email, status)` corren con privilegios del owner pero verifican adentro `auth.jwt() ->> 'email' = 'mauromendaro@gmail.com'` (`public.is_admin()`) y lanzan excepcion si no coincide. RLS de `entitlements` sigue sin policies de escritura para ningun rol de cliente.
2. **Admin unico, hardcodeado**: un solo email admin, igual que la decision 007 ("Mauro activa por SQL"). No hay tabla de roles ni admins multiples; si eso cambia, es una decision nueva.
3. **Alcance acotado**: el panel solo activa/revoca licencias de usuarios que ya se registraron (tienen fila en `entitlements`). No se agrega alta anticipada de emails (allowlist) ni invitaciones: eso queda fuera de esta spec si hace falta despues.
4. **Sin service role key en la app**: la app sigue usando la anon key del usuario logueado (Mauro); la elevacion de privilegios vive solo del lado del server, en la funcion SQL.
5. **UI en `ProfileScreen`**: seccion "Administración" visible solo cuando el email del perfil logueado coincide con el admin, ademas de necesitar backend configurado. Es una comodidad de UI, no el limite de seguridad (ese es el chequeo dentro de la funcion SQL).

## Consecuencias

- Mauro puede activar/revocar companeros desde el celular durante un torneo, sin abrir el SQL editor.
- El SQL editor (`supabase/README.md`) queda como respaldo, ademas de seguir siendo necesario para `expires_at` y altas anticipadas.
- Si en el futuro hay mas de un admin, hace falta reemplazar el email hardcodeado por una tabla `public.admins` y actualizar `is_admin()`; no rompe la superficie de la app (`accountService.ts` no cambia).
- Nuevo archivo de migracion (`0003_admin_entitlements.sql`) que hay que correr manualmente en el proyecto Supabase existente, igual que 0001/0002.
