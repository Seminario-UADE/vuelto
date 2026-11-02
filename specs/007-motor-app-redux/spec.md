# Feature Specification: App — motor en el dispositivo y store de Redux

**Feature Branch**: `claude/motor-app-redux-95593e`

**Created**: 2026-11-01 · **Revisada**: 2026-11-01 (hallazgos de `spec-critic`)

**Status**: Draft

**Input**: Issue [#81](https://github.com/Seminario-UADE/vuelto/issues/81) — "App: motor en el dispositivo y store de Redux". Pasos 1 y 2 del plan de [ADR-010](../../docs/decisions/010-motor-en-la-app-y-redux.md), con la constitución 3.0.0 (Principio II).

**Decisión que resuelve (constitución §I)**: con qué medio de pago conviene pagar una compra concreta, ahora calculado en el teléfono, para que la respuesta cambie mientras el usuario escribe el monto y siga funcionando sin señal. Es un habilitador: no cambia qué ve el usuario, cambia de dónde sale el número.

**Frontera con otras issues**:

- **#43 («¿Con qué pago?» en vivo)**: que la cifra cambie al tipear es consecuencia directa de derivar la recomendación con un selector, y la issue #81 pide verificarlo (US2). Son de #43: agregar `monto: null` al motor (`CompraPropuesta.monto` hoy es `number`) y el pulido de la pantalla. Hasta entonces, la app consulta sin monto como monto 0 (ver Assumptions).
- **#34 (esquema) y #42 (sincronización)**: no hay base. El corpus, las compras y los catálogos salen de los datos de ejemplo (`fixtures.ts`). Los slices y la persistencia quedan listos para que #42 los llene desde Supabase.
- **#45 (Mis topes)**: esta spec cambia el origen de los topes al motor; el rediseño de la pantalla es de #45.
- **#54/#56 (gasto en grupo)**: el grupo sigue siendo un reemplazo local de la Edge Function, pero cada integrante se evalúa con el motor real (ver FR-012).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La recomendación sale del motor real (Priority: P1)

Martín elige Coto un miércoles con los datos de ejemplo. La app le recomienda Galicia, con el 20% en supermercados, y el reintegro y el tope que le quedan salen del mismo motor que tiene la suite de tests, no de una simulación escrita a mano.

**Why this priority**: es el paso 1 de ADR-010 y lo que justifica el Principio II en la app. Sin él no hay recomendación en vivo.

**Independent Test**: con el estado de ejemplo (mapeo en `data-model.md` §Datos de ejemplo) y el reloj en `2026-10-14T12:00:00-03:00` (miércoles), la recomendación para Coto con $10.000 es Galicia, con $2.000 de reintegro y ≈$4.500 de tope después, según 3 compras de octubre. El archivo del servidor simulado no existe.

**Acceptance Scenarios**:

1. **Given** el estado de ejemplo y el reloj en `2026-10-14T12:00:00-03:00`, **When** se pide la recomendación para Coto con $10.000, **Then** el mejor medio es Galicia Visa crédito, reintegro $2.000, te sale $8.000, tope después ≈$4.500 con base "3 compras de octubre".
2. **Given** el mismo estado, **When** se pide para Farmacity con $10.000, **Then** no hay medio recomendado y Macro aparece como "tope agotado" con su base.
3. **Given** el mismo estado, **When** se pide para YPF (la promo de Santander es los jueves), **Then** no hay medio recomendado y la promo de Santander aparece como "no aplica hoy" con el día en que sí aplica.
4. **Given** el mismo estado, **When** se pide para Coto sin monto, **Then** el mejor medio es Galicia y se muestra el tope disponible ≈$6.500 con su base, sin reintegro ni "te sale".

---

### User Story 2 - La recomendación cambia al tipear, sin red (Priority: P1)

Mientras Martín escribe el monto, la recomendación y el reintegro se actualizan con cada tecla, sin indicador de carga, sin botón y sin pedidos de red.

**Why this priority**: es el requisito que motivó ADR-010.

**Independent Test**: en el simulador, en la pantalla de un comercio, se tipea un monto dígito por dígito y la cifra cambia en cada tecla; el registro de red no muestra pedidos durante el tipeo. En tests, cambiar solo el monto del estado cambia solo los valores que dependen del monto.

**Acceptance Scenarios**:

1. **Given** Coto elegido, **When** el monto pasa de $1.000 a $10.000, **Then** el reintegro pasa de $200 a $2.000 sin estado de carga intermedio.
2. **Given** el estado de ejemplo salvo el monto (Coto, $1.000 y $10.000), **When** se recalcula, **Then** el medio recomendado, el motivo, las promos descartadas y la base son idénticos; cambian solo reintegro, te sale y tope después.
3. **Given** el mismo estado completo dos veces, **When** se recalcula, **Then** el resultado es idéntico y no se vuelve a ejecutar el motor (memoizado).

---

### User Story 3 - Los topes y las compras usan el mismo estado (Priority: P2)

Martín guarda una compra en Coto con Galicia. La pantalla de topes, la lista de compras y la siguiente recomendación reflejan esa compra porque todas leen el mismo estado.

**Why this priority**: es el paso 2 de ADR-010: una sola fuente de verdad en el cliente.

**Independent Test**: se guarda una compra de $5.000 con Galicia en Coto; el tope de Galicia baja de ≈$6.500 a ≈$5.500, su base pasa a 4 compras y la compra aparece en Mis compras.

**Acceptance Scenarios**:

1. **Given** el estado de ejemplo, **When** se guarda una compra de $5.000 en Coto con Galicia el 14/10, **Then** esa compra queda asociada a la promo de Galicia con un reintegro esperado de $1.000, sin descuento informado, y el tope de Galicia queda en ≈$5.500 según 4 compras.
2. **Given** una compra guardada con un medio que no es el recomendado, **When** se guarda, **Then** su reintegro es el de la promo de ese medio si aplica, o ninguno si no aplica.
3. **Given** el escenario de desarrollo "mes sin compras", **When** se abre Topes, **Then** ningún tope muestra cifra y todos dicen que no hay compras registradas.

---

### User Story 4 - El estado sobrevive al cerrar la app (Priority: P2)

Martín termina el onboarding, guarda una compra y cierra la app. Al abrirla, sigue en Inicio con sus medios y comercios, y la compra sigue en Mis compras. Lo que estaba simulando (comercio y monto) no se recuerda.

**Why this priority**: hoy el perfil se persiste y las compras nuevas se pierden; el store no debe perder lo primero y gana lo segundo.

**Independent Test**: tests del mecanismo de persistencia con un almacenamiento en memoria: se escribe el estado, se rehidrata un store nuevo y se compara.

**Acceptance Scenarios**:

1. **Given** el onboarding completo y una compra guardada, **When** la app se reabre, **Then** el perfil (onboarding, medios, comercios, invitación pendiente), la cuenta, el corpus y las compras se recuperan.
2. **Given** un comercio y un monto en la simulación, **When** la app se reabre, **Then** la simulación está vacía.
3. **Given** cualquier estado, **When** se inspecciona lo guardado en el dispositivo, **Then** no hay ninguna recomendación ni estimación de tope.
4. **Given** lo guardado está corrupto o en un formato viejo, **When** la app abre, **Then** arranca con el estado inicial (y repite el onboarding) sin romperse.

---

### Edge Cases

- **Monto 0, vacío o no numérico**: se trata como "sin monto" (US1 escenario 4). El campo acepta solo dígitos y los separadores de miles de es-AR ("10.000" es diez mil); no hay negativos ni decimales. Un monto ≤ 0 que llegue al estado se guarda como `null`.
- **Comercio fuera del catálogo** (sin categoría): no se llama al motor; la pantalla dice que no conoce el rubro, como hoy.
- **Perfil sin medios con promos** (por ejemplo, solo Mercado Pago): el motor exige al menos un medio; la app responde "sin promo" en vez de fallar.
- **Cambio de día con la app abierta**: el valor del reloj del estado se actualiza y la recomendación se recalcula sola (una promo "los miércoles" deja de aplicar el jueves). Se prueba con una fuente de reloj inyectada en los tests.
- **Compra con fecha distinta de hoy** (ticket de otro día): su reintegro esperado se evalúa con el reloj en el mediodía de la fecha de la compra, en hora de Argentina.
- **Compras de un período anterior en el estado**: los cálculos solo cuentan las del período (el motor filtra por fecha) y «Mis compras» muestra solo las del mes en curso. Podar el estado es de #42.
- **Promo vencida en el corpus guardado**: el motor la filtra por vigencia con el reloj del estado.
- **Promo con monto mínimo sin monto escrito**: con monto 0 se descarta por monto mínimo (limitación hasta #43; los datos de ejemplo no tienen monto mínimo).
- **Almacenamiento lleno o no disponible**: la app sigue funcionando en memoria; se pierde solo lo que no se pudo guardar.

## Requirements *(mandatory)*

### Functional Requirements

**Resolución del paquete**

- **FR-001**: La app DEBE depender de `@vuelto/motor` como paquete del monorepo y empaquetarlo compilado en Expo Go, en la web y en el build `preview` de EAS.
- **FR-002**: Una instalación limpia del monorepo (como la del CI y la de EAS) DEBE dejar el motor compilado sin pasos manuales. Decisión del PO (01/11/2026): el motor se compila al instalar.

**Cálculo**

- **FR-003**: La recomendación y la estimación de topes DEBEN salir de `recomendar()` y `estimarTopes()`/`formatearEstimacion()` del motor. El servidor simulado se borra.
- **FR-004**: La recomendación y los topes DEBEN derivarse del estado (perfil, corpus, compras, simulación y reloj) con funciones memoizadas: el mismo estado devuelve el mismo objeto sin recalcular.
- **FR-005**: Ninguna función que derive la recomendación o los topes DEBE leer el reloj del sistema. La hora entra como un valor del estado (`ahora`).
- **FR-006**: `ahora` (instante ISO 8601 con zona) DEBE vivir en el slice `sesion`, sin persistirse, y actualizarse al abrir la app, al volver a primer plano y al pasar la medianoche de Argentina, leyendo una fuente de reloj inyectable. Mientras la app use los datos de ejemplo, la fuente devuelve siempre `2026-10-14T12:00:00-03:00` (reloj fijo de la spec 006, FR-038).
- **FR-007**: El texto de la base y la cifra de cada tope DEBEN salir de las plantillas del motor (Principio V): con cero compras, sin cifra; el estado "queda poco" es el del motor (20% del tope o menos).
- **FR-008**: Al guardar una compra con un comercio de categoría conocida, la app DEBE evaluarla con el motor (reloj: mediodía de la fecha de la compra) y, si el medio elegido tiene una opción, registrar su promoción en `promocionId` y el ahorro estimado en `reintegroEsperado`. `descuentoObtenido` queda `null` (el usuario no informó el descuento), así el motor calcula el consumo y la base lo cuenta como "sin descuento informado". Si el medio no tiene opción, `promocionId` y `reintegroEsperado` quedan `null`.

**Estado**

- **FR-009**: La app DEBE tener un solo store con estos slices: `sesion` (cuenta, `ahora`, aviso pendiente, escenario de desarrollo y si ya se rehidrató), `perfil` (onboarding, medios, comercios, invitación pendiente), `corpus` (promociones y marca de la última carga), `compras` (compras del período), `simulacion` (comercio y monto) y `contactos` (contactos y grupo en armado).
- **FR-010**: La recomendación y los topes NO DEBEN guardarse en el store ni en el almacenamiento del dispositivo.
- **FR-011**: `perfil`, `corpus`, `compras` y la cuenta de `sesion` DEBEN persistirse en el dispositivo y rehidratarse al abrir. `simulacion`, `contactos`, `ahora`, el aviso y el escenario no se persisten. Cada parte se valida por separado: si una está corrupta o con otra versión, solo esa vuelve a su estado inicial (corpus y compras: los de ejemplo).
- **FR-012**: El gasto en grupo sigue detrás de `api.recomendarGrupo` (asíncrona: en producción es la Edge Function de #54/#56), con un reemplazo local que DEBE evaluar a cada integrante con cuenta usando `recomendar()` del motor sobre su perfil y sus compras de ejemplo (forma del motor, `data-model.md`), con el reloj en el mediodía de la fecha del grupo. Un integrante sin medios con promos (`PerfilSinMediosError`) queda sin opción. La app no recibe medios ni topes de un contacto salvo el medio recomendado (ADR-008 §3).
- **FR-013**: `sesion.ts` y `perfil-local.ts` DEBEN dejar de existir; todas las pantallas leen y escriben el store.
- **FR-014**: Los escenarios de desarrollo DEBEN seguir funcionando sobre el store: "mes sin compras" vacía `compras` (y lo persistido), "normal" vuelve a las compras de ejemplo (se pierden las guardadas), "ticket ilegible" hace fallar la lectura del ticket.
- **FR-016**: `api.ts` DEBE conservar solo lo que en producción sale a la red (catálogos, búsqueda, ticket, invitaciones, grupo); la recomendación, los topes, el perfil y las compras se leen de selectores, sin demora simulada ni estado de carga.

**Documentación**

- **FR-015**: `docs/architecture/03-frontend.md` DEBE describir el estado implementado (slices, selectores, persistencia, reloj) y cómo se resuelve el motor.

### Key Entities

- **Estado del cliente**: los seis slices de FR-009. Solo datos de entrada; nada derivado.
- **Corpus**: promociones con la forma del motor (`Promocion`) y la fecha de la última carga. El mapeo de los datos de ejemplo a esta forma (banco, tarjetas, vigencia, tope, canal, jurisdicción, acumulable) está en `data-model.md`; la compra propuesta va siempre con canal `presencial`.
- **Compra del período**: compra con la forma del motor (`Compra`: comercio, categoría, medio, promoción aplicada, descuento obtenido) más lo que la app necesita para mostrarla (origen, texto del ticket).
- **Simulación**: comercio elegido y monto opcional de la compra que se está evaluando.
- **Reloj (`ahora`)**: instante ISO guardado en el estado; lo actualiza la capa imperativa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un test de selectores fija las cuatro respuestas de US1 con sus cifras exactas sobre el estado de ejemplo.
- **SC-002**: Al tipear un monto de 5 dígitos, la cifra del reintegro cambia en cada una de las 5 teclas, sin estado de carga visible y con 0 pedidos de red.
- **SC-003**: Recalcular con un estado idéntico no vuelve a ejecutar el motor (verificado en tests).
- **SC-004**: Después de cerrar y abrir la app, el 100% del perfil, las compras y el corpus se conservan, y lo guardado no contiene ninguna recomendación ni tope.
- **SC-005**: Después de una instalación limpia del repositorio (sin `dist/`), el empaquetado JavaScript de la app para iOS, Android y web termina sin pasos manuales, y el build `preview` de EAS (APK de Android) termina sin errores.
- **SC-006**: Ningún archivo de la app contiene el servidor simulado, `sesion.ts` ni `perfil-local.ts`, y ninguna función derivada lee el reloj del sistema (búsqueda en el código y `rules-guardian`).

## Assumptions

- **Monto opcional**: hasta que #43 agregue `monto: null` al motor, "sin monto" se consulta con monto 0: el ahorro es 0 y `topeRestanteTrasCompra` es el tope disponible. Limitaciones aceptadas hasta #43: una promo con monto mínimo se descartaría, y si dos medios aplican, con ahorro 0 el motor desempata por id de medio (no por porcentaje). Los datos de ejemplo no tienen ninguno de los dos casos.
- **Reloj fijo**: los datos de ejemplo son de octubre de 2026; con el reloj real las promos estarían vencidas. La fuente del reloj se cambia por la real cuando #42 traiga el corpus vigente.
- **Catálogos** (medios y comercios ofrecidos en el onboarding): siguen siendo datos estáticos de `fixtures.ts`; no son estado del usuario.
- **Medios sin promos** (Mercado Pago): no entran al perfil del motor. Para el motor un medio necesita banco, tipo y red; inventarlos estaría prohibido por el Principio III.
- **Persistencia**: AsyncStorage con un listener propio, sin `redux-persist`. Con los datos de ejemplo el corpus es de pocas promos; medir el corpus real es de #42.
- **Cambio de comportamiento aceptado**: el umbral de "queda poco" pasa del 30% del mock al 20% del motor (DESIGN.md §5, spec 005). Con los datos de ejemplo, Santander ($2.300 de $8.000) pasa de "queda poco" a "disponible".
- **Contactos**: la lista sale de los datos de ejemplo; aceptar o quitar un contacto vive en el slice y se pierde al cerrar, como hoy.
