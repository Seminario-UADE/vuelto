# ADR-013: Las migraciones no se aplican solas a la base alojada; el CI avisa cuando quedó atrás

Estado: **propuesto** (14/11/2026). Entra en vigencia cuando el Product Owner
apruebe el PR que lo introduce.

## Context

Issue #127. Al mergear #107, #117, #118 y #125, la base alojada tenía aplicadas
solo las migraciones hasta `20261101000007` y la app pedía `bancos.on_hub_list`,
que crea `20261103000008_bancos_hub`. Postgres devolvió «columna inexistente» y
la app lo mostró como «No pudimos guardar el cambio». Había cuatro migraciones
sin aplicar, entre el 3 y el 10/11; se aplicaron a mano con
`supabase db push --linked`.

Nada las aplica al mergear. El job `supabase-rls` del CI las prueba contra una
base **local**, así que da verde aunque la alojada esté atrasada.

## Decision

- **No se aplican migraciones automáticamente en cada merge.** Las aplica una
  persona, con `supabase db push --linked`, y el PR que trae una migración lo
  recuerda con una casilla en la plantilla (`.github/pull_request_template.md`).
- **Un workflow de solo lectura avisa si la base alojada quedó atrás**
  (`.github/workflows/migraciones.yml`): lista las migraciones del repo y de la
  base alojada (`supabase migration list --db-url`) y falla si el repo trae
  alguna que la base no tiene. Corre al mergear cambios de
  `supabase/migrations/` a `main`, una vez por día y a mano. **No corre en
  `pull_request`**: un PR con una migración nueva fallaría siempre, y un
  workflow que edita quien abre el PR no debe poder leer el secret.
- El secret es uno solo, `SUPABASE_DB_URL` (la cadena de conexión del proyecto),
  cargado desde la web de GitHub. No se usa `SUPABASE_ACCESS_TOKEN`: es de toda
  la cuenta, con permisos de gestión sobre todos los proyectos.
- La app distingue «el servidor no está al día» de «sin conexión» y de un
  error cualquiera (`servidor_desactualizado` en `apps/mobile/src/perfil/modelo.ts`),
  para que el próximo desfasaje se diagnostique de un vistazo.

## Rationale

- **Aplicar en el merge toca producción sin mirar.** Una migración mala rompe la
  app en vivo, no hay base de staging para probarla antes y, durante el
  cuatrimestre, un cambio de esquema sorpresa antes del pitch es el riesgo que
  conviene evitar. Además exigiría en el CI una credencial con permiso de
  escritura sobre la base.
- **El chequeo vuelve ruidoso lo que antes era silencioso**, que era el problema
  real: nadie se enteraba de que faltaba aplicar. Sigue dependiendo de una
  persona, pero ahora GitHub avisa por mail el mismo día del merge.
- **Solo lectura:** `migration list` no modifica nada. La cadena de conexión
  incluye la contraseña de la base, que puede todo: por eso vive solo en este
  workflow y no se dispara con código de PRs.

## Consequences

- Después de mergear un PR con migraciones hay un paso manual (aplicarlas) y
  el workflow queda en rojo hasta que se haga. Es la señal buscada.
- Si el secret no está cargado, el workflow falla con un mensaje que lo dice.
- El workflow no frena `deploy-web`: la web puede publicarse antes de que se
  apliquen las migraciones. Si pasa a ser un problema, se hace que el deploy
  espere a este chequeo.
- **Cuándo revisar la decisión:** si se suma una base de staging o si aplicar a
  mano se olvida igual, aplicar en el merge pasa a ser razonable (con un
  `environment` de GitHub que pida aprobación).
