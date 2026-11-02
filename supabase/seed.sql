-- Datos iniciales de las categorías (solo `supabase db reset`). Idempotente.
-- En el proyecto alojado el seed no corre: las categorías, los bancos y el corpus los carga,
-- con la service role, `node --env-file=supabase/.env ingesta/src/corpus/cargar.ts --aplicar`
-- (desde la raíz del repo; sin `--aplicar` solo muestra qué haría).

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

-- Los bancos (el catálogo completo de MODO, con sus ids reales) y las promociones
-- del corpus sembrado a mano no se escriben acá: los genera
-- `npm run corpus:generar -w ingesta` en `seed/bancos.sql` y `seed/promociones.sql`,
-- que `config.toml` carga a continuación (issue #35). No se inventan ids.
