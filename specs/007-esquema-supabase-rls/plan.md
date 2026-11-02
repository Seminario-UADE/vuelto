# Implementation Plan: Esquema inicial de Supabase con RLS

**Branch**: `claude/supabase-rls-schema-922617` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-esquema-supabase-rls/spec.md` (issue #34)

## Summary

Se inicializa el proyecto de Supabase en `supabase/` y se crean 8 tablas en 7 migraciones SQL versionadas. Cada migración que crea una tabla activa RLS y define sus policies en el mismo archivo. Los roles de la app (`anon`, `authenticated`) arrancan sin privilegios y reciben solo los que cada tabla necesita; la service role escribe el corpus. Un trigger mantiene `promociones.actualizada_en` para la sincronización incremental (ADR-010 §4). Una clave foránea compuesta impide que una compra use el medio de pago de otro usuario. La verificación es una suite pgTAP (`supabase test db`) que corre en un job nuevo del CI sobre `supabase start`. No se agrega código TypeScript ni se toca la Edge Function `recomendar`.

## Technical Context

**Language/Version**: SQL (PostgreSQL 17 del stack local de Supabase CLI 2.x). Sin código TS nuevo.

**Primary Dependencies**: Supabase CLI (migraciones, `db reset`, `test db`); extensión pgTAP (viene con la imagen de Supabase). Cero dependencias npm nuevas.

**Storage**: Postgres (Supabase). Esquema `public`; referencia `auth.users`.

**Testing**: pgTAP en `supabase/tests/database/*.test.sql`, ejecutado con `supabase test db`. Corre dentro de una transacción con rollback, así que no depende de datos previos.

**Target Platform**: Supabase local (Docker) y CI de GitHub Actions (ubuntu-latest, Docker disponible).

**Project Type**: backend/infra de datos dentro del monorepo (workspace `supabase`).

**Performance Goals**: sin metas numéricas; sí índices en toda FK y columna de policy (FR-022) y un índice para `actualizada_en` (FR-007).

**Constraints**: costo $0 (tier gratuito); `supabase db reset` limpio e idempotente; ningún secreto en el repo; una migración por tabla con su RLS adentro.

**Scale/Scope**: corpus de cientos a pocos miles de promos; compras del orden de decenas por usuario por mes.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| I. Decisión, no listado | Cumple | Habilitador: guarda el corpus que el motor evalúa contra una compra concreta; no expone pantallas. |
| II. Motor determinístico | Cumple | No toca el motor ni agrega lógica de recomendación. |
| III. Esquema y `null` explícito | Cumple | `not null` solo donde el tipo TS no admite `null`; el fragmento fuente de cada campo se guarda en jsonb. |
| IV. Secretos y privacidad | Cumple | RLS en la misma migración; sin columna de imagen; la service role no aparece en el repo (los tests simulan roles). |
| V. Topes estimados | Cumple | Las decisiones de borrado (no borrar medio con compras, baja lógica de promos) protegen la base del tope. |
| VI. Test-first en el motor | No aplica | No hay lógica del motor; las tablas se prueban con pgTAP. |
| Costo $0 | Cumple | Supabase local y tier gratuito; el job de CI usa Docker del runner. |

Sin violaciones. Se vuelve a evaluar tras el diseño: sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/007-esquema-supabase-rls/
├── plan.md
├── research.md
├── data-model.md        # tablas, columnas, constraints y matriz de policies
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

Sin `contracts/`: el esquema no expone una interfaz externa propia; la matriz de acceso vive en `data-model.md`.

### Source Code (repository root)

```text
supabase/
├── config.toml                          # supabase init
├── seed.sql                             # categorias (13) + banco Galicia con su id real
├── migrations/
│   ├── 20261101000001_catalogos.sql           # bancos, categorias
│   ├── 20261101000002_perfiles.sql
│   ├── 20261101000003_medios_de_pago.sql
│   ├── 20261101000004_comercios_habituales.sql
│   ├── 20261101000005_capturas_crudas.sql
│   ├── 20261101000006_promociones.sql         # + función/trigger de actualizada_en
│   └── 20261101000007_compras.sql
├── tests/database/
│   ├── rls.test.sql                     # aislamiento, catálogos, anon, capturas, cambio de dueño, medio ajeno, borrar cuenta
│   ├── promociones.test.sql             # constraints del tipo Promocion y marca actualizada_en
│   └── estructura.test.sql              # RLS activa en todo public, policies, sin columna de imagen, sin vistas/security definer
├── functions/                           # intacto
└── package.json                         # intacto
.github/workflows/ci.yml                 # + job supabase-rls
docs/architecture/01-data-models.md      # se actualiza: ya hay migraciones
docs/bitacora-prompts.md                 # entrada de la sesión
```

**Structure Decision**: una migración por tabla (o par de catálogos) para que cada archivo muestre su RLS junto a su `create table` y la revisión automática sea trivial. `seed.sql` solo corre en `db reset`; en producción el catálogo completo lo siembra la ingesta.

## Decisiones de diseño clave

1. **Dueño**: `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade` en las 3 tablas de datos del usuario; `perfiles.id` es la propia clave y referencia `auth.users`.
2. **Policies**: una policy `for all to authenticated` por tabla de dueño, con `using` y `with check` iguales a `user_id = (select auth.uid())` (el `select` evita reevaluar por fila). El `with check` impide crear a nombre de otro y cambiar el dueño.
3. **Medio ajeno** (FR-014): `medios_de_pago` tiene `unique (user_id, id)` y `compras` una FK compuesta `(user_id, medio_de_pago_id) → medios_de_pago (user_id, id)`. Sin acción de borrado (NO ACTION): impide borrar un medio con compras, y al borrar la cuenta ambos cascades ocurren en la misma sentencia, que verifica la FK al final.
4. **Grants**: Supabase otorga todo por defecto a `anon` y `authenticated`. Cada migración hace `revoke all` a ambos y luego `grant` mínimo: CRUD en tablas de dueño, `select` en catálogos y `promociones`, nada en `capturas_crudas`. `anon` no recibe nada. La service role conserva sus privilegios por defecto (y salta RLS).
5. **`actualizada_en`**: trigger `before insert or update` con `clock_timestamp()` (no `now()`, que es la hora de inicio de la transacción y no distingue pasos dentro de un test). En el insert fuerza la hora. En el update compara `to_jsonb(new)` contra `to_jsonb(old)` sin esa columna: si cambió algo, la fuerza; si no, restituye el valor viejo. La función es `security invoker` con `search_path` vacío.
6. **Comercios**: índice único sobre `(user_id, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')))`.
7. **Promociones**: campos de `Promocion` como columnas planas (`tope_*`, `vigencia_*`, `debito_redes`/`credito_redes` como `text[]` con `check` de pertenencia y sin repetidos); `fragmentos_fuente jsonb`; `captura_cruda_id` con NO ACTION y `check` que lo exige para `fuente = 'modo'`; `unique (fuente, fuente_id)`; `dada_de_baja_en`. `numeric(14,2)` para montos y `numeric(5,2)` para el porcentaje.
8. **CI**: job `supabase-rls` con `supabase/setup-cli`, `supabase start` sin servicios innecesarios, `supabase db reset` dos veces y `supabase test db`.
9. **Seed de bancos**: el único id real de MODO presente en el repo es Galicia (`88d8705e-2dda-46f9-8411-bb4916af858e`). El seed lo carga con su nombre; los demás bancos los siembra la ingesta (consulta `GET /promos/api/rewards/banks`). Las pruebas crean sus propios bancos dentro de la transacción. Se documenta como supuesto; no se inventan ids.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
