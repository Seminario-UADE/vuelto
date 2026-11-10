-- FR-027 (specs/012-flujo-directo): el nombre para mostrar va de 1 a 40 caracteres, sin contar los
-- espacios de los costados. La app ya lo valida; acá lo garantiza la base.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local');
insert into public.perfiles (id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$ update public.perfiles set nombre_para_mostrar = repeat('a', 40) $$,
  'un nombre de 40 caracteres entra'
);
select throws_ok(
  $$ update public.perfiles set nombre_para_mostrar = repeat('a', 41) $$,
  '23514', null, 'un nombre de 41 caracteres se rechaza'
);
select lives_ok(
  $$ update public.perfiles set nombre_para_mostrar = '  ' || repeat('a', 40) || '  ' $$,
  'los espacios de los costados no cuentan'
);
select throws_ok(
  $$ update public.perfiles set nombre_para_mostrar = '   ' $$,
  '23514', null, 'un nombre de solo espacios se rechaza'
);
select lives_ok(
  $$ update public.perfiles set nombre_para_mostrar = null $$,
  'sin nombre (cuentas anteriores) sigue valiendo'
);
select lives_ok(
  $$ update public.perfiles set nombre_para_mostrar = 'Sofía' $$,
  'el dueño puede cambiar su nombre'
);
select is((select nombre_para_mostrar from public.perfiles), 'Sofía', 'quedó guardado');

select * from finish();
rollback;
