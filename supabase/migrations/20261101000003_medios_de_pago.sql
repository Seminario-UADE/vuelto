-- Medios de pago que declara el usuario (banco + tipo + red). Solo su dueño.

create table public.medios_de_pago (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  banco_id uuid not null references public.bancos (id),
  tipo text not null check (tipo in ('debito', 'credito')),
  red text not null check (red in (
    'visa', 'master', 'american_express', 'dinners_club', 'maestro',
    'cabal', 'naranja', 'confiable', 'tarjeta_sol'
  )),
  creado_en timestamptz not null default now(),
  -- Apoya la clave foránea compuesta de compras: una compra solo puede usar
  -- un medio de pago del mismo usuario (la verificación de una FK no aplica RLS).
  unique (user_id, id),
  unique (user_id, banco_id, tipo, red)
);

create index medios_de_pago_banco_id_idx on public.medios_de_pago (banco_id);

alter table public.medios_de_pago enable row level security;

revoke all on table public.medios_de_pago from anon, authenticated;
-- La ingesta y el seed escriben con la service role (salta RLS, pero necesita el privilegio).
grant all on table public.medios_de_pago to service_role;
grant select, insert, update, delete on table public.medios_de_pago to authenticated;

create policy medios_de_pago_dueno on public.medios_de_pago
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
