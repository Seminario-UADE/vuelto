---
description: "Tareas para el perfil de bancos, tarjetas y redes (issue #41)"
---

# Tasks: Perfil — declarar bancos, tarjetas y redes (MODO)

**Input**: `spec.md` y `plan.md` de `specs/001-perfil-billeteras/`. Todo lo que dice "según plan" está detallado en `plan.md` §Decisiones y §Código de la app.

**Tests**: test-first para las funciones puras de `apps/mobile/src/perfil/`: cada test se escribe antes y tiene que fallar primero. Las pantallas se prueban con los escenarios de aceptación de la spec.

**Formato**: `[ID] [P?] [Story] Descripción`. `[P]` = se puede hacer en paralelo. `pf/` = `apps/mobile/src/perfil/`.

---

## Phase 1: Base — **BLOQUEADA por #39** (app base)

- [ ] T001 Verificar que `npm ci`, `lint`, `typecheck` y `test` pasan. Confirmar el runner de tests y el almacenamiento local que dejó la #39. Si falta alguno, sumar Vitest al workspace `apps/mobile` (`include` `["src/**/*.test.ts"]`) y AsyncStorage con `npx expo install @react-native-async-storage/async-storage`.
- [ ] T002 [P] Escribir `pf/modelo.test.ts`:
  - `esDuplicado`: `true` con la misma tripleta. `false` si cambia solo la red (Galicia crédito Visa vs. crédito American Express, US1-3), solo el tipo o solo el banco.
  - `puedeConfirmar`: `false` con `[]`, `true` con 1.
  - `puedeSacar`: `false` con 1, `true` con 2.
  - `clasificarError`: los 5 casos de la tabla del plan (`23505`, `23503`, `status` 401, `status` 0 o `fetch` fallido, cualquier otro).
- [ ] T003 Implementar `pf/modelo.ts` según plan: tipos sin `?:`, `ETIQUETAS_RED`, las tres reglas y `clasificarError`. No importa `@vuelto/motor` (decisión 2). Hace pasar T002.
- [ ] T004 [P] Escribir `pf/buscarBancos.test.ts`:
  - `"galic"`, `"GALIC"` y `"Galíc"` encuentran "Galicia".
  - Encuentra la palabra aunque esté en el medio del nombre.
  - Los espacios de más no importan.
  - Texto vacío o sin coincidencias → `[]`.
  - Con coincidencias dentro y fuera de `on_hub_list`, los `on_hub_list` van primero y cada grupo queda en orden alfabético (US3-1).
  - El resultado es el mismo sin importar el orden del catálogo de entrada.
- [ ] T005 Implementar `pf/buscarBancos.ts` según la decisión 7 del plan: la normalización exacta que figura ahí, desempate por `id` y sin `localeCompare`. Hace pasar T004.

**Checkpoint**: `npm run test -w @vuelto/mobile` en verde.

---

## Phase 2: User Story 1 — Declarar medios en el onboarding (P1) 🎯 MVP — **BLOQUEADA por #34 y #40**

- [ ] T006 [US1] Implementar `pf/datos.ts` según plan:
  - las 5 operaciones, con `bancos(nombre)` embebido en las lecturas y en lo que devuelven los `insert`;
  - el mapeo de columnas;
  - el resultado `{ ok, datos } | { ok: false, error }`, sin lanzar;
  - el cache por usuario.
  Nunca manda `usuario_id`.
- [ ] T007 [P] [US1] Crear `apps/mobile/components/SelectorMedio.tsx`:
  - buscador (T005) sobre `leerBancos()`, con el cache como respaldo;
  - al elegir un banco, elegir tipo y red con `ETIQUETAS_RED`;
  - "Agregar" deshabilitado sin red (FR-005) o si `esDuplicado` contra los medios que recibe por props (FR-004);
  - sin resultados: "Ese banco o emisor no está disponible en esta versión. Podés seguir con otro medio de pago." (US1-7);
  - devuelve el `MedioNuevo` por un callback y no guarda nada.
- [ ] T008 [US1] Crear `apps/mobile/app/onboarding/medios-de-pago.tsx`:
  - usa `SelectorMedio` y muestra la lista de agregados, que se pueden quitar antes de confirmar;
  - "Confirmar" deshabilitado si `!puedeConfirmar` (FR-007);
  - "Confirmar" llama `confirmarOnboarding` en un solo pedido (FR-011);
  - hasta confirmar, nada se guarda (FR-006);
  - errores según `clasificarError`.
- [ ] T009 [US1] En el control de sesión que deja la #40, si `leerMisMedios()` devuelve `[]`, llevar al onboarding sin salida hasta confirmar. La ruta tiene que ser la misma a la que lleva la #43 cuando `recomendar` responde 422 `perfil_sin_medios`.

**Checkpoint**: escenarios US1-1 a US1-7 de la spec OK en Expo Go.

---

## Phase 3: User Story 2 — Editar desde Perfil (P2) — **BLOQUEADA por #34 y #40**

- [ ] T010 [US2] Crear `apps/mobile/app/(tabs)/perfil.tsx`:
  - lista de `leerMisMedios()` con `nombreBanco`, tipo y etiqueta de red;
  - "Agregar" abre `SelectorMedio` y llama `agregarMedio`;
  - "Sacar" llama `sacarMedio` y queda deshabilitado si `!puedeSacar` (FR-009);
  - cada cambio exitoso refresca la lista y el cache.
- [ ] T011 [US2] Sin conexión (FR-010, FR-012, SC-003):
  - si `leerMisMedios()` da `sin_conexion`, mostrar el cache con el aviso "Sin conexión: tu perfil se muestra como estaba la última vez. Para editarlo necesitás conexión." y deshabilitar agregar y sacar;
  - si tampoco hay cache, mostrar el error de conexión, nunca una carga infinita;
  - llamar `borrarCache()` al cerrar sesión (FR-013).

**Checkpoint**: escenarios US2-1 a US2-3 y la prueba de dos usuarios del plan §Cómo validar OK.

> US3 (priorizar `on_hub_list`) no tiene fase propia: es parte de `buscarBancos` (T004–T005).

---

## Phase 4: Cierre

- [ ] T012 Verificar `grep -rn "@vuelto/motor" apps/mobile` → 0 resultados (RNF-02).
- [ ] T013 Correr `rules-guardian`, `/code-review` y `test-runner`, y corregir lo que encuentren. Agregar la entrada en `docs/bitacora-prompts.md`. El PR cierra la issue (`Closes #41`).

---

## Orden

- **Phase 1**: cuando cierre la #39. Son funciones puras y no necesitan la base. T002 y T004 van en paralelo.
- **Phases 2 y 3**: cuando cierren además la #34 y la #40. T006 y T007 van en paralelo. T008 depende de las dos. La Phase 3 reusa `SelectorMedio`.
