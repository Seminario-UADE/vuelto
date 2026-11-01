# Research: Esquema inicial de Supabase con RLS

## 1. Privilegios por defecto de Supabase

- **Decisión**: en cada migración, `revoke all on <tabla> from anon, authenticated` y luego `grant` explícito del mínimo.
- **Razón**: Supabase configura privilegios por defecto sobre `public` para `anon`, `authenticated` y `service_role`. Con RLS activa y sin policy para `anon` ya no ve filas, pero dejar el `grant` abierto hace que un olvido de policy exponga la tabla. Defensa en profundidad (FR-006).
- **Alternativas**: depender solo de RLS (más frágil); `alter default privileges` global (afecta a tablas de otras issues).

## 2. Impedir un medio de pago ajeno (FR-014)

- **Decisión**: FK compuesta `(user_id, medio_de_pago_id)` hacia `unique (user_id, id)` de `medios_de_pago`.
- **Razón**: una FK simple verifica la existencia de la fila referenciada sin aplicar RLS, así que A podría referenciar el medio de B si conoce el id. La FK compuesta lo hace imposible por estructura y no depende de una policy ni de un trigger.
- **Alternativas**: `with check (exists (select … from medios_de_pago …))` en la policy de compras (funciona, pero repite lógica y se puede olvidar); trigger (más código, más superficie).

## 3. Borrado de un medio con compras y borrado de cuenta

- **Decisión**: `NO ACTION` en la FK compuesta; `on delete cascade` desde `auth.users` hacia `medios_de_pago` y `compras`.
- **Razón**: `NO ACTION` se verifica al final de la sentencia, cuando el cascade ya borró las compras y los medios del usuario; borrar un medio suelto con compras falla. `RESTRICT` fallaría también al borrar la cuenta. Se prueba en pgTAP (FR-018 j).

## 4. Marca `actualizada_en`

- **Decisión**: trigger `before insert or update` con `clock_timestamp()`, que compara la fila nueva y la vieja como jsonb sin esa columna.
- **Razón**: `now()` devuelve la hora de inicio de la transacción; en un test pgTAP (una sola transacción) no se podría distinguir «avanzó». `clock_timestamp()` además acerca la marca al momento del commit. Evita que una re-escritura idéntica de la ingesta fuerce a la app a bajar todo el corpus (FR-007).
- **Límite conocido**: una transacción larga puede publicar una fila con hora anterior a una marca ya leída por la app. Lo resuelve la issue de sincronización con un margen de relectura (SC-006).
- **Alternativas**: extensión `moddatetime` (mueve la marca siempre, aun sin cambios); columna `xmin` (no es portable para el cliente).

## 5. Formato de las listas cerradas

- **Decisión**: `text` + `check` para `fuente`, `jurisdiccion`, `canal`, `periodo`, `alcance`, `origen`, `tipo`, `red`; `text[]` con `check (<@)` para días y redes.
- **Razón**: los enums de Postgres son difíciles de modificar en migraciones; una red nueva de MODO (ya ocurrió con las categorías) requiere solo cambiar un `check`. Los valores son los literales de `tipos.ts`.

## 6. Cómo probar RLS

- **Decisión**: pgTAP con `supabase test db`. Cada test crea usuarios en `auth.users`, usa `set local role authenticated` y `set local request.jwt.claims`.
- **Razón**: es la herramienta que trae la CLI, corre en SQL contra las policies reales y revierte todo con `rollback`. No hay secretos: los roles se simulan con claims locales.
- **Alternativas**: script TS con `supabase-js` y claves locales (requiere dependencia nueva, claves efímeras y más lento); `psql` a mano (no automatizable).

## 7. CI

- **Decisión**: job nuevo `supabase-rls` en `ci.yml` con `supabase start` (excluyendo studio, imgproxy, mailpit, realtime, storage, edge runtime, logflare, vector y pooler), dos `db reset` seguidos y `supabase test db`.
- **Razón**: FR-018 exige que la suite corra en CI. El runner de GitHub trae Docker; el costo es $0. Si el arranque fuera demasiado inestable, se enmienda FR-018 en lugar de pasar a un paso manual (Supuestos de la spec).
- **Validación**: los servicios a excluir se confirman localmente antes de fijarlos en el workflow.

## 8. Ids reales de MODO

- **Hallazgo**: en el repo solo aparece el id real de Galicia (`88d8705e-…`); `SANTANDER` en las fábricas de tests es un id inventado (`5b1c3a7e-0000-…`).
- **Decisión**: el seed carga Galicia y las 13 categorías; no se siembran bancos con ids inventados. Los tests crean bancos de prueba propios. El resto lo carga la ingesta con la service role. Anotado en el PR para que quien tenga acceso a la API de MODO cargue el catálogo.
