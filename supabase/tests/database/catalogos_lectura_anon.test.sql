-- Lectura sin cuenta de los catálogos y las promociones (issue #112, spec 012 FR-032, T042).
-- `anon` lee bancos, categorías y promociones (todas, como con cuenta: ver la migración), que son
-- datos públicos de MODO. No lee ninguna tabla con datos de usuarios ni escribe en ninguna tabla.
begin;
select no_plan();

-- Datos de prueba, cargados como superusuario (salta RLS). Todo se revierte al final.
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local');
insert into public.perfiles (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');
insert into public.categorias (id, nombre) values (990, 'Categoría de prueba');
insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa');

create temp table hoy as select (now() at time zone 'America/Argentina/Buenos_Aires')::date as d;

insert into public.promociones (id, fuente, titulo, banco_id, categoria_id, porcentaje, credito_redes, vigencia_desde, vigencia_hasta)
select p.id::uuid, 'manual', p.titulo, '00000000-0000-4000-8000-0000000000b1', 990, 20, '{visa}', hoy.d - 10, hoy.d + p.dias_hasta
from hoy, (values
  ('d1000000-0000-4000-8000-000000000001', 'Vigente', 10),
  ('d1000000-0000-4000-8000-000000000002', 'Vence hoy', 0),
  ('d1000000-0000-4000-8000-000000000003', 'Vencida ayer', -1)
) as p (id, titulo, dias_hasta);

-- ===== Rol anónimo =====
select set_config('request.jwt.claims', '', true);
set local role anon;

-- Catálogos: los lee enteros.
select ok((select count(*) from public.bancos where id = '00000000-0000-4000-8000-0000000000b1') = 1, 'anon lee bancos');
select ok((select count(*) from public.categorias where id = 990) = 1, 'anon lee categorias');

-- Promos: todas, también la vencida (la sincronización con cuenta la necesita para los topes).
select results_eq(
  $$ select id from public.promociones where categoria_id = 990 order by id $$,
  $$ values ('d1000000-0000-4000-8000-000000000001'::uuid), ('d1000000-0000-4000-8000-000000000002'::uuid), ('d1000000-0000-4000-8000-000000000003'::uuid) $$,
  'anon lee las promociones, vigentes y vencidas'
);

-- Tablas con datos de usuarios y capturas: nada.
select throws_ok($$ select * from public.perfiles $$, '42501', null, 'anon no lee perfiles');
select throws_ok($$ select * from public.medios_de_pago $$, '42501', null, 'anon no lee medios_de_pago');
select throws_ok($$ select * from public.comercios_habituales $$, '42501', null, 'anon no lee comercios_habituales');
select throws_ok($$ select * from public.compras $$, '42501', null, 'anon no lee compras');
select throws_ok($$ select * from public.capturas_crudas $$, '42501', null, 'anon no lee capturas_crudas');

-- Escritura: en ninguna tabla, tampoco en las que ahora lee.
select throws_ok($$ insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b9', 'X') $$, '42501', null, 'anon no inserta bancos');
select throws_ok($$ update public.bancos set nombre = 'X' $$, '42501', null, 'anon no actualiza bancos');
select throws_ok($$ delete from public.bancos $$, '42501', null, 'anon no borra bancos');
select throws_ok($$ insert into public.categorias (id, nombre) values (991, 'X') $$, '42501', null, 'anon no inserta categorias');
select throws_ok($$ update public.categorias set nombre = 'X' $$, '42501', null, 'anon no actualiza categorias');
select throws_ok($$ delete from public.categorias $$, '42501', null, 'anon no borra categorias');
select throws_ok(
  $$ insert into public.promociones (fuente, titulo, banco_id, categoria_id, porcentaje, credito_redes, vigencia_desde, vigencia_hasta) values ('manual', 'X', '00000000-0000-4000-8000-0000000000b1', 990, 10, '{visa}', '2026-11-01', '2026-11-30') $$,
  '42501', null, 'anon no inserta promociones'
);
select throws_ok($$ update public.promociones set titulo = 'X' $$, '42501', null, 'anon no actualiza promociones');
select throws_ok($$ delete from public.promociones $$, '42501', null, 'anon no borra promociones');
select throws_ok($$ insert into public.perfiles (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') $$, '42501', null, 'anon no inserta perfiles');
select throws_ok(
  $$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'debito', 'visa') $$,
  '42501', null, 'anon no inserta medios_de_pago'
);
select throws_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X') $$, '42501', null, 'anon no inserta comercios_habituales');
select throws_ok(
  $$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 5, 'X', 'a1000000-0000-4000-8000-000000000001', 'manual') $$,
  '42501', null, 'anon no inserta compras'
);
select throws_ok($$ insert into public.capturas_crudas (origen, contenido) values ('x', 'y') $$, '42501', null, 'anon no inserta capturas_crudas');
reset role;

select * from finish();
rollback;
