# Research: Gasto en grupo (spec 016)

Decisiones técnicas que el plan toma para cumplir la spec. Cada una: decisión, por qué y qué se descartó. Lo verificado en el repo o en la base local se marca como **verificado**; lo que hay que confirmar al implementar, como **a confirmar**.

## R1. Clave de servidor para los datos de contactos (D8, FR-018)

- **Decisión**: la función `contactos_privado.datos_de_contactos` recibe `p_clave text` y la compara con un secreto de Supabase Vault (`vault.decrypted_secrets`, nombre `recomendar_grupo_clave`). Si no coincide, o si el secreto no está cargado, lanza `insufficient_privilege` (`42501`) antes de leer nada. La Edge Function lee la clave de la variable de entorno `GRUPO_CLAVE_SERVIDOR`. El envoltorio de `public` sigue existiendo (PostgREST solo expone `public`), pero sin la clave no sirve.
- **Por qué**: cierra el camino que encontró `spec-critic` (B1): con el JWT del usuario, la app podía llamar la misma RPC que la Edge Function. La clave no es la service role key (RNF-05 sigue intacto) ni una key de extractor (constitución §IV). Vault ya viene en el stack de Supabase: **verificado** que `supabase_vault` está instalado en la base local (`pg_extension`).
- **Configuración**: en local, los tests pgTAP crean el secreto dentro de su transacción (`vault.create_secret`) y lo revierten. La Edge Function local lee `GRUPO_CLAVE_SERVIDOR` de `supabase/functions/.env` (no se commitea; hay un `.env.example`). En el proyecto alojado se carga a mano una vez: el secreto en Vault (SQL editor) y el mismo valor con `supabase secrets set`. Va documentado en `docs/architecture/04-infrastructure.md` y en el quickstart.
- **Descartado**: (a) conectar la Edge Function directo a Postgres con un rol propio: suma un driver y un secreto de conexión, y aísla poco más que la clave. (b) `SUPABASE_DB_URL` de la Edge Function: es una conexión con todos los permisos, equivalente a la llave maestra. (c) Un header leído con `current_setting('request.headers')`: es la misma clave por otro canal, y más difícil de testear en pgTAP.

## R2. Dónde viven las funciones con permisos elevados (D6, FR-017)

- **Decisión**: schema nuevo `contactos_privado`, con `usage` para `authenticated` y nada para `anon` ni `public`. Ahí viven las funciones `security definer` con `set search_path = ''`: `crear_invitacion`, `ver_invitacion`, `aceptar_invitacion`, `mis_contactos` y `datos_de_contactos`. A cada una se le revoca `execute` de `public` y `anon`, y se le da a `authenticated`. En `public`, un envoltorio `security invoker` en SQL por cada una, con el mismo nombre, que solo delega. `quitar_contacto` no necesita permisos elevados: es una función `security invoker` en `public` que borra con el RLS de `contactos`.
- **Por qué**: es la opción A de la revisión. `supabase/tests/database/estructura.test.sql:30-33` («ninguna función security definer en public») sigue pasando sin cambios. **Verificado**: `config.toml:13` expone solo `public` y `graphql_public`, así que el cliente no llega a `contactos_privado` sin el envoltorio. El schema `private` existente queda cerrado (`revoke all … from authenticated`): por eso hace falta uno propio.
- **Descartado**: exponer el schema en `api.schemas` (habría que tocar a mano el proyecto alojado, con riesgo de que local y producción diverjan), y aflojar el test de estructura.

## R3. `crear_invitacion` con permisos elevados y no como RPC con permisos normales (D7)

- **Decisión**: `crear_invitacion()` es `security definer`. Borra las invitaciones sin usar de quien la llama (FR-011: como mucho una vigente), genera el token (`gen_random_bytes(18)` en base64url: 24 caracteres), guarda solo `sha256(token)` y devuelve `{token, vence_en}`. Si quien llama no tiene nombre para mostrar, lanza un error con hint `sin_nombre`. `authenticated` solo tiene `select` sobre `invitaciones` (sus propias filas, por RLS); no puede insertar ni modificar directo.
- **Por qué**: si el cliente pudiera insertar, elegiría `vence_en` o crearía invitaciones sin límite. Con todo adentro de la función, el vencimiento (24 h) y la unicidad los fija la base. Sigue sin ser una Edge Function: no hay secreto ni datos ajenos (D7). **Verificado**: `pgcrypto` está en el schema `extensions` de la base local.
- **Descartado**: un insert directo con privilegios por columna (`grant insert (token_hash)`): obliga a duplicar en el cliente la generación del token y el borrado de las anteriores.

## R4. Aceptar sin carreras (FR-014, US2-10, US2-11)

- **Decisión**: `aceptar_invitacion(p_token)` busca la invitación por hash con `for update` (serializa dos aceptaciones de la misma invitación), resuelve el estado en este orden: inexistente → vencida → usada → propia → sin nombre → ya contacto. Si es válida, inserta el par ordenado en `contactos` con `on conflict do nothing`. Solo si insertó marca `usada_en`; si chocó (invitaciones cruzadas aceptadas a la vez), devuelve `ya_contacto` y la invitación queda sin usar. Devuelve `{estado, contacto: {id, nombre} | null}`.
- **Por qué**: la clave primaria `(usuario_a, usuario_b)` con `check (usuario_a < usuario_b)` garantiza un solo vínculo por par sin importar el orden. `for update` resuelve la misma invitación; el `on conflict` resuelve las cruzadas.
- **`ver_invitacion(p_token)`**: misma resolución de estado, sin bloquear ni escribir. Devuelve `{estado, quien_invita, vence_en}`, con `quien_invita` nulo si es inexistente (FR-013).

## R5. Lista de contactos (FR-016, FR-019)

- **Decisión**: `mis_contactos()` (`security definer`, porque el nombre del otro está en `perfiles`, que su RLS no deja leer) devuelve `(id, nombre, vinculado_desde)` de los vínculos de `auth.uid()`. `quitar_contacto(p_contacto uuid)` borra el par con el RLS de `contactos` (policy `delete` para sus dos integrantes) y es idempotente.
- **Por qué**: no se abre ninguna policy de `perfiles` (ADR-008 §4). El nombre es lo único del perfil ajeno que se lee, y solo de los vínculos propios.

## R6. Qué devuelve `datos_de_contactos` (D4, FR-002, FR-023)

- **Decisión**: firma `(p_contactos uuid[], p_clave text, p_desde date, p_hasta date)`. Verifica la clave (R1), que `p_hasta - p_desde` esté entre 0 y 40 días, y que **todos** los ids estén vinculados con `auth.uid()`. Si alguno no lo está (o no existe), lanza `no_vinculado` sin devolver nada (misma respuesta en los dos casos, FR-023). Por contacto devuelve: `id`, `nombre`, `medios` (jsonb: `id`, `banco_id`, `tipo`, `red`, `banco_nombre`) y `consumos` (jsonb: `promocion_id`, `fecha`, `monto`, `descuento_obtenido`, solo de compras con `promocion_id` no nulo, entre `p_desde` y `p_hasta`). Sin comercio, medio de la compra, origen, texto ni id real.
- **Por qué**: el motor solo usa esos campos para los topes (**verificado** en `packages/motor/src/tope.ts`: `promocionId`, `fecha`, `id`, `descuentoObtenido` y `monto`). Una compra sin promoción no consume ningún tope, así que no hace falta leerla. El tope de 40 días acota el daño si la clave se filtrara. El nombre del banco viaja para nombrar el medio de quien paga en la respuesta (la app nombra los medios por banco, red y tipo, `apps/mobile/src/perfil/vista.ts`).
- **Identificador opaco**: lo arma la Edge Function (`c1`, `c2`, …, por contacto y en el orden de llegada) porque el motor lo necesita para `compraIds`. Nunca sale de la Edge Function.

## R7. Motor: consumo de topes y función de grupo (FR-001 a FR-010)

- **Decisión**:
  - Tipo nuevo `ConsumoDeTope { id, promocionId, fecha, monto, descuentoObtenido }`. `calcularSaldos`, `recomendar` y `estimarTopes` pasan a aceptar `readonly ConsumoDeTope[]`. `Compra` lo cumple estructuralmente, así que la app y `recomendar` no cambian (FR-003: una sola función de consumo).
  - `recomendarGrupo(compra, integrantes, promociones, ahora)` en `packages/motor/src/grupo.ts`. Por cada integrante con cuenta llama a `recomendar()` con sus medios y sus consumos; sin medios, queda sin reintegro (no llama, así evita `PerfilSinMediosError`, FR-009). Calcula el reintegro mostrado (al peso, o en escalones de $100 si no es quien pide), la base (FR-008), qué da la promo (`textoPromo(promo, false, false)`: nunca la variante sin saldo ni el motivo con el tope), elige con el desempate de FR-004 y divide con `dividir()` (FR-006).
  - `dividir(total, claves)` en `packages/motor/src/division.ts`, exportada y testeada sola.
  - Error propio `GrupoInvalidoError` con un campo `motivo` (FR-010), en `errores.ts`. Es la segunda clase del motor; se justifica igual que `PerfilSinMediosError` (ADR-009: no es un dato del dominio).
  - Base de grupo: se toma la promo principal de la opción (la primera de `opcion.promociones`, que el motor ya ordena). `topeRestanteTrasCompra === null` → `tope_por_compra` si `tope.periodo === "por_compra"`, si no `sin_tope_informado`; con saldo → `con_compras` (con la cantidad y el período, para quien pide) o `sin_compras`.
- **Por qué**: reusar `recomendar()` cumple FR-003 sin duplicar reglas. Lo nuevo del grupo (redondeo, desempate, base, división) queda en funciones puras chicas, testeables una por una.
- **Redondeo**: en centavos enteros. Al peso: `Math.floor((c + 50) / 100)`. Escalón de $100: `Math.floor((c + 5000) / 10000) * 100`. Sin `Math.round` sobre flotantes, para que .50 suba siempre igual en Node y en Deno.
- **Descartado**: que el motor devuelva el `OpcionDePago` completo de cada contacto y la Edge Function lo filtre. Deja los textos con tope dentro del núcleo, a un descuido de salir (B2). El motor devuelve el `OpcionDePago` solo de quien pide.

## R8. Edge Function `recomendar-grupo` (ADR-009)

- **Decisión**: `supabase/functions/recomendar-grupo/` con `index.ts` (composition root), `handler.ts` (fábrica `crearHandlerRecomendarGrupo`), `servicio.ts` (`ServicioGrupo`), `respuesta.ts` (arma el JSON de la respuesta con la lista blanca de FR-021) y `deno.json`. Repositorios nuevos en `_shared/repositorios.ts`: `RepositorioContactos.datosDe(ids, desde, hasta)` y los existentes de medios, promociones, compras y categorías. Implementaciones en memoria en `_shared/memoria/` para los tests en Node; implementaciones reales en `_shared/supabase/`, sobre `@supabase/supabase-js`, chequeadas por `deno check` (las importa `index.ts`) y excluidas de `tsc` y de la cobertura, igual que los `index.ts`.
- **Mapeo de filas**: `_shared/filas.ts`, funciones puras de fila → tipo del motor (promoción, medio, consumo), testeadas en Vitest. Repite la lógica de `apps/mobile/src/sync/mapeo.ts` para promociones, que vive en otro workspace y otro runtime. Es deuda conocida: se anota en el plan.
- **Cliente por pedido**: `createClient(url, anonKey, { global: { headers: { Authorization } } })` con el header del pedido, para que el RLS aplique a las lecturas propias (perfil, compras). La clave de servidor solo viaja en la llamada a `datos_de_contactos`.
- **Período y promos**: como `ServicioRecomendacion` (**verificado**, `supabase/functions/recomendar/servicio.ts`): `desde = min(inicio del mes, inicio de la semana)` de `fechaArgentina(ahora)`. Promos vigentes del rubro más `porIds` de las referenciadas por los consumos de todos los integrantes (M9).
- **Registros**: el handler registra solo el `name` del error, como `recomendar` (FR-034).
- **Descartado**: reusar `recomendar/servicio.ts`. Su forma de juntar datos se copia, pero el caso de uso es otro.

## R9. Contrato de errores de la Edge Function (FR-027)

| Código | Status | Cuándo | Acción en la app |
|---|---|---|---|
| `invalido` + `campo` | 400 | body mal formado, monto, rubro inexistente, repetidos, más de 12 | «No pudimos armar este grupo» → volver al paso de compra |
| `no_autenticado` | 401 | sin sesión válida | aviso de sesión existente |
| `contacto_no_vinculado` | 409 | algún id no vinculado o inexistente (misma respuesta) | «Alguien del grupo ya no es tu contacto» → «Volver a armar» y recargar la lista |
| `metodo_no_permitido` | 405 | no es POST | — |
| `interno` | 500 | cualquier otra falla, incluida una clave mal configurada | «No pudimos calcularlo» → «Reintentar» |

El timeout de 15 s lo pone la app (`AbortController`) y se trata como `interno`. `_shared/http.ts` suma `contacto_no_vinculado`.

## R10. App: datos, estado y pantallas

- **Repositorio de contactos** (`apps/mobile/src/grupo/repositorio.ts`): interfaz con `listar`, `crearInvitacion`, `verInvitacion`, `aceptarInvitacion`, `quitar` y `recomendarGrupo`; implementación Supabase (`.rpc(...)` y `functions.invoke('recomendar-grupo', { body, signal })`) e implementación en memoria para los tests. Reemplaza las funciones de grupo e invitaciones de `data/api.ts`. **Verificado**: `functions.invoke` de la versión instalada acepta `timeout` y `signal` (`@supabase/functions-js`, `FunctionInvokeOptions`); se usa `timeout: 15000`.
- **Slice `contactos`**: `{ cuentaId, lista, estado }`, con thunks `cargarContactos`, `quitarContacto` y `aceptarInvitacion`. Arranca vacío (G-02). Se persiste `{cuentaId, lista}` en su propia clave, `vuelto.contactos.v1` (como `vuelto.por-confirmar.v1`, para no tocar la forma de `vuelto.store.v1`); al rehidratar se descarta si `cuentaId` no es la sesión actual, y `sesionCerrada` o entrar otra cuenta la vacía y la borra (FR-019). El grupo en armado pasa a estado local de la navegación (params y un slice no persistido `grupo`), nunca a AsyncStorage.
- **Carga**: `useContactos()` dispara `cargarContactos` al entrar una cuenta, al volver a primer plano (`AppState`, como `use-sincronizacion.ts`) y al enfocar Contactos.
- **Pegar invitación**: pantalla `app/contactos/pegar.tsx`. `tokenDeInvitacion(texto)` (puro, testeado) acepta `vuelto://i/<t>`, el link de Expo Go `exp://…/--/i/<t>` y el token solo (`^[A-Za-z0-9_-]{24}$`); si no es válido, lo dice sin red. Con `expo-clipboard` (**verificado** en `apps/mobile/package.json`) ofrece «Pegar».
- **Link**: `Linking.createURL('i/' + token)` de `expo-linking` (**verificado**) da `vuelto://i/<t>` en un build y el link de Expo Go en desarrollo. `app.json` ya define `"scheme": "vuelto"`.
- **Pantallas**: `armar.tsx` sin grupo de ejemplo, exige comercio con rubro y hasta 12 integrantes. `resultado.tsx` sobre el contrato nuevo: filas por id y por posición, «pone», día evaluado y los errores de R9. En `comprar/recomendacion.tsx`, «¿Pagan entre varios?» solo si `categoriaId !== null`. `invitar.tsx`, `quitar.tsx` e `i/[token].tsx` con error y «Reintentar», el vencimiento real, el estado inexistente y `sin_nombre`.
- **Textos**: la vista de grupo (`apps/mobile/src/grupo/vista.ts`, pura y testeada) arma los textos con `lib/textos.ts` y `perfil/vista.ts`. La respuesta del servidor no trae textos armados de los contactos.
- **Se borran**: `data/grupo-simulado.ts`, `datosDeContactos`, `grupoDeEjemplo`, `invitacionPropia` y `contactos` de `fixtures.ts`, y los mocks de grupo de `data/api.ts`. El escenario de demo (`escenarioElegido`) deja de cargar contactos.

## R11. Pruebas

- **Motor**: Vitest primero, con los 18 escenarios de US1 y la propiedad de SC-001 (100 permutaciones con un PRNG con semilla fija, sin `Math.random`).
- **Base**: pgTAP nuevo, `supabase/tests/database/contactos.test.sql`: RLS de las dos tablas, `anon` sin permisos, estados de invitación, carrera simulada (dos `aceptar` sobre la misma invitación en la misma transacción y la cruzada), clave de servidor (con y sin, SC-005), no vinculado igual que inexistente, quitar. Las comprobaciones existentes de `estructura.test.sql` no se tocan.
- **Edge Function**: Vitest del handler (status y códigos), del servicio (con repositorios en memoria) y de `respuesta.ts`: un contacto con tope, restante y cantidad de compras conocidos, y una búsqueda recursiva de esos valores en todo el JSON (SC-008).
- **App**: Vitest de `tokenDeInvitacion`, la vista de grupo, el slice y los thunks (repositorio en memoria), y la persistencia por cuenta. La integración contra Supabase local (`test:integracion`) suma las RPC de contactos.
- **Base local compartida**: los contenedores de Supabase usan el `project_id` `vuelto`, compartido por todos los worktrees. **Verificado**: hoy hay una instancia corriendo con las 11 migraciones de `main`. `supabase db reset` desde esta rama la cambia para cualquier otra sesión que la use: se avisa antes de correrlo.
