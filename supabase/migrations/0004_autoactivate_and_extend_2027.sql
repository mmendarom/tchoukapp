-- Spec 021: vigencia hasta fin de 2027 + altas nuevas auto-activas.
-- Correr en el SQL editor de Supabase, despues de 0001-0003. Es re-ejecutable.
--
-- Que hace:
--   1) Extiende el vencimiento de TODAS las licencias a 2027-12-31.
--   2) Activa las licencias que estaban 'pending' (no toca las 'revoked').
--   3) Cambia el alta automatica: los registros nuevos nacen 'active' y con
--      vencimiento 2027-12-31 (antes nacian 'pending').
--
-- Ojo (decision 010): con esto, cualquiera que se registre con un email queda
-- activo al instante, sin aprobacion manual. Para sacarle acceso a alguien,
-- revocalo desde el Perfil (panel de admin, spec 016) o con:
--   select public.admin_set_entitlement_status('email@ejemplo.com', 'revoked');

-- 1) Vigencia hasta fin de 2027 para todas las licencias existentes.
update public.entitlements
set expires_at = '2027-12-31T23:59:59Z';

-- 2) Activar las pendientes (las revocadas quedan como estan, a proposito).
update public.entitlements
set status = 'active'
where status = 'pending';

-- 3) Alta automatica al registrarse: ahora ACTIVA y vigente hasta fin de 2027.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (user_id, plan, status, expires_at)
  values (new.id, 'cortesia', 'active', '2027-12-31T23:59:59Z');
  return new;
end;
$$;
