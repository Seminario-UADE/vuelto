-- Catálogos de MODO: bancos y categorías. Los leen todos los usuarios
-- autenticados; solo la service role (ingesta / seed) escribe.

create table public.bancos (
  -- id del catálogo de MODO (GET /promos/api/rewards/banks), no el bcra_code
  id uuid primary key,
  nombre text not null check (btrim(nombre) <> '')
);

create table public.categorias (
  -- id numérico de la API de MODO; el slug de texto no sirve para filtrar
  id integer primary key,
  nombre text not null check (btrim(nombre) <> '')
);

alter table public.bancos enable row level security;
alter table public.categorias enable row level security;

revoke all on table public.bancos, public.categorias from anon, authenticated;
-- La ingesta y el seed escriben con la service role (salta RLS, pero necesita el privilegio).
grant all on table public.bancos, public.categorias to service_role;
grant select on table public.bancos, public.categorias to authenticated;

create policy bancos_select_autenticados on public.bancos
  for select to authenticated using (true);

create policy categorias_select_autenticados on public.categorias
  for select to authenticated using (true);
