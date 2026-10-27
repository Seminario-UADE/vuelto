# Feature Specification: Motor — recomendar el medio de pago óptimo para una compra

**Feature Branch**: `claude/motor-recomendar-36` (sobre `main`, con el PR #67 ya mergeado)

**Created**: 2026-10-18 · **Revisada**: 2026-10-20 (hallazgos de `spec-critic`)

**Status**: Draft

**Input**: Issue [#36](https://github.com/Seminario-UADE/vuelto/issues/36) — "Motor: recomendar el medio de pago óptimo para una compra (elegibilidad y ranking)", incluido el criterio agregado el 18/10 sobre la base del tope. Usa el contrato de tipos de la issue #33 (`packages/motor/src/tipos.ts`) y la arquitectura de ADR-009.

**Decisión que resuelve (constitución §I)**: dado dónde y cuánto va a comprar, con qué medio de pago de los que tiene conviene pagar, y por qué las demás promociones no le sirven.

**Frontera con otras issues** (acordada con el dueño de la issue):

- **Issue #37** (topes compartidos, períodos y acumulabilidad): esta spec calcula el tope consumido **de cada promoción por separado**, en el mes calendario, sin saldos compartidos entre promociones ni suma de promociones acumulables. La issue #37 generaliza este cálculo y resuelve los períodos semanal y por compra.
- **Issue #38** (estimar topes): su cuerpo propone la forma de la base (`EstimacionTope.base`). Esta spec es la primera en implementarla y la agrega a cada opción de pago; la issue #38 reutiliza ese mismo tipo.
- **Criterio "tope agotado ⇒ ahorro 0 y no es `mejor`" de la issue #36**: esta spec lo cumple descartando la promoción con causa `tope_agotado` (no genera una opción con ahorro $0), que es además lo que pide la issue #37 ("aparece en `descartadas` con motivo 'tope agotado'").
- **Issue #46** (explicar la recomendación): esta spec exige que cada opción y cada descarte tengan un motivo y una causa identificable; la redacción final de los textos es de la issue #46.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber con qué medio de pago conviene pagar (Priority: P1)

El usuario indica una compra concreta (categoría, comercio si lo sabe, monto y si es presencial u online). El motor evalúa todas las promociones contra los medios de pago que el usuario declaró y devuelve la opción que más ahorro le da, seguida de las demás opciones ordenadas.

**Why this priority**: Es el núcleo del producto (RF-03). Sin esto no hay recomendación que mostrar en la pantalla «¿Con qué pago?» (issue #43).

**Independent Test**: Se prueba llamando al motor con un perfil, una compra, un conjunto de promociones y una fecha fijos, y verificando que la mejor opción y el orden de las alternativas son los esperados — sin base de datos, sin red y sin la app.

**Acceptance Scenarios**:

1. **Given** un perfil con Galicia crédito Visa y Santander débito Mastercard, y dos promociones vigentes en Supermercados (Galicia crédito Visa 20%, Santander débito Mastercard 10%), **When** el usuario consulta una compra de $10.000 en Supermercados, **Then** la mejor opción es Galicia crédito Visa con un ahorro de $2.000 y la alternativa es Santander débito Mastercard con $1.000.
2. **Given** dos opciones con exactamente el mismo ahorro, **When** se pide la recomendación, **Then** el orden entre ellas es siempre el mismo, decidido por un criterio fijo sobre sus identificadores (no por el orden en que llegaron las promociones).
3. **Given** el mismo perfil, la misma compra, las mismas promociones, las mismas compras registradas y la misma fecha, **When** se pide la recomendación dos veces, **Then** los dos resultados son idénticos.
4. **Given** un perfil sin ningún medio de pago declarado, **When** se pide una recomendación, **Then** el motor lanza un error propio de "perfil sin medios de pago", distinguible de cualquier otro error y de una recomendación sin opciones (RF-01).
5. **Given** un perfil con medios de pago pero ninguna promoción que aplique a la compra, **When** se pide la recomendación, **Then** no hay mejor opción, no hay alternativas y todas las promociones recibidas aparecen como descartadas con su causa y su motivo.

---

### User Story 2 - Entender por qué una promoción no me sirve (Priority: P2)

Para cada promoción que no aplica a la compra, el motor informa la causa (por ejemplo: vale otro día, ya venció, no tengo esa tarjeta, no llego al monto mínimo), para que el usuario confíe en la recomendación y entienda qué está dejando pasar.

**Why this priority**: Es lo que hace confiable la recomendación (RF-05) y lo que permite testear cada regla de elegibilidad por separado (constitución §VI, RF-04). Depende de US1.

**Independent Test**: Se prueba con una promoción que falla exactamente una regla por vez y se verifica que aparece descartada con la causa de esa regla.

**Acceptance Scenarios**:

1. **Given** una promoción válida solo los viernes, **When** se consulta un miércoles, **Then** aparece descartada con la causa `dia`.
2. **Given** una promoción cuya vigencia terminó ayer, **When** se consulta hoy, **Then** aparece descartada con la causa `vigencia`.
3. **Given** una promoción de un banco o una red que el usuario no declaró, **When** se consulta, **Then** aparece descartada con la causa `medio_de_pago`.
4. **Given** una promoción con monto mínimo de $20.000, **When** se consulta una compra de $15.000, **Then** aparece descartada con la causa `monto_minimo`.
5. **Given** una promoción solo online, **When** se consulta una compra presencial, **Then** aparece descartada con la causa `canal`.
6. **Given** una promoción de otra categoría, o de un comercio distinto al de la compra, **When** se consulta, **Then** aparece descartada con la causa `categoria` o `comercio`, según corresponda.
7. **Given** una promoción válida solo en otra provincia (por ejemplo, Córdoba), **When** se consulta, **Then** aparece descartada con la causa `jurisdiccion`; una promoción nacional, de CABA o de provincia de Buenos Aires sí aplica.

---

### User Story 3 - Que el ahorro tenga en cuenta el tope que ya usé (Priority: P2)

Si el usuario ya registró compras con una promoción este mes, el ahorro de esa promoción se limita a lo que le queda de tope. Cada opción informa cuánto tope quedaría después de la compra, como estimado y con su base (cuántas compras lo sostienen y cuántas de ellas no informan el reintegro real).

**Why this priority**: Es el diferencial del producto (`docs/product/problema.md`): no recomendar una promoción que ya no reintegra nada. Esta historia cubre cada promoción por separado; los topes compartidos son de la issue #37.

**Independent Test**: Se prueba con una promoción con tope y compras registradas que consumen parte o todo ese tope, verificando el ahorro, el tope restante y la base.

**Acceptance Scenarios**:

1. **Given** una promoción de 20% con tope mensual de $5.000 y dos compras registradas este mes que informan $1.500 y $2.500 de descuento, **When** se consulta una compra de $10.000, **Then** el ahorro es $1.000 (no $2.000), el tope restante tras la compra es $0 y la base es 2 compras registradas, 0 sin descuento informado.
2. **Given** una promoción cuyo tope del mes ya está consumido por completo, **When** se consulta, **Then** la promoción aparece descartada con la causa `tope_agotado` y nunca es la mejor opción.
3. **Given** compras registradas con esa promoción en el mes anterior, **When** se consulta, **Then** esas compras no consumen el tope de este mes ni cuentan en la base.
4. **Given** una promoción de 20% con tope de $5.000 y una compra registrada de $10.000 este mes que no informa el descuento, **When** se calcula el tope consumido, **Then** el consumo de esa compra se estima en $2.000 y la base es 1 compra registrada, 1 sin descuento informado.
5. **Given** una promoción de 20% con tope de $5.000 y una compra registrada de $100.000 este mes que no informa el descuento, **When** se calcula el tope consumido, **Then** el consumo estimado es $5.000 (nunca más que el tope), el tope restante es $0 y la promoción se descarta con causa `tope_agotado` y base 1 compra registrada, 1 sin descuento informado.
6. **Given** una promoción que no informa su tope, **When** se consulta una compra de $10.000 con 20%, **Then** el ahorro es $2.000 (el porcentaje completo, sin techo), el tope restante es `null`, la base es `null` y el motivo aclara que la promoción no informa tope.
7. **Given** una promoción con tope y ninguna compra registrada con ella este mes, **When** se consulta, **Then** la base es 0 compras registradas, 0 sin descuento informado (para que la pantalla diga explícitamente que no hay compras que sostengan el estimado).

---

### Edge Cases

- **Mismo medio, varias promociones**: si un medio de pago califica para dos promociones, cada par (medio, promoción) es una opción distinta; no se suman (la acumulabilidad es de la issue #37).
- **Misma promoción, varios medios**: si una promoción acepta dos medios del usuario (por ejemplo Galicia Visa débito y Galicia Visa crédito), cada par es una opción distinta y el desempate fijo decide el orden.
- **Compra sin comercio**: si la compra no indica comercio, una promoción restringida a un comercio no aplica (no se puede confirmar), con causa `comercio`; una promoción de toda la categoría sí aplica.
- **Diferencias de formato en el comercio**: "COTO", "Coto" y "coto " se consideran el mismo comercio (se compara sin mayúsculas, sin acentos y sin espacios de más).
- **Bordes de la vigencia**: el primer y el último día de la vigencia son válidos.
- **Bordes del día y del mes**: la fecha, el día de la semana y el mes se evalúan en hora de Argentina. Una consulta a las 23:30 del 31/10/2026 en Argentina es del 31/10 (sábado, mes de octubre), aunque en UTC ya sea domingo 1/11.
- **Varias causas a la vez**: si una promoción falla más de una regla, se informa una sola causa, siempre la misma para los mismos datos, según el orden fijo de FR-015.
- **Promoción que falla para un medio y aplica para otro**: aparece como opción (con el medio que aplica) y no como descartada.
- **Tope justo agotado**: si el tope restante antes de la compra es exactamente $0, la promoción se descarta con causa `tope_agotado` (no genera una opción con ahorro $0). Como los importes se calculan en centavos enteros (FR-018), "exactamente $0" no depende de errores de redondeo.
- **Ahorro que redondea a $0**: si a la promoción le queda tope pero el porcentaje sobre una compra de pocos centavos redondea a $0, se genera una opción con ahorro $0. No es un caso realista y se deja así (decisión de la revisión de código, 20/10).
- **Tope de $0**: una promoción con tope informado de $0 se descarta con causa `tope_agotado`.
- **Período del tope no informado**: se trata como mensual.
- **Compras registradas con fecha posterior a hoy**: no consumen tope ni cuentan en la base (el motor no las "adelanta").
- **Compra registrada con descuento informado de $0 o negativo**: consume $0 y cuenta como compra con descuento informado (no como estimada).
- **Promoción con porcentaje de descuento 0%** (no confundir con tope agotado): es un dato inválido que la ingesta no publica (issue #51), así que el motor no lo contempla (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Entrada y salida**

- **FR-001**: El motor MUST recibir la compra propuesta, el perfil del usuario, la lista de promociones, las compras registradas del usuario y el instante actual (`ahora`, un `Date`) como parámetros, y no leer ninguno de esos datos de otro lado (constitución §II).
- **FR-002**: El motor MUST devolver una recomendación con: la mejor opción (o `null`), las alternativas ordenadas y las promociones descartadas.
- **FR-003**: Cada promoción recibida MUST terminar en exactamente un lugar: formando parte de al menos una opción de pago, o en la lista de descartadas — nunca en las dos, nunca en ninguna.
- **FR-004**: Si el perfil no tiene ningún medio de pago, el motor MUST lanzar un error propio (`PerfilSinMediosError`), distinguible por su tipo de cualquier otro error y de una recomendación sin opciones (RF-01). La capa externa (Edge Function, ADR-009) lo traduce en una respuesta que la app le muestra al usuario para que cargue un medio de pago. Este error se agrega al contrato del motor.

**Elegibilidad** (una promoción aplica a un par medio de pago + compra solo si cumple todas)

- **FR-005 — Medio de pago** (`medio_de_pago`): el banco de la promoción es el banco del medio de pago, y la red del medio de pago está entre las redes aceptadas por la promoción para su tipo de tarjeta (débito o crédito).
- **FR-006 — Vigencia** (`vigencia`): la fecha de `ahora` (en hora de Argentina) está entre el inicio y el fin de la vigencia, ambos incluidos.
- **FR-007 — Día** (`dia`): el día de la semana de `ahora` (en hora de Argentina) está entre los días válidos de la promoción, o la promoción vale todos los días.
- **FR-008 — Categoría** (`categoria`): la categoría de la promoción es la de la compra.
- **FR-009 — Comercio** (`comercio`): si la promoción está restringida a un comercio, la compra indica un comercio y coincide con el de la promoción comparando sin mayúsculas, sin acentos y sin espacios de más. Si la promoción no está restringida a un comercio, aplica a toda la categoría.
- **FR-010 — Monto mínimo** (`monto_minimo`): la promoción no tiene monto mínimo, o el monto de la compra es mayor o igual al mínimo.
- **FR-011 — Canal** (`canal`): la promoción vale en ambos canales, no informa canal, o su canal es el de la compra.
- **FR-012 — Jurisdicción** (`jurisdiccion`): el alcance del MVP es CABA y AMBA (decisión del 20/10/2026). La promoción aplica si su jurisdicción es nacional (vale en todo el país, CABA y AMBA incluidos), CABA o provincia de Buenos Aires, o si no la informa. Una promoción de otra provincia (por ejemplo, solo Córdoba) no aplica. La lista de jurisdicciones válidas MUST ser un valor configurable en un único lugar, no repetido en la lógica.
- **FR-013 — Tope disponible** (`tope_agotado`): a la promoción le queda tope en el período (ver FR-016 y FR-017). Si el tope restante antes de la compra es $0, la promoción no genera opción.

**Descartes**

- **FR-014**: Cada promoción que no genera ninguna opción MUST aparecer en descartadas con una **causa** del conjunto cerrado `categoria`, `comercio`, `vigencia`, `dia`, `canal`, `jurisdiccion`, `monto_minimo`, `medio_de_pago`, `tope_agotado` (una por regla) y un **motivo** de texto no vacío, generado por plantilla, nunca por un modelo de lenguaje (constitución §II).
- **FR-015**: Si una promoción falla varias reglas, la causa informada MUST ser la de la primera regla que falla según este orden fijo: categoría, comercio, vigencia, día, canal, jurisdicción, monto mínimo, medio de pago, tope agotado. (Primero lo que hace que la promoción sea irrelevante para la compra; al final, lo que depende del usuario.) Si la promoción falla `medio_de_pago` con todos los medios del usuario, esa es la causa; si pasa con al menos un medio y falla después, la causa es la de esa regla posterior.

**Tope y ahorro**

- **FR-016**: El tope consumido de una promoción MUST calcularse con las compras registradas que tienen esa misma promoción y cuya fecha cae en el mismo mes calendario que `ahora` y no es posterior a la fecha de `ahora` (en hora de Argentina). Si el período del tope no se informa, se trata como mensual; los períodos semanal y por compra también se evalúan como mensuales hasta la issue #37 (ver Assumptions). No se combinan saldos entre promociones (issue #37).
- **FR-017**: El consumo de cada compra registrada MUST ser su descuento informado (o $0 si es $0 o negativo) o, si no lo informa, una estimación: su monto por el porcentaje de la promoción, sin superar el tope. El tope consumido total nunca supera el tope, y el tope restante (tope menos consumido) nunca es negativo.
- **FR-018**: El ahorro de una opción MUST ser el monto de la compra por el porcentaje de la promoción, limitado al tope restante. Si la promoción no informa su tope, el ahorro es el porcentaje completo, sin límite, y el motivo lo aclara. Todos los importes se calculan con **enteros**: los montos de entrada (en pesos) se convierten a centavos redondeando al centavo más cercano, el porcentaje se convierte a centésimos de punto (20% = 2000, 33,3% = 3330) redondeando al más cercano, y cada producto monto × porcentaje se redondea hacia abajo al centavo (nunca se promete un reintegro mayor al real). Los importes que devuelve el motor son pesos con a lo sumo dos decimales exactos.
- **FR-019**: Cada opción MUST informar el tope restante después de la compra (tope restante menos ahorro, nunca negativo), o `null` si la promoción no informa su tope.
- **FR-020**: Cada opción, y cada descarte con causa `tope_agotado`, MUST incluir la **base** del estimado: `{ comprasRegistradas, comprasSinDescuentoInformado }`, con la cantidad de compras registradas que entran en el cálculo de FR-016 y cuántas de ellas no informan descuento (FR-017). La base es `null` solo si la promoción no informa su tope; con tope informado y ninguna compra, es `{ 0, 0 }`. En los descartes con otra causa, la base es `null` (no se informa ningún tope). Es la forma propuesta en la issue #38, que la reutiliza.

**Ranking**

- **FR-021**: Las opciones MUST ordenarse por ahorro de mayor a menor. Ante igual ahorro, por identificador del medio de pago y luego por identificador de la promoción, en orden ascendente comparando carácter por carácter por su código (no según el idioma del sistema), para que el orden no dependa del entorno de ejecución.
- **FR-022**: La mejor opción MUST ser la primera del orden; las alternativas, el resto. Sin opciones, la mejor opción es `null`.
- **FR-023**: El orden de las descartadas MUST ser fijo (por identificador de promoción, con la misma comparación que FR-021), para que el resultado no dependa del orden de entrada.

**Restricciones**

- **FR-024**: El motor MUST seguir sin dependencias de runtime, sin acceso a red y sin leer el reloj del sistema; su suite de tests MUST correr sin red (constitución §II y §VI).
- **FR-025**: MUST existir al menos un test por cada regla de elegibilidad (FR-005 a FR-013) que verifique su causa de descarte, más los casos de las historias de usuario (constitución §VI, RF-04).

### Key Entities *(include if feature involves data)*

Usa el contrato de la issue #33 (`packages/motor/src/tipos.ts`). Cambios que introduce esta spec sobre ese contrato:

- **Base del estimado** *(nueva)*: `{ comprasRegistradas: number; comprasSinDescuentoInformado: number } | null` en cada opción de pago y en cada descarte (FR-020). La reutiliza la issue #38.
- **Causa de descarte** *(nueva)*: conjunto cerrado de causas (FR-014). Se agrega a cada descarte junto al motivo, para que los tests y la issue #46 no dependan de la redacción del texto.
- **Error de perfil sin medios** *(nuevo)*: `PerfilSinMediosError` (FR-004).
- **Jurisdicción** *(ampliada)*: se agrega el valor `"otra_provincia"` a `Jurisdiccion` para las promociones de provincias fuera del alcance. Sin él, el extractor no tiene cómo expresar "solo Córdoba" y la deja en `null`, que aplica en todos lados. Las jurisdicciones válidas del MVP (`nacional`, `caba`, `pba`) quedan en una constante configurable (FR-012).

Sin cambios: compra propuesta, perfil y medio de pago, promoción, compra registrada y recomendación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para los mismos datos de entrada, el resultado es idéntico en el 100% de las ejecuciones repetidas.
- **SC-002**: Cada una de las 9 reglas de elegibilidad tiene al menos un caso de prueba que la hace fallar sola y verifica su causa.
- **SC-003**: La recomendación para una compra evaluada contra 2.000 promociones (el tamaño del corpus completo de MODO) y 100 compras registradas se obtiene en menos de 1 segundo, medido por un test de la suite en el CI.
- **SC-004**: El 100% de las promociones recibidas queda clasificada (en una opción o descartada) en cada caso de prueba.
- **SC-005**: Ninguna opción informa un tope restante sin su base, salvo que la promoción no informe su tope, y ningún descarte por tope agotado aparece sin su base (constitución §V).
- **SC-006**: La suite completa del motor pasa sin conexión a internet.

## Assumptions

- Los datos de entrada llegan validados por la capa externa (ADR-009): el monto de la compra es mayor a 0, el porcentaje de cada promoción está entre 0 (excluido) y 100, y la vigencia tiene inicio anterior o igual al fin (la validación de rangos queda en la issue #51).
- Las compras registradas recibidas son las del usuario que consulta y están confirmadas: en la base solo se guardan compras confirmadas (RF-09), así que el contrato no tiene un estado de compra. El motor igual filtra por mes y por promoción, así que recibir compras de otros meses no altera el resultado.
- El período del tope se trata como **mes calendario** para todas las promociones en esta issue. Los períodos semanal y por compra los resuelve la issue #37; hasta entonces se evalúan como mensuales (limitación conocida). Riesgo: una promoción "por compra" se descartaría por tope agotado después de la primera compra del mes, aunque siga reintegrando. Por eso la pantalla «¿Con qué pago?» (issue #43) no debería salir a usuarios antes que la issue #37.
- Hoy la app no tiene dónde cargar el reintegro real (`docs/design/`), así que en la práctica casi todas las compras registradas tendrán el descuento estimado. El motor usa el descuento informado cuando existe.
- El redondeo para mostrar (por ejemplo "≈$8.000") es responsabilidad de la presentación (issues #38 y #46); el motor solo redondea al centavo (FR-018).
- La fecha y hora actual se interpreta en hora de Argentina (UTC−3, sin horario de verano). Las fechas de vigencia y de compras registradas ya vienen como fecha calendario de Argentina (`FechaISO`).
- Los identificadores de promociones, de medios de pago del perfil y de compras registradas son únicos dentro de cada lista; lo garantiza la capa externa (vienen de claves primarias de la base).
- Las promociones que llegan al motor son las que la capa externa decidió evaluar (por ejemplo, solo las de la categoría de la compra); el motor no asume nada sobre ese filtro y clasifica todas las que recibe.
- Una promoción de AMBA la clasifica el extractor como `caba` o `pba` (las dos son válidas, así que el resultado del motor es el mismo); cómo se mapea cada texto de la letra chica a `Jurisdiccion`, incluido `otra_provincia`, es de la issue #51.
- La comparación de comercio es por igualdad después de normalizar; coincidencias parciales ("Coto" vs. "Coto Express") no se consideran el mismo comercio en esta issue.
