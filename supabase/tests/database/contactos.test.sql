-- Contactos vinculados e invitaciones (spec 013 US2 y US3, ADR-008).
-- Las carreras reales (dos aceptaciones a la vez) las resuelven `for update` y la clave primaria
-- del par; acá se prueba la lógica de cada caso en una sola transacción.
begin;
select no_plan();

-- Ana (A), Beto (B), Caro (C) con nombre; D sin nombre para mostrar.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local');
insert into public.perfiles (id, nombre_para_mostrar) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ana'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Beto'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Caro'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', null);

-- Una invitación vencida de Caro, cargada como superusuario con un token conocido.
insert into public.invitaciones (emisor, token_hash, creada_en, vence_en) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', encode(extensions.digest('vencidaVencidaVencida123', 'sha256'), 'hex'),
   now() - interval '2 days', now() - interval '1 day');

-- ===== Estructura y permisos =====
select has_table('public', 'invitaciones', 'existe invitaciones');
select has_table('public', 'contactos', 'existe contactos');
select ok((select relrowsecurity from pg_class where oid = 'public.invitaciones'::regclass), 'invitaciones tiene RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.contactos'::regclass), 'contactos tiene RLS');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon' and table_name in ('invitaciones', 'contactos')
$$, 'anon no tiene ningún privilegio sobre invitaciones ni contactos');

select ok(not has_table_privilege('authenticated', 'public.invitaciones', 'insert'), 'authenticated no inserta invitaciones');
select ok(not has_table_privilege('authenticated', 'public.invitaciones', 'update'), 'authenticated no modifica invitaciones');
select ok(not has_table_privilege('authenticated', 'public.invitaciones', 'delete'), 'authenticated no borra invitaciones directo');
select ok(not has_table_privilege('authenticated', 'public.contactos', 'insert'), 'authenticated no inserta contactos (solo aceptar_invitacion)');
select ok(not has_table_privilege('authenticated', 'public.contactos', 'update'), 'authenticated no modifica contactos');

select is_empty($$
  select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'contactos_privado')
    and p.proname in ('crear_invitacion', 'ver_invitacion', 'aceptar_invitacion', 'mis_contactos',
                      'quitar_contacto', 'datos_de_contactos')
    and has_function_privilege('anon', p.oid, 'execute')
$$, 'anon no ejecuta ninguna función de contactos');

select ok(not has_schema_privilege('anon', 'contactos_privado', 'usage'), 'anon no usa el schema contactos_privado');

select is((
  select string_agg(p.proname::text, ',' order by p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'contactos_privado' and p.prosecdef
), 'aceptar_invitacion,crear_invitacion,datos_de_contactos,mis_contactos,ver_invitacion',
'las funciones con permisos elevados viven en contactos_privado');

select is_empty($$
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'contactos_privado'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
$$, 'toda función de contactos_privado fija su search_path');

-- ===== D, sin nombre, no puede invitar =====
select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.crear_invitacion() $$, 'P0001', 'sin_nombre', 'sin nombre para mostrar no se puede invitar');

-- ===== Ana crea una invitación =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
select set_config('test.vieja', public.crear_invitacion() ->> 'token', true);
select set_config('test.ana', public.crear_invitacion() ->> 'token', true);
select matches(current_setting('test.ana'), '^[A-Za-z0-9_-]{24}$', 'el token tiene 24 caracteres base64url');
select isnt(current_setting('test.ana'), current_setting('test.vieja'), 'cada invitación tiene un token nuevo');
select is((select count(*)::int from public.invitaciones), 1, 'Ana ve una sola invitación suya: la nueva borró la anterior sin usar');
select is(public.ver_invitacion(current_setting('test.ana')) ->> 'estado', 'propia', 'Ana abriendo su propia invitación');
select is(public.ver_invitacion(current_setting('test.vieja')) ->> 'estado', 'inexistente', 'la invitación anterior ya no existe');

reset role;
select is((select count(*)::int from public.invitaciones
           where token_hash = encode(extensions.digest(current_setting('test.ana'), 'sha256'), 'hex')
             and vence_en = now() + interval '24 hours' and usada_en is null), 1,
  'se guarda solo la huella del token, con vencimiento a 24 h y sin usar');

-- ===== Beto ve y acepta la invitación de Ana =====
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}', true);
set local role authenticated;
select is(public.ver_invitacion(current_setting('test.ana')) ->> 'estado', 'valida', 'Beto ve una invitación válida');
select is(public.ver_invitacion(current_setting('test.ana')) ->> 'quien_invita', 'Ana', 'y quién lo invita');
select isnt(public.ver_invitacion(current_setting('test.ana')) ->> 'vence_en', null, 'y cuándo vence');
select is(public.ver_invitacion('vencidaVencidaVencida123') ->> 'estado', 'vencida', 'una invitación vencida');
select is(public.ver_invitacion('vencidaVencidaVencida123') ->> 'quien_invita', 'Caro', 'la vencida dice quién la mandó');
select is(public.ver_invitacion('noExisteNoExisteNoExiste') ->> 'estado', 'inexistente', 'un token que no existe');
select is(public.ver_invitacion('noExisteNoExisteNoExiste') ->> 'quien_invita', null, 'sin nombre de nadie');
select is(public.ver_invitacion('abc') ->> 'estado', 'inexistente', 'un token mal formado es inexistente');
select is(public.aceptar_invitacion('vencidaVencidaVencida123') ->> 'estado', 'vencida', 'aceptar una vencida no vincula');

select is(public.aceptar_invitacion(current_setting('test.ana')),
  '{"estado": "aceptada", "contacto": {"id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "nombre": "Ana"}}'::jsonb,
  'Beto acepta y queda vinculado con Ana');
select results_eq($$ select id, nombre from public.mis_contactos() $$,
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'Ana'::text) $$, 'Beto ve a Ana en sus contactos');
select is(public.ver_invitacion(current_setting('test.ana')) ->> 'estado', 'usada', 'la invitación quedó usada');
select is((select count(*)::int from public.invitaciones), 0, 'Beto no ve la invitación de Ana');

reset role;
select is((select count(*)::int from public.contactos
           where usuario_a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and usuario_b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1,
  'un solo vínculo, con el par ordenado');
select isnt((select usada_en from public.invitaciones where token_hash = encode(extensions.digest(current_setting('test.ana'), 'sha256'), 'hex')), null,
  'usada_en quedó marcada');

-- ===== Caro intenta usar la misma invitación; D intenta aceptar =====
select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "role": "authenticated"}', true);
set local role authenticated;
select is(public.aceptar_invitacion(current_setting('test.ana')) ->> 'estado', 'usada', 'una invitación sirve una sola vez');
select set_config('test.caro', public.crear_invitacion() ->> 'token', true);

select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "role": "authenticated"}', true);
select is(public.aceptar_invitacion(current_setting('test.caro')) ->> 'estado', 'sin_nombre', 'sin nombre para mostrar no se puede aceptar');
select is_empty($$ select 1 from public.mis_contactos() $$, 'D no quedó vinculado');

-- ===== Ana con Beto ya vinculados: ya contacto =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
select set_config('test.ana2', public.crear_invitacion() ->> 'token', true);
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}', true);
select is(public.ver_invitacion(current_setting('test.ana2')) ->> 'estado', 'ya_contacto', 'Beto ya es contacto de Ana');
select is(public.aceptar_invitacion(current_setting('test.ana2')) ->> 'estado', 'ya_contacto', 'aceptar de nuevo no crea otro vínculo');

-- ===== Invitaciones cruzadas: Ana acepta la de Caro y Caro la de Ana =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
select is(public.aceptar_invitacion(current_setting('test.caro')) ->> 'estado', 'aceptada', 'Ana acepta la de Caro');
select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "role": "authenticated"}', true);
select is(public.aceptar_invitacion(current_setting('test.ana2')) ->> 'estado', 'ya_contacto', 'la cruzada no crea otro vínculo');
reset role;
select is((select usada_en from public.invitaciones where token_hash = encode(extensions.digest(current_setting('test.ana2'), 'sha256'), 'hex')), null,
  'la invitación de Ana sigue sin usar');
select is((select count(*)::int from public.contactos
           where usuario_a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and usuario_b = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 1,
  'un solo vínculo entre Ana y Caro');

-- ===== Lista y quitar =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;
select results_eq($$ select nombre from public.mis_contactos() $$, $$ values ('Beto'::text), ('Caro'::text) $$,
  'Ana ve a Beto y a Caro, ordenados por nombre');

select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "role": "authenticated"}', true);
select lives_ok($$ select public.quitar_contacto('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') $$, 'Caro quita a alguien que no es su contacto sin error');
select is_empty($$ with d as (delete from public.contactos where usuario_b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1) select * from d $$,
  'Caro no puede borrar el vínculo entre Ana y Beto');

select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}', true);
select lives_ok($$ select public.quitar_contacto('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, 'Beto quita a Ana');
select is_empty($$ select 1 from public.mis_contactos() $$, 'Beto ya no tiene contactos');
select lives_ok($$ select public.quitar_contacto('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, 'quitar es idempotente');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
select results_eq($$ select nombre from public.mis_contactos() $$, $$ values ('Caro'::text) $$, 'el vínculo se rompió para los dos');

-- ===== datos_de_contactos: solo para la Edge Function, con la clave de servidor (US3, D8) =====
-- Ana y Caro siguen vinculadas. Caro tiene un medio y tres compras: una con promo en el rango,
-- una sin promo y una con promo fuera del rango.
reset role;
insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');
insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('c1000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa');
insert into public.capturas_crudas (id, origen, contenido) values
  ('c9000000-0000-4000-8000-000000000001', 'https://example.test/promos', '{"crudo": true}');
insert into public.promociones (id, fuente, fuente_id, titulo, banco_id, categoria_id, porcentaje, credito_redes, vigencia_desde, vigencia_hasta, captura_cruda_id) values
  ('d9000000-0000-4000-8000-000000000001', 'modo', 'p-grupo', '20% en gastronomía', '00000000-0000-4000-8000-0000000000b1', 2, 20, '{visa}', '2026-09-01', '2026-12-31', 'c9000000-0000-4000-8000-000000000001');
insert into public.compras (user_id, fecha, monto, comercio, categoria_id, medio_de_pago_id, promocion_id, descuento_obtenido, origen, texto_extraido) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-11-05', 1000, 'La Parolaccia', 2, 'c1000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001', 200, 'ticket', 'TEXTO DEL TICKET'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-11-06', 5000, 'Coto', 1, 'c1000000-0000-4000-8000-000000000001', null, null, 'manual', null),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-09-10', 3000, 'La Parolaccia', 2, 'c1000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001', 600, 'manual', null);

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  '42501', null, 'sin el secreto cargado en Vault, se rechaza');

reset role;
select vault.create_secret('clave-de-prueba', 'recomendar_grupo_clave');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;

select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], null, '2026-11-01', '2026-11-30') $$,
  '42501', null, 'con la sesión sola, sin la clave, se rechaza (SC-005)');
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'otra-clave', '2026-11-01', '2026-11-30') $$,
  '42501', null, 'con una clave equivocada se rechaza');
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-30', '2026-11-01') $$,
  '22023', null, 'un rango invertido se rechaza');
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-10-01', '2026-11-11') $$,
  '22023', null, 'un rango de más de 40 días se rechaza');
select throws_ok($$ select * from public.datos_de_contactos(array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  'P0001', 'no_vinculado', 'un id que no es contacto vinculado se rechaza (SC-004)');
select throws_ok($$ select * from public.datos_de_contactos(array['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  'P0001', 'no_vinculado', 'un id inexistente da el mismo error que uno no vinculado');
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  'P0001', 'no_vinculado', 'un solo id no vinculado rechaza el pedido entero');
select throws_ok($$ select * from public.datos_de_contactos(array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  'P0001', 'no_vinculado', 'uno mismo no es su propio contacto');

select is((select nombre from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30')),
  'Caro', 'con la clave y un contacto vinculado devuelve su nombre');
select is((select medios from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30')),
  '[{"id": "c1000000-0000-4000-8000-000000000001", "banco_id": "00000000-0000-4000-8000-0000000000b1", "banco_nombre": "Banco de prueba", "tipo": "credito", "red": "visa"}]'::jsonb,
  'sus medios con el nombre del banco');
select is((select consumos from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30')),
  '[{"promocion_id": "d9000000-0000-4000-8000-000000000001", "fecha": "2026-11-05", "monto": 1000, "descuento_obtenido": 200}]'::jsonb,
  'solo las compras con promo del rango, reducidas a promoción, fecha, monto y descuento');
select is((
  select string_agg(distinct k, ',' order by k)
  from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-09-01', '2026-10-10') d,
       jsonb_array_elements(d.consumos) e, jsonb_object_keys(e) k
), 'descuento_obtenido,fecha,monto,promocion_id', 'ninguna compra trae comercio, origen, texto ni id');

select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "role": "authenticated"}', true);
select lives_ok($$ select public.quitar_contacto('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, 'Caro quita a Ana');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
select throws_ok($$ select * from public.datos_de_contactos(array['cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[], 'clave-de-prueba', '2026-11-01', '2026-11-30') $$,
  'P0001', 'no_vinculado', 'después de quitar el contacto, sus datos ya no se pueden leer (SC-007)');

-- ===== Borrar la cuenta borra vínculos e invitaciones =====
reset role;
delete from auth.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select is((select count(*)::int from public.contactos where 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' in (usuario_a, usuario_b)), 0,
  'borrar la cuenta borra sus vínculos');
select is((select count(*)::int from public.invitaciones where emisor = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 0,
  'y sus invitaciones');

select * from finish();
rollback;
