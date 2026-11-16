---

description: "Tareas para sugerir el comercio del catálogo (issue #134)"
---

# Tasks: Sugerir el comercio del catálogo cuando el nombre no coincide

**Input**: `specs/015-sugerir-comercio/` (spec.md, plan.md, research.md, data-model.md, quickstart.md).

**Tests**: obligatorios para la lógica (constitución §VI). Los tests van antes que el código y se corren para verlos fallar primero. La pantalla se prueba a mano (quickstart §2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (elegir con un toque), US2 (buscar o dejarlo), US3 (carga a mano)
- El código vive en `apps/mobile/` salvo que se indique otra ruta.

---

## Phase 1: Foundational — la lógica de la sugerencia

**Purpose**: `data/sugerir-comercio.ts`, que usan las tres historias, probada en Node.

- [X] T001 Escribir `src/data/sugerir-comercio.test.ts` con un catálogo de prueba (incluye un comercio en dos rubros y un rubro sin comercio): `nombreLimpio` saca formas societarias (`s.a.`, `sa`, `s.r.l.`, `srl`, `s.a.s.`, `sas`, `c.i.c.s.a.`, `cicsa`, `saciei`), `suc`/`sucursal`, dígitos, tildes, mayúsculas y puntuación («Open25» y «Open 25» dan «open»); `parecido` (Damerau-Levenshtein normalizado: «carrefur»/«carrefour» ≥ 0,8, «sol»/«shell» por debajo, largo mínimo 4); y la lista de ajuste del umbral de research R2 (cada nombre con su comercio esperado o ninguno).
- [X] T002 Implementar en `src/data/sugerir-comercio.ts` `nombreLimpio`, `parecido` y el umbral (0,8 de inicio, ajustado con la lista de T001). Hace pasar T001.
- [X] T003 Sumar a `src/data/sugerir-comercio.test.ts` los casos de `sugerirComercio({ nombre, textoTicket, catalogo, categoriaConocida })` (data-model): coincide exacto en un rubro → `coincide`; mismo nombre en dos rubros sin rubro conocido → `elegir_rubro` con los dos en orden de categoría; con rubro conocido → `coincide`; «COTO C.I.C.S.A.» → `sugerencias` con Coto primero (`no_encontrado`); «INC S.A.» con una línea «CARREFOUR MARKET» → Carrefour primero (origen `texto_del_ticket`); dos comercios en el texto → en el orden del texto; «Día» solo si ocupa una línea entera del texto («día de la semana» no); nombre vacío con un comercio en el texto → `es_alguno`; nombre vacío sin nada → `nada`; nunca un rubro sin comercio (FR-013); máximo 3, sin repetir; el mismo resultado en dos llamadas (FR-003).
- [X] T004 Implementar `sugerirComercio` en `src/data/sugerir-comercio.ts` (research R3, R4): texto del ticket → contenido → parecido. Hace pasar T003.
- [X] T005 Sumar a `src/data/sugerir-comercio.test.ts` los casos de `buscarEnCatalogo(catalogo, texto, limite)` (FR-007): «jum» encuentra «Jumbo» (contenido primero), «farmasity» encuentra «Farmacity» (parecido después), sin repetir, sin rubros, vacío sin texto; y el tiempo de `sugerirComercio` con 1.000 comercios y 60 líneas de texto, por debajo de 100 ms (SC-005).
- [X] T006 Implementar `buscarEnCatalogo` y la limpieza del catálogo una sola vez por catálogo (research R5) en `src/data/sugerir-comercio.ts`. Hace pasar T005.
- [X] T007 [P] Escribir `src/data/sugerir-comercio.anexos.test.ts` con el catálogo de prueba y las listas de los anexos A y B de la spec, tal cual: SC-001 (correcto entre los 3 en ≥ 18 de 20 y primero en ≥ 15) y SC-002 (sin sugerencias en ≥ 9 de 10). No se ajusta el umbral con este archivo; si falla, se revisa la lógica o se documenta en la spec.

**Checkpoint**: la sugerencia, el buscador y los anexos en verde.

---

## Phase 2: User Story 1 — elegir el comercio sugerido con un toque (P1) 🎯 MVP

**Goal**: el recuadro con las 3 sugerencias y la línea de confirmación en «Revisá tu compra».

**Independent Test**: quickstart §2, pasos 1, 2 y 5.

- [X] T008 [P] [US1] Sumar `onBlur` (opcional) a `src/components/field.tsx`, que lo pasa al `TextInput` (research R6).
- [X] T009 [P] [US1] Escribir `src/components/sugerencia-comercio.tsx`: la línea de confirmación («Coto · Supermercados»), el recuadro con su título (`no_encontrado`, `es_alguno` o «¿En qué rubro?»), hasta 3 filas tocables con nombre y rubro (`nombreDeRubro`), «Buscar otro comercio» y «No está en la lista»; anunciado al lector de pantalla y cada fila con nombre y rubro en su etiqueta (FR-014). Sin lógica: recibe el `ResultadoSugerencia` y las acciones.
- [X] T010 [US1] Ajustar `src/app/revisa.tsx` (research R7): estados `elegido`, `noEstaEnLaLista` y `buscadoEn`; el `categoriaId` de la promo y de los textos de las tarjetas sale de `elegido` si lo hay; cambiar el texto borra `elegido` y `noEstaEnLaLista`; con ticket se busca al abrir; tocar una sugerencia pone el nombre del catálogo y su rubro (FR-005); nunca elige solo (FR-004).

**Checkpoint**: con un ticket que dice «COTO C.I.C.S.A.», un toque deja la compra en Coto con su promo.

---

## Phase 3: User Story 2 — buscar otro comercio o dejar el nombre (P2)

**Goal**: el buscador y «No está en la lista».

**Independent Test**: quickstart §2, pasos 3 y 4.

- [X] T011 [US2] Sumar a `src/components/sugerencia-comercio.tsx` el buscador en el mismo lugar (campo con el teclado abierto, resultados de `buscarEnCatalogo` mientras se escribe, «No encontramos comercios con promo con ese nombre» si no hay) y conectar en `src/app/revisa.tsx` «No está en la lista» (cierra y deja el campo como está, FR-008).

---

## Phase 4: User Story 3 — la misma ayuda al cargar a mano (P3)

**Goal**: buscar al terminar de escribir y no molestar con compra por confirmar ni con una recomendación.

**Independent Test**: quickstart §2, pasos 2 y 6.

- [X] T012 [US3] En `src/app/revisa.tsx`, buscar en `onBlur` del campo «Comercio» y no mostrar el recuadro mientras se escribe (FR-009); con compra por confirmar (con o sin ticket) o desde una recomendación, pasar el rubro que vino como `categoriaConocida` y no mostrar el recuadro mientras el comercio sea el que vino (FR-010).
- [X] T013a [US1] Después de la prueba del usuario: el texto del ticket se usa solo mientras el comercio sea el leído o esté vacío (FR-002.1); test de la regla en `src/data/sugerir-comercio.test.ts` antes del código y aplicarla en `src/app/revisa.tsx`.
- [X] T013b [US1] Después de la prueba del usuario: «¿Dónde pagaste?» con «En el local» y «Online» en `src/app/revisa.tsx` (FR-015), con `Segmentado`; test en `src/data/calculo.test.ts` de que una promo solo online aplica con canal online y no en el local.
- [X] T013 [US3] Prueba a mano (quickstart §2, todos los pasos), la corre el usuario en el celular o en la web.

**Checkpoint**: las tres historias andando.

---

## Phase 5: Polish

- [X] T014 Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` desde la raíz.
- [X] T015 `rules-guardian` y `/code-review` sobre el diff; corregir lo que surja.
- [X] T016 Actualizar `docs/architecture/03-frontend.md` (la sugerencia del comercio en «Revisá») y completar la entrada de la issue #134 en `docs/bitacora-prompts.md`, mostrándola antes del commit.

---

## Dependencies & Execution Order

- **Foundational (T001-T007)** → **US1 (T008-T010)** → **US2 (T011)** → **US3 (T012-T013)** → **Polish (T014-T016)**.
- T007 depende de T006 (la función completa).
- T013 depende del usuario.

## Parallel Opportunities

- T007 en paralelo con el arranque de la Phase 2.
- T008 y T009 en paralelo (archivos distintos).

## Implementation Strategy

1. **Etapa 1 = Foundational** (T001-T007): la lógica y su medición, sin pantalla. Pausa para revisión.
2. **Etapa 2 = Pantalla** (T008-T012): el recuadro, el buscador y los cambios en «Revisá». Termina en la prueba del usuario (T013).
3. **Etapa 3 = Polish** (T014-T016): verificación, revisiones, documentación y bitácora. Después, PR que cierre la issue #134.
