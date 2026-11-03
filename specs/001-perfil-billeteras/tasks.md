---
description: "Tareas para el perfil de bancos, tarjetas y redes (issue #41)"
---

# Tasks: Perfil — declarar bancos, tarjetas y redes (MODO)

**Input**: `spec.md` y `plan.md` de `specs/001-perfil-billeteras/`. Todo lo que dice "según plan" está detallado en `plan.md` §Decisiones y §Código de la app.

> **Actualizado el 02/11/2026 por ADR-010.** El perfil vive en el slice `perfil` de Redux (#81), que también lo persiste: se cayó el cache propio de esta feature. Las fases 1 y 2a (modelo, buscador, acceso a Supabase y selector) se hacen ya; conectar las pantallas (fases 2b y 3) espera a la #40 y a que el slice `perfil` guarde `MedioDePago` (la #81 ya cerró).

**Tests**: test-first para las funciones puras de `apps/mobile/src/perfil/`: cada test se escribe antes y tiene que fallar primero. Las pantallas se prueban con los escenarios de aceptación de la spec.

**Formato**: `[ID] [P?] [Story] Descripción`. `[P]` = se puede hacer en paralelo. `pf/` = `apps/mobile/src/perfil/`.

---

## Phase 1: Base — desbloqueada (la #39 cerró)

- [x] T001 Verificar que `npm ci`, `lint`, `typecheck` y `test` pasan. La #39 dejó Vitest (`src/**/*.test.ts`) y AsyncStorage.
- [x] T002 [P] Escribir `pf/modelo.test.ts`:
  - `esDuplicado`: `true` con la misma tripleta. `false` si cambia solo la red (Galicia crédito Visa vs. crédito American Express, US1-3), solo el tipo o solo el banco.
  - `puedeConfirmar`: `false` con `[]`, `true` con 1.
  - `puedeSacar`: `false` con 1, `true` con 2.
  - `clasificarError`: los 5 casos de la tabla del plan (`23505`, `23503`, `status` 401, `status` 0 o `fetch` fallido, cualquier otro).
  - `REDES` y `TIPOS_TARJETA` tienen los mismos valores que el motor (decisión 2).
- [x] T003 Implementar `pf/modelo.ts` según plan: tipos sin `?:`, `ETIQUETAS_RED`, las tres reglas y `clasificarError`. Hace pasar T002.
- [x] T004 [P] Escribir `pf/buscar-bancos.test.ts`:
  - `"galic"`, `"GALIC"` y `"Galíc"` encuentran "Galicia".
  - Encuentra la palabra aunque esté en el medio del nombre.
  - Los espacios de más no importan.
  - Texto vacío o sin coincidencias → `[]`.
  - Con coincidencias dentro y fuera de `on_hub_list`, los `on_hub_list` van primero y cada grupo queda en orden alfabético (US3-1). `onHubList: null` se ordena como no priorizado (decisión 9).
  - El resultado es el mismo sin importar el orden del catálogo de entrada.
- [x] T005 Implementar `pf/buscar-bancos.ts` según la decisión 7 del plan: la normalización exacta que figura ahí, desempate por `id` y sin `localeCompare`. Hace pasar T004.

**Checkpoint**: `npm run test -w @vuelto/mobile` en verde.

---

## Phase 2a: User Story 1 — piezas que no dependen del store ni de la sesión

- [x] T006 [US1] Implementar `pf/datos.ts` según plan:
  - las 5 operaciones, con `bancos(nombre)` embebido en las lecturas y en lo que devuelven los `insert`;
  - el mapeo de columnas (`banco_id`, `user_id`, `creado_en`, como quedaron en la #34);
  - el resultado `{ ok, datos } | { ok: false, error }`, sin lanzar;
  - recibe el cliente de Supabase por parámetro y nunca manda `user_id`.
  Tests en `pf/datos.test.ts` con un cliente falso.
- [x] T007 [P] [US1] Crear `apps/mobile/src/components/selector-medio.tsx`:
  - buscador (T005) sobre el catálogo que recibe por props;
  - al elegir un banco, elegir tipo y red con `ETIQUETAS_RED`;
  - "Agregar" deshabilitado sin red (FR-005) o si `esDuplicado` contra los medios que recibe por props (FR-004);
  - sin resultados: "Ese banco o emisor no está disponible en esta versión. Podés seguir con otro medio de pago." (US1-7);
  - devuelve el `MedioNuevo` por un callback y no guarda nada.

## Phase 2b: User Story 1 — conectar el onboarding (P1) 🎯 MVP — **BLOQUEADA por #40 y por reconciliar el slice `perfil` con `MedioDePago`**

- [ ] T008 [US1] En `apps/mobile/src/app/(onboarding)/medios.tsx`:
  - reemplazar la lista fija de medios por `SelectorMedio` y mostrar la lista de agregados, que se pueden quitar antes de confirmar;
  - "Confirmar" deshabilitado si `!puedeConfirmar` (FR-007);
  - "Confirmar" llama `confirmarOnboarding` en un solo pedido (FR-011) y guarda el resultado en el slice `perfil`;
  - hasta confirmar, nada se guarda (FR-006);
  - errores según `clasificarError`.
- [ ] T009 [US1] En el control de sesión que deja la #40, si `leerMisMedios()` devuelve `[]`, llevar al onboarding sin salida hasta confirmar. La ruta tiene que ser la misma a la que lleva la #43 cuando el motor lanza `PerfilSinMediosError`.

**Checkpoint**: escenarios US1-1 a US1-7 de la spec OK en Expo Go.

---

## Phase 3: User Story 2 — Editar desde Perfil (P2) — **BLOQUEADA por #40 y por reconciliar el slice `perfil` con `MedioDePago`**

- [ ] T010 [US2] En `apps/mobile/src/app/(tabs)/perfil.tsx`:
  - lista de medios del slice `perfil` con `nombreBanco`, tipo y etiqueta de red;
  - "Agregar" abre `SelectorMedio` y llama `agregarMedio`;
  - "Sacar" llama `sacarMedio` y queda deshabilitado si `!puedeSacar` (FR-009);
  - cada cambio exitoso actualiza el slice.
- [ ] T011 [US2] Sin conexión (FR-010, FR-012, SC-003):
  - si `leerMisMedios()` da `sin_conexion`, mostrar lo que tiene el slice con el aviso "Sin conexión: tu perfil se muestra como estaba la última vez. Para editarlo necesitás conexión." y deshabilitar agregar y sacar;
  - si el slice tampoco tiene nada, mostrar el error de conexión, nunca una carga infinita;
  - al cerrar sesión se vacía el slice (FR-013).

**Checkpoint**: escenarios US2-1 a US2-3 y la prueba de dos usuarios del plan §Cómo validar OK.

> US3 (priorizar `on_hub_list`) no tiene fase propia: es parte de `buscar-bancos` (T004–T005). Con datos reales necesita que la tabla `bancos` sume `on_hub_list` (plan §Lo que dejó la #34).

---

## Phase 4: Cierre

- [x] T012 ~~Reemplazar `Red` y `TipoTarjeta` por `import type` del motor~~ (hecho: la #81 ya sumó el motor).
- [ ] T013 Correr `rules-guardian`, `/code-review` y `test-runner`, y corregir lo que encuentren. Agregar la entrada en `docs/bitacora-prompts.md`. El PR cierra la issue (`Closes #41`).

---

## Orden

- **Phase 1 y 2a**: ya. Son funciones puras y un componente que recibe todo por props.
- **Phase 2b y 3**: cuando cierre la #40 (sesión) y el slice `perfil` guarde `MedioDePago` en vez de ids del catálogo fijo. T008 y T010 reusan `SelectorMedio`.
