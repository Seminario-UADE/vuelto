---

description: "Tareas para registrar una compra con la foto del ticket (issue #49)"
---

# Tasks: Registrar una compra con la foto del ticket

**Input**: `specs/014-ticket-con-foto/` (spec.md, plan.md, research.md, data-model.md, quickstart.md) y el contrato del servicio `specs/013-extraer-ticket/contracts/extraer-ticket.md`.

**Tests**: obligatorios para la lógica (constitución §VI). En cada historia, los tests van antes que el código y se corren para verlos fallar primero. Las pantallas y el adaptador nativo se prueban a mano (quickstart §2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas sin terminar)
- **[Story]**: US1 (foto y confirmación), US2 (la foto no queda), US3 (errores)
- El código vive en `apps/mobile/` salvo que se indique otra ruta.

---

## Phase 1: Foundational — la lógica que no necesita librerías nuevas

**Purpose**: las reglas que usan todas las historias, probadas en Node.

- [X] T001 [P] Escribir `src/ticket/resultados.test.ts`: cada fila de la tabla de FR-011 devuelve su mensaje exacto y sus salidas en orden (`no_autenticado` → iniciar sesión y cargar a mano; `imagen_demasiado_grande` → solo cargar a mano; el resto → probar de nuevo y cargar a mano), y cada código del contrato de la spec 013 se agrupa en su resultado (`invalido`, `formato_no_soportado`, `imagen_danada` → `foto_no_valida`; `metodo_no_permitido` y un código desconocido → `interno`) (SC-004).
- [X] T002 [P] Implementar `src/ticket/resultados.ts` (`ResultadoLectura`, `resultadoDeCodigo(codigo)`, `salidaDe(resultado)`), según data-model. Hace pasar T001.
- [X] T003 [P] Escribir `src/ticket/sugerencia.test.ts` (FR-008): VISA débito y una sola tarjeta Visa débito → `sugerida`; VISA y dos tarjetas Visa → `sin_coincidencia` con «Visa»; solo crédito y una tarjeta de crédito → `sugerida`; solo crédito y dos → `sin_coincidencia` con «crédito»; sin red ni tipo → `sin_medio`; «BCO GALICIA» contra «Banco Galicia» coincide y contra «Banco Santander» no; una tarjeta sin banco no filtra por banco; los nombres para mostrar de las 9 redes y los 2 tipos («Visa débito», «Diners Club», «Tarjeta Sol»…); los últimos 4 no cambian nada.
- [X] T004 [P] Implementar `src/ticket/sugerencia.ts` (`sugerirMedio(medioLeido, tarjetas)`, `textoLeido(medioLeido)`). Hace pasar T003.
- [X] T005 [P] Escribir `src/ticket/fechas.test.ts` (FR-010): con compra por confirmar, los días entre la simulación y hoy (incluidos), un mismo día da uno solo; sin compra por confirmar, cualquier día hasta hoy; nunca uno futuro; los bordes de mes y de año.
- [X] T006 [P] Implementar `src/ticket/fechas.ts` (`diaPermitido(dia, { desde: FechaISO | null, hoy })`, `diasDelMes(mes, rango)` para el calendario). Hace pasar T005.
- [X] T007 Ajustar `src/data/por-confirmar.test.ts` y `src/data/por-confirmar.ts` (research R6): `TicketParaConfirmar.medioId` pasa a `medioSugeridoTicket`; en modo `ticket` el borrador sale con `medioId: null`; aviso `medio-distinto` cuando la sugerencia del ticket difiere del medio simulado; la nota de la simulación (`medioSugerido`) solo cuando el ticket no sugiere ninguno; `fechasPosibles` pasa a un rango (`desde` = día de la simulación). Tests primero.

**Checkpoint**: la lógica de mensajes, sugerencia y fechas en verde.

---

## Phase 2: User Story 1 y 2 — leer la foto y que no quede (P1) 🎯 MVP

**Goal**: la lectura completa, de la foto preparada a `LecturaApp`, borrando siempre los temporales.

**Independent Test**: con la cámara, el manipulador, el borrado y el cliente simulados, cada camino devuelve lo esperado y deja 0 temporales (SC-002).

- [X] T008 [P] [US1] Escribir `src/ticket/servicio.test.ts` (research R3) con un cliente de Supabase falso: 200 → la lectura con el medio leído tal cual; `FunctionsHttpError` con cada código del contrato → su `ResultadoLectura`; un cuerpo que no es del contrato → `interno`; `FunctionsFetchError` → `sin_conexion`; `FunctionsRelayError` → `interno`; 30 s sin respuesta → `tardo_demasiado` (temporizador simulado). El pedido manda `{ imagen, tipo: "image/jpeg" }` a `extraer-ticket` y nunca una key.
- [X] T009 [US1] Implementar `src/ticket/servicio.ts` (`pedirLectura(cliente, base64, { limiteMs })`). Hace pasar T008.
- [X] T010 [P] [US2] Escribir `src/ticket/leer.test.ts` con `preparar`, `borrar` y `pedir` simulados: éxito → `LecturaApp` y los temporales borrados antes de devolver; cada error del servicio → su resultado y los temporales borrados; `preparar` que falla o que no baja de 2,5 MB → `imagen_demasiado_grande`, sin pedir y con los temporales borrados; un `borrar` que falla no cambia el resultado; las rutas de web (`blob:`, `data:`) no se borran. Un test por camino (SC-002).
- [X] T011 [US2] Implementar `src/ticket/leer.ts` (`leerFoto(foto, deps)`: preparar → pedir → traducir, con el borrado en un `finally`). Hace pasar T010.
- [X] T012 [US1] Cambiar `LecturaTicket` por `LecturaApp` en `src/data/contracts.ts` (data-model) y adaptar `src/data/api.ts` (`leerTicket` solo para escenarios) y `src/data/fixtures.ts` (el ticket de ejemplo con `VISA DEBITO`); sumar el escenario `"ticket-de-ejemplo"` en `src/store/acciones.ts` y su opción en Perfil. Ajustar `src/data/api.test.ts`.

**Checkpoint**: la lectura y su borrado en verde, sin celular.

---

## Phase 3: Lo nativo y las pantallas (US1, US2, US3)

**Goal**: la cámara real, «Escanear ticket» y «Revisá tu compra».

**Independent Test**: a mano en Expo Go (quickstart §2) y en web con «Ticket de ejemplo» (quickstart §3).

- [ ] T013 Instalar con `npx expo install expo-image-picker expo-image-manipulator expo-file-system` (workspace `apps/mobile`) y configurar el plugin de `expo-image-picker` en `app.json`: textos de permiso en castellano para cámara y fotos, sin micrófono.
- [ ] T014 [US2] Escribir `src/ticket/camara.ts` (research R1, R2, R4): `sacarFoto()` y `elegirDeGaleria()` (sin guardar en la galería, `null` si se cancela, `"sin_permiso"` si se niega), `preparar(uri)` (2.000 px, JPEG 0,8 y, si hace falta, 0,6, con base64; devuelve las rutas temporales), `borrar(rutas)` y `limpiarTemporales()` (vacía las carpetas del selector y del manipulador). Sin lógica: solo llama a Expo.
- [ ] T015 [US1] [US3] Rehacer `src/app/escanear.tsx`: sin sesión, «Iniciá sesión para leer tickets» con «Iniciar sesión» y «Cargar a mano» (FR-002); con sesión, «Sacar foto» y «Elegir de la galería»; permiso negado (FR-003); «Leyendo el ticket…» sin poder disparar otra (FR-006); cada resultado con el mensaje y las salidas de `resultados.ts` (FR-011); `limpiarTemporales()` al abrir (FR-007); los escenarios de desarrollo con `api.leerTicket` (FR-012). Al leer bien, abre «Revisá» con `medioRed`, `medioTipo` y `medioBanco`.
- [ ] T016 [P] [US1] Escribir `src/components/selector-fecha.tsx`: una hoja con el calendario del mes, con los colores del tema, flechas de mes, días fuera del rango deshabilitados (`fechas.ts`) y etiquetas accesibles.
- [ ] T017 [US1] Ajustar `src/app/revisa.tsx`: la sugerencia del ticket con `sugerencia.ts` y sus notas y mensajes (FR-008); los avisos de monto y de medio con sus textos nuevos; el medio nunca marcado en modo `ticket`; la fecha editable con `selector-fecha.tsx` y el rango de FR-010 (reemplaza la lista de dos días); sin campo de descuento.
- [ ] T018 [US1] Prueba a mano en el celular (quickstart §2), la corre el usuario: cámara, «Repetir», galería, HEIC, la nota del medio, la fecha, que la foto no aparezca en la galería, sin sesión, sin permiso, modo avión, y 10 lecturas cronometradas (SC-001).

**Checkpoint**: las tres historias andando en el celular.

---

## Phase 4: Polish

- [ ] T019 Correr `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` desde la raíz; buscar la key del proveedor en la app (`git grep -i "groq_api_key\|gsk_" apps/mobile`, 0 resultados, SC-005).
- [ ] T020 `rules-guardian` y `/code-review` sobre el diff; corregir lo que surja.
- [ ] T021 Actualizar `docs/architecture/02-api-routes.md` y `docs/architecture/03-frontend.md` (la lectura del ticket ya no es simulada) y completar la entrada de la issue #49 en `docs/bitacora-prompts.md`, mostrándola antes del commit.

---

## Dependencies & Execution Order

- **Foundational (T001-T007)** → **Lectura (T008-T012)** → **Nativo y pantallas (T013-T018)** → **Polish (T019-T021)**.
- T018 depende del usuario (celular y tickets reales).
- T016 (calendario) depende solo de T006.

## Parallel Opportunities

- Foundational: T001, T003 y T005 en paralelo; después T002, T004 y T006.
- Lectura: T008 y T010 en paralelo.
- Pantallas: T016 en paralelo con T014 y T015.

## Implementation Strategy

1. **Etapa 1 = Foundational + Lectura** (T001-T012): toda la lógica probada en Node. Pausa para revisión.
2. **Etapa 2 = Nativo y pantallas** (T013-T017): la cámara y las pantallas. Termina en la prueba en el celular (T018), que corre el usuario.
3. **Etapa 3 = Polish** (T019-T021): verificación, revisiones, documentación y bitácora. Después, PR que cierre la issue #49 y lleve la aclaración 3.0.2 de la constitución para el PO.
