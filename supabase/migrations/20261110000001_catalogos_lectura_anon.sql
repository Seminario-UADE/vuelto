-- Lectura sin cuenta de los catálogos y las promociones (issue #112, spec 012 FR-032).
-- Con la cuenta al final del onboarding, la app tiene que poder elegir medios y dar la primera
-- respuesta antes de que exista un usuario. Bancos, categorías y promociones son datos públicos
-- de MODO, sin datos de usuarios. Solo lectura: la escritura sigue siendo de la service role, y
-- ninguna tabla con datos de usuarios cambia sus permisos.
--
-- Las promociones se leen todas, igual que con cuenta, y no solo las vigentes: al entrar a una
-- cuenta, la sincronización sigue desde la marca que dejó la lectura sin cuenta, y las promos
-- vencidas en el período (que las compras del mes pueden haber usado) no llegarían nunca, con
-- el tope subestimado. La vigencia la filtra la app, como hasta ahora.

grant select on table public.bancos, public.categorias, public.promociones to anon;

create policy bancos_select_anon on public.bancos
  for select to anon using (true);

create policy categorias_select_anon on public.categorias
  for select to anon using (true);

create policy promociones_select_anon on public.promociones
  for select to anon using (true);
