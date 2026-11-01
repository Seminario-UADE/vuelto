-- Perfil del usuario: un registro por cuenta. Solo lo ve y lo edita su dueño.

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Lo elige el usuario, nunca es el email (ADR-008). null = todavía no lo eligió.
  nombre_para_mostrar text check (nombre_para_mostrar is null or btrim(nombre_para_mostrar) <> ''),
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

revoke all on table public.perfiles from anon, authenticated;
-- La service role salta RLS pero necesita el privilegio (soporte, migraciones de datos).
grant all on table public.perfiles to service_role;
grant select, insert, update, delete on table public.perfiles to authenticated;

create policy perfiles_dueno on public.perfiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
