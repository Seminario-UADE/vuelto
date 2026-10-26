# Feature Specification: Pantalla «¿Con qué pago?» — cargar una compra y ver la recomendación

**Feature Branch**: `feat/43-recomendar-edge-function`

**Created**: 2026-10-24 · **Revisada**: 2026-10-24 (hallazgos de `spec-critic`: B1, I1–I6, M1–M6)

**Status**: Draft

**Input**: Issue [#43](https://github.com/Seminario-UADE/vuelto/issues/43) — "Pantalla «¿Con qué pago?»: cargar una compra y ver la recomendación", con el cambio de arquitectura del 13/10/2026 (ADR-001 §Actualización, RNF-02): la recomendación se calcula del lado del servidor, en una Edge Function, disparada por un botón explícito. Usa el motor de la issue #36 (`recomendar()`, `specs/002-motor-recomendar/`) y la estructura de capas de ADR-009.

**Decisión que resuelve (constitución §I)**: en el momento de pagar, con cuál de los medios de pago que tiene conviene pagar esta compra concreta (dónde y cuánto), cuánto ahorra y cuánto tope le queda después.

**Frontera con otras issues**:

- **Issue #36** (motor, cerrada): esta spec no cambia ninguna regla de elegibilidad, cálculo de ahorro ni ranking. Solo invoca `recomendar()` desde el servidor y muestra su resultado.
- **Issue #41** (perfil: bancos y tarjetas): de ahí salen los medios de pago del usuario. Esta pantalla los lee; no los edita.
- **Issue #34** (esquema de Supabase con RLS): define las tablas que lee la Edge Function (perfil, medios de pago, promociones, compras, catálogos). Esta spec fija qué datos necesita, no cómo se guardan.
- **Issue #44** (registrar una compra): el botón "Pagué con esto" de esta pantalla lleva al registro de esa issue con los datos precargados. El registro en sí es de la #44.
- **Issue #46** (explicar la recomendación): la redacción final de los motivos es de esa issue. Esta pantalla muestra el motivo que trae la respuesta, sin reescribirlo.
- **Issue #37** (topes compartidos y períodos, cerrada en el PR #73): el motor calcula topes mensuales, semanales y por compra, topes compartidos por grupo y promos acumulables. Cada opción de pago trae una lista de promociones aplicadas, cada una con su ahorro, su tope restante y su base (`specs/003-motor-topes-acumulables/`). El servidor cumple las dos precondiciones nuevas del motor (FR-020) y esta pantalla no corrige ni reinterpreta el cálculo.
- **Issue #47** (comercios habituales): los accesos rápidos a comercios habituales en esta pantalla son de esa issue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber con qué pagar una compra concreta (Priority: P1)

El usuario, a punto de pagar, indica dónde compra (eligiendo un comercio, o solo el rubro si no encuentra el comercio), cuánto gasta y si es presencial u online. Toca "Simular" y ve con qué banco y tarjeta le conviene pagar, cuánto ahorra, qué promoción se aplica y cuánto tope le queda después de la compra, como estimado y con su base.

**Why this priority**: Es la pantalla principal del producto (RF-03). Sin esto, Vuelto no resuelve la decisión que justifica su existencia.

**Independent Test**: Con un usuario de prueba que tiene medios de pago declarados y un corpus sembrado con una promoción que le aplica, se carga una compra, se toca "Simular" y se verifica que aparece el medio recomendado con su ahorro, su promoción y su tope restante con base. No depende del registro de compras (#44) ni de las alternativas (US2).

**Acceptance Scenarios**:

1. **Given** un usuario con Galicia crédito Visa declarado, una promoción vigente hoy de Galicia crédito Visa del 20% en Gastronomía con tope mensual de $12.000, y 2 compras registradas este mes con esa promoción que informan $1.000 de descuento cada una, **When** elige el comercio "Kansas" (rubro Gastronomía), carga $15.000, presencial, y toca "Simular", **Then** ve como recomendación Galicia crédito Visa, ahorro estimado ≈$3.000, el nombre de la promoción aplicada y el tope restante tras la compra con su base: "≈$7.000, según 2 compras registradas".
2. **Given** la pantalla recién abierta, **When** el usuario todavía no eligió comercio ni rubro, o no cargó un monto mayor a $0, **Then** el botón "Simular" está deshabilitado y no se muestra ninguna recomendación ni promoción (regla de oro).
3. **Given** que el usuario no encuentra su comercio en el buscador, **When** elige solo el rubro (una de las 13 categorías) y carga el monto, **Then** puede tocar "Simular" y recibe la recomendación para ese rubro (las promociones restringidas a un comercio específico no le aplican).
4. **Given** una recomendación ya mostrada, **When** el usuario cambia el comercio, el rubro, el monto o el canal, **Then** la recomendación anterior deja de mostrarse hasta que vuelva a tocar "Simular" (nunca se muestra un resultado que no corresponde a los datos cargados).
5. **Given** que el usuario tocó "Simular", **When** la respuesta todavía no llegó, **Then** ve un estado de carga y el botón no se puede volver a tocar hasta que termine.
6. **Given** la promoción recomendada no informa su tope, **When** se muestra el resultado, **Then** en lugar del tope restante se lee que la promoción no informa tope (nunca un número inventado).
7. **Given** la promoción recomendada tiene tope y el usuario no registró ninguna compra con ella este mes, **When** se muestra el resultado, **Then** el tope restante dice explícitamente que no hay compras registradas que lo sostengan (constitución §V).

---

### User Story 2 - Ver las otras opciones y por qué no aplican las demás promociones (Priority: P2)

Debajo de la recomendación, el usuario ve las alternativas ordenadas (otros medios con promoción, con su ahorro) y, plegadas, las promociones del rubro que no le sirven con su motivo. Si ninguna promoción aplica, ve un mensaje claro en lugar de una lista vacía.

**Why this priority**: Da confianza en la recomendación (RF-05) y evita que el usuario salga a buscar promociones por su cuenta. Depende de US1.

**Independent Test**: Con un corpus donde dos promociones aplican y una tercera falla por día, se simula una compra y se verifica la alternativa, su orden y la promoción descartada con su motivo.

**Acceptance Scenarios**:

1. **Given** un usuario con dos medios que tienen promoción para la compra, **When** simula, **Then** ve la mejor opción arriba y la otra como alternativa, en el mismo orden que devuelve el motor, cada una con su ahorro estimado.
2. **Given** una promoción del rubro que vale solo los viernes y la consulta es un miércoles, **When** el usuario despliega "Promociones que no aplican", **Then** la ve con el motivo que trae la respuesta (por ejemplo, que vale otro día).
3. **Given** que el usuario tiene medios de pago pero ninguna promoción aplica a la compra, **When** simula, **Then** ve el mensaje "Ninguno de tus medios tiene promo acá hoy" (no una lista vacía) y puede desplegar igual las promociones descartadas con su motivo.
4. **Given** que no hay ninguna promoción vigente para el rubro, **When** simula, **Then** ve el mismo mensaje de US2-3 y no se muestra la sección de descartadas.
5. **Given** una promoción descartada por tope agotado, **When** se la muestra, **Then** su motivo va acompañado de la base del estimado (constitución §V).

---

### User Story 3 - Saber qué pasa cuando no se puede calcular (Priority: P2)

Si el cálculo no se puede hacer (sin conexión, sesión vencida, perfil sin medios de pago o error del servidor), el usuario ve un mensaje claro que le dice qué pasó y qué puede hacer, en lugar de una pantalla vacía o un resultado viejo.

**Why this priority**: El cálculo pasó al servidor, así que se perdió el funcionamiento en modo avión (RNF-02). Si el error no se comunica bien, el usuario cree que no hay promociones o confía en un dato que no es de ahora.

**Independent Test**: Se simula con el dispositivo en modo avión, con un usuario sin medios de pago y con el servidor devolviendo un error, y se verifica el mensaje de cada caso.

**Acceptance Scenarios**:

1. **Given** el dispositivo sin conexión, **When** el usuario toca "Simular", **Then** ve "Necesitás conexión para calcular" y no se muestra ningún resultado, ni uno anterior.
2. **Given** un usuario sin ningún medio de pago declarado, **When** abre la pantalla, **Then** ve que necesita cargar al menos un medio de pago y un acceso a Perfil, y no puede simular (RF-01). Si de todos modos el servidor responde que el perfil no tiene medios (por ejemplo, porque los borró desde otro dispositivo), ve el mismo mensaje.
3. **Given** que la sesión del usuario venció, **When** toca "Simular", **Then** se le pide volver a iniciar sesión, sin perder lo que cargó en la pantalla.
4. **Given** que el servidor falla o no responde en 15 segundos, **When** el usuario toca "Simular", **Then** ve "No pudimos calcular. Probá de nuevo" con una opción para reintentar con los mismos datos.

---

### User Story 4 - Registrar la compra con el medio recomendado (Priority: P3)

Desde la recomendación (o desde una alternativa), el usuario toca "Pagué con esto" y pasa al registro de la compra con el comercio, el rubro, el monto, el medio de pago y la promoción ya cargados.

**Why this priority**: Cierra el circuito con el control de topes: las compras registradas son las que alimentan el tope estimado. Depende de la issue #44, que hace el registro.

**Independent Test**: Se simula una compra, se toca "Pagué con esto" sobre una alternativa y se verifica que el registro abre con los datos de esa alternativa (no los de la mejor opción).

**Acceptance Scenarios**:

1. **Given** una recomendación mostrada, **When** el usuario toca "Pagué con esto" en la mejor opción, **Then** pasa al registro de compra con comercio, rubro, monto, medio de pago y promoción precargados (el canal no se pasa: la compra registrada no lo guarda).
2. **Given** una recomendación mostrada, **When** toca "Pagué con esto" en una alternativa, **Then** el registro abre con el medio y la promoción de esa alternativa.
3. **Given** que el usuario volvió del registro después de guardar la compra, **When** vuelve a simular la misma compra, **Then** el resultado tiene en cuenta la compra recién registrada (el tope restante bajó).

---

### Edge Cases

- **Comercio con promociones en dos rubros**: si un comercio aparece en el corpus en más de un rubro, el buscador lo muestra una vez por rubro, con el nombre del rubro al lado, y el usuario elige cuál.
- **Comercio escrito con otro formato**: el buscador encuentra "Kansas" aunque el usuario escriba "kansas" o "KANSAS " (mismo criterio de normalización que el motor: sin mayúsculas, sin acentos, sin espacios de más).
- **Comercio que no está en el corpus**: el buscador dice que no lo encontró y ofrece elegir el rubro. La pantalla no permite elegir un comercio escrito a mano que no esté en la lista. El servidor no valida que el par (comercio, rubro) exista en el corpus: si le llega un comercio desconocido, el motor lo trata como cualquier otro (solo aplican las promociones de todo el rubro), así que no hay riesgo de un resultado incorrecto.
- **Medio o promoción que la app no conoce**: si la respuesta trae un medio de pago o una promoción que la app no tiene cargados (por ejemplo, un medio agregado desde otro dispositivo), la app vuelve a leerlos. Si aun así alguno no se puede resolver, o la lectura falla, se muestra el error de FR-016; nunca una opción sin banco ni tarjeta.
- **Pedido cerca de medianoche o de fin de mes**: la fecha de hoy y el mes calendario se calculan una sola vez, en hora de Argentina, a partir del mismo `ahora` que recibe el motor. Un pedido a las 22:00 del 31/10 en Argentina (01:00 del 1/11 en UTC) usa el 31/10 y las compras de octubre.
- **Monto con centavos**: se aceptan hasta 2 decimales. Más decimales, o un monto de $0, negativo o mayor a $100.000.000, deja el botón deshabilitado con un aviso al lado del campo.
- **Doble toque en "Simular"**: se manda un solo cálculo (el botón se deshabilita al tocarlo).
- **Respuesta que llega después de cambiar los datos**: si el usuario modifica la compra mientras se calcula, la respuesta que llega se descarta y no se muestra.
- **Cambio de día entre la carga y el cálculo**: vale el momento en que el servidor recibe el pedido, en hora de Argentina (una compra simulada a las 23:59 del martes puede calcularse con las promociones del miércoles si el pedido llega después de medianoche).
- **Medio de pago recomendado que el usuario borró en otro dispositivo mientras miraba el resultado**: el resultado mostrado no cambia; la próxima simulación ya no lo incluye.
- **Promoción descartada que ya no existe al desplegarla**: si al mostrar las descartadas una promoción ya no está en el corpus, se muestra igual con su motivo y sin título, en lugar de esconderla.
- **Pedido con datos inválidos** (rubro inexistente, canal desconocido, monto fuera de rango, comercio vacío o de más de 100 caracteres): el servidor lo rechaza sin calcular. La app no debería mandarlo nunca (valida antes); si pasa, muestra el error genérico de US3-4.
- **Pedido sin sesión, o con la clave pública de la app pero sin usuario logueado**: el servidor lo rechaza sin leer ningún dato.

## Requirements *(mandatory)*

### Functional Requirements

**Pantalla: entrada**

- **FR-001**: La pantalla MUST pedir: dónde (un comercio elegido de un buscador sobre los comercios del corpus, que trae su rubro, o un rubro de las 13 categorías de MODO sin comercio), monto en pesos y canal (presencial u online, presencial por defecto).
- **FR-002**: El buscador de comercios MUST buscar por texto parcial, sin distinguir mayúsculas, acentos ni espacios de más, y mostrar cada comercio con su rubro.
- **FR-003**: El botón "Simular" MUST estar deshabilitado mientras no haya un comercio o un rubro elegido y un monto válido (mayor a $0, hasta $100.000.000, con hasta 2 decimales).
- **FR-004**: Sin una compra simulada, la pantalla MUST NOT mostrar promociones de ningún tipo (constitución §I).

**Pantalla: cálculo y salida**

- **FR-005**: Tocar "Simular" MUST pedir la recomendación al servidor una sola vez, con estado de carga visible y el botón deshabilitado hasta que termine.
- **FR-006**: Ante una recomendación con mejor opción, la pantalla MUST mostrar: banco y tarjeta (tipo y red) del medio recomendado, ahorro estimado en pesos, nombre de la promoción aplicada, motivo y tope restante tras la compra con su base.
- **FR-007**: El tope restante MUST mostrarse como estimado y con su base, por ejemplo "≈$7.000, según 2 compras registradas", indicando cuántas de esas compras tienen el reintegro estimado y no informado. Con base de 0 compras MUST decir que no hay compras registradas que lo sostengan. Si la promoción no informa tope, MUST decirlo en lugar de mostrar un número (constitución §V).
- **FR-008**: La pantalla MUST mostrar las alternativas en el orden en que llegan, con los mismos datos que la mejor opción, y las promociones descartadas en una sección plegada, cada una con su título y su motivo, más la base cuando la causa es tope agotado.
- **FR-009**: Si no hay mejor opción, la pantalla MUST mostrar "Ninguno de tus medios tiene promo acá hoy" y, si hay descartadas, la sección plegada de FR-008.
- **FR-010**: Cambiar cualquier dato de la compra MUST ocultar el resultado mostrado. Una respuesta que llega para datos que ya cambiaron MUST descartarse.
- **FR-011**: La pantalla MUST NOT calcular, ordenar, filtrar ni reinterpretar la recomendación: muestra lo que devuelve el servidor tal cual (constitución §II). Solo resuelve nombres para mostrar (banco, tarjeta, título de promoción) a partir de los identificadores, y da formato a los importes.
- **FR-012**: Cada opción (mejor y alternativas) MUST tener un botón "Pagué con esto" que abre el registro de compra (issue #44) con comercio, rubro, monto, medio de pago y promoción de esa opción precargados.

**Pantalla: errores**

- **FR-013**: Sin conexión, "Simular" MUST mostrar "Necesitás conexión para calcular" y ningún resultado.
- **FR-014**: Si el usuario no tiene medios de pago declarados, la pantalla MUST mostrar que necesita cargar al menos uno, con acceso a Perfil, y no permitir simular (RF-01). Si el servidor responde que el perfil no tiene medios, MUST mostrar lo mismo.
- **FR-015**: Si la sesión venció, MUST pedir volver a iniciar sesión conservando los datos cargados.
- **FR-016**: Ante un error del servidor, una respuesta inválida o 15 segundos sin respuesta, MUST mostrar "No pudimos calcular. Probá de nuevo" con un botón para reintentar con los mismos datos.

**Servidor: cálculo de la recomendación**

- **FR-017**: El servidor MUST exponer un único punto de entrada autenticado para recomendar, que recibe la compra propuesta (comercio o `null`, rubro, monto, canal) y responde la recomendación del motor sin modificar su forma (contrato de `Recomendacion`, issue #33).
- **FR-018**: Un pedido MUST rechazarse antes de leer cualquier dato si no trae la sesión de un usuario logueado verificada contra el servicio de autenticación. Una credencial que no identifica a un usuario (por ejemplo, la clave pública de la app sin login) se rechaza igual que la falta de sesión. MUST existir un test para cada uno de los dos casos.
- **FR-019**: Un pedido con datos inválidos MUST rechazarse sin llamar al motor, indicando qué campo falló. Es válido si: el rubro existe en el catálogo de categorías; el monto es un número mayor a 0 y hasta 100.000.000 con hasta 2 decimales; el canal es presencial u online; el comercio es `null` o un texto de 1 a 100 caracteres después de quitar espacios de los extremos; y no trae otros campos. El servidor no valida que el comercio exista en el corpus (ver Edge Cases).
- **FR-020**: Para cada pedido válido, el servidor MUST tomar `ahora` del reloj del servidor una sola vez y derivar de ese mismo `ahora`, con la función de fecha del motor, la fecha de hoy y el mes calendario en hora de Argentina (nunca la fecha de la base, que está en UTC). Con eso junta, del usuario autenticado y de ningún otro:
  - sus medios de pago;
  - las promociones publicadas cuyo rubro es el de la compra y cuya vigencia incluye la fecha de hoy (inicio ≤ hoy ≤ fin). Este filtro previo MUST NOT usar los días de la semana ni ningún otro campo: las demás reglas las aplica el motor;
  - sus compras registradas con fecha desde el primer día del mes calendario de hoy o el lunes de la semana de hoy, lo que sea anterior, hasta hoy, incluidos ambos (precondición del motor, issue #37);
  - las promociones referenciadas por esas compras que no vinieron en el filtro anterior, sin filtrar por rubro ni vigencia: el motor las necesita para descontar los topes compartidos de su grupo (precondición del motor, issue #37).
- **FR-021**: El servidor MUST armar el perfil con los medios de pago del usuario (el nombre para mostrar y los comercios habituales no los usa el motor y van vacíos), llamar a `recomendar()` con ese perfil, las promociones, las compras, la compra del pedido y `ahora`, y MUST NOT agregar, quitar ni reordenar nada del resultado. El filtro previo de FR-020 no cambia la mejor opción ni las alternativas respecto de pasarle al motor todas las promociones publicadas: solo evita que aparezcan como descartadas las de otros rubros o fuera de vigencia, que no ayudan a la decisión. Las promociones de las compras registradas sí pueden aparecer como descartadas aunque sean de otro rubro o estén vencidas.
- **FR-022**: Las respuestas del servidor MUST seguir este contrato, para que la app distinga cada caso de US3:

  | Caso | Código | Cuerpo |
  |---|---|---|
  | Recomendación calculada | 200 | la `Recomendacion` del motor |
  | Datos inválidos (FR-019) | 400 | `{ "error": "invalido", "campo": "<nombre del campo>" }` |
  | Sin usuario logueado (FR-018) | 401 | `{ "error": "no_autenticado" }` |
  | Perfil sin medios de pago (el motor lanza `PerfilSinMediosError`) | 409 | `{ "error": "perfil_sin_medios" }` |
  | Método distinto de POST | 405 | `{ "error": "metodo_no_permitido" }` |
  | Cualquier otro error | 500 | `{ "error": "interno" }` |

- **FR-023**: Ninguna respuesta de error MUST exponer detalles internos (mensajes de la base, trazas). Los registros del servidor MUST NOT incluir el cuerpo del pedido, los medios de pago ni las compras del usuario; solo el tipo de error (`docs/product/privacidad.md`).
- **FR-024**: Para los mismos medios de pago, promociones, compras y `ahora`, la respuesta del servidor MUST ser idéntica a llamar `recomendar()` directamente con esos argumentos. MUST existir un test que lo verifique sin base de datos ni red, con un acceso a datos falso.
- **FR-025**: MUST existir tests, con un acceso a datos falso que registra con qué lo llamaron, que verifiquen que el servidor pide: los datos del usuario autenticado y de ningún otro; las promociones del rubro de la compra con la fecha de hoy en Argentina; y las compras desde el día 1 del mes o el lunes de la semana en Argentina, lo que sea anterior. Uno de los casos MUST ser un pedido a las 22:00 del último día del mes en Argentina (ya el día siguiente en UTC) y otro, un pedido en una semana que empezó el mes anterior.
- **FR-026**: Ningún modelo de lenguaje participa del cálculo ni de los textos de la respuesta (constitución §II).

**Restricciones**

- **FR-027**: La app MUST NOT tener al motor como dependencia ni importarlo (RNF-02). Es revisable en el manifiesto de dependencias de la app y en sus imports.
- **FR-028**: Las lecturas del servidor MUST respetar la seguridad por fila de cada tabla: el servidor accede a los datos con la sesión del usuario, nunca con una credencial que se la saltee.
- **FR-029**: ~~Esta pantalla MUST NOT publicarse para usuarios reales mientras la issue #37 esté abierta.~~ Resuelto: la #37 cerró (PR #73) y el motor ya calcula los topes semanales y por compra en su período real. El corpus de la demo puede tener cualquier período de tope.

**Comercios del corpus**

- **FR-030**: MUST existir una lectura de los comercios del corpus para el buscador: los pares únicos (comercio, rubro) de las promociones publicadas que tienen comercio y cuya vigencia no terminó (fin ≥ hoy). Es parte de esta issue y se crea junto con el esquema de la #34.

### Key Entities *(include if feature involves data)*

Usa el contrato de la issue #33 (`packages/motor/src/tipos.ts`) sin cambios.

- **Compra propuesta** (`CompraPropuesta`): lo que manda la app — comercio (o `null`), rubro, monto y canal.
- **Recomendación** (`Recomendacion`): lo que responde el servidor — mejor opción, alternativas y descartadas, cada una con identificadores de medio de pago y promoción, ahorro, tope restante, base y motivo.
- **Medio de pago** del perfil (issue #41), **promoción** publicada y **compra registrada** (issue #44): lo que el servidor lee para llamar al motor.
- **Comercio del corpus** *(lectura nueva, FR-030)*: pares únicos (comercio, rubro) que salen de las promociones publicadas no vencidas; alimenta el buscador de FR-002.
- **Error de perfil sin medios**: respuesta propia del servidor cuando el motor lanza `PerfilSinMediosError` (FR-022).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba con 3 personas que no conocen la app, con perfil ya cargado, cada una llega desde la pantalla abierta hasta ver con qué pagar (elegir comercio, cargar monto, tocar "Simular") en menos de 20 segundos.
- **SC-002**: Con conexión 4G y el corpus sembrado de la demo, en 20 simulaciones seguidas (sin contar la primera, que puede incluir el arranque en frío del servidor), al menos 19 muestran la recomendación en menos de 3 segundos desde que se toca "Simular".
- **SC-003**: Para los mismos datos de entrada, el resultado del servidor coincide con el de llamar al motor directamente en el 100% de los casos de prueba.
- **SC-004**: El 100% de los topes que muestra la pantalla aparece con su base o con el aviso de que la promoción no informa tope.
- **SC-005**: En los 4 casos de error de US3 el usuario ve un mensaje que nombra la causa; ninguno termina en una pantalla vacía ni en un resultado anterior.
- **SC-006**: La búsqueda de la dependencia o de imports del motor en la app da 0 resultados.

## Assumptions

- **Monto obligatorio**: se sigue la issue (comercio o rubro + monto). La auditoría de diseño v5 (`docs/design/auditoria-pantallas-v5.md`, hallazgo 1) propone un monto opcional y la respuesta en la misma tarjeta del Inicio; queda fuera de esta spec porque el motor necesita el monto para calcular el ahorro y el tope.
- **Promociones que evalúa el servidor**: solo las publicadas del rubro de la compra con vigencia que incluye hoy (FR-020). Las de otros rubros o vencidas no son relevantes para la decisión y harían ruido en las descartadas. El filtro usa solo rubro y fechas, nunca días de la semana, para que las promociones de otro día sigan apareciendo como descartadas con su motivo (US2-2).
- **Fecha de Argentina**: el motor ya calcula la fecha en hora de Argentina (`fechaArgentina`, spec 002), pero hoy no la exporta. El plan la exporta desde el paquete del motor (un cambio de una línea, sin tocar ninguna regla) para que el servidor no duplique ese cálculo.
- **Nombres para mostrar**: la respuesta trae identificadores, no nombres (el tipo `Recomendacion` no cambia). La app ya tiene los medios de pago del usuario (issue #41) y el catálogo de bancos; los títulos de las promociones los lee de la tabla de promociones publicadas, que es de lectura para cualquier usuario autenticado (la define la issue #34). Después de cada simulación vuelve a leer lo que no tenga (Edge Cases). Leer datos públicos no es calcular la recomendación (ADR-009).
- **Formato de la base**: el texto "≈$X, según N compras registradas" lo arma la pantalla con plantilla fija a partir del número y la base que trae la respuesta. Es formato, no lógica de negocio. Si la issue #38 publica un formato común, se usa ese.
- **Topes semanales y por compra**: los calcula el motor desde la issue #37. La pantalla no los corrige por su cuenta (FR-011).
- **Rubro del comercio**: un comercio del corpus pertenece al rubro de sus promociones. Si un comercio tiene promociones en dos rubros, se lista dos veces (Edge Cases).
- **Hora del servidor**: el reloj del servidor es confiable y se interpreta en hora de Argentina (UTC−3, sin horario de verano), igual que el motor.
- **Comercios habituales**: los accesos rápidos a comercios habituales en esta pantalla los agrega la issue #47. Esta spec deja el buscador listo para sumarlos arriba.
- **Detección de conexión**: se considera "sin conexión" cuando el dispositivo informa que no tiene red o el pedido falla antes de llegar al servidor. Un servidor que no responde es el caso de FR-016.
- **Datos de la base**: las tablas, columnas y políticas de seguridad por fila las define la issue #34. Hasta que estén, la lógica del servidor se prueba con datos fijos en memoria (FR-024).
