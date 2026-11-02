-- Revisión estructural del esquema (spec 007: FR-002, FR-006, FR-013, FR-023, SC-003, SC-005).
begin;
select no_plan();

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
$$, 'toda tabla de public tiene RLS activa');

select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'capturas_crudas'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
$$, 'toda tabla salvo capturas_crudas tiene al menos una policy');

select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'capturas_crudas'), 0,
  'capturas_crudas no tiene policies (solo la service role)');

select is_empty($$
  select table_name, column_name from information_schema.columns
  where table_schema = 'public'
    and (column_name ~* '(imagen|image|foto|photo|ticket_img)' or data_type = 'bytea')
$$, 'ninguna columna guarda la imagen de un ticket');

select has_column('public', 'compras', 'texto_extraido', 'compras guarda el texto extraído');
select col_is_null('public', 'compras', 'texto_extraido', 'texto_extraido es nullable');

select is_empty($$ select viewname from pg_views where schemaname = 'public' $$, 'no hay vistas en public (que salteen RLS)');

select is_empty($$
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
$$, 'ninguna función security definer en public');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
$$, 'anon no tiene privilegios sobre ninguna tabla de public');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
    and table_name = 'capturas_crudas'
$$, 'authenticated no tiene privilegios sobre capturas_crudas');

select is_empty($$
  select table_name, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
    and table_name in ('bancos', 'categorias', 'promociones') and privilege_type <> 'SELECT'
$$, 'authenticated solo puede leer catálogos y promociones');

-- Catálogos sembrados por supabase/seed.sql
select results_eq($$ select id, nombre from public.categorias where id <> 99 order by id $$, $$ values
  (1, 'Supermercados'), (2, 'Gastronomía'), (3, 'Indumentaria'),
  (4, 'Farmacias, Perfumerías y Peluquerías'), (5, 'Combustibles'), (6, 'Deportes'),
  (7, 'Hogar'), (8, 'Automóviles'), (10, 'Electro y Tecnología'),
  (11, 'Ferretería y Pinturerías'), (12, 'Mascotas'), (13, 'Jugueterías y Librerías'),
  (14, 'Entretenimiento') $$, 'categorias tiene las 13 de CATEGORIAS_MODO');
select ok(exists (select 1 from public.bancos where id = '88d8705e-2dda-46f9-8411-bb4916af858e'), 'bancos tiene a Galicia con su id real de MODO');

select * from finish();
rollback;
