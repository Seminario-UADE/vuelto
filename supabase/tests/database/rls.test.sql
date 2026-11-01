-- Aislamiento de datos y permisos por rol (issue #34, spec 007 historias 1 y 2).
begin;
select no_plan();

-- Datos de prueba, cargados como superusuario (salta RLS). Todo se revierte al final.
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

insert into public.comercios_habituales (id, user_id, nombre) values
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Coto'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Coto');

insert into public.compras (id, user_id, fecha, monto, comercio, medio_de_pago_id, origen) values
  ('a2000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 1000, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'manual'),
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-01', 2000, 'Coto', 'b1000000-0000-4000-8000-000000000001', 'manual');

insert into public.capturas_crudas (id, origen, contenido) values
  ('c1000000-0000-4000-8000-000000000001', 'https://example.test/promos', '{"crudo": true}');

insert into public.promociones (id, fuente, fuente_id, titulo, banco_id, categoria_id, porcentaje, debito_redes, vigencia_desde, vigencia_hasta, captura_cruda_id) values
  ('d1000000-0000-4000-8000-000000000001', 'modo', 'p1', '20% en supermercados', '00000000-0000-4000-8000-0000000000b1', 1, 20, '{visa}', '2026-11-01', '2026-11-30', 'c1000000-0000-4000-8000-000000000001');

-- ===== Usuario A =====
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;

-- (a) A solo ve lo suyo en las cuatro tablas de dueño
select results_eq($$ select id from public.compras $$, $$ values ('a2000000-0000-4000-8000-000000000001'::uuid) $$, 'A ve solo su compra');
select results_eq($$ select id from public.medios_de_pago $$, $$ values ('a1000000-0000-4000-8000-000000000001'::uuid) $$, 'A ve solo su medio de pago');
select results_eq($$ select id from public.comercios_habituales $$, $$ values ('a3000000-0000-4000-8000-000000000001'::uuid) $$, 'A ve solo su comercio habitual');
select results_eq($$ select id from public.perfiles $$, $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$, 'A ve solo su perfil');
select is_empty($$ select 1 from public.compras where id = 'b2000000-0000-4000-8000-000000000001' $$, 'A no lee la compra de B por id');

-- (b) A no modifica ni borra lo de B
select is_empty($$ with u as (update public.compras set monto = 1 where id = 'b2000000-0000-4000-8000-000000000001' returning 1) select * from u $$, 'A no actualiza la compra de B');
select is_empty($$ with d as (delete from public.compras where id = 'b2000000-0000-4000-8000-000000000001' returning 1) select * from d $$, 'A no borra la compra de B');
select is_empty($$ with u as (update public.medios_de_pago set red = 'master' where id = 'b1000000-0000-4000-8000-000000000001' returning 1) select * from u $$, 'A no actualiza el medio de B');
select is_empty($$ with d as (delete from public.comercios_habituales where id = 'b3000000-0000-4000-8000-000000000001' returning 1) select * from d $$, 'A no borra el comercio de B');
select is_empty($$ with u as (update public.perfiles set nombre_para_mostrar = 'x' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1) select * from u $$, 'A no actualiza el perfil de B');

-- ... ni inserta a nombre de B
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-11-01', 5, 'X', 'b1000000-0000-4000-8000-000000000001', 'manual') $$, '42501', null, 'A no inserta una compra a nombre de B');
select throws_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-4000-8000-0000000000b1', 'debito', 'visa') $$, '42501', null, 'A no inserta un medio de pago a nombre de B');
select throws_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Jumbo') $$, '42501', null, 'A no inserta un comercio a nombre de B');
select throws_ok($$ insert into public.perfiles (id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') $$, '42501', null, 'A no crea el perfil de B');

-- (h) A no puede pasarle una fila propia a B
select throws_ok($$ update public.compras set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'a2000000-0000-4000-8000-000000000001' $$, '42501', null, 'A no cambia el dueño de su compra');
select throws_ok($$ update public.medios_de_pago set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'a1000000-0000-4000-8000-000000000001' $$, '42501', null, 'A no cambia el dueño de su medio');
select throws_ok($$ update public.comercios_habituales set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'a3000000-0000-4000-8000-000000000001' $$, '42501', null, 'A no cambia el dueño de su comercio');
select throws_ok($$ update public.perfiles set id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, '42501', null, 'A no cambia el dueño de su perfil');

-- (i) A no usa el medio de pago de B, ni insertando ni actualizando
select throws_ok($$ insert into public.compras (fecha, monto, comercio, medio_de_pago_id, origen) values ('2026-11-01', 5, 'X', 'b1000000-0000-4000-8000-000000000001', 'manual') $$, '23503', null, 'A no inserta una compra con el medio de B');
select throws_ok($$ update public.compras set medio_de_pago_id = 'b1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001' $$, '23503', null, 'A no pasa su compra al medio de B');

-- A sí opera sobre lo suyo
select lives_ok($$ insert into public.compras (fecha, monto, comercio, medio_de_pago_id, origen) values ('2026-11-02', 50, 'Carrefour', 'a1000000-0000-4000-8000-000000000001', 'ticket') $$, 'A inserta su compra (el dueño sale de la sesión)');
select is((select count(*)::int from public.compras), 2, 'A lee sus dos compras');
select lives_ok($$ update public.compras set monto = 60 where comercio = 'Carrefour' $$, 'A actualiza su compra');
select lives_ok($$ delete from public.compras where comercio = 'Carrefour' $$, 'A borra su compra');
select throws_ok($$ insert into public.perfiles (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, '23505', null, 'un solo perfil por cuenta');

-- (e) capturas_crudas: invisible desde la app
select throws_ok($$ select * from public.capturas_crudas $$, '42501', null, 'A no lee capturas_crudas');
select throws_ok($$ insert into public.capturas_crudas (origen, contenido) values ('x', 'y') $$, '42501', null, 'A no escribe capturas_crudas');

-- (d) corpus y catálogos: lectura sí
select is((select count(*)::int from public.promociones), 1, 'A lee promociones');
select is((select count(*)::int from public.categorias), 13, 'A lee las 13 categorías');
select cmp_ok((select count(*)::int from public.bancos), '>=', 1, 'A lee bancos');

-- (c) y (k): escritura prohibida en el corpus
select throws_ok($$ insert into public.promociones (fuente, fuente_id, titulo, banco_id, categoria_id, porcentaje, debito_redes, vigencia_desde, vigencia_hasta, captura_cruda_id) values ('modo', 'p2', 'x', '00000000-0000-4000-8000-0000000000b1', 1, 10, '{visa}', '2026-11-01', '2026-11-30', 'c1000000-0000-4000-8000-000000000001') $$, '42501', null, 'A no inserta en promociones');
select throws_ok($$ update public.promociones set porcentaje = 99 $$, '42501', null, 'A no actualiza promociones');
select throws_ok($$ delete from public.promociones $$, '42501', null, 'A no borra promociones');
select throws_ok($$ insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b2', 'Falso') $$, '42501', null, 'A no inserta en bancos');
select throws_ok($$ update public.bancos set nombre = 'x' $$, '42501', null, 'A no actualiza bancos');
select throws_ok($$ delete from public.bancos $$, '42501', null, 'A no borra bancos');
select throws_ok($$ insert into public.categorias (id, nombre) values (99, 'Falsa') $$, '42501', null, 'A no inserta en categorias');
select throws_ok($$ update public.categorias set nombre = 'x' $$, '42501', null, 'A no actualiza categorias');
select throws_ok($$ delete from public.categorias $$, '42501', null, 'A no borra categorias');

reset role;

-- ===== Rol anónimo: nada en ninguna tabla =====
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select * from public.perfiles $$, '42501', null, 'anon no lee perfiles');
select throws_ok($$ select * from public.medios_de_pago $$, '42501', null, 'anon no lee medios_de_pago');
select throws_ok($$ select * from public.comercios_habituales $$, '42501', null, 'anon no lee comercios_habituales');
select throws_ok($$ select * from public.compras $$, '42501', null, 'anon no lee compras');
select throws_ok($$ select * from public.promociones $$, '42501', null, 'anon no lee promociones');
select throws_ok($$ select * from public.bancos $$, '42501', null, 'anon no lee bancos');
select throws_ok($$ select * from public.categorias $$, '42501', null, 'anon no lee categorias');
select throws_ok($$ select * from public.capturas_crudas $$, '42501', null, 'anon no lee capturas_crudas');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 5, 'X', 'a1000000-0000-4000-8000-000000000001', 'manual') $$, '42501', null, 'anon no inserta compras');
reset role;

-- ===== Service role: escribe el corpus y las capturas =====
set local role service_role;
select lives_ok($$ insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b2', 'Otro banco') $$, 'service_role escribe bancos');
select lives_ok($$ insert into public.categorias (id, nombre) values (99, 'Nueva') $$, 'service_role escribe categorias');
select lives_ok($$ insert into public.capturas_crudas (origen, contenido) values ('x', 'y') $$, 'service_role escribe capturas_crudas');
select lives_ok($$ insert into public.promociones (fuente, titulo, banco_id, categoria_id, porcentaje, credito_redes, vigencia_desde, vigencia_hasta) values ('manual', 'Promo manual', '00000000-0000-4000-8000-0000000000b2', 99, 10, '{master}', '2026-11-01', '2026-11-30') $$, 'service_role escribe promociones');
reset role;

-- ===== Medio con compras: no se borra solo; la cuenta sí se borra entera =====
select throws_ok($$ delete from public.medios_de_pago where id = 'b1000000-0000-4000-8000-000000000001' $$, '23503', null, 'no se borra un medio de pago con compras');
delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select count(*)::int from public.compras where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'borrar la cuenta de A borra sus compras');
select is((select count(*)::int from public.medios_de_pago where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'borrar la cuenta de A borra sus medios de pago');
select is((select count(*)::int from public.comercios_habituales where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'borrar la cuenta de A borra sus comercios');
select is((select count(*)::int from public.perfiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'borrar la cuenta de A borra su perfil');
select is((select count(*)::int from public.compras where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1, 'la compra de B sigue');
select is((select count(*)::int from public.promociones), 2, 'las promociones no se tocan');

select * from finish();
rollback;
