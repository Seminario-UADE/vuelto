-- Compras registradas por el usuario: base de los topes estimados. Solo su dueño.
-- No hay columna para la imagen del ticket: no se persiste (RNF-06). Sí el
-- texto extraído.

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date not null,
  monto numeric(14, 2) not null check (monto > 0),
  comercio text not null check (btrim(comercio) <> ''),
  categoria_id integer references public.categorias (id),
  medio_de_pago_id uuid not null,
  promocion_id uuid references public.promociones (id),
  descuento_obtenido numeric(14, 2) check (descuento_obtenido is null or descuento_obtenido >= 0),
  -- No se usa en el MVP; habilita seguimiento futuro sin migración.
  reintegro_esperado numeric(14, 2) check (reintegro_esperado is null or reintegro_esperado >= 0),
  fecha_acreditacion_estimada date,
  origen text not null check (origen in ('ticket', 'excepcion', 'manual')),
  texto_extraido text,
  creada_en timestamptz not null default now(),
  -- Compuesta: el medio de pago tiene que ser del mismo usuario. NO ACTION:
  -- no se puede borrar un medio con compras, pero borrar la cuenta sí (el
  -- cascade borra compras y medios en la misma sentencia).
  foreign key (user_id, medio_de_pago_id) references public.medios_de_pago (user_id, id)
);

create index compras_usuario_fecha_idx on public.compras (user_id, fecha desc);
create index compras_usuario_medio_idx on public.compras (user_id, medio_de_pago_id);
create index compras_categoria_id_idx on public.compras (categoria_id);
create index compras_promocion_id_idx on public.compras (promocion_id);

alter table public.compras enable row level security;

revoke all on table public.compras from anon, authenticated;
-- La service role salta RLS pero necesita el privilegio (soporte, migraciones de datos).
grant all on table public.compras to service_role;
grant select, insert, update, delete on table public.compras to authenticated;

create policy compras_dueno on public.compras
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
