# Implementation Plan: Pantalla «¿Con qué pago?» y Edge Function `recomendar`

**Branch**: `feat/43-recomendar-edge-function` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-recomendar-pantalla/spec.md`

## Summary

Crear la Edge Function `POST /functions/v1/recomendar`: autentica al usuario, valida la compra
propuesta, junta sus medios de pago, las promociones publicadas del rubro vigentes hoy y sus
compras del período (desde el día 1 del mes o el lunes de la semana, lo que sea anterior, en hora
de Argentina, calculado con el motor; más las promos de esas compras, issue #37), llama a `recomendar()` de
`@vuelto/motor` y devuelve la `Recomendacion` sin tocarla, con un contrato de errores fijo
(400/401/405/422/500). Es la primera Edge Function del proyecto, así que crea
`supabase/functions/_shared/` con la estructura de ADR-009 (handler → servicio → repositorios
detrás de interfaces) para que la reusen #45, #48 y #54. La pantalla Expo consume ese contrato.

**Alcance de esta rama** (lo que no depende de otras issues): toda la capa del servidor salvo
el acceso real a Postgres, con su suite de tests en Node, más el export de `fechaArgentina` en
el motor. **Bloqueado** y planificado en `tasks.md` como fases posteriores: repositorios sobre
Supabase y vista de comercios (#34), pantalla Expo (#39, #40, #41).

## Technical Context

**Language/Version**: TypeScript 6 (strict, `tsconfig.base.json`); Node ≥ 22.13 en tests y CI;
Deno (runtime de Supabase Edge Functions) en producción

**Primary Dependencies**: `@vuelto/motor` (workspace, importado por import map en Deno y por
alias en Node); ninguna dependencia de runtime nueva. El cliente de Supabase se tipa con una
interfaz estructural mínima propia, así que tampoco hace falta `@supabase/supabase-js` en Node.
DevDependencies del workspace `supabase`: `typescript`, `vitest` (mismas versiones que el motor)

**Storage**: Supabase Postgres, solo lectura, con la sesión del usuario (RLS). Tablas de la
issue #34; en esta rama, repositorios en memoria

**Testing**: Vitest en Node, sin red ni base (`*.test.ts` junto a cada módulo)

**Target Platform**: Supabase Edge Functions (Deno); app Expo (iOS/Android) para la pantalla

**Project Type**: backend serverless (Edge Function) + pantalla de app móvil

**Performance Goals**: respuesta en < 3 s con 4G en 19 de 20 pedidos (SC-002); el motor ya
cumple < 1 s con 2.000 promociones (spec 002)

**Constraints**: el motor no se importa en la app (RNF-02); sin LLM; sin service role; los
registros no incluyen datos del usuario; `index.ts` mínimo porque no lo chequea `tsc` en Node
(research R2)

**Scale/Scope**: 1 endpoint, 4 repositorios, 1 pantalla; corpus de la demo (decenas de promos)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | Sin compra concreta no se pide nada ni se muestra ninguna promo (FR-004). Las descartadas solo aparecen como respuesta a una compra | ✅ |
| II. Motor determinístico | El motor no cambia (solo se exporta `fechaArgentina`). Lo importa solo la Edge Function; la app no (FR-027). `ahora` lo toma el handler una vez y lo pasa al motor y a los filtros (R6). El servidor no reordena ni filtra el resultado (FR-021). Test de equivalencia con `recomendar()` directo (FR-024) | ✅ |
| III. Esquema y null explícito | No hay extractor. El body se valida con `comercio: string \| null` explícito; los tipos nuevos no usan `?:` | ✅ |
| IV. Secretos y privacidad | Sin Gemini ni service role: cliente con anon key + JWT del usuario, RLS aplica (FR-028). Registros solo con el tipo de error (R8). No crea tablas en esta rama; la vista de comercios lleva `security_invoker` (R10) | ✅ |
| V. Topes estimados con base | La pantalla muestra siempre el tope con su base o el aviso de "no informa tope" (FR-007). Los topes no mensuales quedan bloqueados por #37 para usuarios reales (FR-029) | ✅ con bloqueo explícito |
| VI. Test-first en el motor | El motor no gana lógica nueva. La capa del servidor también se escribe con tests primero (FR-024, FR-025, contrato de errores) | ✅ |

**Flujo de trabajo**: issue M → spec-kit completo. `rules-guardian` obligatorio antes del PR
(toca el motor y una Edge Function).

Re-check post-diseño: sin cambios. Las clases de repositorio en memoria y de servicio son de la
capa imperativa, permitidas por ADR-009; los datos siguen siendo `interface`.

## Project Structure

### Documentation (this feature)

```text
specs/004-recomendar-pantalla/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas R1–R10
├── data-model.md        # Entidades, validación y mapeo a tablas
├── quickstart.md        # Cómo validar
├── contracts/
│   └── recomendar.md    # Contrato HTTP de la Edge Function
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/motor/src/
└── index.ts                       # + export { fechaArgentina }

supabase/
├── package.json                   # scripts lint/typecheck/test; devDeps typescript, vitest
├── tsconfig.json                  # extiende tsconfig.base; paths @vuelto/motor → src; excluye */index.ts
├── vitest.config.ts               # alias @vuelto/motor → ../packages/motor/src/index.ts
└── functions/
    ├── _shared/                   # código común de todas las Edge Functions (ADR-009)
    │   ├── http.ts                # respuestaJson, contrato de errores (tabla de FR-022)
    │   ├── autenticar.ts          # interfaz Autenticador + AutenticadorSupabase (getUser)
    │   ├── repositorios.ts        # interfaces de los 4 repositorios
    │   ├── errores.ts             # CategoriaInexistenteError
    │   ├── validacion.ts          # validarCompraPropuesta (FR-019)
    │   ├── memoria/               # repositorios en memoria que registran llamadas (tests)
    │   └── supabase/              # repositorios sobre Postgres — BLOQUEADO por #34
    └── recomendar/
        ├── deno.json              # import map: @vuelto/motor → ../../../packages/motor/src/index.ts
        ├── index.ts               # composition root + Deno.serve (sin lógica)
        ├── handler.ts             # crearHandlerRecomendar(deps): Request → Response
        ├── handler.test.ts
        ├── servicio.ts            # ServicioRecomendacion
        └── servicio.test.ts

apps/mobile/                       # pantalla «¿Con qué pago?» — BLOQUEADO por #39/#40/#41
```

**Structure Decision**: se usa el workspace `supabase` ya reservado en el monorepo. El código
del servidor queda bajo `supabase/functions/`, que es donde lo espera la CLI de Supabase. Los
tests corren en el workspace con el mismo `npm run test` del CI.

## Complexity Tracking

Sin violaciones de la constitución.
