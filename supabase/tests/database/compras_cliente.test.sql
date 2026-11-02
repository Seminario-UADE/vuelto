-- Lo que la app asume de `public.compras` al subir y borrar compras (spec 010, FR-006, FR-012, FR-021):
-- id generado por el cliente, reinsertar el mismo id sin duplicar, borrar algo que no existe, y que
-- otra cuenta no pueda leer ni pisar la fila.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local');

insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');

insert into public.perfiles (id, nombre_para_mostrar) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ana'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Beto');

insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa'),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa');

insert into public.compras (id, user_id, fecha, monto, comercio, medio_de_pago_id, origen) values
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-01', 2000, 'Coto', 'b1000000-0000-4000-8000-000000000001', 'manual');

-- ===== Usuario A =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;

-- El cliente genera el id; el dueño sale de la sesión (auth.uid()).
select lives_ok(
  $$ insert into public.compras (id, fecha, monto, comercio, medio_de_pago_id, origen)
     values ('a2000000-0000-4000-8000-000000000099', '2026-11-02', 5000, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'excepcion') $$,
  'A inserta una compra con un id generado por la app');
select is(
  (select user_id from public.compras where id = 'a2000000-0000-4000-8000-000000000099'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'el dueño de la fila es la sesión, no algo que mande la app');

-- El reintento de un envío que sí llegó (upsert con ignoreDuplicates = ON CONFLICT DO NOTHING).
select lives_ok(
  $$ insert into public.compras (id, fecha, monto, comercio, medio_de_pago_id, origen)
     values ('a2000000-0000-4000-8000-000000000099', '2026-11-02', 5000, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'excepcion')
     on conflict (id) do nothing $$,
  'reinsertar el mismo id no es un error');
select is((select count(*)::int from public.compras where id = 'a2000000-0000-4000-8000-000000000099'), 1, 'queda una sola fila');

-- Un insert simple repetido sí falla: por eso la app usa on conflict do nothing.
select throws_ok(
  $$ insert into public.compras (id, fecha, monto, comercio, medio_de_pago_id, origen)
     values ('a2000000-0000-4000-8000-000000000099', '2026-11-02', 5000, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'excepcion') $$,
  '23505', null, 'un insert simple repetido choca con la clave');

-- Borrar es idempotente: lo que no existe no es un error.
select lives_ok($$ delete from public.compras where id = 'a2000000-0000-4000-8000-0000000000ff' $$, 'borrar un id que no existe no falla');
select is_empty(
  $$ with d as (delete from public.compras where id = 'a2000000-0000-4000-8000-0000000000ff' returning 1) select * from d $$,
  'borrar un id que no existe borra cero filas');

-- Con el id de la compra de B, A no la lee, no la pisa y no la borra.
select is_empty($$ select 1 from public.compras where id = 'b2000000-0000-4000-8000-000000000001' $$, 'A no ve la compra de B');
select lives_ok(
  $$ insert into public.compras (id, fecha, monto, comercio, medio_de_pago_id, origen)
     values ('b2000000-0000-4000-8000-000000000001', '2026-11-02', 1, 'Pisada', 'a1000000-0000-4000-8000-000000000001', 'manual')
     on conflict (id) do nothing $$,
  'A reinsertando el id de B con do nothing no falla ni escribe');
select is_empty(
  $$ with d as (delete from public.compras where id = 'b2000000-0000-4000-8000-000000000001' returning 1) select * from d $$,
  'A no borra la compra de B por su id');

-- Los datos inválidos se rechazan con los códigos que la app trata como «rechazada».
select throws_ok(
  $$ insert into public.compras (fecha, monto, comercio, medio_de_pago_id, origen)
     values ('2026-11-02', 0, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '23514', null, 'monto 0 viola el check');
select throws_ok(
  $$ insert into public.compras (fecha, monto, comercio, medio_de_pago_id, origen)
     values ('2026-11-02', 5, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'otro') $$,
  '23514', null, 'un origen fuera de ticket/excepcion/manual viola el check');
select throws_ok(
  $$ insert into public.compras (fecha, monto, comercio, medio_de_pago_id, origen)
     values ('2026-11-02', 5, 'Coto', 'b1000000-0000-4000-8000-000000000001', 'manual') $$,
  '23503', null, 'el medio de otro usuario viola la clave foránea compuesta');
select throws_ok(
  $$ insert into public.compras (id, fecha, monto, comercio, medio_de_pago_id, origen)
     values ('no-es-un-uuid', '2026-11-02', 5, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '22P02', null, 'un id que no es uuid falla con 22P02');

reset role;

-- La fila de B quedó como estaba.
select is((select monto from public.compras where id = 'b2000000-0000-4000-8000-000000000001'), 2000::numeric, 'la compra de B no se tocó');
select is((select user_id from public.compras where id = 'b2000000-0000-4000-8000-000000000001'), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'y sigue siendo de B');

select * from finish();
rollback;
