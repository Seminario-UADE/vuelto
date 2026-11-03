-- Las promociones que publica la ingesta automática son consistentes (issue #35, ADR-011).
-- `supabase db reset` no siembra promociones: estas pruebas no escriben nada, solo miran lo
-- que haya. En una base recién reiniciada no hay promos y las que dependen de ellas pasan
-- (no hay filas que violen nada); contra una base con la ingesta corrida, controlan lo publicado.
begin;
select no_plan();

-- Catálogo de bancos: el de MODO completo, con sus ids reales.
select cmp_ok((select count(*)::int from public.bancos), '>=', 82, 'el catálogo de bancos de MODO está cargado (82 entradas al 2026-11-02)');
select is((select count(*)::int from public.bancos where btrim(nombre) = ''), 0, 'ningún banco tiene el nombre vacío');

-- Trazabilidad: toda promo de MODO tiene su clave natural y su captura cruda.
select is((select count(*)::int from public.promociones where fuente = 'modo' and captura_cruda_id is null), 0, 'ninguna promo de MODO sin su captura');
select is((select count(*)::int from public.promociones where fuente = 'modo' and fuente_id is null), 0, 'toda promo de MODO tiene fuente_id (la clave natural)');
select is(
  (select count(*)::int from (select fuente_id from public.promociones where fuente = 'modo' group by fuente_id having count(*) > 1) d),
  0,
  'ningún fuente_id de MODO se repite'
);

-- Integridad: cada promo apunta a un banco y una categoría que existen.
select is((select count(*)::int from public.promociones p left join public.bancos b on b.id = p.banco_id where b.id is null), 0, 'todo banco_id existe en bancos');
select is((select count(*)::int from public.promociones p left join public.categorias c on c.id = p.categoria_id where c.id is null), 0, 'todo categoria_id existe en categorias');

-- Lo publicado entra al alcance del MVP y es lo que el motor espera.
select is((select count(*)::int from public.promociones where fuente = 'modo' and jurisdiccion = 'otra_provincia'), 0, 'no hay promos de otra provincia');
select is((select count(*)::int from public.promociones where fuente = 'modo' and tope_monto is not null and tope_periodo is null), 0, 'un tope con monto siempre tiene período (el motor usaría mensual en silencio)');
select is((select count(*)::int from public.promociones where fuente = 'modo' and (tope_alcance = 'compartido') <> (grupo_tope_id is not null)), 0, 'compartido y grupo_tope_id van juntos');

-- Los campos que no vienen estructurados traen de dónde salieron.
select is((select count(*)::int from public.promociones where fuente = 'modo' and jsonb_typeof(fragmentos_fuente) <> 'object'), 0, 'fragmentos_fuente es siempre un objeto');
select is((select count(*)::int from public.promociones where fuente = 'modo' and acumulable is not null and coalesce(fragmentos_fuente ->> 'acumulable', '') = ''), 0, 'acumulable no nulo trae su fragmento');
select is((select count(*)::int from public.promociones where fuente = 'modo' and jurisdiccion is not null and coalesce(fragmentos_fuente ->> 'jurisdiccion', '') = ''), 0, 'jurisdiccion no nula trae su fragmento');
select is((select count(*)::int from public.promociones where fuente = 'modo' and tope_alcance is not null and coalesce(fragmentos_fuente ->> 'tope.alcance', '') = ''), 0, 'tope.alcance no nulo trae su fuente');

-- Las capturas crudas no las ve la app: RLS activa y sin policies (solo la service role de la ingesta).
select ok((select relrowsecurity from pg_class where oid = 'public.capturas_crudas'::regclass), 'capturas_crudas tiene RLS activa');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'capturas_crudas'), 0, 'capturas_crudas no tiene policies para la app');

select * from finish();
rollback;
