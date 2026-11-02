# Modelo de datos: esquema inicial

Esquema `public`. Todas las tablas con RLS activa. Nombres en `snake_case` y plural. «Nullable» corresponde a `| null` del tipo TS (`packages/motor/src/tipos.ts`).

## bancos
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | id del catálogo de MODO |
| nombre | text not null | `check (btrim(nombre) <> '')` |

## categorias
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | id numérico de MODO |
| nombre | text not null | no vacío |

## perfiles
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `references auth.users(id) on delete cascade` |
| nombre_para_mostrar | text | nullable; si no es null, no vacío |
| creado_en | timestamptz not null | default `now()` |

## medios_de_pago
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid not null | default `auth.uid()`, `references auth.users on delete cascade` |
| banco_id | uuid not null | `references bancos(id)` |
| tipo | text not null | `debito` \| `credito` |
| red | text not null | los 9 valores de `Red` |
| creado_en | timestamptz not null | |

Constraints: `unique (user_id, id)` (apoya la FK compuesta de `compras`); `unique (user_id, banco_id, tipo, red)` (FR-021). Índices: `banco_id`; el unique cubre `user_id`.

## comercios_habituales
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid not null | igual que arriba |
| nombre | text not null | no vacío |
| creado_en | timestamptz not null | |

Unicidad: índice único `(user_id, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')))`.

## capturas_crudas
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| origen | text not null | de dónde se capturó (URL o endpoint), no vacío |
| contenido | text not null | crudo de la captura |
| extraccion | jsonb | nullable; salida completa del extractor |
| capturada_en | timestamptz not null | default `now()` |

RLS activa y **sin policies** a propósito (comentario en la migración). Sin `grant` a `anon` ni `authenticated`.

## promociones
| Columna | Tipo | TS (`Promocion`) | Constraint |
|---|---|---|---|
| id | uuid PK | `id` | |
| fuente | text not null | `fuente` | `modo` \| `manual` |
| fuente_id | text | — | not null si `fuente = 'modo'`; `unique (fuente, fuente_id)` |
| titulo | text not null | `titulo` | no vacío |
| banco_id | uuid not null | `bancoId` | FK `bancos` |
| categoria_id | integer not null | `categoriaId` | FK `categorias` |
| comercio | text | `comercio` | nullable |
| porcentaje | numeric(5,2) not null | `porcentaje` | 0–100 |
| debito_redes | text[] not null | `tarjetas.debito` | default `{}`; ⊆ redes; sin repetidos |
| credito_redes | text[] not null | `tarjetas.credito` | ídem; al menos una de las dos no vacía |
| vigencia_desde | date not null | `vigencia.desde` | |
| vigencia_hasta | date not null | `vigencia.hasta` | `>= vigencia_desde` |
| dias | text[] | `vigencia.dias` | nullable; no vacía, sin repetidos, ⊆ días |
| tope_monto | numeric(14,2) | `tope.monto` | nullable; `> 0` |
| tope_periodo | text | `tope.periodo` | nullable; `mensual` \| `semanal` \| `por_compra` |
| tope_alcance | text | `tope.alcance` | nullable; `compartido` \| `exclusivo` |
| grupo_tope_id | text | `tope.grupoTopeId` | nullable |
| monto_minimo | numeric(14,2) | `montoMinimo` | nullable; `>= 0` |
| jurisdiccion | text | `jurisdiccion` | nullable; `nacional` \| `pba` \| `caba` \| `otra_provincia` |
| canal | text | `canal` | nullable; `presencial` \| `online` \| `ambos` |
| acumulable | boolean | `acumulable` | nullable |
| fragmentos_fuente | jsonb not null | (RNF-08) | default `{}`; `jsonb_typeof = 'object'` |
| captura_cruda_id | uuid | (RNF-08) | FK `capturas_crudas`, NO ACTION; not null si `fuente = 'modo'` |
| dada_de_baja_en | timestamptz | — | nullable |
| creada_en | timestamptz not null | — | default `now()` |
| actualizada_en | timestamptz not null | — | la fija el trigger |

Índices: `actualizada_en`, `banco_id`, `categoria_id`, `captura_cruda_id`. Trigger `before insert or update` (`set_actualizada_en`).

## compras
| Columna | Tipo | TS (`Compra`) | Constraint |
|---|---|---|---|
| id | uuid PK | `id` | |
| user_id | uuid not null | — | dueño |
| fecha | date not null | `fecha` | |
| monto | numeric(14,2) not null | `monto` | `> 0` |
| comercio | text not null | `comercio` | no vacío |
| categoria_id | integer | `categoriaId` | nullable; FK `categorias` |
| medio_de_pago_id | uuid not null | `medioDePagoId` | FK compuesta `(user_id, medio_de_pago_id)` |
| promocion_id | uuid | `promocionId` | nullable; FK `promociones`, NO ACTION |
| descuento_obtenido | numeric(14,2) | `descuentoObtenido` | nullable; `>= 0` |
| reintegro_esperado | numeric(14,2) | `reintegroEsperado` | nullable; `>= 0` |
| fecha_acreditacion_estimada | date | `fechaAcreditacionEstimada` | nullable |
| origen | text not null | `origen` | `ticket` \| `excepcion` \| `manual` |
| texto_extraido | text | `textoExtraido` | nullable. **No existe columna de imagen** |
| creada_en | timestamptz not null | — | default `now()` |

Índices: `(user_id, fecha desc)`, `(user_id, medio_de_pago_id)`, `categoria_id`, `promocion_id`.

## Matriz de acceso

| Tabla | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| perfiles, medios_de_pago, comercios_habituales, compras | nada | CRUD solo de sus filas | todo (salta RLS) |
| bancos, categorias, promociones | nada | `select` | todo |
| capturas_crudas | nada | nada | todo |

## Orden de dependencias entre migraciones

`catalogos` → `perfiles` → `medios_de_pago` (usa `bancos`) → `comercios_habituales` → `capturas_crudas` → `promociones` (usa catálogos y capturas) → `compras` (usa medios, categorías y promociones).
