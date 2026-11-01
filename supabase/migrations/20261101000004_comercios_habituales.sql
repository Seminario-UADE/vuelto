-- Comercios donde el usuario compra con frecuencia. Solo su dueño.

create table public.comercios_habituales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  creado_en timestamptz not null default now()
);

-- "Coto", "coto" y " Coto " son el mismo comercio; los acentos no se normalizan.
-- También cubre las consultas por user_id.
create unique index comercios_habituales_usuario_nombre_idx
  on public.comercios_habituales (user_id, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')));

alter table public.comercios_habituales enable row level security;

revoke all on table public.comercios_habituales from anon, authenticated;
-- La service role salta RLS pero necesita el privilegio (soporte, migraciones de datos).
grant all on table public.comercios_habituales to service_role;
grant select, insert, update, delete on table public.comercios_habituales to authenticated;

create policy comercios_habituales_dueno on public.comercios_habituales
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
