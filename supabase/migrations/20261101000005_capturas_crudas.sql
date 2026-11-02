-- Contenido crudo de cada captura de la ingesta (RF-13, RNF-08).

create table public.capturas_crudas (
  id uuid primary key default gen_random_uuid(),
  -- De dónde se capturó: URL o endpoint.
  origen text not null check (btrim(origen) <> ''),
  contenido text not null,
  -- Salida completa del extractor; null si todavía no se extrajo.
  extraccion jsonb,
  capturada_en timestamptz not null default now()
);

-- Sin policies a propósito: con RLS activa y ninguna policy, ningún rol de la
-- app (anon / authenticated) lee ni escribe. Solo la service role de la
-- ingesta, que salta RLS. No es un olvido.
alter table public.capturas_crudas enable row level security;

revoke all on table public.capturas_crudas from anon, authenticated;
-- La ingesta y el seed escriben con la service role (salta RLS, pero necesita el privilegio).
grant all on table public.capturas_crudas to service_role;
