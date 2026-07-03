-- Vencimiento de licencias: las cortesias valen hasta el 2027 (en principio).
-- expires_at null = sin vencimiento. Correr en el SQL editor de Supabase.

alter table public.entitlements
  add column expires_at timestamptz;

-- Cortesias existentes: validas hasta el 1 de enero de 2027.
update public.entitlements
set expires_at = '2027-01-01T00:00:00Z'
where plan = 'cortesia';

-- Los registros nuevos tambien nacen con ese vencimiento.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (user_id, plan, status, expires_at)
  values (new.id, 'cortesia', 'pending', '2027-01-01T00:00:00Z');
  return new;
end;
$$;
