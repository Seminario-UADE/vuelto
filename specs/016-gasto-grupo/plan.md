# Implementation Plan: Gasto en grupo — quién de nosotros paga, con contactos vinculados

**Branch**: `claude/54-gasto-grupo` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-gasto-grupo/spec.md`

## Summary

Tres capas, en el orden en que se construyen y se prueban:

1. **Motor** (`packages/motor`): `recomendarGrupo` y `dividir`, funciones puras sobre una foto de los integrantes. Reusan `recomendar()` para evaluar a cada uno con su tope (FR-003), y suman el redondeo de lo que se muestra, el desempate, la base de cuatro casos y la división en pesos enteros. El consumo de topes pasa a un tipo mínimo (`ConsumoDeTope`) que `Compra` ya cumple.
2. **Base y Edge Function** (`supabase`): tablas `invitaciones` y `contactos` con RLS en la misma migración, funciones `security definer` en el schema `contactos_privado` con envoltorios `security invoker` en `public`, y la clave de servidor en Vault para los datos de los contactos. La Edge Function `recomendar-grupo` (handler → `ServicioGrupo` → repositorios) junta los datos con la sesión de quien pide, llama al motor y responde solo lo que permite FR-021.
3. **App** (`apps/mobile`): repositorio de contactos sobre Supabase, slice `contactos` persistido por cuenta, la pantalla nueva «Tengo una invitación», las pantallas existentes conectadas al backend real, con sus estados de error, y el borrado de los datos de ejemplo de grupo.

Decisiones técnicas en [research.md](research.md); modelo en [data-model.md](data-model.md); contratos en [contracts/](contracts/).

## Technical Context

**Language/Version**: TypeScript 6 (strict, `tsconfig.base.json`); SQL de PostgreSQL 17 (Supabase); Deno 2 para la Edge Function.

**Primary Dependencies**: motor sin `dependencies`. Edge Function: `@supabase/supabase-js@2` (jsr, en `deno.json`). App: Expo 58, Expo Router, Redux Toolkit, `@supabase/supabase-js` ^2.118, `expo-linking`, `expo-clipboard` (todas ya instaladas). Base: `pgcrypto` y `supabase_vault` (ya en el stack, verificado).

**Storage**: Postgres de Supabase (dos tablas nuevas y un schema). En el teléfono, AsyncStorage (`vuelto.contactos.v1`): la lista de contactos asociada a la cuenta.

**Testing**: Vitest (motor, Edge Function en Node, app), pgTAP (`supabase test db`), `deno check`, e integración de la app contra Supabase local (`test:integracion`).

**Target Platform**: iOS y Android con Expo (Expo Go y build de EAS); Edge Functions de Supabase (Deno).

**Project Type**: monorepo con app móvil, backend (Supabase) y biblioteca de reglas.

**Performance Goals**: el motor de grupo, con 12 integrantes, en milisegundos (son 12 llamadas a `recomendar()`). La Edge Function responde en el uso normal bastante antes del corte de 15 s de la app (SC-009).

**Constraints**: costo $0 (tier gratis de Supabase); el motor sin red, reloj ni LLM; RLS en la misma migración; ninguna función `security definer` en `public`; ningún dato de un contacto fuera de FR-021; la service role key no se usa.

**Scale/Scope**: grupos de 2 a 12 integrantes. Seis pantallas existentes ajustadas y una nueva. Una migración, cinco funciones con permisos elevados, una función con permisos normales y una Edge Function.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| **I. Decisión, no listado** | La respuesta es una sola decisión (quién paga, con qué medio) para una compra concreta: comercio, hoy, monto. No hay lista de promos (spec §Decisión que resuelve) | ✅ |
| **II. Motor determinístico** | `recomendarGrupo` es pura: `ahora` por parámetro, sin red ni base; misma foto, misma respuesta (SC-001). El grupo cruza usuarios, así que corre en una Edge Function que llama al mismo paquete; la app no lee datos ajenos. Los textos (`queDa`) son plantillas del motor, sin LLM | ✅ |
| **III. Extracción con esquema** | No aplica: no hay extractor. Los campos ausentes del contrato son `null` explícito, nunca opcionales | ✅ |
| **IV. Secretos y privacidad** | RLS en la misma migración que crea `invitaciones` y `contactos`. Sin service role key: la Edge Function usa el JWT del usuario y la clave de servidor, que no está en la app ni en el repo. `privacidad.md` actualizado (FR-032). Ninguna imagen de ticket en juego | ✅ |
| **V. Topes estimados con su base** | Toda cifra con «≈»; la base en palabras para los cuatro casos; sin compras, «sin base». El escalón de $100 sigue siendo un estimado. Una compra sin confirmar no cambia ningún tope (no se toca) | ✅ |
| **VI. Test-first en el motor** | Los tests de `grupo.test.ts` y `division.test.ts` van antes del código (tareas de la fase 2). La suite corre sin red | ✅ |
| **Flujo** | Issue L: spec-kit completo, con `spec-critic` hecho; `rules-guardian` obligatorio (motor y migración); `/code-review` y `test-runner` antes del PR; bitácora | ✅ |

**Re-check después del diseño (fase 1)**: sin cambios. Dos puntos que conviene que mire un revisor:

- `contactos_privado` es un schema nuevo con `usage` para `authenticated`. Es la opción que mantiene intacto el test de estructura (research R2).
- `GrupoInvalidoError` es la segunda clase del motor. ADR-009 admite clases para errores; es el mismo caso que `PerfilSinMediosError`.

## Project Structure

### Documentation (this feature)

```text
specs/016-gasto-grupo/
├── spec.md
├── plan.md              # este archivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── recomendar-grupo.md
│   └── rpc-contactos.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/motor/src/
├── tipos.ts                 # + ConsumoDeTope, CompraDeGrupo, IntegranteDeGrupo, BaseDeGrupo, OpcionDeGrupo, RecomendacionDeGrupo
├── tope.ts                  # calcularSaldos acepta ConsumoDeTope[]
├── recomendar.ts            # comprasDelPeriodo: readonly ConsumoDeTope[]
├── estimar.ts               # ídem
├── division.ts              # nuevo: dividir()
├── division.test.ts         # nuevo
├── grupo.ts                 # nuevo: recomendarGrupo()
├── grupo.test.ts            # nuevo
├── errores.ts               # + GrupoInvalidoError
└── index.ts                 # exporta lo nuevo

supabase/
├── migrations/20261115000001_contactos.sql      # tablas, RLS, schema, funciones, envoltorios
├── tests/database/contactos.test.sql            # pgTAP nuevo
├── functions/
│   ├── .env.example                             # GRUPO_CLAVE_SERVIDOR (el .env no se commitea)
│   ├── _shared/
│   │   ├── repositorios.ts                      # + RepositorioContactos, DatosDeContacto
│   │   ├── filas.ts (+ .test.ts)                # nuevo: fila → tipos del motor
│   │   ├── http.ts                              # + contacto_no_vinculado (409)
│   │   ├── errores.ts                           # + ContactoNoVinculadoError
│   │   ├── memoria/repositorios.ts              # + contactos en memoria
│   │   └── supabase/                            # nuevo: repositorios reales (solo deno check)
│   └── recomendar-grupo/
│       ├── index.ts                             # composition root
│       ├── handler.ts (+ .test.ts)
│       ├── servicio.ts (+ .test.ts)
│       ├── respuesta.ts (+ .test.ts)            # lista blanca de FR-021
│       ├── validacion.ts (+ .test.ts)
│       └── deno.json
├── tsconfig.json                                # excluye functions/_shared/supabase
└── vitest.config.ts                             # ídem en la cobertura

apps/mobile/src/
├── grupo/                                       # nuevo
│   ├── repositorio.ts                           # interfaz + Supabase
│   ├── repositorio-memoria.ts
│   ├── token.ts (+ .test.ts)                    # tokenDeInvitacion()
│   └── vista.ts (+ .test.ts)                    # respuesta → RecomendacionGrupo con textos
├── store/contactos.ts (+ thunks, tests)         # slice por cuenta, persistido
├── store/contactos.ts                           # persiste {cuentaId, lista} en vuelto.contactos.v1
├── hooks/use-contactos.ts                       # carga al entrar, en primer plano y al enfocar
├── data/contracts.ts                            # PedidoGrupo, EstadoInvitacion, RecomendacionGrupo
├── data/api.ts                                  # sin funciones de grupo ni invitaciones
├── data/fixtures.ts                             # sin datos de grupo
├── data/grupo-simulado.ts                       # se borra
└── app/
    ├── comprar/recomendacion.tsx                # «¿Pagan entre varios?» solo con rubro
    ├── grupo/armar.tsx, grupo/resultado.tsx
    ├── contactos/index.tsx, invitar.tsx, quitar.tsx, pegar.tsx (nueva)
    └── i/[token].tsx

docs/ (FR-032, FR-033): product/privacidad.md, decisions/008, decisions/010, product/requisitos.md,
product/pendientes.md, architecture/01-data-models.md, architecture/04-infrastructure.md,
specs/006-app-mobile-pantallas/spec.md, CLAUDE.md, bitacora-prompts.md
```

**Structure Decision**: se usan los cuatro workspaces que ya existen; no se crea ninguno. La lógica de grupo de la app va en una carpeta nueva `apps/mobile/src/grupo/`, igual que `sync/` y `perfil/`.

## Fases de implementación (para `/speckit-tasks`)

1. **Motor, tests primero** (US1): `ConsumoDeTope` en las firmas existentes (la suite actual tiene que seguir pasando sin tocar sus tests), tests de `dividir` y de `recomendarGrupo`, y después el código.
2. **Base** (US2, cimiento de US3): pgTAP primero, después la migración. `supabase db reset` y `supabase test db`.
3. **Edge Function** (US3): validación, respuesta (con el test de SC-008), servicio y handler con repositorios en memoria; repositorios reales y `index.ts`; `deno check`.
4. **App: contactos** (US2): repositorio, token, slice y persistencia, hooks, pantallas de contactos e invitación, pegar.
5. **App: grupo** (US3): vista, armar, resultado, paso de compra, borrado de los datos de ejemplo.
6. **Docs y cierre**: enmiendas de los ADR, privacidad, requisitos, pendientes, data models, infraestructura, spec 006, CLAUDE.md, bitácora; chequeos del PR.

## Complexity Tracking

Sin violaciones de la constitución. Deuda que se acepta a sabiendas:

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| `_shared/filas.ts` repite el mapeo de promociones de `apps/mobile/src/sync/mapeo.ts` | Otro workspace y otro runtime (Deno); importar código de la app desde la Edge Function acopla el backend a la app | Mover el mapeo al motor: le metería la forma de las filas de Postgres al núcleo (ADR-009) |
| Clave de servidor cargada a mano en el proyecto alojado | Es la forma de cerrar B1 sin la service role key | Rol de base propio con conexión directa (research R1) |
