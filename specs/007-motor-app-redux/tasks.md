---

description: "Tareas para el motor en la app y el store de Redux (issue #81)"
---

# Tasks: App — motor en el dispositivo y store de Redux

**Input**: `specs/007-motor-app-redux/` (spec.md, plan.md, research.md, data-model.md, contracts/store.md, quickstart.md)

**Tests**: obligatorios para el cálculo, los reducers, los selectores y la persistencia (SC-001, SC-003, SC-004). Van antes o junto con el código.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (motor real), US2 (en vivo), US3 (mismo estado), US4 (persistencia)
- El código vive en `apps/mobile/src/` salvo que se indique otra ruta.

---

## Phase 1: Setup — resolver el motor (FR-001, FR-002)

- [ ] T001 `"prepare": "npm run build"` en `packages/motor/package.json`; `@vuelto/motor`, `@reduxjs/toolkit` y `react-redux` en `apps/mobile/package.json`; `package-lock.json` actualizado.
- [ ] T002 Verificar R1: `rm -rf packages/motor/dist && npm ci` deja `dist/`, y `expo export` para ios, android y web empaqueta el motor.

**Checkpoint**: la app puede importar `@vuelto/motor` desde un checkout limpio.

---

## Phase 2: US1 — la recomendación y los topes salen del motor (paso 1 de ADR-010)

- [ ] T003 [US1] En `data/fixtures.ts`: medios del motor por id de la app, las 4 promociones como `Promocion`, las compras de octubre como `Compra` del motor, el reloj de ejemplo (`RELOJ_EJEMPLO`) y los datos de Lucía y Mateo, según `data-model.md`. Borrar `PromoFixture`, `consumido`, `consejos` y `contactoServidor`.
- [ ] T004 [US1] Tests en `data/calculo.test.ts` (fallan primero): las cuatro respuestas de US1 con cifras exactas (SC-001); las causas `categoria` no aparecen; perfil sin medios con promos → `sin-promo`; vista de topes de Galicia (≈$6.500, 3 compras), Santander (disponible, ≈$2.300), Macro (agotado, "vuelve el 1/11") y Provincia (`sin-base`); reintegro de una compra guardada (FR-008).
- [ ] T005 [US1] `data/calculo.ts`: `perfilDelMotor`, `recomendacionVista(entradas, comercio, monto)` (monto `null` → 0, filtra `categoria`, usa `aVista`), `topesVista(entradas, opciones)`, `comprasVista`, `compraParaGuardar(entradas, borrador)`. Pasa T004.
- [ ] T006 [US1] `data/grupo-simulado.ts` con el motor por integrante (FR-012) y su test (`grupo-simulado.test.ts`): la cena del sábado la paga Mateo con Provincia, ≈$5.000; Lucía sin compras dice "sin base".
- [ ] T007 [US1] `api.recomendar`/`getTopes`/`getCompras`/`guardarCompra`/`recomendarGrupo` sobre `calculo.ts` y `grupo-simulado.ts`; borrar `servidor-simulado.ts`. Adaptar `api.test.ts`. `TopeMedio.cifra` en `contracts.ts` y `components/tope-card.tsx`.
- [ ] T008 [US1] lint, typecheck y tests en verde. **Commit 1** ("paso 1 de ADR-010").

**Checkpoint**: misma app, con el cálculo real; `servidor-simulado.ts` no existe.

---

## Phase 3: Foundational — el store (FR-009, FR-005, FR-006)

- [ ] T009 [P] `store/sesion.ts`, `store/perfil.ts`, `store/corpus.ts`, `store/compras.ts`, `store/simulacion.ts`, `store/contactos.ts` según `contracts/store.md`, con `rehidratado` en `extraReducers`.
- [ ] T010 [P] Tests de reducers en `store/slices.test.ts`: monto ≤ 0 → `null`; cambiar de comercio borra el monto; `escenarioElegido("mes-vacio")` vacía compras y `"normal"` las restituye; `sesionCerrada`.
- [ ] T011 `store/index.ts`: `crearStore`, `RootState`, `AppDispatch`, `useAppSelector`, `useAppDispatch`.

---

## Phase 4: US2 + US3 — selectores derivados

- [ ] T012 [US2] Tests en `store/selectores.test.ts`: SC-001 sobre el store; cambiar solo el monto conserva `selectEntradasMotor` (misma referencia) y cambia solo reintegro/te sale/tope después; estado idéntico → mismo objeto y `recomendar` llamado una vez (espía); `ahoraCambio` al jueves → Galicia "no aplica"; ningún selector lee el reloj del sistema (`vi.useFakeTimers` con otra fecha no cambia el resultado).
- [ ] T013 [US2] `store/selectores.ts` (`createSelector`). Pasa T012.
- [ ] T014 [US3] Thunk `guardarCompra` en `store/compras.ts` y test: guardar $5.000 en Coto con Galicia → Topes ≈$5.500 según 4 compras, reintegro esperado $1.000, `descuentoObtenido: null`.

---

## Phase 5: US4 — persistencia

- [ ] T015 [US4] Tests en `store/persistencia.test.ts` con un almacenamiento en memoria: se escribe y se rehidrata en un store nuevo; `simulacion`, `ahora` y `contactos` no vuelven; lo escrito no tiene `mejor`, `alternativas`, `restante` ni `cifra` (FR-010); una parte corrupta vuelve solo esa al inicial; migra `vuelto.perfil.v1`.
- [ ] T016 [US4] `store/persistencia.ts` (listener + `rehidratar`). Pasa T015.
- [ ] T017 `hooks/use-reloj.ts` (montar, `AppState`, medianoche) con la fuente de `fixtures.ts`.

---

## Phase 6: Migración de pantallas (FR-013, FR-016)

- [ ] T018 `app/_layout.tsx`: `Provider`, `rehidratar`, `useReloj`; el splash espera `hidratado`.
- [ ] T019 [P] Onboarding (`_layout`, `medios`, `comercios`, `primera-respuesta`), `(tabs)/_layout` y `(auth)/login` sobre `perfil`/`sesion`.
- [ ] T020 [P] Inicio y Con qué pagar sobre `simulacion` + `selectRecomendacion` (sin `useAsync` ni esqueleto en la recomendación); Topes, Mis compras, Comprar sobre selectores.
- [ ] T021 [P] Revisá tu compra (`recomendacionVista` + thunk `guardarCompra`), Perfil (escenarios, cerrar sesión), Toast, contactos, invitación y grupo sobre el store.
- [ ] T022 Borrar `data/sesion.ts`, `data/perfil-local.ts` y lo que sale de `api.ts` (research R7); `grep` sin referencias; `hooks/use-async.ts` queda para lo que sigue siendo asíncrono.
- [ ] T023 lint, typecheck y tests en verde. **Commit 2**.

---

## Phase 7: Verificación y cierre

- [ ] T024 Simulador de iOS (Expo Go): quickstart pasos 2–6, capturas para el PR; sin pedidos de red al tipear.
- [ ] T025 Web (`expo export --platform web` y `npm run web`) y build `preview` de EAS (Android).
- [ ] T026 `docs/architecture/03-frontend.md` (FR-015) y entrada en `docs/bitacora-prompts.md`.
- [ ] T027 `/code-review`, `test-runner`, `rules-guardian`; PR con `Closes #81`.
