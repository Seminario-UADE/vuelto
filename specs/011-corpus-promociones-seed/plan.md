# Implementation Plan: Corpus de promociones sembrado a mano desde MODO (Supermercados y Farmacias)

> **Reemplazada en parte por [ADR-011](../../docs/decisions/011-corpus-siempre-automatico.md) (2026-11-03).**
> Las promos nunca se cargan a mano: las publica la ingesta automática todos los días
> (`ingesta/src/corpus/ingestar.ts`, `.github/workflows/ingesta.yml`). Lo que este documento dice
> sobre `promociones.json`, revisión humana, exclusiones y grupos de tope a mano, crudos en el repo,
> seed de promociones y fixtures del motor ya no rige. Siguen vigentes el mapeo del detalle de MODO,
> la validación, los ids estables, el contrato de escritura y las reglas de tope y jurisdicción.
> El contrato actual está en [contracts/corpus.md](contracts/corpus.md).

**Branch**: `feat/35-corpus-promociones-seed` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-corpus-promociones-seed/spec.md`, más los hallazgos de [critica.md](critica.md) (spec-critic) y una muestra de 14 detalles de promo de MODO relevada el 2026-11-02.

## Summary

El corpus real de promos de Supermercados (id 1) y Farmacias (id 4) se arma con un **helper determinístico** que baja el detalle de cada promo desde `GET /promos/api/rewards/v2/benefit/<slug>` y mapea por código todo lo que MODO ya trae estructurado (banco por id, porcentaje, vigencia, días, redes, tope y su período, monto mínimo, canal). **Una persona** revisa cada entrada contra la letra chica y completa a mano lo que solo está en prosa (acumulabilidad, tope compartido, jurisdicción, comercio). No interviene ningún modelo de lenguaje.

La **fuente de verdad** es `supabase/seed/promociones.json`. De ahí se derivan, con un generador y una verificación en CI que detecta el desfase:

1. el SQL que carga el corpus en `supabase db reset` (y que el job `supabase-rls` del CI ya corre dos veces, así que Postgres valida cada fila);
2. las fixtures tipadas del motor (`packages/motor/src/test/`);
3. la **carga remota** al Supabase alojado que usa la demo (script idempotente por `(fuente, fuente_id)`, service role desde el entorno, bajas con `dada_de_baja_en`).

El catálogo de bancos se siembra completo (82 entradas, ids reales de MODO, fechado). La traducción de banco y la tabla de alias viven en `ingesta/` para que #51 las reutilice. No se toca la lógica del motor.

## Technical Context

**Language/Version**: TypeScript ≥ 5 (el repo usa `typescript ^6.0.3`) sobre Node 22 (`.nvmrc`). Los scripts de `ingesta/` corren con la ejecución nativa de `.ts` de Node (≥ 22.18), igual que la convención de imports con extensión `.ts` del motor. Si el CI no la trae, se pasa `--experimental-strip-types` (se verifica en la primera tarea).

**Primary Dependencies**: `ingesta/` pasa a depender de `@vuelto/motor` (workspace) y de `@supabase/supabase-js` (solo para la carga remota; la versión se fija al instalar). El motor **no suma dependencias**. Sin dependencias para UUID v5 (`node:crypto`) ni para validar el JSON (validador escrito a mano, con tests).

**Storage**: Postgres de Supabase (tablas `bancos`, `categorias`, `promociones` de la issue #34, sin cambios de esquema) y archivos versionados en `supabase/seed/`.

**Testing**: Vitest en `ingesta/` (suite sin red: el cliente de Supabase y `fetch` se inyectan) y en el motor (fixtures reales); pgTAP en `supabase/tests/database` (el job `supabase-rls` del CI). Cobertura mínima de líneas del 90 %, igual que el motor y la carpeta `supabase`.

**Target Platform**: Node en la máquina de quien carga el corpus (local o runner); el Supabase local de la CLI y el proyecto alojado.

**Project Type**: monorepo con npm workspaces (`packages/motor`, `apps/mobile`, `supabase`, `ingesta`). Este trabajo vive casi todo en `ingesta/` y `supabase/seed/`.

**Performance Goals**: no aplica al camino de la app. El relevamiento de ~170 promos con 1,2 s de pausa tarda unos 4 minutos y se corre pocas veces.

**Constraints**: scraping respetuoso (RNF-13: User-Agent `VueltoBot (UADE)`, ≥ 1 s de pausa); la service role key solo en el entorno (nunca en el repo); costo $0; el reinicio local no requiere red.

**Scale/Scope**: unos 170 candidatos vigentes entre las dos categorías (171 `slug` únicos de pago vigentes al 2026-11-02). Se espera que entre menos de la mitad tras aplicar las reglas de exclusión. La carga es por tandas: primero las cadenas de la ruta de la demo, después el resto.

## Constitution Check

*GATE: debe pasar antes de la Fase 0 y se re-evalúa después de la Fase 1. Constitución v3.0.0.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| **I. Regla de oro** | ✅ | Es un habilitador y la spec lo explica: sin corpus, el motor no tiene sobre qué decidir. No agrega ninguna pantalla ni muestra promociones sin una compra concreta. |
| **II. Motor determinístico** | ✅ con una nota | No se modifica la lógica del motor ni se le agregan dependencias de runtime. Se le agregan **datos de prueba** en `src/test/` (excluidos del build) y se **exporta** `normalizar` desde `index.ts` para no duplicarla (cambia la superficie de la API, no su comportamiento). El helper y el mapeo no usan ningún modelo de lenguaje. |
| **III. Null explícito** | ✅ | Un dato que MODO no informa es `null`. El validador rechaza campos ausentes (distingue ausente de `null`), un `0` de la tarjeta como si fuera «sin tope», y un `monto` sin `periodo`. Cada campo sacado de la letra chica guarda su fragmento. Lo estructurado se mapea por código. |
| **IV. Secretos y privacidad** | ✅ con una regla | La service role key solo entra por variable de entorno al ejecutar la carga remota (documentada en `supabase/.env.example`, que ya está ignorado por git). La carga es `--dry-run` por defecto y no corre en el CI. Fecha y revisor **no** se guardan en la base, así no se sincronizan al celular de todos los usuarios (hallazgo A9). No hay datos de usuario ni imágenes de ticket. |
| **V. Topes estimados con su base** | ✅ | Una promo sin tope entra con `monto = null` y el motor la marca como «sin tope informado». No se muestra ninguna cifra inventada. Una promo con tope diario o para toda la promo no se aproxima: se propone para excluir (ver D8), para no sobrestimar el saldo. |
| **VI. Test-first en el motor** | ✅ | El validador, la traducción de banco, el mapeo, el generador y la carga remota se escriben con tests Vitest sin red. Las fixtures se generan del corpus con una verificación de desfase. |
| **Stack y alcance** | ✅ | $0, un solo proveedor de datos (MODO) por su API pública, solo CABA/AMBA, Supabase como base. El `robots.txt` de MODO prohíbe `/api/` pero no `/promos/api/` (verificado el 2026-11-02): es un permiso por omisión, no una autorización expresa. Se mantiene el ritmo bajo y el User-Agent identificado. |
| **Flujo de trabajo** | ✅ | Issue M → spec-kit completo. `rules-guardian` es obligatorio antes del merge (toca migraciones/seed de Supabase y el borde del extractor). Bitácora al cerrar. |

**Gate de la Fase 0**: pasa. No hay violaciones que justificar (sección de complejidad vacía).

**Re-chequeo tras el diseño (Fase 1)**: pasa. El diseño no agrega dependencias al motor, no mueve ningún secreto al repo, y la única superficie nueva del motor es el export de `normalizar`.

## Convenciones que necesitan confirmación de Joaquín

Todas se dejan escritas en `research.md` con su valor por defecto. Si Joaquín no responde, se avanza con el valor por defecto, pero ninguna promo de su mitad se carga hasta que las confirme.

| # | Convención | Valor por defecto | Por qué importa |
|---|---|---|---|
| J1 | **Dueño de cada entrada** | Se decide por `categoriaId`: Santiago 1 y 4, Joaquín el resto. | Dos personas en un solo archivo. |
| J2 | **`fuente_id`** | `slug` de MODO, con sufijo `#…` solo cuando una promo se parte en varias entradas (por banco, por categoría o por comercio, ver D3). | Una colisión rompe el reinicio por `unique (fuente, fuente_id)`. |
| J3 | **Cómo se escribe `comercio`** | Nombre de marca corto, sin prefijos genéricos ni sufijos societarios (D3). | Es la clave de cruce con lo que tipea la persona. |
| J4 | **`grupoTopeId`** | `<banco>:<clave>` con un registro único de grupos (D5). | Si cada uno inventa su id, el motor ve dos saldos. |
| J5 | **Bancos** | Se siembran los 82 del catálogo, con ids reales y fecha (D6). | Evita que cada mitad agregue los suyos y se pisen. |
| J6 | **Orden y formato del archivo** | Entradas ordenadas por `categoriaId`, luego `fuenteId`; el generador reescribe el archivo con el mismo formato. | Menos conflictos de merge. |
| J7 | **Las 2 aserciones de `rls.test.sql`** | Pasan a contar solo las filas del propio test, no el total de `promociones`. | El corpus cargado en el reinicio rompe `count = 1` y `count = 2` (issue #34, de Joaquín). |

## Avisos a otras issues

- **#50 y #51** (Agustín/Santiago): MODO **sí** tiene endpoint de detalle por promo, `GET /promos/api/rewards/v2/benefit/<slug>`; trae los legales completos, el tope estructurado, el monto mínimo, el canal, los días, las redes y los bancos **por id del catálogo**. #50 pedía investigarlo y #51 puede dejar de traducir `name_bank` por nombre. También avisar que la comparación solo normalizada **no alcanza** para el listado (alias necesarios) y que "Exclusivo con" en la tarjeta es exclusividad de banco, no alcance del tope.
- **#51**: al publicar una promo `('modo', X)` debe dar de baja la `('manual', X)` del mismo `slug` (D2).
- **#53**: el corpus manual y los crudos versionados son su verdad de referencia.

## Cambios en `main` y PRs abiertos revisados (2026-11-02)

Se revisó lo mergeado desde que se escribió la spec (#86, #89) y los PRs abiertos (#87, #88, #90, #91). Nada obliga a rehacer el diseño. Lo que cambia:

| Origen | Qué cambió | Efecto en esta feature |
|---|---|---|
| Numeración de specs | `008-motor-app-redux` ya está en `main`; #91 usa 009 y #90 usa 010 | Esta spec se **renumera a 011** (carpeta, plan y `.specify/feature.json`). |
| #86 (mergeado) | `packages/motor/package.json` tiene `"prepare": "npm run build"` | `npm ci` compila el motor: `ingesta/` puede importar `@vuelto/motor` sin paso manual. Se quita el prerrequisito del quickstart. |
| #86 (mergeado) | `packages/motor/src/index.ts` exporta más funciones de `fecha.ts` | No choca con el export de `normalizar` que se agrega; el conflicto de merge, si lo hay, es de una línea. |
| #86 (mergeado) | `CLAUDE.md` describe `ingesta` como «Reservado» | Se actualiza esa fila en la fase de documentación. |
| #91 (abierto, sincronización del corpus en la app) | Contrato de escritura de `promociones` en `04-infrastructure.md`: **cada lote se confirma en menos de 5 minutos; nunca una sola transacción para todo el corpus**; una promo que sale se da de baja, no se borra; la app detecta ids que desaparecieron | La carga remota escribe en **lotes de hasta 50 filas, cada uno en su propio pedido** (un commit por lote), nunca una transacción única. El diseño ya daba de baja y no borraba. Los **ids deterministas** (D9) hacen que una re-siembra no deje compras apuntando a un id viejo. |
| #91 | La primera sincronización baja solo promos con `vigencia_hasta` dentro del período en curso y descarta `jurisdiccion = otra_provincia`; una baja llega como promo vencida | La promo «vencida» del corpus sirve para los tests del motor (fixtures); para que **la app** la reciba tiene que vencer dentro del período en curso. Se anota en `corpus-semilla.md`. |
| #91 | `npm run medir:corpus` mide el tamaño del corpus que baja la app | Partir una promo por banco (D3) infla el número de filas. Se mide con esa herramienta cuando #91 esté en `main`; si es un problema, se vuelve a excluir. |
| #90 (abierto, compras) | `compras_cliente.test.sql` inserta un banco `...b1` de prueba | No choca con los 82 ids reales; no cuenta filas de `promociones`. La única asunción de conteo sigue siendo `rls.test.sql` (J7). |
| #87, #88 (abiertos, motor/perfil) | No tocan `Promocion`, `promociones` ni `ingesta/` | Sin efecto. |

Compatibilidad con el mapeo de la app (`apps/mobile/src/sync/mapeo.ts` en #91): lee las columnas de `promociones` tal como las define #34 y descarta una fila que no cumpla el contrato del motor. Las entradas del corpus cumplen ese contrato por construcción (las valida el mismo conjunto de reglas), así que ninguna se pierde en silencio.

## Project Structure

### Documentation (this feature)

```text
specs/011-corpus-promociones-seed/
├── plan.md              # Este archivo
├── spec.md
├── critica.md           # Crítica de spec-critic
├── research.md          # Fase 0: decisiones con su razón y alternativas
├── data-model.md        # Fase 1: entradas del archivo, derivados y mapeo desde MODO
├── quickstart.md        # Fase 1: cómo validar de punta a punta
├── contracts/
│   └── corpus.md        # Fase 1: formato del archivo y comandos de los scripts
├── checklists/requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
ingesta/
├── package.json                  # scripts: lint, typecheck, test, corpus:*; deps: @vuelto/motor, @supabase/supabase-js
├── tsconfig.json
├── vitest.config.ts
└── src/
    └── corpus/
        ├── tipos.ts              # EntradaCorpus, Revision, Exclusion
        ├── validar.ts            # validador del archivo (M1): enums, fechas, coherencia del tope, fragmentos
        ├── bancos.ts             # normalizar + resolverBanco (ambigüedad = excluir)
        ├── bancos-alias.ts       # tabla de alias revisada
        ├── ids.ts                # UUID v5 determinista desde (fuente, fuenteId)
        ├── mapear.ts             # detalle de MODO → borrador de entrada (por código)
        ├── modo.ts               # cliente de MODO (fetch inyectable, pausa, User-Agent)
        ├── relevar.ts            # CLI: baja listado + detalle y guarda el crudo
        ├── generar.ts            # CLI: JSON → SQL de reinicio + fixtures del motor
        ├── cargar.ts             # CLI: carga remota idempotente (dry-run por defecto)
        └── *.test.ts

supabase/
├── config.toml                   # sql_paths ampliado: seed.sql, seed/bancos.sql, seed/promociones.sql
├── seed.sql                      # solo categorías (se saca el insert suelto de Galicia)
├── seed/
│   ├── promociones.json          # FUENTE DE VERDAD (compartida con Joaquín)
│   ├── exclusiones.json          # promos candidatas dejadas afuera, con motivo
│   ├── grupos-tope.json          # registro único de grupos de tope
│   ├── bancos.sql                # GENERADO desde el catálogo crudo
│   ├── promociones.sql           # GENERADO
│   └── crudo/<slug>.json         # tarjeta + detalle de MODO, con fecha (RNF-08)
├── tests/database/corpus.test.sql    # pgTAP: el corpus quedó cargado y consistente
└── tests/database/rls.test.sql       # 2 aserciones pasan a contar filas propias (J7)

packages/motor/src/
├── index.ts                      # + export { normalizar }
├── tipos.ts                      # solo el comentario de BancoId
└── test/corpus.ts                # GENERADO: fixtures tipadas como Promocion[] (excluido del build)

docs/
├── product/data/modo-bancos-raw.json   # catálogo crudo de 82 bancos, con fecha y fuente
├── product/corpus-semilla.md           # matriz de cobertura, limitaciones, resumen de exclusiones
├── product/alcance-mvp.md              # cadenas reales de supermercado (FR-016)
├── product/requisitos.md               # fila de RF-18 de «bloqueados» (M12)
├── design/DESIGN.md                    # nota en §9: el ejemplo Coto no tiene promo vigente (M12)
└── architecture/01-data-models.md      # traducción de banco con alias (M5)

CLAUDE.md                               # fila de `ingesta` deja de ser «Reservado» y suma los comandos reales
```

**Structure Decision**: el trabajo vive en `ingesta/` porque es el proceso que, por la constitución §IV, puede usar la service role y porque #50 y #51 lo van a ampliar. Los derivados (`bancos.sql`, `promociones.sql`, `test/corpus.ts`) son **generados y versionados**, y un test falla si no coinciden con lo que produce el generador a partir del JSON.

## Fases de implementación

Se detallan en `tasks.md`. Orden previsto, cada fase deja algo verificable:

1. **Andamiaje de `ingesta/`**: scripts, `tsconfig`, Vitest, ESLint; confirmar que el CI lo corre.
2. **Bancos**: catálogo crudo fechado, `normalizar` exportada, `resolverBanco` con alias y sus tests, seed completo de 82, y carga de categorías y bancos en la carga remota.
3. **Validador y modelo del archivo**: tipos, validador, ids estables y sus tests (rojos primero).
4. **Relevamiento y mapeo**: `modo.ts`, `relevar.ts`, `mapear.ts` con tests contra los crudos de muestra; correrlo sobre las dos categorías.
5. **Generador y carga remota**: `generar.ts` (SQL + fixtures) con verificación de desfase; `cargar.ts` con cliente inyectable; pgTAP del corpus; ajuste de `rls.test.sql` (J7).
6. **Primera tanda de promos revisadas** (ruta de la demo): Paladini, Farmacity y las otras cadenas con promo vigente; fixtures y compras de prueba del motor (SC-004).
7. **Resto del corpus** de las dos categorías, matriz de cobertura y registro de exclusiones.
8. **Documentación**: `alcance-mvp.md`, `DESIGN.md`, `requisitos.md`, `01-data-models.md`, comentario de `BancoId`, `corpus-semilla.md`, bitácora.
9. **Cierre**: `/code-review`, `test-runner`, `rules-guardian`, PR con `Closes #35` (cerrar la issue solo cuando Joaquín termine su mitad; hasta entonces `Refs #35`).

## Complexity Tracking

Sin violaciones de la constitución que justificar.

Hay una decisión de complejidad deliberada, no una violación: se generan tres derivados del mismo JSON en vez de mantenerlos a mano. La alternativa (SQL y fixtures escritos a mano) dejaría tres fuentes de verdad que se desfasan, que es justo el riesgo A2 de la crítica.
