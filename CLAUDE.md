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
| `apps/mobile` | Reservado — la app Expo la crea la issue #39 |
| `supabase` (`@vuelto/supabase`) | Edge Functions (`functions/`: `recomendar` y `_shared/`, tests Vitest); migraciones y seed llegan con la issue #34. Los `functions/*/index.ts` corren en Deno: los chequea `deno check` en el CI, no `tsc` |
| `ingesta` | Reservado — script de ingesta de MODO |

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

Un solo workspace: `npm run test -w @vuelto/motor`. Tests en modo watch:
`npx vitest` dentro de `packages/motor`. Un workspace nuevo se suma a
`workspaces` del `package.json` raíz y define los scripts que le apliquen.

## Stack decidido (costo $0 durante el cuatrimestre)

| Pieza | Elección |
|---|---|
| Motor de reglas | Paquete TypeScript propio, sin dependencias, con su suite de tests. Corre **solo en la Edge Function** de Supabase; la app no lo importa |
| Cliente mobile | Expo (React Native) |
| Backend / DB | Supabase (Postgres + Auth) |
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
  Functions se organizan en handler (rol de controller) → service →
  repositorios detrás de interfaces, inyectados por constructor, con el
  código común en `supabase/functions/_shared/`. Sin framework ni
  contenedor de DI.
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
  cola de aprobación.
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
