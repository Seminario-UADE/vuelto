-- Marca de sincronización incremental (spec 007, historia 3, ADR-010 §4).
begin;
select no_plan();

insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');
create temp table marcas (k text primary key, t timestamptz);

-- Se inserta con una marca vieja a propósito: la base la tiene que ignorar.
insert into public.promociones (id, fuente, titulo, banco_id, categoria_id, porcentaje, debito_redes, vigencia_desde, vigencia_hasta, actualizada_en) values
  ('d1000000-0000-4000-8000-000000000001', 'manual', 'Uno', '00000000-0000-4000-8000-0000000000b1', 1, 10, '{visa}', '2026-11-01', '2026-11-30', '2000-01-01'),
  ('d1000000-0000-4000-8000-000000000002', 'manual', 'Dos', '00000000-0000-4000-8000-0000000000b1', 1, 10, '{visa}', '2026-11-01', '2026-11-30', '2000-01-01');

select cmp_ok((select actualizada_en from public.promociones where titulo = 'Uno'), '>', '2020-01-01'::timestamptz, 'al insertar, la base ignora la marca enviada');
insert into marcas select 'insert', actualizada_en from public.promociones where titulo = 'Uno';

select pg_sleep(0.02);
update public.promociones set titulo = 'Uno bis' where id = 'd1000000-0000-4000-8000-000000000001';
select cmp_ok((select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001'), '>', (select t from marcas where k = 'insert'), 'cambiar un campo avanza la marca');
insert into marcas select 'cambio', actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001';

select pg_sleep(0.02);
update public.promociones set titulo = 'Uno ter', actualizada_en = '2000-01-01' where id = 'd1000000-0000-4000-8000-000000000001';
select cmp_ok((select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001'), '>', (select t from marcas where k = 'cambio'), 'una marca vieja enviada en el update se ignora');
update marcas set t = (select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001') where k = 'cambio';

select pg_sleep(0.02);
update public.promociones set titulo = titulo, porcentaje = porcentaje where id = 'd1000000-0000-4000-8000-000000000001';
select is((select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001'), (select t from marcas where k = 'cambio'), 're-escribir los mismos valores no mueve la marca');
update public.promociones set actualizada_en = '2000-01-01' where id = 'd1000000-0000-4000-8000-000000000001';
select is((select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001'), (select t from marcas where k = 'cambio'), 'tocar solo actualizada_en tampoco la mueve');

select pg_sleep(0.02);
update public.promociones set dada_de_baja_en = now() where id = 'd1000000-0000-4000-8000-000000000001';
select cmp_ok((select actualizada_en from public.promociones where id = 'd1000000-0000-4000-8000-000000000001'), '>', (select t from marcas where k = 'cambio'), 'dar de baja una promoción avanza la marca');

-- Consulta incremental: solo lo modificado después de la marca
select results_eq(
  $$ select id from public.promociones where actualizada_en > (select t from marcas where k = 'cambio') $$,
  $$ values ('d1000000-0000-4000-8000-000000000001'::uuid) $$,
  'la consulta «posteriores a la marca» devuelve solo la promoción modificada');
select is((select count(*)::int from public.promociones where id = 'd1000000-0000-4000-8000-000000000002' and actualizada_en > (select t from marcas where k = 'cambio')), 0, 'la promoción sin cambios no aparece');

select * from finish();
rollback;
