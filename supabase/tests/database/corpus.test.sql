-- El corpus sembrado a mano quedó cargado y es consistente (issue #35, spec 011).
-- `supabase db reset` carga seed.sql, seed/bancos.sql y seed/promociones.sql; estas
-- pruebas no escriben nada, solo miran lo que quedó. Si el corpus está vacío, las que
-- dependen de que haya promos pasan (no hay filas que violen nada).
begin;
select no_plan();

-- Catálogo de bancos: el de MODO completo, con sus ids reales.
select cmp_ok((select count(*)::int from public.bancos), '>=', 82, 'el catálogo de bancos de MODO está cargado (82 entradas al 2026-11-02)');
select is((select count(*)::int from public.bancos where btrim(nombre) = ''), 0, 'ningún banco tiene el nombre vacío');

-- Corpus: lo sembrado a mano es fuente = 'manual' y se identifica por su clave natural.
select is((select count(*)::int from public.promociones where fuente = 'modo' and captura_cruda_id is null), 0, 'ninguna promo de MODO sin su captura');
select is((select count(*)::int from public.promociones where fuente = 'manual' and fuente_id is null), 0, 'toda promo manual del corpus tiene fuente_id (la clave natural)');
select is(
  (select count(*)::int from (select fuente_id from public.promociones where fuente = 'manual' group by fuente_id having count(*) > 1) d),
  0,
  'ningún fuente_id manual se repite'
);

-- Integridad: cada promo apunta a un banco y una categoría que existen.
select is((select count(*)::int from public.promociones p left join public.bancos b on b.id = p.banco_id where b.id is null), 0, 'todo banco_id existe en bancos');
select is((select count(*)::int from public.promociones p left join public.categorias c on c.id = p.categoria_id where c.id is null), 0, 'todo categoria_id existe en categorias');

-- Lo sembrado entra al alcance del MVP y es lo que el motor espera.
select is((select count(*)::int from public.promociones where fuente = 'manual' and jurisdiccion = 'otra_provincia'), 0, 'el corpus no trae promos de otra provincia');
select is((select count(*)::int from public.promociones where fuente = 'manual' and tope_monto is not null and tope_periodo is null), 0, 'un tope con monto siempre tiene período (el motor usaría mensual en silencio)');
select is((select count(*)::int from public.promociones where fuente = 'manual' and (tope_alcance = 'compartido') <> (grupo_tope_id is not null)), 0, 'compartido y grupo_tope_id van juntos');
select is((select count(*)::int from public.promociones where fuente = 'manual' and dada_de_baja_en is not null), 0, 'el reinicio no deja promos manuales dadas de baja');

-- La trazabilidad: los fragmentos fuente son un objeto { campo: texto | null }, y los campos
-- que solo salen de la letra chica traen su fragmento.
select is((select count(*)::int from public.promociones where fuente = 'manual' and jsonb_typeof(fragmentos_fuente) <> 'object'), 0, 'fragmentos_fuente es siempre un objeto');
select is((select count(*)::int from public.promociones where fuente = 'manual' and acumulable is not null and coalesce(fragmentos_fuente ->> 'acumulable', '') = ''), 0, 'acumulable no nulo trae su fragmento');
select is((select count(*)::int from public.promociones where fuente = 'manual' and jurisdiccion is not null and coalesce(fragmentos_fuente ->> 'jurisdiccion', '') = ''), 0, 'jurisdiccion no nula trae su fragmento');
select is((select count(*)::int from public.promociones where fuente = 'manual' and tope_alcance is not null and coalesce(fragmentos_fuente ->> 'tope.alcance', '') = ''), 0, 'tope.alcance no nulo trae su fragmento');

select * from finish();
rollback;
