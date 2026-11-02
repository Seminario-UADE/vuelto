-- Corpus de promociones validadas (tipo `Promocion` del motor). Las leen todos
-- los usuarios autenticados; solo la service role (ingesta / seed) escribe.

-- Mantiene `actualizada_en` para la sincronización incremental (ADR-010 §4).
-- La hora la pone la base: ignora lo que escriba el cliente. Si un update no
-- cambia ningún valor (la ingesta reescribe lo mismo en cada corrida), la
-- marca no se mueve y la app no vuelve a bajar el corpus.
-- Ojo: compara toda la fila; si algún día se agrega una columna que cambia sola
-- (contador, etc.), hay que excluirla de la comparación.
create function public.set_actualizada_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.actualizada_en := clock_timestamp();
  elsif (to_jsonb(new) - 'actualizada_en') is distinct from (to_jsonb(old) - 'actualizada_en') then
    new.actualizada_en := clock_timestamp();
  else
    new.actualizada_en := old.actualizada_en;
  end if;
  return new;
end;
$$;

-- Un check no admite subconsultas; esta función pura permite validar que una
-- lista no repite elementos.
create function public.sin_repetidos(lista text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(lista) = cardinality(array(select distinct e from unnest(lista) as e));
$$;

-- Las funciones auxiliares no son parte de la API: PostgREST las expondría como
-- RPC a cualquier rol. Las evalúa el rol que escribe (service role / postgres).
revoke execute on function public.sin_repetidos(text[]) from public, anon, authenticated;
grant execute on function public.sin_repetidos(text[]) to service_role;
revoke execute on function public.set_actualizada_en() from public, anon, authenticated;
grant execute on function public.set_actualizada_en() to service_role;

create table public.promociones (
  id uuid primary key default gen_random_uuid(),
  fuente text not null check (fuente in ('modo', 'manual')),
  -- Clave natural de la fuente (id de la promo en MODO): la ingesta actualiza
  -- la promo existente en vez de duplicarla.
  fuente_id text check (fuente_id is null or btrim(fuente_id) <> ''),
  titulo text not null check (btrim(titulo) <> ''),
  banco_id uuid not null references public.bancos (id),
  categoria_id integer not null references public.categorias (id),
  comercio text,
  porcentaje numeric(5, 2) not null check (porcentaje between 0 and 100),
  -- Redes aceptadas por tipo de tarjeta; lista vacía = ese tipo no participa.
  debito_redes text[] not null default '{}',
  credito_redes text[] not null default '{}',
  vigencia_desde date not null,
  vigencia_hasta date not null,
  -- null = todos los días
  dias text[],
  tope_monto numeric(14, 2) check (tope_monto is null or tope_monto > 0),
  tope_periodo text check (tope_periodo in ('mensual', 'semanal', 'por_compra')),
  tope_alcance text check (tope_alcance in ('compartido', 'exclusivo')),
  grupo_tope_id text,
  monto_minimo numeric(14, 2) check (monto_minimo is null or monto_minimo >= 0),
  jurisdiccion text check (jurisdiccion in ('nacional', 'pba', 'caba', 'otra_provincia')),
  canal text check (canal in ('presencial', 'online', 'ambos')),
  -- null se trata como no acumulable (RF-04)
  acumulable boolean,
  -- Fragmento de letra chica de la que sale cada campo: { campo: texto | null } (RNF-08)
  fragmentos_fuente jsonb not null default '{}' check (jsonb_typeof(fragmentos_fuente) = 'object'),
  captura_cruda_id uuid references public.capturas_crudas (id),
  -- Una promo que deja de estar vigente en la fuente no se borra: se da de baja,
  -- así las compras conservan su referencia y la baja llega por sincronización.
  dada_de_baja_en timestamptz,
  creada_en timestamptz not null default now(),
  -- clock_timestamp() y no now(): hora real de la escritura, no del inicio de la transacción.
  actualizada_en timestamptz not null default clock_timestamp(),

  unique (fuente, fuente_id),
  check (vigencia_hasta >= vigencia_desde),
  check (debito_redes <@ array['visa', 'master', 'american_express', 'dinners_club', 'maestro', 'cabal', 'naranja', 'confiable', 'tarjeta_sol']),
  check (credito_redes <@ array['visa', 'master', 'american_express', 'dinners_club', 'maestro', 'cabal', 'naranja', 'confiable', 'tarjeta_sol']),
  check (public.sin_repetidos(debito_redes)),
  check (public.sin_repetidos(credito_redes)),
  check (cardinality(debito_redes) + cardinality(credito_redes) > 0),
  check (dias is null or (
    cardinality(dias) > 0
    and dias <@ array['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
    and public.sin_repetidos(dias)
  )),
  check (fuente <> 'modo' or (fuente_id is not null and captura_cruda_id is not null))
);

create index promociones_actualizada_en_idx on public.promociones (actualizada_en);
create index promociones_banco_id_idx on public.promociones (banco_id);
create index promociones_categoria_id_idx on public.promociones (categoria_id);
create index promociones_captura_cruda_id_idx on public.promociones (captura_cruda_id);

create trigger promociones_set_actualizada_en
  before insert or update on public.promociones
  for each row execute function public.set_actualizada_en();

alter table public.promociones enable row level security;

revoke all on table public.promociones from anon, authenticated;
-- La ingesta y el seed escriben con la service role (salta RLS, pero necesita el privilegio).
grant all on table public.promociones to service_role;
grant select on table public.promociones to authenticated;

create policy promociones_select_autenticados on public.promociones
  for select to authenticated using (true);
