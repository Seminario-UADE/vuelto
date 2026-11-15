-- Contactos vinculados por invitación y lectura de sus datos para el gasto en grupo
-- (spec 013, ADR-008). RLS en la misma migración que crea cada tabla (constitución §IV).
--
-- Las funciones que necesitan permisos elevados (leer el nombre o los datos de otra cuenta,
-- crear el vínculo) viven en el schema `contactos_privado`, fuera de `public`: así
-- `estructura.test.sql` («ninguna función security definer en public») sigue valiendo
-- (research R2). En `public` solo hay envoltorios `security invoker` que delegan, porque la
-- API (PostgREST) expone únicamente `public`.

-- ─── Tablas ───────────────────────────────────────────────────────────────────

-- Invitación de un solo uso que vence a las 24 h. Se guarda solo la huella del token.
create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  emisor uuid not null references auth.users (id) on delete cascade,
  -- sha256 en hexadecimal; texto y no bytea: la regla de estructura prohíbe columnas binarias.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  creada_en timestamptz not null default now(),
  vence_en timestamptz not null default now() + interval '24 hours',
  usada_en timestamptz,
  check (vence_en > creada_en)
);

-- Como mucho una invitación sin usar por cuenta (FR-011): crear otra borra la anterior.
create unique index invitaciones_una_vigente on public.invitaciones (emisor) where usada_en is null;

alter table public.invitaciones enable row level security;

revoke all on table public.invitaciones from anon, authenticated;
grant all on table public.invitaciones to service_role;
-- Solo lectura de las propias: crear, aceptar y borrar pasan por las funciones.
grant select on table public.invitaciones to authenticated;

create policy invitaciones_emisor on public.invitaciones
  for select to authenticated
  using (emisor = (select auth.uid()));

-- Vínculo simétrico entre dos cuentas: un solo par, sin orden ni auto-vínculo (FR-015).
create table public.contactos (
  usuario_a uuid not null references auth.users (id) on delete cascade,
  usuario_b uuid not null references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (usuario_a, usuario_b),
  check (usuario_a < usuario_b)
);

create index contactos_usuario_b_idx on public.contactos (usuario_b);

alter table public.contactos enable row level security;

revoke all on table public.contactos from anon, authenticated;
grant all on table public.contactos to service_role;
-- Se crea solo con aceptar_invitacion; cualquiera de los dos lo puede ver y quitar.
grant select, delete on table public.contactos to authenticated;

create policy contactos_ver on public.contactos
  for select to authenticated
  using ((select auth.uid()) in (usuario_a, usuario_b));

create policy contactos_quitar on public.contactos
  for delete to authenticated
  using ((select auth.uid()) in (usuario_a, usuario_b));

-- ─── Schema de las funciones con permisos elevados ─────────────────────────────

create schema contactos_privado;
revoke all on schema contactos_privado from public, anon;
grant usage on schema contactos_privado to authenticated;

-- Crea la invitación de quien llama y devuelve el token en claro, que no se guarda (R3).
create function contactos_privado.crear_invitacion() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text;
  v_vence timestamptz;
begin
  if v_uid is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;
  -- El otro va a ver este nombre en la pantalla de aceptación (US2-3).
  if not exists (select 1 from public.perfiles p where p.id = v_uid and p.nombre_para_mostrar is not null) then
    raise exception 'sin_nombre' using errcode = 'P0001', hint = 'sin_nombre';
  end if;
  delete from public.invitaciones i where i.emisor = v_uid and i.usada_en is null;
  -- 18 bytes al azar en base64url: 24 caracteres, sin relleno.
  v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  insert into public.invitaciones (emisor, token_hash)
  values (v_uid, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  returning vence_en into v_vence;
  return jsonb_build_object('token', v_token, 'vence_en', v_vence);
end;
$$;

-- Estado de una invitación para la pantalla de aceptación. No escribe nada (FR-013).
-- Orden: inexistente → vencida → usada → propia → ya_contacto → valida.
create function contactos_privado.ver_invitacion(p_token text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invitaciones;
  v_nombre text;
  v_estado text;
begin
  if v_uid is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then
    return jsonb_build_object('estado', 'inexistente', 'quien_invita', null, 'vence_en', null);
  end if;
  select * into v_inv from public.invitaciones i where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then
    return jsonb_build_object('estado', 'inexistente', 'quien_invita', null, 'vence_en', null);
  end if;
  select p.nombre_para_mostrar into v_nombre from public.perfiles p where p.id = v_inv.emisor;
  v_estado := case
    when v_inv.vence_en <= now() then 'vencida'
    when v_inv.usada_en is not null then 'usada'
    when v_inv.emisor = v_uid then 'propia'
    when exists (
      select 1 from public.contactos c
      where c.usuario_a = least(v_uid, v_inv.emisor) and c.usuario_b = greatest(v_uid, v_inv.emisor)
    ) then 'ya_contacto'
    else 'valida'
  end;
  return jsonb_build_object(
    'estado', v_estado,
    'quien_invita', v_nombre,
    'vence_en', case when v_estado = 'valida' then v_inv.vence_en end
  );
end;
$$;

-- Acepta la invitación y crea el vínculo en la misma transacción (R4). `for update`
-- serializa dos aceptaciones de la misma invitación; la clave primaria del par, las cruzadas.
create function contactos_privado.aceptar_invitacion(p_token text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.invitaciones;
  v_nombre text;
  v_creados integer;
begin
  if v_uid is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then
    return jsonb_build_object('estado', 'inexistente', 'contacto', null);
  end if;
  select * into v_inv from public.invitaciones i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found then
    return jsonb_build_object('estado', 'inexistente', 'contacto', null);
  end if;
  if v_inv.vence_en <= now() then
    return jsonb_build_object('estado', 'vencida', 'contacto', null);
  end if;
  if v_inv.usada_en is not null then
    return jsonb_build_object('estado', 'usada', 'contacto', null);
  end if;
  if v_inv.emisor = v_uid then
    return jsonb_build_object('estado', 'propia', 'contacto', null);
  end if;
  -- Quien acepta también tiene que tener nombre: el otro lo va a ver en su lista.
  if not exists (select 1 from public.perfiles p where p.id = v_uid and p.nombre_para_mostrar is not null) then
    return jsonb_build_object('estado', 'sin_nombre', 'contacto', null);
  end if;

  insert into public.contactos (usuario_a, usuario_b)
  values (least(v_uid, v_inv.emisor), greatest(v_uid, v_inv.emisor))
  on conflict do nothing;
  get diagnostics v_creados = row_count;
  if v_creados = 0 then
    -- Ya eran contactos (o se cruzaron dos invitaciones): la invitación sigue sin usar.
    return jsonb_build_object('estado', 'ya_contacto', 'contacto', null);
  end if;

  update public.invitaciones i set usada_en = now() where i.id = v_inv.id;
  select p.nombre_para_mostrar into v_nombre from public.perfiles p where p.id = v_inv.emisor;
  return jsonb_build_object('estado', 'aceptada', 'contacto', jsonb_build_object('id', v_inv.emisor, 'nombre', v_nombre));
end;
$$;

-- Los vínculos de quien llama con el nombre del otro, que el RLS de `perfiles` no deja leer (R5).
create function contactos_privado.mis_contactos()
returns table (id uuid, nombre text, vinculado_desde timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.otro, p.nombre_para_mostrar, c.creado_en
  from public.contactos c
  cross join lateral (
    select case when c.usuario_a = (select auth.uid()) then c.usuario_b else c.usuario_a end as otro
  ) o
  left join public.perfiles p on p.id = o.otro
  where (select auth.uid()) in (c.usuario_a, c.usuario_b)
  order by p.nombre_para_mostrar nulls last, o.otro;
$$;

-- Datos de los contactos para la Edge Function `recomendar-grupo` (R1, R6). Exige la clave de
-- servidor (D8): con la sesión sola, desde la app o con cualquier cliente, se rechaza antes de
-- leer nada. Devuelve solo lo que el motor necesita: medios y compras del período reducidas a
-- promoción, fecha, monto y descuento. Un id no vinculado o inexistente da el mismo error.
create function contactos_privado.datos_de_contactos(p_contactos uuid[], p_clave text, p_desde date, p_hasta date)
returns table (id uuid, nombre text, medios jsonb, consumos jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_clave text;
begin
  if v_uid is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;
  select s.decrypted_secret into v_clave from vault.decrypted_secrets s where s.name = 'recomendar_grupo_clave' limit 1;
  if v_clave is null or p_clave is null or p_clave <> v_clave then
    raise exception 'clave_invalida' using errcode = '42501';
  end if;
  -- Acota lo que se puede leer aunque la clave se filtrara.
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 40 then
    raise exception 'rango_invalido' using errcode = '22023';
  end if;
  if p_contactos is null or exists (
    select 1 from unnest(p_contactos) as x (cid)
    where x.cid is null or not exists (
      select 1 from public.contactos c
      where c.usuario_a = least(v_uid, x.cid) and c.usuario_b = greatest(v_uid, x.cid)
    )
  ) then
    raise exception 'no_vinculado' using errcode = 'P0001', hint = 'no_vinculado';
  end if;

  return query
  select
    u.cid,
    p.nombre_para_mostrar,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'banco_id', m.banco_id, 'banco_nombre', b.nombre, 'tipo', m.tipo, 'red', m.red
      ) order by m.id)
      from public.medios_de_pago m
      left join public.bancos b on b.id = m.banco_id
      where m.user_id = u.cid
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'promocion_id', k.promocion_id, 'fecha', k.fecha, 'monto', k.monto, 'descuento_obtenido', k.descuento_obtenido
      ) order by k.fecha, k.id)
      from public.compras k
      where k.user_id = u.cid and k.promocion_id is not null and k.fecha between p_desde and p_hasta
    ), '[]'::jsonb)
  from (select distinct x.cid from unnest(p_contactos) as x (cid)) u
  left join public.perfiles p on p.id = u.cid
  order by u.cid;
end;
$$;

revoke all on function contactos_privado.crear_invitacion() from public, anon;
revoke all on function contactos_privado.ver_invitacion(text) from public, anon;
revoke all on function contactos_privado.aceptar_invitacion(text) from public, anon;
revoke all on function contactos_privado.mis_contactos() from public, anon;
revoke all on function contactos_privado.datos_de_contactos(uuid[], text, date, date) from public, anon;
grant execute on function contactos_privado.crear_invitacion() to authenticated;
grant execute on function contactos_privado.ver_invitacion(text) to authenticated;
grant execute on function contactos_privado.aceptar_invitacion(text) to authenticated;
grant execute on function contactos_privado.mis_contactos() to authenticated;
grant execute on function contactos_privado.datos_de_contactos(uuid[], text, date, date) to authenticated;

-- ─── Envoltorios en public (lo único que ve la API) ─────────────────────────────

create function public.crear_invitacion() returns jsonb
language sql security invoker set search_path = ''
as $$ select contactos_privado.crear_invitacion(); $$;

create function public.ver_invitacion(p_token text) returns jsonb
language sql stable security invoker set search_path = ''
as $$ select contactos_privado.ver_invitacion(p_token); $$;

create function public.aceptar_invitacion(p_token text) returns jsonb
language sql security invoker set search_path = ''
as $$ select contactos_privado.aceptar_invitacion(p_token); $$;

create function public.mis_contactos()
returns table (id uuid, nombre text, vinculado_desde timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from contactos_privado.mis_contactos(); $$;

create function public.datos_de_contactos(p_contactos uuid[], p_clave text, p_desde date, p_hasta date)
returns table (id uuid, nombre text, medios jsonb, consumos jsonb)
language sql stable security invoker set search_path = ''
as $$ select * from contactos_privado.datos_de_contactos(p_contactos, p_clave, p_desde, p_hasta); $$;

-- Quitar no necesita permisos elevados: borra con el RLS de `contactos` y es idempotente.
create function public.quitar_contacto(p_contacto uuid) returns void
language sql security invoker set search_path = ''
as $$
  delete from public.contactos c
  where c.usuario_a = least((select auth.uid()), p_contacto)
    and c.usuario_b = greatest((select auth.uid()), p_contacto);
$$;

-- Supabase da `execute` en las funciones nuevas de `public` a anon por defecto: se le quita.
revoke all on function public.crear_invitacion() from public, anon;
revoke all on function public.ver_invitacion(text) from public, anon;
revoke all on function public.aceptar_invitacion(text) from public, anon;
revoke all on function public.mis_contactos() from public, anon;
revoke all on function public.datos_de_contactos(uuid[], text, date, date) from public, anon;
revoke all on function public.quitar_contacto(uuid) from public, anon;
grant execute on function public.crear_invitacion() to authenticated;
grant execute on function public.ver_invitacion(text) to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;
grant execute on function public.mis_contactos() to authenticated;
grant execute on function public.datos_de_contactos(uuid[], text, date, date) to authenticated;
grant execute on function public.quitar_contacto(uuid) to authenticated;
