-- FR-009 (specs/001-perfil-billeteras): la base no deja a un usuario sin medios de pago.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local');
insert into public.bancos (id, nombre) values ('00000000-0000-4000-8000-0000000000b1', 'Banco de prueba');
insert into public.perfiles (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'visa'),
  ('a1000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'debito', 'visa');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok($$ delete from public.medios_de_pago where id = 'a1000000-0000-4000-8000-000000000001' $$, 'con dos medios, se puede sacar uno');
select throws_ok($$ delete from public.medios_de_pago where id = 'a1000000-0000-4000-8000-000000000002' $$, 'VM001', null, 'el último medio no se saca');
select is((select count(*)::int from public.medios_de_pago), 1, 'el último medio sigue');

-- Sacar todos de una vez tampoco vale.
reset role;
insert into public.medios_de_pago (id, user_id, banco_id, tipo, red) values
  ('a1000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-0000000000b1', 'credito', 'master');
select throws_ok($$ delete from public.medios_de_pago where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, 'VM001', null, 'un DELETE que los saca a todos falla');
select lives_ok($$ delete from public.medios_de_pago where id = 'a1000000-0000-4000-8000-000000000003' $$, 'sacar uno de dos en un DELETE sí');

-- Borrar la cuenta baja en cascada y no se frena.
select lives_ok($$ delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$, 'borrar la cuenta borra sus medios');
select is((select count(*)::int from public.medios_de_pago where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'no quedó ninguno');

select * from finish();
rollback;
