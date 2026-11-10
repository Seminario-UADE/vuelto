# Tasks: Flujo directo — compra por confirmar, tres tabs y onboarding con primera respuesta real

**Input**: `specs/012-flujo-directo/`: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/rutas.md](contracts/rutas.md) y [quickstart.md](quickstart.md).

**Prerequisites**: `main` con las specs 008, 009 y 010 (store, sincronización y cola de compras). Para la parte visual (tarjetas, hero, tab bar), #115: los temas de `DESIGN.md` v6.

**Tests**: se piden. La constitución §VI pide test-first en el núcleo, y SC-003 y SC-008 se verifican con tests. Cada tarea de implementación va después del test que la cubre.

**Organization**: por historia de usuario, y cada historia es un PR (plan, «Entrega en issues»). US1 y US2 son P1; US3 y US4, P2; US5, P3 y condicional.

## Format: `[ID] [P?] [Story] Descripción con ruta`

- **[P]**: se puede hacer en paralelo, porque toca archivos distintos y no depende de tareas incompletas.
- Las rutas son relativas a la raíz del repo, y `apps/mobile/src` se abrevia `src/`.

## Phase 1: Setup

- [ ] T001 Correr `npm ci` y confirmar la línea de base: `npm run lint && npm run typecheck && npm run test` pasan en `main` antes de tocar nada.
- [ ] T002 [P] Sacar las capturas «antes» de Inicio, Comprar, Mis compras, Perfil y del onboarding completo en el simulador de iOS y en Android, y guardarlas en `docs/design/capturas-app/antes-012/` (SC-007).

## Phase 2: Foundational (bloquea a US1, US2 y US4)

- [ ] T003 Cambiar `perfilInicial.nombre` a `null` en `src/store/perfil.ts`. Hacer que el escenario de demo de `src/store/acciones.ts` y Perfil (solo en desarrollo) cargue «Martín» a propósito. Actualizar los tests de `src/store/*.test.ts` que esperaban «Martín» (FR-029, SC-005).
- [ ] T004 Sacar los respaldos `?? "Martín"` de `src/app/(tabs)/index.tsx` y `src/app/(tabs)/perfil.tsx`: sin nombre, Inicio saluda «Hola» y Perfil muestra «Cargá tu nombre».
- [ ] T005 [P] Hacer que el ticket de ejemplo de `src/data/fixtures.ts` y `src/data/api.ts` (`leerTicket`) devuelva la fecha de hoy, recibida como parámetro desde `sesion.ahora`. Sumar el escenario `"sin-red"` a `Escenario`, que hace fallar `leerTicket` con el error de conexión (research R12).

**Checkpoint**: la línea de base sigue en verde y ninguna pantalla dice «Martín» sin el escenario de demo.

---

## Phase 3: User Story 1 - Simular, pagar y confirmar a mano (P1) 🎯 MVP

**Goal**: «Usar» crea una compra por confirmar que no toca los topes; «Ya pagué» la registra.

**Independent Test**: los seis casos de SC-003 y SC-008 en Vitest, más el recorrido 1 y 2 del quickstart.

### Tests

- [ ] T006 [P] [US1] Escribir `src/data/por-confirmar.test.ts` para `origenAlConfirmar`, la tabla de `data-model.md` (`excepcion` solo con el medio y el comercio sin cambios), y para `borradorDesdePorConfirmar` sin ticket: precarga, `fechasPosibles` con el mismo día y con otro día (FR-017).
- [ ] T007 [P] [US1] Escribir `src/store/por-confirmar.test.ts`:
  - `porConfirmarCreada` reemplaza por `comercioId`;
  - `selectPorConfirmarVigentes` oculta las vencidas (48 h con el reloj del store) y las de otro usuario;
  - `porConfirmarPurgadas` saca las vencidas, las de otro dueño y las que ya están en `compras`;
  - `sesionCerrada` vacía la lista;
  - los seis casos de SC-003 dejan `selectTopes`, `selectResumenCompras` y `selectRecomendacion` exactamente iguales.
- [ ] T008 [P] [US1] Sumar a `src/store/persistencia.test.ts` la clave `vuelto.por-confirmar.v1`: ida y vuelta, una entrada inválida se descarta y las demás quedan.
- [ ] T009 [P] [US1] Sumar a `src/store/thunks.compras.test.ts`:
  - `guardarCompra(b, intento, id)` con un id existente devuelve la compra existente sin duplicar;
  - `confirmarPorConfirmar` deja una sola compra con el id de la compra por confirmar y la saca de la lista, incluso si se llama dos veces (SC-008).

### Implementation

- [ ] T010 [P] [US1] Crear `src/data/por-confirmar.ts` con el tipo `CompraPorConfirmar`, `VENCIMIENTO_POR_CONFIRMAR_MS`, `origenAlConfirmar` y `borradorDesdePorConfirmar` (con la rama sin ticket). Tiene que pasar T006.
- [ ] T011 [US1] Crear `src/store/por-confirmar.ts`:
  - el slice con las acciones de `data-model.md`;
  - que escuche `compraAgregada` y `sesionCerrada`;
  - `selectPorConfirmarVigentes`;
  - la persistencia en su propia clave con su listener y su lectura al arrancar, como `src/store/cola.ts`.

  Registrarlo en `src/store/index.ts` y en el arranque de `src/app/_layout.tsx`. Tiene que pasar T007 y T008.
- [ ] T012 [US1] En `src/store/thunks.ts`:
  - `guardarCompra` suma el parámetro opcional `id`;
  - nuevos thunks `usarRecomendacion()`, que crea la compra por confirmar desde `simulacion`, la limpia y devuelve si hubo reemplazo; `confirmarPorConfirmar(id, borrador)` y `descartarPorConfirmar(id)`.

  Tiene que pasar T009.
- [ ] T013 [P] [US1] Crear `src/components/por-confirmar-card.tsx`: comercio, «Pagá con [medio]», monto y antigüedad, con «Ya pagué» (primario), «Escanear ticket» y «Descartar». Áreas de 44 pt y orden de lectura correcto.
- [ ] T014 [P] [US1] Crear `src/app/descartar-por-confirmar.tsx` (form sheet, `fitToContents`) y registrarlo en `src/app/_layout.tsx`.
- [ ] T015 [US1] Sumar el footer «Usar [medio]» a `src/components/recomendacion.tsx` cuando `r.medio` no es `null`. En `src/app/(tabs)/index.tsx`: las `PorConfirmarCard` arriba, «Usar» → `usarRecomendacion` → toast (los textos de `contracts/rutas.md`).
- [ ] T016 [US1] Cambiar `usar` en `src/app/comercio/[id].tsx` para que llame a `usarRecomendacion`, muestre el toast y vuelva a Inicio (en lugar de abrir `revisa` en modo `excepcion`).
- [ ] T017 [US1] En `src/app/revisa.tsx`:
  - aceptar el parámetro `porConfirmar` y precargar con `borradorDesdePorConfirmar`;
  - si cambió el día, mostrar la elección entre «el día de la simulación» y «hoy»;
  - guardar con `confirmarPorConfirmar` y el origen que da `origenAlConfirmar`;
  - deshabilitar «Guardar» sin monto, con la razón a la vista.
- [ ] T018 [US1] Estado vacío de Inicio sin enlace a otra tab (FR-035). Sacar la fila «¿Ya compraste? Escaneá el ticket» de `src/app/(tabs)/index.tsx`.
- [ ] T019 [US1] En `src/app/cerrar-sesion.tsx`, el aviso dice cuántas compras por confirmar se van a perder (FR-014).
- [ ] T020 [P] [US1] Declarar en `docs/product/privacidad.md` la clave `vuelto.por-confirmar.v1`: qué guarda, que no sale del teléfono y su vencimiento de 48 h (FR-037).

**Checkpoint**: US1 completa. «Usar» ya no descuenta tope y el quickstart 1 y 2 pasan.

---

## Phase 4: User Story 2 - Confirmar con el ticket (P1)

**Goal**: el ticket se cruza con la compra por confirmar y nunca preselecciona un medio que el ticket no trae.

**Independent Test**: los tests de T021 más el recorrido 3 y 4 del quickstart.

### Tests

- [ ] T021 [P] [US2] Sumar a `src/data/por-confirmar.test.ts`:
  - `normalizarComercio`;
  - `ticketCoincide`: «COTO C.I.C.S.A.» coincide con Coto, «Cotolengo» no, y una fecha anterior al día de la simulación no coincide;
  - `borradorDesdePorConfirmar` con ticket: `medioId: null` y `medioSugerido` cuando el ticket no trae medio, el medio del ticket cuando sí lo trae, el aviso de monto solo si se simuló con monto y el aviso de medio distinto.

### Implementation

- [ ] T022 [US2] Completar `normalizarComercio`, `ticketCoincide` y la rama con ticket de `borradorDesdePorConfirmar` en `src/data/por-confirmar.ts`. Tiene que pasar T021.
- [ ] T023 [US2] En `src/app/escanear.tsx`:
  - aceptar el parámetro `porConfirmar`. Si coincide, ir a `revisa` con `modo: "ticket"`; si no, preguntar «¿Este ticket es de tu compra en X?».
  - sin el parámetro, buscar con `ticketCoincide` y preguntar «¿Es tu compra por confirmar en X?».
  - si la lectura falla, ofrecer «Probar de nuevo» y «Confirmar a mano».
- [ ] T024 [US2] En `src/app/revisa.tsx`:
  - con ticket y sin medio, mostrar la sugerencia «El que elegiste al simular» **sin seleccionarla**;
  - «Guardar» se habilita con un toque en un medio (FR-008);
  - mostrar los avisos de diferencia.
- [ ] T025 [US2] Pasar `rules-guardian` sobre los cambios de `revisa.tsx` y `escanear.tsx` (ticket: RF-10, la imagen no se persiste).

**Checkpoint**: US1 + US2 cumplen el flujo de #105.

---

## Phase 5: User Story 3 - Tres tabs con Inicio al centro (P2)

**Goal**: Compras · Inicio · Topes, con Perfil desde el avatar y zonas seguras correctas.

**Independent Test**: el recorrido 5 del quickstart y las capturas de SC-007.

- [ ] T026 [US3] Crear `src/app/(tabs)/compras.tsx` con:
  - las `PorConfirmarCard`;
  - las `ActionRow` «Escanear ticket» y «Cargar a mano»;
  - el contenido de `src/app/mis-compras.tsx` (resumen, filtros, historial, borrado y marcas de la cola de 010);
  - el estado vacío de FR-036.
- [ ] T027 [US3] Convertir `src/app/mis-compras.tsx` en una redirección a `/compras` y borrar `src/app/(tabs)/comprar.tsx`. Cambiar los enlaces de `src/app/(tabs)/topes.tsx`, `src/app/(tabs)/index.tsx` y `src/app/tope/[clave].tsx` a `/compras` (FR-022).
- [ ] T028 [US3] Mover `src/app/(tabs)/perfil.tsx` a `src/app/perfil.tsx`, registrarlo con `headerNativo` en `src/app/_layout.tsx` y crear `src/components/avatar-boton.tsx` en el encabezado de Inicio.
- [ ] T029 [US3] En `src/app/(tabs)/_layout.tsx`:
  - las tabs Compras · Inicio · Topes, con `unstable_settings.initialRouteName = "index"`;
  - primero, verificar si `NativeTabs` es estable en el SDK 58. Si lo es, usar la tab bar nativa con el `tint` del acento del tema; si no, la tab bar JS actual con el mismo `tint`, sin dibujar una propia (research R6).

  Verificar con una herramienta de contraste: indicador ≥ 3:1 y etiqueta ≥ 4.5:1 (FR-019).
- [ ] T030 [US3] Revisar las zonas seguras en `src/components/screen.tsx` y en la tab bar: que el inset de abajo no se sume dos veces ni falte, y que la barra de estado deje ver `canvas` (research R7). Probar en iPhone con notch, Android con gestos y Android con tres botones.
- [ ] T031 [P] [US3] Sacar las capturas «después» en `docs/design/capturas-app/despues-012/` y adjuntarlas al PR junto con las de T002 (SC-007).

**Checkpoint**: la navegación nueva cumple #103.

---

## Phase 6: User Story 4 - Primera respuesta real y con nombre (P2)

**Goal**: el onboarding muestra la respuesta del motor para un comercio que el usuario eligió, y la app sabe su nombre.

**Independent Test**: el recorrido 6 del quickstart, los tests de T032 y T033 y el pgTAP de T034.

### Tests

- [ ] T032 [P] [US4] Sumar a `src/perfil/datos.test.ts` `guardarNombre` y `leerNombre` sobre `perfiles.nombre_para_mostrar`, con el validador de 1 a 40 caracteres sin contar los espacios de los costados.
- [ ] T033 [P] [US4] Sumar a `src/store/perfil-remoto.test.ts` que `leerMedios` también carga el nombre y que `cambiarNombre` lo guarda y actualiza el store.
- [ ] T034 [P] [US4] Escribir `supabase/tests/database/perfiles_nombre_largo.test.sql`: se rechaza un nombre de 41 caracteres y se acepta uno de 40.

### Implementation

- [ ] T035 [US4] Crear la migración `supabase/migrations/20261105000001_perfiles_nombre_largo.sql` con el check de largo. Tiene que pasar T034.
- [ ] T036 [US4] Sumar `guardarNombre` y `leerNombre` a `src/perfil/datos.ts` y el thunk `cambiarNombre` a `src/store/perfil-remoto.ts`. Tiene que pasar T032 y T033.
- [ ] T037 [US4] En `src/components/formulario-cuenta.tsx`, sumar el campo nombre al modo registro (validado) y guardarlo con `cambiarNombre` después de crear la cuenta.
- [ ] T038 [US4] En `src/app/perfil.tsx`, hacer el nombre editable (FR-028).
- [ ] T039 [US4] Extraer `src/components/selector-comercios.tsx` de `src/app/(onboarding)/comercios.tsx`, con búsqueda, chips agrupados por rubro, tocar para marcar y ver, y × para desmarcar (FR-025). Usarlo también en `src/components/comercios-del-perfil.tsx` si encaja sin cambiar su comportamiento.
- [ ] T040 [US4] Rehacer `src/app/(onboarding)/primera-respuesta.tsx`:
  - `SelectorComercios`;
  - `useRecomendacionPara(ultimoTocado, null)` con el `DecisionCard`;
  - el texto para un comercio sin promo;
  - «Seguir» guarda con `confirmarComercios` y «Seguir sin elegir» sigue sin guardar.
- [ ] T041 [US4] Borrar `src/app/(onboarding)/comercios.tsx`, hacer que `medios.tsx` lleve a `/primera-respuesta` y ajustar `ProgressSegments` a 2 pasos reales (FR-030).

**Checkpoint**: un usuario nuevo ve una recomendación real para un comercio que eligió, y nadie se llama Martín.

---

## Phase 7: User Story 5 - Probar antes de crear la cuenta (P3, condicional)

**Goal**: la cuenta se pide al final, sin perder lo elegido.

**Independent Test**: el recorrido 7 del quickstart y los tests de T042 a T044.

### Tests

- [ ] T042 [P] [US5] Escribir `supabase/tests/database/catalogos_lectura_anon.test.sql`: `anon` lee `bancos`, `categorias` y las promociones vigentes; no lee una promo no vigente ni `perfiles`, `medios_de_pago`, `comercios_habituales` o `compras`; y no puede escribir en ninguna tabla.
- [ ] T043 [P] [US5] Sumar a `src/store/persistencia.test.ts` que `perfil.borrador` hace ida y vuelta y que uno de más de 30 días se descarta al rehidratar.
- [ ] T044 [P] [US5] Escribir `src/store/borrador.test.ts` para `guardarBorradorEnCuenta`, con un `DatosPerfil` en memoria:
  - cuenta vacía: guarda todo;
  - cuenta con medios: los descarta del borrador y avisa;
  - cuenta con habituales: igual, por separado;
  - una falla a mitad conserva el borrador.

### Implementation

- [ ] T045 [US5] Crear la migración `supabase/migrations/20261105000002_catalogos_lectura_anon.sql` con los grants y las policies de solo lectura para `anon`. Tiene que pasar T042. Pasar `rules-guardian`.
- [ ] T046 [US5] Sumar `borrador` a `src/store/perfil.ts` y a `src/store/persistencia.ts` (parte opcional validada), y escribir `guardarBorradorEnCuenta` en `src/store/perfil-remoto.ts`. Tiene que pasar T043 y T044.
- [ ] T047 [US5] Hacer que `src/app/(onboarding)/_layout.tsx` deje entrar sin sesión a `medios` y `primera-respuesta`, y que en esas pantallas se guarde en `borrador` cuando no hay sesión.
- [ ] T048 [US5] En `src/app/(onboarding)/bienvenida.tsx`, «Empezar» lleva a `/medios`. `registro` se titula «Guardá tu perfil» y, al crear la cuenta, corre `guardarBorradorEnCuenta`.
- [ ] T049 [US5] Crear `src/app/(auth)/confirmar-email.tsx`, que se abre cuando `registrarCuenta` devuelve `cuenta: null`, y correr `guardarBorradorEnCuenta` en el primer ingreso.
- [ ] T050 [P] [US5] Declarar el borrador del onboarding en `docs/product/privacidad.md` (FR-037).

**Checkpoint**: SC-009 se cumple, con y sin confirmación de email.

---

## Phase 8: Polish

- [x] T051 [P] Marcar como `issue` en `docs/design/ideas-ux.md` las entradas de la barra inferior y del flujo, con el número de cada issue.
- [ ] T052 [P] Actualizar `docs/architecture/03-frontend.md` y ADR-006 con el flujo «por confirmar» (pendiente de #105).
- [ ] T053 Correr el quickstart completo, `/code-review` y `test-runner`, y registrar la sesión en `docs/bitacora-prompts.md`.

## Dependencies & Execution Order

- **Setup → Foundational → historias.**
- **US1 → US2**: US2 extiende `por-confirmar.ts` y `revisa.tsx`.
- **US1 → US3**: la tab Compras muestra las `PorConfirmarCard`.
- **US4** solo depende de Foundational y puede ir en paralelo a US1. Toca `(onboarding)`, `formulario-cuenta` y `perfil`; coordinar con T028 de US3, que mueve `perfil.tsx`.
- **US4 → US5.**
- Dentro de cada historia, los tests van antes de su implementación, y los [P] se pueden repartir.

## MVP

US1 sola ya arregla el bug de producto («Usar» descuenta tope sin pagar). El corte para el pitch es US1 + US2 + US3 + US4, y US5 queda si el tiempo no alcanza.
