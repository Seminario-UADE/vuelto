-- Datos iniciales de las categorías (solo `supabase db reset`). Idempotente.
-- En el proyecto alojado el seed no corre: las categorías, los bancos y las promociones
-- los publica todos los días la ingesta automática (`.github/workflows/ingesta.yml`, ADR-011).

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

-- Los bancos (el catálogo completo de MODO, con sus ids reales) están en `seed/bancos.sql`,
-- que `config.toml` carga a continuación. Las promociones no se siembran: en una base local
-- se cargan corriendo la ingesta contra ella (ver `ingesta/src/corpus/ingestar.ts`).
