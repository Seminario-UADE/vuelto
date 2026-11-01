-- Datos iniciales de los catálogos (solo `supabase db reset`). Idempotente.
-- En producción el catálogo completo lo siembra la ingesta con la service role.

-- Las 13 categorías de MODO (CATEGORIAS_MODO en packages/motor/src/categorias.ts).
insert into public.categorias (id, nombre) values
  (1, 'Supermercados'),
  (2, 'Gastronomía'),
  (3, 'Indumentaria'),
  (4, 'Farmacias, Perfumerías y Peluquerías'),
  (5, 'Combustibles'),
  (6, 'Deportes'),
  (7, 'Hogar'),
  (8, 'Automóviles'),
  (10, 'Electro y Tecnología'),
  (11, 'Ferretería y Pinturerías'),
  (12, 'Mascotas'),
  (13, 'Jugueterías y Librerías'),
  (14, 'Entretenimiento')
on conflict (id) do update set nombre = excluded.nombre;

-- Bancos: solo Galicia tiene su id real de MODO en el repo. El resto lo carga la
-- ingesta desde GET /promos/api/rewards/banks; no se inventan ids.
insert into public.bancos (id, nombre) values
  ('88d8705e-2dda-46f9-8411-bb4916af858e', 'Banco Galicia')
on conflict (id) do update set nombre = excluded.nombre;
