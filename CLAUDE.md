# Vuelto

> Asistente de decisión de medio de pago y control de topes de reintegro.
> MVP — Seminario de Integración Profesional (UADE).

## Qué es

En Argentina, las promociones bancarias cambian por día, billetera, banco y tarjeta,
y tienen tope de reintegro mensual compartido entre promos. Vuelto no lista
promociones — recomienda **qué medio de pago usar en una compra concreta** y
controla **cuánto tope de reintegro queda**, que hoy es invisible para el
usuario.

> **Regla de oro:** si una funcionalidad se puede describir como "mostrar
> promociones", no es este producto.

Contexto completo del producto: `docs/product/`.
Arquitectura técnica: `docs/architecture/`.
Decisiones y su razonamiento: `docs/decisions/`.
Registro de sesiones de trabajo con IA (para la cátedra): `docs/bitacora-prompts.md`.
Declaración end-to-end de dónde se usa IA en el proyecto: `docs/uso-de-ia.md`.

## Estado

Monorepo con npm workspaces inicializado (issue #32). Requiere Node ≥ 22.13
(versión fijada en `.nvmrc`; ESLint 10 y Vitest 5 no soportan Node 20).

| Workspace | Contenido |
|---|---|
| `packages/motor` (`@vuelto/motor`) | Motor de reglas: TS puro, sin `dependencies`, tests Vitest |
| `apps/mobile` | App Expo (issue #39). Importa `@vuelto/motor` y guarda su estado en Redux; la recomendación y los topes son selectores (ADR-010, issue #81). Sincroniza el corpus y las compras del período desde Supabase (`src/sync/`, issue #42). Tests Vitest de cálculo, store, persistencia y sincronización; `npm run test:integracion -w @vuelto/mobile` prueba las consultas contra un Supabase local (Docker) |
| `supabase` (`@vuelto/supabase`) | Edge Functions (`functions/`: `recomendar`, hoy fuera del camino de la app por ADR-010, y `_shared/`, tests Vitest); `migrations/` (esquema con RLS), `seed.sql` y `tests/database/` (pgTAP, `supabase test db`). Los `functions/*/index.ts` corren en Deno: los chequea `deno check` en el CI, no `tsc` |
| `ingesta` | Corpus de promociones sembrado a mano desde MODO (issue #35): `src/corpus/` con el relevamiento, el mapeo del detalle de MODO, la validación, el generador de SQL y de fixtures, la carga remota y el reporte de cobertura. Tests Vitest sin red. El extractor con Gemini (#50, #51) se suma acá |

Comandos (desde la raíz; recorren todos los workspaces, los mismos que corre el CI):

```bash
npm ci              # instalar dependencias
npm run lint        # ESLint (config en eslint.config.js)
npm run typecheck   # tsc --noEmit (strict, tsconfig.base.json)
npm run test        # Vitest
npm run build       # compilación TS a dist/ (no es build de Expo/EAS)
```

El CI corre además `deno check` sobre cada `supabase/functions/*/index.ts`
(job `deno-check`). A mano: `deno check --no-lock --config
supabase/functions/recomendar/deno.json supabase/functions/recomendar/index.ts`.
El job `supabase-rls` levanta Supabase local, hace `supabase db reset` dos
veces y corre `supabase test db` (requiere Docker). A mano, lo mismo desde la
raíz; si los puertos por defecto (54321-54329) están ocupados por otro
proyecto de Supabase, hay que frenarlo o cambiarlos solo en tu copia local.

Un solo workspace: `npm run test -w @vuelto/motor`. Tests en modo watch:
`npx vitest` dentro de `packages/motor`. Un workspace nuevo se suma a
`workspaces` del `package.json` raíz y define los scripts que le apliquen.

Corpus de promociones sembrado a mano (issue #35, `specs/011-corpus-promociones-seed/`), desde la raíz:

```bash
npm run corpus:relevar -w ingesta -- --categorias 1,4   # baja el listado y el detalle de MODO a supabase/seed/crudo/ (red, pausa >= 1 s)
npm run corpus:cobertura -w ingesta -- --lista          # qué promos faltan revisar, por comercio (--casos: candidatas por caso)
npm run corpus:borrador -w ingesta -- <slug>            # borrador de una promo y frases de su letra chica
npm run corpus:generar -w ingesta                       # valida promociones.json y regenera SQL y fixtures (--verificar: no escribe)
node --env-file=supabase/.env ingesta/src/corpus/cargar.ts [--aplicar]   # carga remota; por defecto no escribe
```

Si cambia `packages/motor/src`, recompilarlo (`npm run build -w @vuelto/motor`) antes de correr un script
`corpus:*`: usan el motor compilado, mientras que los tests de Vitest usan su código fuente.

## Stack decidido (costo $0 durante el cuatrimestre)

| Pieza | Elección |
|---|---|
| Motor de reglas | Paquete TypeScript propio, sin dependencias, con su suite de tests. Corre **en la app** (recomendación y topes en vivo, sin red) y, para el gasto en grupo, en una Edge Function (ADR-010) |
| Cliente mobile | Expo (React Native) con Redux Toolkit como estado: perfil, corpus de promociones y compras del período; la recomendación y los topes se derivan con selectores, no se guardan |
| Backend / DB | Supabase (Postgres + Auth + RLS). Edge Functions solo donde hay un secreto o datos de otros usuarios (ticket, grupo, invitaciones) |
| Extractor | Gemini API — **siempre del lado del servidor**, nunca en el cliente |
| Ingesta / scraping | Playwright (dónde corre el cron: pendiente) |
| Testing | Vitest sobre el motor + Expo Go para ejecución manual |

## Reglas que la IA siempre debe seguir en este proyecto

- **El modelo de lenguaje nunca entra al motor de reglas.** La recomendación
  al usuario sale de código determinístico. El LLM vive solo en la ingesta
  (offline, batch, fuera del camino crítico). No proponer "preguntarle al
  modelo cuál medio de pago conviene": mata el determinismo, los tests y el
  argumento de innovación tecnológica de la materia.
- **Núcleo funcional, capa imperativa** (ADR-009). El motor son funciones
  puras sobre datos planos (`interface`/`type`, no clases). Las Edge
  Functions que quedan se organizan en handler (rol de controller) →
  service → repositorios detrás de interfaces, inyectados por constructor,
  con el código común en `supabase/functions/_shared/`. Sin framework ni
  contenedor de DI.
- **La recomendación y los topes se derivan, no se guardan** (ADR-010). La
  app los calcula con el motor en selectores memoizados sobre el estado de
  Redux; el reloj entra como valor del store (`ahora`), nunca con `new Date()`
  adentro. Lo que cruza datos de varios usuarios (grupo) queda en una Edge
  Function.
- **Salida del extractor siempre estructurada contra un esquema.** Campos
  ausentes se devuelven `null` explícito — nunca inventados ni inferidos.
  Esquema: `{"type": ["string", "null"]}`, no campos opcionales.
- **La API key de Gemini nunca va en la app del celular.** Letra chica → script
  de ingesta. Ticket → Edge Function de Supabase.
- **Las imágenes de ticket no se persisten** (se mandan a Gemini y se
  descartan; no se escriben a disco ni a Supabase Storage en ningún paso del
  camino). Sí se persiste el texto extraído junto al registro de compra.
  Detalle completo de qué se guarda y por cuánto tiempo:
  `docs/product/privacidad.md`.
- **La ingesta de promociones es 100% automática, sin revisión humana.** El
  extractor publica el borrador directo si completa el esquema (todos los
  campos obligatorios no `null`); si no lo completa, se descarta solo, sin
  cola de aprobación. (El corpus sembrado a mano de la issue #35 no es
  ingesta: ver ADR-005 §Consecuencias.)
- **Topes de reintegro siempre se muestran como estimados, con su base**
  (ej. "≈$18.000, según 4 compras registradas"). Nunca una cifra falsamente
  precisa.
- **Row-level security se escribe al crear cada tabla en Supabase**, no después.

## Fuera de alcance (MVP), explícito

Integración bancaria directa, lectura automática de resúmenes/movimientos,
cobertura nacional, app nativa nuda (se usa Expo).

## Agent skills

### Issue tracker

Issues viven en GitHub Issues (`Seminario-UADE/vuelto`), vía la CLI `gh`. Ver
`docs/agents/issue-tracker.md`.

### Domain docs

Layout single-context. Los docs de dominio viven en `docs/product/`,
`docs/architecture/` y `docs/decisions/` (en vez de `CONTEXT.md`/`docs/adr/`,
que es el default de las skills). Ver `docs/agents/domain.md`.

### Specs

Las specs de feature se generan con spec-kit (`/speckit-specify →
spec-critic → /speckit-plan → /speckit-tasks → /speckit-implement → /code-review →
test-runner`), no con la skill `to-spec`. Ver
`docs/decisions/007-speckit-sobre-to-spec.md`. Issues XS/S se implementan
sin spec-kit. Principios no negociables para el chequeo de `/speckit-plan`:
`.specify/memory/constitution.md`.
