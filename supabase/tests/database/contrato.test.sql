-- Contrato con los tipos del motor (spec 007, historia 4): lo que se acepta y lo que se rechaza.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local');
insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');
insert into public.capturas_crudas (id, origen, contenido) values ('c1000000-0000-4000-8000-000000000001', 'https://example.test', 'crudo');

-- Promoción base mínima válida; cada prueba pisa campos con un jsonb.
create function pg_temp.promo(o jsonb default '{}') returns void language sql as $$
  insert into public.promociones
  select * from jsonb_populate_record(null::public.promociones, jsonb_build_object(
    'id', gen_random_uuid(), 'fuente', 'manual', 'titulo', 'Promo', 'banco_id', '00000000-0000-4000-8000-0000000000b1',
    'categoria_id', 1, 'porcentaje', 10, 'debito_redes', '["visa"]'::jsonb, 'credito_redes', '[]'::jsonb,
    'vigencia_desde', '2026-11-01', 'vigencia_hasta', '2026-11-30', 'fragmentos_fuente', '{}'::jsonb,
    'creada_en', now()) || o);
$$;

-- ----- Promociones: lo que se acepta -----
select lives_ok($$ select pg_temp.promo() $$, 'promoción con solo los campos obligatorios (opcionales en null)');
select lives_ok($$ select pg_temp.promo('{
  "fuente": "modo", "fuente_id": "m1", "captura_cruda_id": "c1000000-0000-4000-8000-000000000001",
  "comercio": "Coto", "debito_redes": ["visa", "maestro"], "credito_redes": ["master"], "dias": ["lun", "vie"],
  "tope_monto": 15000, "tope_periodo": "mensual", "tope_alcance": "compartido", "grupo_tope_id": "g1",
  "monto_minimo": 0, "jurisdiccion": "caba", "canal": "ambos", "acumulable": false,
  "fragmentos_fuente": {"porcentaje": "20% de reintegro", "tope": null}}') $$, 'promoción completa con todos los campos del tipo Promocion');

-- ----- Promociones: lo que se rechaza -----
select throws_ok($$ select pg_temp.promo('{"banco_id": null}') $$, '23502', null, 'sin banco_id');
select throws_ok($$ select pg_temp.promo('{"categoria_id": null}') $$, '23502', null, 'sin categoria_id');
select throws_ok($$ select pg_temp.promo('{"porcentaje": null}') $$, '23502', null, 'sin porcentaje');
select throws_ok($$ select pg_temp.promo('{"vigencia_desde": null}') $$, '23502', null, 'sin vigencia_desde');
select throws_ok($$ select pg_temp.promo('{"vigencia_hasta": null}') $$, '23502', null, 'sin vigencia_hasta');
select throws_ok($$ select pg_temp.promo('{"debito_redes": [], "credito_redes": []}') $$, '23514', null, 'sin ninguna red en débito ni crédito');
select throws_ok($$ select pg_temp.promo('{"banco_id": "00000000-0000-4000-8000-0000000000ff"}') $$, '23503', null, 'banco inexistente');
select throws_ok($$ select pg_temp.promo('{"categoria_id": 999}') $$, '23503', null, 'categoría inexistente');
select throws_ok($$ select pg_temp.promo('{"porcentaje": 101}') $$, '23514', null, 'porcentaje mayor a 100');
select throws_ok($$ select pg_temp.promo('{"porcentaje": -1}') $$, '23514', null, 'porcentaje negativo');
select throws_ok($$ select pg_temp.promo('{"vigencia_desde": "2026-12-01"}') $$, '23514', null, 'vigencia con hasta anterior a desde');
select throws_ok($$ select pg_temp.promo('{"dias": []}') $$, '23514', null, 'dias vacía');
select throws_ok($$ select pg_temp.promo('{"dias": ["lun", "lun"]}') $$, '23514', null, 'dias con repetidos');
select throws_ok($$ select pg_temp.promo('{"dias": ["lunes"]}') $$, '23514', null, 'dia fuera de lun..dom');
select throws_ok($$ select pg_temp.promo('{"debito_redes": ["visa", "visa"]}') $$, '23514', null, 'redes repetidas');
select throws_ok($$ select pg_temp.promo('{"credito_redes": ["amex"]}') $$, '23514', null, 'red fuera de las 9 de MODO');
select throws_ok($$ select pg_temp.promo('{"titulo": "  "}') $$, '23514', null, 'título vacío');
select throws_ok($$ select pg_temp.promo('{"tope_monto": 0}') $$, '23514', null, 'tope_monto en cero');
select throws_ok($$ select pg_temp.promo('{"monto_minimo": -5}') $$, '23514', null, 'monto_minimo negativo');
select throws_ok($$ select pg_temp.promo('{"tope_periodo": "anual"}') $$, '23514', null, 'periodo de tope inválido');
select throws_ok($$ select pg_temp.promo('{"tope_alcance": "x"}') $$, '23514', null, 'alcance de tope inválido');
select throws_ok($$ select pg_temp.promo('{"jurisdiccion": "mendoza"}') $$, '23514', null, 'jurisdicción inválida');
select throws_ok($$ select pg_temp.promo('{"canal": "telefono"}') $$, '23514', null, 'canal inválido');
select throws_ok($$ select pg_temp.promo('{"fuente": "otra"}') $$, '23514', null, 'fuente inválida');
select throws_ok($$ select pg_temp.promo('{"fuente": "modo", "captura_cruda_id": "c1000000-0000-4000-8000-000000000001"}') $$, '23514', null, 'fuente modo sin fuente_id');
select throws_ok($$ select pg_temp.promo('{"fuente": "modo", "fuente_id": "m2"}') $$, '23514', null, 'fuente modo sin captura cruda');
select throws_ok($$ select pg_temp.promo('{"fragmentos_fuente": ["x"]}') $$, '23514', null, 'fragmentos_fuente que no es un objeto');
select throws_ok($$ select pg_temp.promo('{"fuente": "modo", "fuente_id": "m1", "captura_cruda_id": "c1000000-0000-4000-8000-000000000001"}') $$, '23505', null, 'misma promo de MODO duplicada (fuente, fuente_id)');
select throws_ok($$ delete from public.capturas_crudas where id = 'c1000000-0000-4000-8000-000000000001' $$, '23503', null, 'no se borra una captura referenciada por una promoción');

-- ----- Medios de pago -----
insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa');
select throws_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'prepago', 'visa') $$, '23514', null, 'tipo de tarjeta inválido');
select throws_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'amex') $$, '23514', null, 'red inválida');
select throws_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa') $$, '23505', null, 'medio de pago duplicado para el mismo usuario');
select lives_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa') $$, 'el mismo medio sí puede tenerlo otro usuario');
select throws_ok($$ insert into public.medios_de_pago (user_id, banco_id, tipo, red) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000ff', 'debito', 'visa') $$, '23503', null, 'medio de pago con banco inexistente');

-- ----- Comercios habituales -----
insert into public.comercios_habituales (user_id, nombre) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Coto');
select throws_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ' coto ') $$, '23505', null, 'comercio repetido con otra capitalización y espacios');
select throws_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'COTO  ') $$, '23505', null, 'comercio repetido en mayúsculas');
select lives_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Coto') $$, 'el mismo comercio sí puede tenerlo otro usuario');
select throws_ok($$ insert into public.comercios_habituales (user_id, nombre) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '   ') $$, '23514', null, 'comercio vacío');

-- ----- Compras -----
select lives_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 100, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'ticket') $$,
  'compra con solo los campos obligatorios (categoría, promoción, descuento, reintegro, acreditación y texto en null)');
select lives_ok($$ insert into public.compras (user_id, fecha, monto, comercio, categoria_id, medio_de_pago_id, promocion_id, descuento_obtenido, reintegro_esperado, fecha_acreditacion_estimada, origen, texto_extraido)
  select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 100, 'Coto', 1, 'a1000000-0000-4000-8000-000000000001', id, 20, 20, '2026-12-01', 'excepcion', 'TICKET 123' from public.promociones limit 1 $$,
  'compra con todos los campos del tipo Compra');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 100, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'web') $$, '23514', null, 'origen inválido');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 0, 'Coto', 'a1000000-0000-4000-8000-000000000001', 'manual') $$, '23514', null, 'monto en cero');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 10, '', 'a1000000-0000-4000-8000-000000000001', 'manual') $$, '23514', null, 'comercio vacío');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen, descuento_obtenido) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 10, 'X', 'a1000000-0000-4000-8000-000000000001', 'manual', -1) $$, '23514', null, 'descuento negativo');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, 10, 'X', 'a1000000-0000-4000-8000-000000000001', 'manual') $$, '23502', null, 'compra sin fecha');
select throws_ok($$ insert into public.compras (user_id, fecha, monto, comercio, categoria_id, medio_de_pago_id, origen) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-11-01', 10, 'X', 999, 'a1000000-0000-4000-8000-000000000001', 'manual') $$, '23503', null, 'compra con categoría inexistente');
select throws_ok($$ delete from public.promociones where id in (select promocion_id from public.compras where promocion_id is not null) $$, '23503', null, 'no se borra una promoción con compras');

select * from finish();
rollback;
