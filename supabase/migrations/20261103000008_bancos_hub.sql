-- Datos de MODO que usa el buscador de bancos de la app (spec 001, US3): si el banco figura en el
-- hub de MODO (se muestra primero) y la URL de su logo. Nullables: `null` = la ingesta todavía no
-- lo informó, nunca un valor inventado. Los permisos y la policy de lectura de `bancos` no cambian.
-- La columna se llama `logo_url` y no `imagen`: el test de estructura prohíbe ese nombre (RNF-06).

alter table public.bancos
  add column on_hub_list boolean,
  add column logo_url text check (logo_url is null or btrim(logo_url) <> '');
