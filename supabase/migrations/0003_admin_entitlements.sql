-- Spec 016: panel de administracion minimo (activar/revocar licencias desde la app).
-- Correr en el SQL editor de Supabase, despues de 0001 y 0002. Es re-ejecutable
-- (todo create or replace): si corriste una version anterior, correlo entero de nuevo.
--
-- No se agregan policies de insert/update/delete en public.entitlements (decision
-- 007/008): las funciones de abajo son security definer y verifican adentro que
-- quien llama es el admin, en vez de aflojar RLS para el cliente.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'mauromendaro@gmail.com';
$$;

create or replace function public.admin_list_entitlements()
returns table (
  email text,
  plan text,
  status text,
  granted_by text,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    -- auth.users.email es varchar(255); sin el cast, RETURN QUERY falla con 42804.
    select u.email::text, e.plan, e.status, e.granted_by, e.expires_at, e.updated_at
    from public.entitlements e
    join auth.users u on u.id = e.user_id
    order by e.updated_at desc;
end;
$$;

create or replace function public.admin_set_entitlement_status(target_email text, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if new_status not in ('pending', 'active', 'revoked') then
    raise exception 'invalid status: %', new_status;
  end if;

  update public.entitlements e
  set status = new_status, granted_by = auth.jwt() ->> 'email'
  from auth.users u
  where u.id = e.user_id and lower(u.email) = lower(target_email);

  if not found then
    raise exception 'user not found: %', target_email;
  end if;
end;
$$;

grant execute on function public.admin_list_entitlements() to authenticated;
grant execute on function public.admin_set_entitlement_status(text, text) to authenticated;
