---

description: "Tareas para leer los datos de un ticket a partir de su foto (issue #48)"
---

# Tasks: Leer los datos de un ticket a partir de su foto

**Input**: `specs/013-extraer-ticket/` (spec.md, plan.md, research.md, data-model.md, contracts/extraer-ticket.md, quickstart.md)

**Tests**: obligatorios (constitución §VI, FR-017). En cada historia, los tests van antes que el código y tienen que fallar primero. Sin red ni key: extractor simulado y `fetch` simulado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (datos del ticket), US2 (privacidad), US3 (errores)
- El código vive en `supabase/functions/extraer-ticket/` salvo que se indique otra ruta.

---

## Phase 1: Setup

- [X] T001 Crear `supabase/functions/extraer-ticket/deno.json` con el mismo import map que `recomendar` (`@vuelto/motor` → `../../../packages/motor/src/index.ts`, `@supabase/supabase-js` → `jsr:@supabase/supabase-js@2`). En `supabase/tsconfig.json` y `supabase/vitest.config.ts`, excluir `functions/*/prueba-manual.ts` (usa `Deno`, como `index.ts`).
- [X] T002 [P] Sumar a `CodigoError` y a `STATUS` de `supabase/functions/_shared/http.ts` los códigos `formato_no_soportado` (415), `imagen_demasiado_grande` (413), `imagen_danada` (422), `ticket_ilegible` (422), `tardo_demasiado` (504) y `no_disponible` (503) (research R6). Test en `supabase/functions/_shared/http.test.ts`: cada código responde su estado y `{ error }`. `recomendar` no cambia.

---

## Phase 2: Foundational — leer una foto con Groq (FR-019) ⛔ bloquea todo lo demás

**Purpose**: comprobar con fotos reales que Groq lee un ticket respetando el esquema estricto, antes de construir el resto.

- [X] T003 [P] Escribir `extractor.ts`: `interface Extractor { leer(imagen: Uint8Array, tipo: TipoImagen): Promise<LecturaCruda> }`, el tipo `LecturaCruda` de `data-model.md` (todos los campos `string | null`, sin `?:`) y los errores `ExtractorTiempoAgotadoError`, `ExtractorNoDisponibleError`, `RespuestaFueraDeEsquemaError` (con `camino` y `regla`) y `ExtractorRechazoError` (con `estado`).
- [X] T004 [P] Escribir `esquema.test.ts`: el validador acepta una `LecturaCruda` completa con `string` y `null`; rechaza una clave faltante, una clave de más, un número donde va texto y `medio` que no es objeto, devolviendo `camino` (ej. `medio.redImpresa`) y `regla` (`requerido`, `adicional`, `tipo`) **sin el valor**; y las claves del esquema JSON que recibe Groq son exactamente las del validador (research R8).
- [X] T005 Implementar `esquema.ts`: `ESQUEMA_LECTURA` (JSON Schema con todos los campos `required`, `type: ["string","null"]` y `additionalProperties: false`) y `validarLecturaCruda(valor: unknown)`. Hace pasar T004.
- [X] T006 [P] Escribir `extractor-groq.test.ts` con un `fetch` simulado: el pedido va a `https://api.groq.com/openai/v1/chat/completions` con `Authorization: Bearer <key>`, modelo `qwen/qwen3.8-27b`, `temperature: 0`, la imagen como data URL y `response_format` `json_schema` con `strict: true` (o `json_object` en modo JSON libre); el prompt pide los datos tal como están impresos y reemplazar nombres, DNI y tarjetas (salvo últimos 4) por `[DATO PERSONAL]` (FR-011); una respuesta válida devuelve la `LecturaCruda`; contenido que no es JSON o no cumple el esquema → `RespuestaFueraDeEsquemaError`; 429, 500, 502, 503 o `fetch` que falla → `ExtractorNoDisponibleError`; otro 4xx → `ExtractorRechazoError`; el `AbortController` a los 20 s → `ExtractorTiempoAgotadoError` (con un temporizador simulado).
- [X] T007 Implementar `extractor-groq.ts`: `class ExtractorGroq implements Extractor`, con la key, el modo (`estricto` o `json-libre`), el `fetch` y el límite de tiempo inyectados por constructor (ADR-009). Hace pasar T006.
- [X] T008 Escribir `prueba-manual.ts` (research R9): lee `GROQ_API_KEY` del entorno, toma rutas de fotos como argumentos, deduce el tipo por la extensión, acepta `--modo=json-libre` y escribe por pantalla la `LecturaCruda` de cada foto o el nombre del error. Nunca escribe la key ni la imagen. Verificar que pasa `npx deno check --config supabase/functions/extraer-ticket/deno.json`.
- [X] T009 ⏸ **Checkpoint del usuario (FR-019)** — **Pasó (13/11)**: 3 tickets reales leídos bien en modo estricto (montos, fechas y medio correctos). Se ajustó: el comercio es el nombre del local, sin "pensamiento" del modelo, sin tope de respuesta, reintento corto ante un 429 y tapar nombres de empleados.: el usuario corre `quickstart.md` §1 con 3 fotos reales en una terminal aparte y comparte solo el JSON. **Pasa si** las 3 cumplen el esquema y el monto impreso es correcto en al menos 2. Si falla en modo estricto, se repite con `--modo=json-libre`; si también falla, **se frena la implementación** y se vuelve al equipo (ADR-012, respaldo).

**Checkpoint**: Groq lee fotos reales con el esquema. Recién entonces se sigue.

---

## Phase 3: User Story 1 — Sacarle una foto al ticket y recibir los datos (P1) 🎯 MVP

**Goal**: el servicio convierte la `LecturaCruda` en `LecturaTicket` sin deducir nada.

**Independent Test**: con el extractor simulado devolviendo las respuestas de los 3 tickets de ejemplo, la `LecturaTicket` coincide campo por campo (SC-001).

- [X] T010 [P] [US1] Escribir `normalizar.test.ts` (research R4):
  - importe: `"$ 24.500,00"` → 24500; `"24500,5"` → 24500.5; `"24.500"` → 24500; `"24.50"`, `"1,234"` con 3 decimales, `"0"`, `"-10"`, `"abc"` → `null`;
  - fecha (con `hoy` inyectado, 14/10/2026): `"14/10/2026"`, `"14-10-26"`, `"14.10.2026"` → `"2026-10-14"`; `"14/10"`, `"31/02/2026"`, `"15/10/2026"` (futura) → `null`; una fecha de 2019 se acepta;
  - red: `"MASTERCARD"`, `"master"`, `"MC"` → `"master"`; `"Visa Débito"` → `"visa"`; `"4509"` y `"TARJETA"` → `null` (US1-5, US1-6);
  - tipo: `"DEBITO"`, `"débito"`, `"DEB"` → `"debito"`; `"CRED"` → `"credito"`; `"DEBITO/CREDITO"` y `"VISA"` → `null`;
  - últimos 4: `"1234"` → `"1234"`; `"123"`, `"12345"`, `"12a4"` → `null`;
  - banco y comercio: espacios de más recortados; `"   "` → `null`.
- [X] T011 [US1] Implementar `normalizar.ts` con funciones puras (`normalizarImporte`, `normalizarFecha(impresa, hoy)`, `normalizarRed`, `normalizarTipo`, `normalizarUltimos4`, `normalizarTexto`). `hoy` se calcula con `fechaArgentina` de `@vuelto/motor`. Hace pasar T010.
- [X] T012 [P] [US1] Crear `test/tickets.ts` con 3 tickets **inventados** (comercios y personas que no existen, CUIT de comercio con dígito verificador válido pero inexistente): para cada uno, la `LecturaCruda` que devolvería Groq y la `LecturaTicket` esperada. Uno completo (US1-1), uno sin medio de pago (US1-2) y uno con "TARJETA DE CREDITO" sin red ni dígitos (US1-3).
- [X] T013 [P] [US1] Escribir `servicio.test.ts` (parte US1) con un extractor simulado: los 3 tickets coinciden campo por campo (SC-001); un dato imposible vacía solo ese campo (US1-8); monto, comercio y fecha `null` → `TicketIlegibleError` (FR-009); los errores del extractor se propagan sin cambiar.
- [X] T014 [US1] Implementar `servicio.ts`: `class ServicioLecturaTicket` (en la primera versión, `LectorDeTickets`) con el `Extractor` y el reloj inyectados; `leer(imagen, tipo)` llama al extractor, normaliza y arma la `LecturaTicket` (`textoExtraido` todavía sin la segunda capa). Hace pasar T013.

**Checkpoint**: US1 en verde.

---

## Phase 4: User Story 2 — Que mi ticket no quede guardado ni exponga mis datos (P1)

**Goal**: el texto devuelto no tiene tarjetas completas, CUIT o CUIL de personas ni DNI anunciados.

**Independent Test**: textos de ejemplo con datos personales inventados → 0 datos sin tapar (SC-003).

- [X] T015 [P] [US2] Escribir `privacidad.test.ts` (research R5): `"4509 9535 6623 3704"`, `"4509-9535-6623-3704"` y `"XXXX XXXX XXXX 3704"` → `"****3704"` (US2-2); `"CUIT 20-12345678-6"` y `"20123456786"` → `"CUIT [DATO PERSONAL]"` y `"[DATO PERSONAL]"` (US2-3); un CUIT de persona con dígito verificador inválido y `"30-54808315-6"` quedan igual (US2-4); `"DNI: 12345678"`, `"D.N.I. 12.345.678"`, `"Documento 1234567"` → la palabra y `[DATO PERSONAL]` (US2-5); `"Cód. 12345678"` queda igual (US2-7); un texto de 12.000 caracteres con una tarjeta en el carácter 9.995 queda tapada y el resultado termina en `"[…]"` con 10.000 caracteres de texto.
- [X] T016 [US2] Implementar `privacidad.ts` (`taparDatosPersonales(texto)` y `recortar(texto)`), en el orden de FR-012. Hace pasar T015.
- [X] T017 [US2] Sumar a `servicio.test.ts` y a `servicio.ts`: `textoExtraido` pasa por `taparDatosPersonales` y después por `recortar`; `texto` `null` → `""`; en los 3 tickets de ejemplo con datos personales inventados quedan 0 tarjetas completas, 0 CUIT o CUIL de personas y 0 DNI anunciados (SC-003).

**Checkpoint**: US1 y US2 en verde.

---

## Phase 5: User Story 3 — Saber qué pasó cuando la lectura no funciona (P2)

**Goal**: cada falla tiene su código; la imagen nunca se escribe ni se registra.

**Independent Test**: un test por código de error (SC-005).

- [X] T018 [P] [US3] Escribir `imagen.test.ts` (research R3): `tipo` fuera de JPEG, PNG y WebP → `formato_no_soportado`; base64 más largo que `ceil(2.500.000 / 3) × 4` → `imagen_demasiado_grande` sin decodificar; base64 inválido → `imagen_danada`; contenido PNG con `tipo` `image/jpeg` → `imagen_danada`; JPEG, PNG y WebP válidos (bytes armados en el test) → `{ ok: true, bytes, tipo }`.
- [X] T019 [US3] Implementar `imagen.ts` (`validarPedidoImagen(cuerpo: unknown)`). Hace pasar T018.
- [X] T020 [P] [US3] Escribir `handler.test.ts` con un autenticador y un lector simulados: método no `POST` → 405; sin sesión o con la anon key → 401 sin llamar al lector (US3-1); cuerpo que no es JSON o sin `imagen` o `tipo` → 400 con `campo` (US3-2); 413, 415 y 422 `imagen_danada` sin llamar al lector (US3-3 a US3-5); `TicketIlegibleError` y `RespuestaFueraDeEsquemaError` → 422 `ticket_ilegible` (US3-6, US3-7); `ExtractorTiempoAgotadoError` → 504 (US3-8); `ExtractorNoDisponibleError` → 503 (US3-9); `ExtractorRechazoError`, Auth caído o un error cualquiera → 500; éxito → 200 con la `LecturaTicket`. Con `console` espiado: cada pedido deja una sola línea con el resultado y la duración, y ninguna contiene la imagen, el texto ni un valor leído; ante un error de esquema, solo `camino` y `regla` (FR-013).
- [X] T021 [US3] Implementar `handler.ts` (`crearHandlerExtraerTicket({ autenticador, crearServicio, ahora, limiteMs })`), siguiendo `recomendar/handler.ts`. Hace pasar T020.
- [X] T022 [US3] Escribir `index.ts` (composition root): `AutenticadorSupabase` con `SUPABASE_URL` y `SUPABASE_ANON_KEY`, `ExtractorGroq` con `GROQ_API_KEY` (si falta, falla al arrancar), modo estricto o JSON libre según el resultado de T009, y `Deno.serve`. Verificar con `npx deno check --config supabase/functions/extraer-ticket/deno.json supabase/functions/extraer-ticket/index.ts`.

**Checkpoint**: US1, US2 y US3 en verde.

---

## Phase 6: Polish

- [X] T023 [P] Documentar el endpoint en `docs/architecture/02-api-routes.md`, apuntando a `specs/013-extraer-ticket/contracts/extraer-ticket.md` (FR-018).
- [X] T024 [P] Actualizar `prueba-manual.ts` para que, además de la `LecturaCruda`, muestre la `LecturaTicket` que devolvería el servicio.
- [X] T025 Correr `npm run lint`, `npm run typecheck`, `npm run test` (cobertura ≥ 90% en `supabase`) y `npm run build` desde la raíz; `deno check` de `extraer-ticket/index.ts` y `prueba-manual.ts`. Verificar que ningún archivo de la función escribe en disco, Storage, la base ni registros con la imagen (`git grep` de `Deno.write`, `writeFile`, `storage`, `console` con variables de imagen o texto).
- [X] T026 `rules-guardian` y `/code-review` sobre el diff; corregir lo que surja.
- [ ] T027 Despliegue: el usuario corre `npx supabase functions deploy extraer-ticket --project-ref wahvysbxwgbbyynjiczy --use-api` (quickstart §3). La prueba de punta a punta con la cámara es de la issue #49.
- [ ] T028 Completar la entrada en `docs/bitacora-prompts.md` y mostrarla en el chat antes de proponer el commit.

---

## Dependencies & Execution Order

- **Setup (T001-T002)** → **Foundational (T003-T009)** ⛔ → **US1 (T010-T014)** → **US2 (T015-T017)** → **US3 (T018-T022)** → **Polish (T023-T028)**.
- T009 depende del usuario. Si no pasa, no se sigue.
- US2 extiende `servicio.ts` de US1. US3 usa el servicio completo en `index.ts`, pero `handler.ts` y `imagen.ts` se pueden escribir en paralelo con US2 (usan un lector simulado).

## Parallel Opportunities

- T002 con T001.
- Foundational: T003, T004 y T006 en paralelo (archivos distintos).
- US1: T010, T012 y T013 en paralelo.
- US3: T018 y T020 en paralelo; se pueden empezar mientras se hace US2.
- Polish: T023 y T024 en paralelo.

## Implementation Strategy

1. **Etapa 1 = Setup + Foundational** (T001-T009): termina en la prueba con fotos reales. **Pausa obligatoria**: el usuario corre la prueba y decide si se sigue.
2. **Etapa 2 = US1 + US2** (T010-T017): el servicio completo, con normalización y privacidad. Pausa para revisión.
3. **Etapa 3 = US3 + Polish** (T018-T028): handler, errores, documentación, revisiones, despliegue y bitácora. Después, PR que cierre la issue #48.
