-- Spec 015: cuentas y licencias (sin pagos).
-- Correr en el SQL editor de Supabase (o via CLI) sobre un proyecto nuevo.

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'cortesia' check (plan in ('cortesia', 'suscripcion')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  granted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Cada usuario puede leer SOLO su propia licencia. No hay policies de
-- insert/update/delete: las escrituras van por service role o SQL editor.
create policy "read own entitlement"
  on public.entitlements
  for select
  using (auth.uid() = user_id);

-- Alta automatica al registrarse: licencia de cortesia PENDIENTE (sin acceso
-- hasta activacion manual, decision 007).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (user_id, plan, status)
  values (new.id, 'cortesia', 'pending');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.touch_entitlements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger entitlements_touch_updated_at
  before update on public.entitlements
  for each row
  execute function public.touch_entitlements_updated_at();
