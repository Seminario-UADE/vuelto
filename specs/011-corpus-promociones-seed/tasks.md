---

description: "Tareas para el corpus de promociones sembrado a mano desde MODO (issue #35, Supermercados y Farmacias)"
---

# Tasks: Corpus de promociones sembrado a mano desde MODO (Supermercados y Farmacias)

**Input**: `specs/011-corpus-promociones-seed/` (spec.md, plan.md, research.md, data-model.md, contracts/corpus.md, quickstart.md, critica.md)

**Tests**: obligatorios para el validador, los ids, la traducción de banco, el mapeo, el relevamiento, el generador y la carga remota (constitución §VI, SC-001 a SC-005). Cada test se escribe **antes** del código que prueba y la suite corre sin red: `fetch` y el cliente de Supabase se inyectan.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar).
- **[Story]**: US1 (demo con promos reales y la ingesta apagada), US2 (fiel a la fuente y revisada por una persona), US3 (banco correcto del catálogo), US4 (cobertura de los casos del motor), US5 (fixtures del motor), US6 (cadenas de supermercado reales).
- **[JOAQUÍN]**: necesita su confirmación o un cambio en algo suyo (convenciones J1 a J7 de `plan.md`).
- **[HUMANO]**: lo hace una persona, no el asistente: revisar la letra chica de cada promo (el corpus es la verdad de #53) o usar la service role.
- **[RED]**: pega a la API pública de MODO (User-Agent `VueltoBot (UADE)`, pausa ≥ 1 s).
- El código vive en `ingesta/src/corpus/` salvo que se indique otra ruta. Los `.ts` se importan con extensión `.ts`, como en el motor.

## Orden de las fases

Las historias P1 se ordenan por dependencia, no por número: **US3** (banco) y los cimientos van primero porque el mapeo, la revisión y la carga los necesitan; después **US2** (relevar, mapear, revisar) y **US1** (generar y cargar). **US4**, **US5** y **US6** son P2.

---

## Phase 1: Setup — el workspace `ingesta/`

- [X] T001 Completar `ingesta/package.json` (hoy solo nombre, versión y `private`): `"type": "module"`, `engines.node >=22.13`, scripts `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run --coverage`), `corpus:relevar`, `corpus:borrador`, `corpus:generar`, `corpus:cargar` (cada uno `node src/corpus/<nombre>.ts`); `dependencies`: `@vuelto/motor` (workspace) y `@supabase/supabase-js` (fijar la versión al instalar); `devDependencies`: `vitest ~5.0.4`, `@vitest/coverage-v8 ~5.0.4`, `typescript ^6.0.3`, mismas versiones que `packages/motor/package.json`.
- [X] T002 [P] Crear `ingesta/tsconfig.json` (extiende `../tsconfig.base.json`, `noEmit`, `allowImportingTsExtensions`, `include: ["src"]`, `paths` de `@vuelto/motor` a `../packages/motor/src/index.ts`, igual que `supabase/tsconfig.json`) y `ingesta/vitest.config.ts` (alias de `@vuelto/motor` al código fuente del motor, cobertura `v8` de `src/**/*.ts` sin `*.test.ts` ni `src/corpus/test/**`, umbral `lines: 90`, igual que `supabase/vitest.config.ts`).
- [X] T003 `npm install` en la raíz para actualizar `package-lock.json`; agregar un test de humo `ingesta/src/corpus/humo.test.ts` que importe `normalizar` y `CATEGORIAS_MODO` de `@vuelto/motor` y compruebe que `CATEGORIAS_MODO` tiene 13 categorías; confirmar que `npm run lint`, `npm run typecheck` y `npm run test` pasan en la raíz y que el job de CI los corre para `ingesta` (los scripts usan `--workspaces --if-present`).
- [X] T004 [P] Verificar que Node con la versión de `.nvmrc` (22) ejecuta un `.ts` con imports de extensión `.ts` sin banderas (`node ingesta/src/corpus/humo.ts`); si no, agregar `--experimental-strip-types` a los scripts `corpus:*` y dejarlo anotado en `quickstart.md`. Borrar el archivo de humo de ejecución, no el test. *(Verificado con Node 24.14: ejecuta `ingesta/src/corpus/*.ts` directo, incluso importando el motor compilado. Node 22 trae la ejecución nativa de `.ts` desde la 22.18; `.nvmrc` resuelve a la última 22.x. No se probó con Node 22 en esta máquina.)*
- [X] T005 [P] Agregar `SUPABASE_URL=` (comentado como no secreto: URL pública del proyecto) a `supabase/.env.example`, junto a las dos variables que ya figuran, y documentar en `docs/architecture/04-infrastructure.md` (tabla de secrets) que la carga del corpus las usa por `node --env-file=supabase/.env`.

**Checkpoint**: `ingesta/` compila, linta y corre tests en el CI; nada más.

---

## Phase 2: Foundational — tipos, ids, validador, cliente de MODO

**⚠️ Bloquea todas las historias.** Tests primero dentro de cada par.

- [ ] T006 [P] **Confirmar con Joaquín J1 a J7** [JOAQUÍN]: dueño por `categoriaId` (Santiago 1 y 4, Joaquín el resto), sufijos de `fuente_id` (`#b-…`, `.c-…`, `.m-…`), forma de `comercio`, formato de `grupoTopeId`, catálogo completo de 82 bancos, orden y formato del archivo compartido y el ajuste de `supabase/tests/database/rls.test.sql`. Dejar la respuesta (o el valor por defecto elegido y la fecha) en la sección «Convenciones» de `specs/011-corpus-promociones-seed/plan.md`. **Ninguna promo se carga en `promociones.json` antes de cerrar J2, J3 y J4.**
- [X] T007 [P] Exportar `normalizar` desde `packages/motor/src/index.ts` (`export { normalizar } from "./elegibilidad.ts";`, junto a `JURISDICCIONES_VALIDAS`; sin tocar la lógica) y escribir `packages/motor/src/index.test.ts` que verifique `normalizar("  BANCOR  ")` = `"bancor"` y `normalizar("Banco Nación")` = `"banco nacion"`.
- [X] T008 [P] Crear `ingesta/src/corpus/tipos.ts` con `EntradaCorpus` (= `Promocion` sin `id`, más `fuenteId: string`, `fragmentosFuente: Record<string, string | null>`, `fixture: boolean` y `revision: { verificadaEl: string; revisor: string; notas: string[] }`), `ArchivoCorpus` (`{ version: 1; promociones: EntradaCorpus[] }`), `Exclusion` (`slug`, `motivo`, `detalle`, `verificadaEl`, `revisor`), `GrupoTope` (`banco`, `clave`, `fragmento`, `creadoPor`) y `MOTIVOS_EXCLUSION` como conjunto cerrado: `fuera_de_zona`, `comercio_no_determinado`, `banco_no_determinado`, `nivel_de_cliente`, `transversal`, `no_es_reintegro`, `tope_no_representable`, `vencida_en_la_fuente`, `detalle_inexistente`, `otro`. En todo el archivo, **ningún `?:`** (constitución §III): lo ausente es `T | null`.
- [X] T009 [P] Test primero: `ingesta/src/corpus/ids.test.ts` — `idDePromocion("manual", "x")` es un UUID v5 (carácter de versión `5`), es determinista, cambia con el `fuenteId` y con la fuente, y dos `fuenteId` con sufijo distinto dan ids distintos. Después `ingesta/src/corpus/ids.ts`: UUID v5 con `node:crypto` (SHA-1), espacio de nombres fijo como constante del archivo, entrada `"<fuente>:<fuenteId>"`.
- [X] T010 Test primero: `ingesta/src/corpus/validar.test.ts`, un caso rojo por cada regla de `data-model.md` §Entrada del corpus. Las reglas, citadas tal cual:
  - todas las claves de `Promocion` presentes; un dato ausente es `null`, **nunca** una clave faltante;
  - `fuente = "manual"`; `fuenteId` no vacío y único en todo el archivo;
  - `esPromocionPublicable` y `camposInvalidos` del motor sin hallazgos;
  - `0 < porcentaje ≤ 100`;
  - `vigencia.desde` y `.hasta` son fechas ISO reales y `desde ≤ hasta`; `dias` es `null` o una lista no vacía sin repetidos;
  - `tarjetas`: al menos una red entre débito y crédito, sin repetidos, solo valores de `Red`;
  - `tope.monto > 0` si no es `null`; `monto ≠ null` ⇒ `periodo ≠ null`; `periodo = null` ⇒ `monto = null`;
  - `tope.alcance = "compartido"` ⇔ `grupoTopeId ≠ null`, y el id existe en `grupos-tope.json`;
  - `bancoId` está en el catálogo de 82; `categoriaId` está en `CATEGORIAS_MODO`;
  - `montoMinimo ≥ 0` si no es `null`; `jurisdiccion`, `canal` dentro de su enum;
  - todo campo que solo sale de la letra chica (`acumulable`, `tope.alcance`, `jurisdiccion`) y es distinto de `null` tiene su fragmento no vacío (`montoMinimo`, `canal` y `tope.periodo` salen de campos estructurados y no lo exigen);
  - `revision.verificadaEl` es una fecha ISO; `revision.revisor` no vacío;
  - `comercio` no vacío si no es `null`; dos entradas con el mismo banco, categoría y comercio normalizado y vigencias superpuestas **avisan** (no son error);
  - un `slug` no puede estar a la vez en `promociones.json` y en `exclusiones.json` (salvo entradas partidas, que se distinguen por el sufijo); toda exclusión tiene un `motivo` del conjunto cerrado y `otro` exige `detalle`.
  Incluir un caso con `porcentaje: 150`, uno con fechas invertidas, uno con `tope.monto` sin `periodo` y uno con una clave faltante (distinta de `null`).
- [X] T011 Implementar `ingesta/src/corpus/validar.ts` hasta que pase T010: `validarArchivo(archivo, { catalogoBancos, gruposTope, exclusiones })` devuelve la lista de errores (con el `fuenteId` y la regla rota) y la de avisos; no lanza. Agregar `validarExclusiones` y `validarGruposTope`.
- [X] T012 [P] Test primero: `ingesta/src/corpus/modo.test.ts` con `fetch` inyectado — manda el header `User-Agent: VueltoBot (UADE)`; la pausa entre pedidos es configurable y **menor a 1000 ms lanza un error**; pagina el listado de 100 en 100 hasta una página corta; un 404 del detalle devuelve `null` y no lanza; una respuesta que no es JSON lanza un error con la URL. Después `ingesta/src/corpus/modo.ts`: `crearClienteMODO({ fetch, pausaMs, esperar })` con `listarPagina(categoria, pagina)`, `detalle(slug)` y `bancos()`; los `GET` son `/promos/api/rewards/slots?slots=web-modo-hub-mas-promos&categories=<id>&page=<n>&limit=100`, `/promos/api/rewards/v2/benefit/<slug>` y `/promos/api/rewards/banks?source=app_modo`.

**Checkpoint**: tipos, ids, validador y cliente de MODO con tests en verde; J1 a J7 cerradas o con valor por defecto anotado.

---

## Phase 3: US3 — cada promo apunta al banco correcto del catálogo (P1)

**Meta**: el banco de cada entrada es un id del catálogo de MODO y las diferencias de nombre se resuelven con una regla explícita y testeada.

**Test independiente**: tomar todos los `name_bank` distintos del listado de Supermercados y Farmacias y aplicar `resolverBanco`: cada uno da un banco del catálogo o una exclusión documentada; ninguno queda sin resolver.

- [X] T013 [US3] [RED] Bajar el catálogo con `crearClienteMODO(...).bancos()` y guardarlo en `docs/product/data/modo-bancos-raw.json` como `{ "capturadoEl": "<fecha>", "url": "https://www.modo.com.ar/promos/api/rewards/banks?source=app_modo", "bancos": [...] }` (82 entradas con `id`, `name`, `image`, `promotion_url`, `bcra_code`, `hub_bank_id`, `on_hub_list`). Es el archivo que la issue #34 cita y no está en `main`.
- [X] T014 [P] [US3] Test primero: `ingesta/src/corpus/bancos.test.ts` — comparación normalizada ("BANCOR" frente a "Bancor", espacios de más, acentos); alias explícitos (`Banco Macro`→`Macro`, `Banco Hipotecario`→`Hipotecario`, `BNA`→`Banco Nación`, `Banco Comafi`→`Comafi`, `Banco Credicoop`→`Credicoop`); `Bancos adheridos` no resuelve; `Ciudad / Buepp` no resuelve (son dos bancos del catálogo: ambiguo); `Macro Selecta` no resuelve por alias (es un nivel de cliente); dos entradas del catálogo que normalizan igual lanzan error (**ambigüedad = excluir**); un alias que apunta a un nombre que el catálogo no tiene lanza error; `contrastar(nameBank, bancoIdDelDetalle, catalogo)` informa discrepancia entre el nombre del listado y el id del detalle.
- [X] T015 [US3] Implementar `ingesta/src/corpus/bancos.ts` (`resolverBanco`, `contrastar`; usa `normalizar` de `@vuelto/motor`) y `ingesta/src/corpus/bancos-alias.ts` (tabla `ALIAS_BANCOS` revisada, con un comentario por alias que diga de dónde sale) hasta que pase T014.
- [X] T016 [P] [US3] Actualizar el comentario de `BancoId` en `packages/motor/src/tipos.ts` (solo el comentario) y el párrafo «`bancoId`» de `docs/architecture/01-data-models.md` (líneas 36 a 43): el `bancoId` sale del detalle de la promo (lista de ids del catálogo); la traducción de `name_bank` es normalizada **más una tabla de alias**; si no resuelve o es ambigua, la promo se excluye.
- [X] T017 [US3] Correr `resolverBanco` sobre todos los `name_bank` de las promos vigentes de las categorías 1 y 4 (los crudos de T024 o el listado) y anotar en `specs/011-corpus-promociones-seed/research.md` (D11) la lista final de alias y los nombres que quedaron sin resolver.

**Checkpoint US3**: `npm run test -w ingesta` pasa los tests de banco; el catálogo de 82 está fechado en `docs/`.

---

## Phase 4: US2 — cada promo es fiel a la fuente y la revisó una persona (P1)

**Meta**: un helper determinístico deja un borrador por promo; una persona lo corrige contra la letra chica. Lo estructurado se mapea por código; la prosa nunca la interpreta el código.

**Test independiente**: para cualquier promo del archivo, alguien que no la cargó reconstruye de dónde salió cada dato con `supabase/seed/crudo/<slug>.json` y su bloque `revision`, en menos de 2 minutos (SC-007).

- [X] T018 [P] [US2] Obtener tres detalles reales con `curl -A "VueltoBot (UADE)" https://www.modo.com.ar/promos/api/rewards/v2/benefit/<slug>` (`20-supermercadospetrelli-icbc-ene26`, `20off-tiendanova-macro-dic25` y `dona-catalina-nov26`, el de 24 bancos) y guardarlos recortados en `ingesta/src/corpus/test/detalles/` para usarlos como datos de prueba del mapeo.
- [X] T019 [US2] Test primero: `ingesta/src/corpus/mapear.test.ts`, contra los tres detalles de T018 y variantes. Reglas del mapeo (`data-model.md` §Mapeo):
  - `porcentaje` solo si `outcomes.cashback.amount_type = "percent"`; otro tipo ⇒ exclusión `no_es_reintegro`;
  - `tarjetas`: `debit_card` → `debito`, `credit_card` → `credito`, `issuer` = `Red`;
  - `vigencia.desde/hasta` desde `conditions.schedule.start_date/stop_date`; `dias` desde `days_of_week` (`monday`→`lun` …), los siete días ⇒ `null`;
  - `tope.monto` desde `limits.period_cap.amount_by_period` o `limits.transaction_cap.amount_by_transaction`; **`0` ⇒ `null`**;
  - `tope.periodo`: `month`→`mensual`, `week`→`semanal`, `day` y `promo` ⇒ **exclusión propuesta `tope_no_representable`**, sin aproximar (decisión del 2026-11-02); `monto = null` ⇒ `periodo = null`; **nunca `monto` con `periodo = null`**;
  - `montoMinimo` desde `requirements.amount_range.min`, `0` ⇒ `null`;
  - `canal`: solo `instore`/`instore_nfc` ⇒ `presencial`, solo `online` ⇒ `online`, ambos ⇒ `ambos`;
  - `tope.alcance`, `tope.grupoTopeId`, `jurisdiccion`, `acumulable` salen **`null`** (los completa una persona);
  - `bancoId`: una entrada por id de `requirements.banks.list` (Doña Catalina ⇒ 24 entradas; el borrador anota que hay que decidir el grupo de tope, porque un `grupoTopeId` sin `alcance: "compartido"` no valida); lista vacía ⇒ exclusión `banco_no_determinado`;
  - `categoriaId`: una entrada por categoría que la promo lista; más de tres con comercio genérico ⇒ `transversal`;
  - `fuenteId` = `<slug>` y, si la promo se parte, `<slug>#` con las partes `b-<8 hex del bancoId>`, `c-<categoriaId>`, `m-<comercio en kebab>` separadas por `.`;
  - un campo desconocido o un tipo inesperado hace fallar el mapeo con un mensaje que nombra la ruta del campo; no devuelve a medias.
- [X] T020 [US2] Implementar `ingesta/src/corpus/mapear.ts` (`mapearDetalle(detalle, tarjeta, { duenos })` devuelve `{ borradores: EntradaCorpus[], exclusiones: Exclusion[], notas: string[] }`) hasta que pase T019. Sin ningún modelo de lenguaje y sin leer `terms_and_conditions` más que para devolver el texto.
- [X] T021 [P] [US2] Test primero y luego `ingesta/src/corpus/resaltar.ts` (`resaltar(htmlLegal)`): convierte el HTML a texto y devuelve las frases candidatas, sin interpretarlas, que contienen «NO ACUMUL», «ACUMULABLE», «TOPE», «COMPARTID», «MÍNIM», «ONLINE», «SUCURSAL», «PROVINCIA», «CABA», «AMBA»; el test usa el legal de Petrelli y de Tienda Nova (por ejemplo, «NO ACUMULA CON OTRA PROMOCIÓN» sale marcada).
- [X] T022 [US2] Test primero y luego `ingesta/src/corpus/relevar.ts` con el cliente de MODO inyectado: filtra `calculated_status = "RUNNING"` y `trigger_type = "payment_promotion"` (descarta `installments` y `payment_scratch`); dos tarjetas con el mismo `slug` o `promo_id` cuentan una vez; guarda `supabase/seed/crudo/<slug>.json` como `{ capturadoEl, url, tarjeta, detalle }`; un 404 se cuenta como `detalle_inexistente` y no aborta; repetirlo reescribe los mismos archivos; imprime un resumen (candidatas por categoría y por banco). Opción `--categorias 1,4` y `--pausa-ms` (mínimo 1000).
- [X] T023 [P] [US2] Test primero y luego `ingesta/src/corpus/borrador.ts` (`npm run corpus:borrador -w ingesta -- <slug>…`): lee el crudo de cada `slug`, imprime la entrada mapeada y las frases de `resaltar`; **no escribe** en `promociones.json`.
- [X] T024 [US2] [RED] Correr `npm run corpus:relevar -w ingesta -- --categorias 1,4` (unos 4 minutos) y confirmar que deja unos 170 archivos en `supabase/seed/crudo/` y el resumen. Commitear solo los crudos; no los editar a mano.
- [X] T025 [US2] Crear `supabase/seed/promociones.json` (`{ "version": 1, "promociones": [] }`), `supabase/seed/exclusiones.json` (`[]`) y `supabase/seed/grupos-tope.json` (`{}`), con el formato canónico.
- [ ] T026 [US2] [HUMANO] **Verificar la zona de cada cadena** de las categorías 1 y 4 con una URL de respaldo anotada en `revision.notas`: Cooperativa Obrera (cadena de Bahía Blanca y la Patagonia), Unicoop (Córdoba), Petrelli, Monarca, Doña Catalina, Tiendas de Cercanía, The Food Market, Tienda Nova, Alvear, Ferias de la Ciudad, Paladini, y las farmacias menores. Una cadena sin sucursales en CABA/AMBA va a `exclusiones.json` con motivo `fuera_de_zona` (D4).
- [ ] T027 [US2] [HUMANO] **Tanda 1 de revisión**: las cadenas de la ruta de la demo (Paladini, Tiendas de Cercanía, The Food Market, ChangoMás y Farmacity, Simplicity, Farmaonline, Juleriaque, Parfumerie). Por cada promo: `npm run corpus:borrador -w ingesta -- <slug>`, leer la letra chica en el detalle, corregir `comercio` (D3), completar `acumulable`, `tope.alcance` + `grupoTopeId` (registrándolo en `grupos-tope.json`, D5), `jurisdiccion` (solo si el texto la sostiene) y `canal`, copiar el fragmento de cada campo sacado de la prosa a `fragmentosFuente`, y completar `revision` (`verificadaEl`, `revisor`, `notas`). Una promo que no entra va a `exclusiones.json` con su motivo. Antes de cada commit: `npm run corpus:generar -w ingesta` para validar.

**Checkpoint US2**: el validador pasa sobre la tanda 1, cada promo tiene su crudo y su `revision`, y un tercero puede verificar una al azar.

---

## Phase 5: US1 — demo con promos reales y la ingesta apagada (P1) 🎯 MVP

**Meta**: el corpus se carga con un reinicio local sin red y, para la demo, con una carga remota idempotente al Supabase alojado.

**Test independiente** (`quickstart.md` pasos 2, 3 y 6): `corpus:generar --verificar` sin error; `supabase db reset` dos veces y `supabase test db` en verde; la carga remota repetida da 0 cambios.

- [X] T028 [US1] Test primero: `ingesta/src/corpus/generar.test.ts` — la salida es determinista; `supabase/seed/bancos.sql` tiene 82 `insert … on conflict (id) do update` con el `name` del catálogo; `supabase/seed/promociones.sql` usa `on conflict (fuente, fuente_id) do update`, escapa las comillas simples, escribe `fragmentos_fuente` como `jsonb` con la forma `{ campo: texto | null }`, calcula `id` con `idDePromocion` y **no contiene** `revision` ni `fixture`; el archivo se reescribe en formato canónico (orden `categoriaId`, `fuenteId`; indentación fija); `--verificar` sale con error y nombra el comando a correr si algún derivado no coincide con el JSON; un archivo inválido no escribe nada.
- [X] T029 [US1] Implementar `ingesta/src/corpus/generar.ts` hasta que pase T028 (el generador de `packages/motor/src/test/corpus.ts` se suma en T043). Correrlo para generar `supabase/seed/bancos.sql` y `supabase/seed/promociones.sql`.
- [X] T030 [P] [US1] Quitar de `supabase/seed.sql` el insert suelto de Galicia (su nombre difería del catálogo) y dejar solo las categorías; en `supabase/config.toml` cambiar `sql_paths = ["./seed.sql"]` por `["./seed.sql", "./seed/bancos.sql", "./seed/promociones.sql"]`.
- [X] T031 [P] [US1] [JOAQUÍN] Ajustar `supabase/tests/database/rls.test.sql`: las aserciones de las líneas 80 y 127 (`count(*) from public.promociones` igual a 1 y a 2) pasan a contar solo las filas del propio test (`where id in (…)`), porque el corpus cargado en el reinicio las rompe. Es código de #34: coordinar y, si se hace en este PR, avisarle.
- [X] T032 [US1] Test primero: `supabase/tests/database/corpus.test.sql` (pgTAP) — hay 82 filas en `bancos`; hay al menos una promo con `fuente = 'manual'`; todas tienen `fuente_id` no nulo; ninguna está dada de baja; todo `banco_id` y `categoria_id` existe en su catálogo; no hay `fuente_id` repetido. Se ejecuta con `supabase test db`.
- [~] T033 [US1] Verificar en local: `supabase start`, `supabase db reset` **dos veces** y `supabase test db` (CI: job `supabase-rls`). Confirmar que no hay duplicados y que el reinicio funciona sin red. *(Verificado con la imagen de Postgres de Supabase de este equipo: las 7 migraciones, `seed.sql`, los 82 bancos y 408 promos reales de prueba cargan sin errores; la segunda carga no cambia nada; las 5 pruebas pgTAP pasan, y la versión original de `rls.test.sql` falla justo las 2 aserciones ajustadas. Falta correr `supabase db reset` con la CLI, que corre el job `supabase-rls` del CI.)*
- [X] T034 [US1] Test primero: `ingesta/src/corpus/cargar.test.ts` con un cliente de Supabase simulado (`ClienteCorpus`): por defecto es `--dry-run` y no escribe; con `--aplicar` valida **antes** de escribir y un archivo inválido no escribe nada; el orden es `categorias`, `bancos`, `promociones`; **lotes de hasta 50 filas, cada uno en su propio pedido** (contrato de escritura de `docs/architecture/04-infrastructure.md`, PR #91); correrlo dos veces da 0 inserciones, 0 actualizaciones y 0 bajas; una fila `manual` que ya no está en el archivo recibe `dada_de_baja_en = now()` y si vuelve se pone en `null`; **nunca emite un `delete`**; no escribe ni reactiva una `manual` cuyo `fuente_id` existe como `modo` activa; no envía `revision` ni `fixture`; falla con un mensaje claro si faltan `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` y **nunca imprime la key**.
- [X] T035 [US1] Implementar `ingesta/src/corpus/cargar.ts` hasta que pase T034, con `@supabase/supabase-js` solo en la función que crea el cliente real; el resto depende de la interfaz `ClienteCorpus`. *(Verificado de punta a punta con `supabase-js` real contra PostgREST y el Postgres de Supabase: 120 promos reales; prueba sin escribir, carga, segunda carga sin cambios y `actualizada_en` quieto, 3 bajas, 3 reactivaciones, 1 actualización.)*
- [ ] T036 [US1] [HUMANO] Carga al Supabase alojado con la service role (la tiene Joaquín; no se guarda en el repo): `node --env-file=supabase/.env ingesta/src/corpus/cargar.ts` (dry-run), revisar el resumen, `--aplicar`, y de nuevo `--aplicar` para confirmar 0 cambios. Verificar desde la app o con `select count(*) from promociones` que las filas están y que `actualizada_en` no se movió en la segunda corrida.

**Checkpoint US1 (MVP)**: la demo tiene promos reales en local y en el alojado, la carga es idempotente y el CI valida cada fila.

---

## Phase 6: US4 — el corpus cubre los casos que el motor tiene que resolver (P2)

**Test independiente**: abrir la matriz de `docs/product/corpus-semilla.md` y, para cada caso, verificar la promo que lo ilustra o la marca «sin ejemplo real vigente».

- [X] T037 [US4] Test primero: `ingesta/src/corpus/cobertura.test.ts` — para cada archivo de `supabase/seed/crudo/` el `slug` está en `promociones.json` (como `fuenteId` o prefijo antes de `#`) o en `exclusiones.json`; ninguna exclusión tiene un motivo fuera del conjunto cerrado; nadie queda sin contabilizar. Falla con la lista de `slug` sin destino. *(Se hizo como `corpus:cobertura`, que reporta pendientes sin romper el CI mientras el corpus se revisa; falla con `--estricto`. Un test del repo exige que ninguna entrada ni exclusión quede sin su crudo.)*
- [ ] T038 [US4] [HUMANO] **Tanda 2 de revisión**: el resto de las promos de las categorías 1 y 4, con el mismo procedimiento de T027. Las que dependen de un banco de Joaquín (un banco compartido con su mitad) se coordinan con él (J4, J6).
- [ ] T039 [US4] [HUMANO] Elegir la promo **vencida** del corpus: la candidata natural es Petrelli (`schedule.stop_date = 2026-12-31`, pero el legal dice «hasta el 30/09/2026»). Cargarla con `vigencia.hasta = 2026-09-30` y la contradicción anotada en `revision.notas`. Para que la app la reciba, su `vigencia_hasta` tiene que caer dentro del período en curso; si no, sirve solo para los tests del motor (D14).
- [~] T040 [US4] Crear `docs/product/corpus-semilla.md` con la **matriz de cobertura** de los casos de la issue: tope compartido entre 2 o más promos del mismo banco, tope exclusivo, no acumulable (Tienda Nova–Macro, A La Mesa, Hipotecario–Bembo/Delimart), `acumulable = null`, acumulable `true` (Doña Catalina), solo ciertos días, solo débito, solo crédito, monto mínimo (Doña Catalina, `40000`) y vencida. Cada caso con su `fuenteId` o «sin ejemplo real vigente (fecha)». Sin inventar ninguna promo para llenar un caso (FR-013). Agregar el resumen del registro de exclusiones y las **limitaciones** (D10): promos que exigen pagar con MODO, beneficios solo para clientes con sueldo en el banco (`user_national_id`), topes diarios o para toda la promo, que se excluyen por no ser representables, saldos de grupo optimistas si el grupo tiene miembros excluidos, vigencia verificada en una fecha, y que la app solo baja promos vigentes dentro del período. *(Documento creado con la matriz, las limitaciones y las exclusiones propuestas, con las cifras del relevamiento real; «Estado» queda en «candidata» hasta la revisión humana.)*
- [ ] T041 [US4] [JOAQUÍN] Repartir con él los casos que le tocan cubrir a su mitad y consolidar la matriz sumando los suyos (compartido, solo débito, etc.).

**Checkpoint US4**: la matriz está completa y `cobertura.test.ts` garantiza que no quedó ninguna candidata sin contabilizar.

---

## Phase 7: US5 — los tests del motor usan promos reales del corpus (P2)

**Test independiente**: `npm run test -w @vuelto/motor` pasa las compras de prueba contra `PROMOS_CORPUS` con `AHORA_CORPUS` fijo.

- [ ] T042 [US5] Marcar `"fixture": true` en 8 a 10 entradas de `promociones.json` (15 a 20 entre las dos mitades): al menos una de supermercado con banco y tarjeta que la aceptan, una de farmacia, la vencida (T039), una con días, una no acumulable y una con tope semanal o por compra.
- [ ] T043 [US5] Test primero (en `generar.test.ts`) y luego en `generar.ts`: emitir `packages/motor/src/test/corpus.ts` con `export const PROMOS_CORPUS: Promocion[]` (solo las entradas `fixture: true`, con el `id` UUID v5 y `fuenteId` como comentario) y `export const AHORA_CORPUS = new Date("2026-11-04T15:00:00Z")`. El archivo va **tipado** como `Promocion[]` para que `tsc` verifique la forma. Regenerarlo; `--verificar` lo compara. El archivo queda fuera del build (`tsconfig.build.json` ya excluye `src/test`).
- [ ] T044 [US5] Test: `packages/motor/src/corpus.test.ts` — cada fixture pasa `esPromocionPublicable`; tres compras de prueba (SC-004) con el resultado esperado **escrito en el test**, no un *snapshot*: (1) una compra de supermercado con el banco y la tarjeta de una promo cargada, que la recomienda con el ahorro calculado a mano; (2) una de farmacia con otra promo; (3) una compra en la que la promo vencida o la de otro día se descarta, con su causa (`vigencia` o `dia`). Todo con `AHORA_CORPUS` fijo. Sin red.
- [ ] T045 [US5] Correr `npm run test -w @vuelto/motor` y confirmar que la cobertura de líneas sigue ≥ 90 % (`src/test/**` queda excluido).

**Checkpoint US5**: el motor decide con promos reales y los resultados esperados están escritos a mano.

---

## Phase 8: US6 — las cadenas de supermercado del alcance son las que tienen promo (P2)

**Test independiente**: cada cadena de la lista de `alcance-mvp.md` está respaldada por una promo del corpus o por la verificación fechada de que no tiene ninguna vigente.

- [~] T046 [US6] Actualizar `docs/product/alcance-mvp.md` (sección «Cadenas de supermercado: la lista previa no está validada contra MODO», líneas 89 a 123): reemplazarla por la lista real de cadenas con promo vigente en MODO que sirven en CABA/AMBA, con la fecha y el método (listado paginado completo de la categoría 1 y detalle de cada promo, no `search_text`); las cadenas de la lista previa **sin promo vigente** (Coto, Carrefour, Jumbo, Disco, Vea, Día; ChangoMás con una) con su consecuencia para el flujo de supermercado de la demo; las cadenas excluidas por zona (Cooperativa Obrera, Unicoop si se confirma). Corregir también la cifra de «226 promos» de Mercados. Cerrar el pendiente de reconciliación. *(Sección reescrita con el relevamiento completo: 0 promos vigentes de las grandes cadenas, lo que sí hay y las consecuencias para la demo. La zona de cada cadena queda como «a verificar» hasta T026, que es humana; el pendiente de reconciliación está resuelto en el método y abierto en la zona.)*
- [X] T047 [P] [US6] Actualizar la fila de RF-18 de «Requisitos bloqueados» en `docs/product/requisitos.md` (línea 129): ya se verificaron las sucursales reales de las cadenas; dejar lo que falte (la parte de Joaquín).
- [X] T048 [P] [US6] Agregar una nota en `docs/design/DESIGN.md` §9 (cerca de «Compra de ejemplo: Coto, miércoles, $24.500», línea 280): Coto, Jumbo y Carrefour no tienen promo vigente en MODO al 2026-11-02; el ejemplo es de diseño y no de datos reales. No cambiar el ejemplo ni los fixtures de la app (decisión de la spec 006). Abrir una issue, o comentar en #35, para que el equipo decida si el pitch muestra un supermercado con promo real.

**Checkpoint US6**: la documentación del alcance coincide con el corpus.

---

## Phase 9: Polish y cierre

- [X] T049 [P] Actualizar `CLAUDE.md`: la fila de `ingesta` deja de ser «Reservado» y describe `ingesta/src/corpus/` y los comandos `corpus:*`; agregar a la sección de comandos reales `npm run corpus:generar -w ingesta -- --verificar`.
- [X] T050 [P] Registrar la sesión en `docs/bitacora-prompts.md` (qué se pidió, qué se generó, qué se descartó y qué se corrigió a mano), incluida la corrección de que «Exclusivo con» en la tarjeta es exclusividad de banco y no el alcance del tope, y el hallazgo del endpoint de detalle.
- [ ] T051 [P] [HUMANO] Publicar los avisos de `plan.md` §Avisos: un comentario en #50 y #51 (el detalle de MODO existe y trae el banco por id; el alias hace falta; #51 debe dar de baja la manual al publicar la de MODO) y en #53 (los crudos y el JSON son su referencia). Son mensajes públicos en el nombre del equipo: los aprueba y los publica una persona.
- [ ] T052 [P] Correr `quickstart.md` de punta a punta (pasos 1 a 5 y 7) y anotar en `specs/011-corpus-promociones-seed/quickstart.md` cualquier desvío.
- [X] T053 Correr `/code-review` sobre el diff (estándares y spec) y atender los hallazgos. *(Hecho el 2026-11-02, los dos ejes: sin violaciones de las reglas duras; defectos reales corregidos, ver «Revisión de código».)*
- [X] T054 Correr el agente `test-runner` (lint, typecheck y tests de todos los workspaces) y arreglar lo que falle. *(Hecho: lint, typecheck y tests de los 4 workspaces; repetido a mano tras las correcciones.)*
- [X] T055 Correr el agente `rules-guardian`: toca migraciones y seed de Supabase, el borde del extractor y la service role. Confirmar que no hay ningún LLM en el camino, que el null es explícito, que la service role no está en el repo y que ninguna escritura a `promociones` esquiva `esPromocionPublicable`. *(Hecho: sin violaciones; 4 riesgos menores atendidos salvo el del tope diario, que es decisión del equipo.)*
- [X] T057 Relevar desde las secciones que muestra la web (`/v2/slots` de cada sección del contenedor activo) en vez de solo «más promos» de `/slots`, que dejaba afuera a Coto, Jumbo, Disco, Vea, Día y La Anónima. `modo.ts` (`secciones`, `listarSeccion`), `relevar.ts` (filtro por `offer.categories` y `benefit.type`), `crudo.ts` (comercio y banco de la tarjeta nueva, y de la anterior para los crudos viejos). *(Hecho el 2026-11-03, tras el review de #92/#93.)*
- [ ] T056 [HUMANO] Abrir el PR desde `feat/35-corpus-promociones-seed` con **`Refs #35`** (no `Closes`) hasta que Joaquín termine su mitad; en la descripción: qué cubre esta parte, las decisiones del equipo, el hallazgo del detalle de MODO, el corpus por tandas y los pendientes (J1 a J7). Cerrar la issue con `Closes #35` en el PR que complete el corpus.

---

## Dependencias entre fases

```text
Phase 1 (Setup) ─► Phase 2 (Foundational) ─┬─► Phase 3 (US3 banco) ─► Phase 4 (US2 relevar, mapear, revisar) ─► Phase 5 (US1 generar y cargar) 🎯
                                           │                                                                          │
                                           └─ J1 a J7 [JOAQUÍN] (T006) ─ antes de la primera promo (T027)             ├─► Phase 6 (US4 cobertura)
                                                                                                                      ├─► Phase 7 (US5 fixtures)
                                                                                                                      └─► Phase 8 (US6 documentación) ─► Phase 9 (cierre)
```

- **Phase 2** bloquea todo lo demás. T006 (Joaquín) corre en paralelo a T007 a T012, pero bloquea T027.
- **US3 → US2**: el mapeo y la revisión necesitan el catálogo y `resolverBanco`.
- **US2 → US1**: el generador y la carga necesitan al menos una tanda de promos revisadas para tener algo real que cargar; los tests de T028 y T034 se pueden escribir antes con datos de prueba.
- **US5** necesita T039 (la vencida) y el generador (T029); **US6** necesita el corpus revisado (T027, T038).
- T031 (aserciones de `rls.test.sql`) bloquea T033: sin ese ajuste, `supabase test db` falla con el corpus cargado.

## Oportunidades de paralelismo

- **Phase 1**: T002, T004 y T005 en paralelo después de T001.
- **Phase 2**: T006, T007, T008, T009 y T012 en paralelo; T010 y T011 después de T008.
- **Phase 3**: T014 en paralelo con T013; T016 en paralelo con T015.
- **Phase 4**: T018, T021 y T023 en paralelo; T019 y T020 en serie.
- **Phase 5**: T030 y T031 en paralelo con T028/T029; T032 en paralelo con T034.
- **Phase 8 y 9**: T047, T048, T049, T050, T051 y T052 en paralelo.
- **Personas distintas**: Santiago en `ingesta/` y en las categorías 1 y 4; Joaquín en T006, T031, T036 y T041, y en su mitad del archivo.

## Estrategia de implementación

1. **MVP** = Phases 1 a 5 con la tanda 1 (T027): `ingesta/` funcionando, banco resuelto, entre 5 y 10 promos revisadas de la ruta de la demo, reinicio local con corpus y carga remota idempotente. Con eso la demo ya recomienda con promos reales.
2. **Incremento 2**: tanda 2 (T038), la matriz de cobertura y la promo vencida (US4).
3. **Incremento 3**: fixtures y compras de prueba del motor (US5) y documentación del alcance (US6).
4. **Cierre**: Phase 9 con `Refs #35`; el `Closes #35` llega con el PR que termine el corpus completo, cuando Joaquín cierre su mitad.

**Qué nunca hace el asistente**: revisar y firmar la letra chica de una promo (T026, T027, T038, T039), usar la service role (T036) ni publicar comentarios en las issues del equipo (T051). Sí puede preparar borradores, correr el relevamiento, escribir los tests y el código, y dejar listos los comandos.

---

## Revisión de código (2026-11-02)

Resultado de `/code-review` (Estándares y Spec), `test-runner` y `rules-guardian` sobre todo lo hecho hasta T050. Corregido con tests primero:

- Los comandos `relevar` y `borrador` resuelven la carpeta de crudos desde la raíz del repo, no desde `cwd` (con `npm run … -w ingesta` el `cwd` es `ingesta/`). `relevar` sale con código 1 si falló el detalle de alguna promo.
- `mapear.ts`: las claves de `Object.prototype` ya no pasan como valores de MODO; no lee la letra chica (la nota de fecha vencida pasó a `borrador.ts`); la exclusión `transversal` y las demás solo se proponen para promos con alguna categoría del dueño; se agrega `nivel_de_cliente` y el contraste del nombre de banco con el id del detalle (T014/T015, FR-007, US3-4).
- `validar.ts` ya no lanza con insumos malformados; `cargar.ts` compara por slug la convivencia con la ingesta (D2) y suma el resumen por categoría; `generar.test.ts` verifica los archivos reales (gate del CI).
- Una sola lista de columnas de `promociones` (`filas.ts`), helpers compartidos (`crudo.ts`, `args.ts`), `Insumos` movido a `tipos.ts` y las listas de `dominio.ts` exhaustivas respecto del motor.
- `rls.test.sql`: la aserción de las promociones tras borrar la cuenta compara contra el total de antes (incluye el corpus); `corpus.test.sql` ya no fija los 82 bancos.

**Decisión del equipo (2026-11-02):** el tope diario ya no se aproxima como «por compra»: se propone para excluir (`tope_no_representable`), ver `research.md` D8. Con los crudos reales quedan 159 promos con 399 entradas candidatas y 12 exclusiones propuestas.
