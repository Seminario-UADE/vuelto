# Feature Specification: Motor — topes compartidos, períodos del tope y promociones acumulables

**Feature Branch**: `claude/motor-topes-37`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Issue [#37](https://github.com/Seminario-UADE/vuelto/issues/37) — "Motor: topes compartidos vs. exclusivos, tope consumido y acumulabilidad". Extiende el motor de la issue #36 (`specs/002-motor-recomendar/`, ya mergeado) y su contrato en `packages/motor/src/tipos.ts`.

**Decisión que resuelve (constitución §I)**: con qué medio de pago conviene pagar una compra cuando el tope ya consumido se reparte entre varias promociones, se renueva cada semana o se aplica compra por compra, y cuando dos promociones se pueden sumar sobre la misma compra. Sin esto, la app recomienda promociones que ya no reintegran nada (por ejemplo, una promo semanal agotada que el motor cree mensual) o deja de recomendar la combinación que más devuelve.

**Frontera con otras issues** (acordada con el dueño de la issue):

- **Issue #36** (ya mergeada): reglas de elegibilidad, causas de descarte, cálculo en centavos, base del estimado y ranking. Esta spec cambia solo el cálculo del tope y la forma de la opción de pago; todo lo demás de `specs/002-motor-recomendar/spec.md` sigue vigente salvo donde esta spec lo reemplaza explícitamente (ver Key Entities).
- **Issue #38** (estimar topes): reutiliza el cálculo de saldo de esta spec para «Mis topes», sin duplicarlo.
- **Issue #51** (extractor): es quien completa `alcance`, `grupoTopeId`, `periodo` y `acumulable` desde la letra chica. Esta spec no define cómo se extraen.

**Datos reales que la sustentan** (letra chica de 15 promociones de supermercados de MODO, relevada el 25/10/2026): el tope más común es semanal ("hasta $6.000 por usuario por semana", 9 de 15); 9 de 15 se declaran acumulables, 2 no acumulables y 4 no lo dicen; no apareció ningún tope compartido explícito entre promociones.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Que el tope se renueve cuando corresponde (Priority: P1)

El tope de cada promoción se cuenta en su período real: el mes calendario, la semana de lunes a domingo, o cada compra por separado. Así una promo semanal ya usada el lunes no se recomienda como si tuviera tope el miércoles, y una promo con tope por compra no se descarta después de la primera compra del mes.

**Why this priority**: El tope semanal es el más común en MODO. Hasta esta issue el motor lo evalúa como mensual, lo que recomienda mal en ambos sentidos.

**Independent Test**: Se prueba con promociones semanales, mensuales y por compra, con compras registradas antes y dentro del período, verificando ahorro, tope restante y base.

**Acceptance Scenarios** (consulta el miércoles 21/10/2026, semana del lunes 19/10 al domingo 25/10):

1. **Given** una promoción de 20% con tope de $6.000 por semana y una compra registrada el lunes 19/10 con $4.000 de descuento, **When** se consulta una compra de $10.000, **Then** el ahorro es $2.000, el tope restante tras la compra es $0 y la base es 1 compra registrada, 0 sin descuento informado.
2. **Given** la misma promoción y una compra registrada el domingo 18/10 (semana anterior) con $6.000 de descuento, **When** se consulta una compra de $10.000, **Then** esa compra no cuenta: el ahorro es $2.000, el tope restante tras la compra es $4.000 y la base es 0 compras.
3. **Given** una promoción de 20% con tope de $6.000 por semana y compras de esta semana que ya consumieron $6.000, **When** se consulta, **Then** la promoción se descarta con causa `tope_agotado` y su base.
4. **Given** una promoción de 20% con tope de $3.000 por compra y compras registradas este mes que ya recibieron $9.000 de descuento, **When** se consulta una compra de $20.000, **Then** el ahorro es $3.000 (no $4.000, y sin importar las compras anteriores), el tope restante es `null`, la base es `null` y el motivo dice que el tope es de $3.000 por compra.
5. **Given** una promoción con tope mensual, **When** se consulta, **Then** el comportamiento es el mismo que en la issue #36 (mes calendario).

---

### User Story 2 - Sumar promociones acumulables (Priority: P1)

Si dos o más promociones aplican al mismo medio de pago y todas se declaran acumulables, el motor las suma en una sola opción y muestra cuánto aporta cada una. Si alguna no es acumulable o no lo informa, no se suma y se compara por separado.

**Why this priority**: 9 de cada 15 promos de MODO se declaran acumulables. Sin sumarlas, el motor subestima lo que devuelve un medio de pago y puede recomendar otro peor.

**Independent Test**: Se prueba con dos promociones del mismo medio, variando su acumulabilidad, y verificando cuántas opciones salen y su ahorro.

**Acceptance Scenarios**:

1. **Given** un perfil con Galicia crédito Visa y dos promociones que le aplican, A (20%) y B (10%), ambas acumulables y sin tope, **When** se consulta una compra de $10.000, **Then** hay una sola opción para ese medio, con ahorro total $3.000 y el detalle A $2.000 y B $1.000.
2. **Given** las mismas promociones pero B con acumulabilidad no informada, **When** se consulta, **Then** hay dos opciones separadas para ese medio: A con $2.000 (la mejor) y B con $1.000.
3. **Given** A y B acumulables (20% y 10%) y C no acumulable (25%), las tres para el mismo medio, **When** se consulta una compra de $10.000, **Then** hay dos opciones para ese medio: A+B con $3.000 (la mejor) y C con $2.500.
4. **Given** A acumulable de 20% con tope mensual de $5.000 y $4.500 ya consumidos, y B acumulable de 10% sin tope, **When** se consulta una compra de $10.000, **Then** la opción combinada tiene ahorro total $1.500: A $500 (tope restante tras la compra $0) y B $1.000 (tope restante `null`).
5. **Given** A y B acumulables pero de medios de pago distintos del usuario, **When** se consulta, **Then** no se suman: cada medio tiene su propia opción.
6. **Given** A acumulable que aplica a Galicia crédito Visa y a Galicia débito Visa, y B acumulable que aplica solo a Galicia crédito Visa, **When** se consulta, **Then** hay una opción A+B para crédito y una opción con A sola para débito.

---

### User Story 3 - Topes compartidos entre promociones (Priority: P2)

Si varias promociones comparten un mismo tope (por ejemplo, todas las de supermercados de un banco), lo consumido con cualquiera de ellas descuenta del mismo saldo. Una promoción con tope exclusivo no se ve afectada por el consumo de otras.

**Why this priority**: Es la regla que hace invisible el tope para el usuario hoy (`docs/product/problema.md`), pero en la muestra de MODO no apareció ningún tope compartido explícito, así que su impacto real es menor que el de US1 y US2.

**Independent Test**: Se prueba con dos promociones del mismo grupo y compras registradas con una de ellas, verificando el saldo que le queda a la otra.

**Acceptance Scenarios** (grupo "galicia-super", tope compartido de $10.000 por mes):

1. **Given** las promociones Coto 20% y Día 20%, ambas del grupo, y una compra registrada este mes con la promo de Coto y $6.000 de descuento, **When** se consulta una compra de $30.000 en Día, **Then** el ahorro con Día es $4.000 (no $6.000), el tope restante tras la compra es $0 y la base es 1 compra registrada.
2. **Given** una promoción de Galicia con tope exclusivo y compras registradas este mes con otra promoción de Galicia, **When** se consulta, **Then** esas compras no reducen su tope.
3. **Given** dos promociones del grupo que informan topes distintos ($10.000 y $8.000), **When** se calcula el saldo del grupo, **Then** se usa $8.000.
4. **Given** la promo de Coto ya vencida, pero recibida por el motor porque una compra de este mes la usó, **When** se consulta Día, **Then** esa compra descuenta del saldo del grupo y la promo de Coto aparece descartada con causa `vigencia`.
5. **Given** dos promociones del grupo, ambas acumulables y aplicables al mismo medio, con $2.500 de saldo en el grupo, **When** se consulta una compra de $10.000 (20% = $2.000 y 10% = $1.000), **Then** la opción combinada tiene ahorro total $2.500 (nunca más que el saldo del grupo) y el tope restante tras la compra del grupo es $0.
6. **Given** el saldo del grupo agotado, **When** se consulta, **Then** todas las promociones del grupo que pasan las demás reglas se descartan con causa `tope_agotado` y la base del grupo.
7. **Given** dos promociones del grupo, A (20%) y B (10%), ambas acumulables y del mismo medio, con $2.000 de saldo en el grupo, **When** se consulta una compra de $10.000, **Then** la opción combinada tiene ahorro total $2.000: A $2.000 y B $0, el motivo dice que el tope compartido se agota con A, y B no aparece en descartadas.
8. **Given** la promo de Coto vencida (recibida porque una compra la usó) que informa un tope de $5.000, y Día vigente con tope de $10.000, ambas del grupo, **When** se calcula el saldo, **Then** el monto del grupo es $10.000: la promo vencida aporta su consumo pero no su monto.

---

### Edge Cases

- **Grupo con alcance no informado o exclusivo**: una promoción con `grupoTopeId` pero `alcance` distinto de "compartido" tiene saldo propio. Una con `alcance` "compartido" pero sin `grupoTopeId` también (no se puede saber con qué otras comparte).
- **Grupo con promociones de distinto período**: el saldo del grupo usa el período más largo informado entre sus promociones (mensual antes que semanal), para no prometer saldo de más. Las promociones "por compra" nunca comparten saldo: se evalúan como en US1-4 aunque tengan grupo.
- **Grupo con tope no informado en alguna promoción**: el saldo usa el menor de los topes informados. Si ninguna del grupo informa tope, el grupo no tiene tope (porcentaje completo, como en la issue #36).
- **Compra registrada con una promoción que el motor no recibió**: no se puede saber a qué grupo pertenece, así que no descuenta de ningún saldo compartido (ver Assumptions: la capa externa debe pasar esas promociones).
- **Compra sin descuento informado en un grupo**: su consumo se estima con el porcentaje de la promoción con la que se registró, sin superar el saldo del grupo.
- **Semana que cruza de mes**: la semana del lunes 26/10 al domingo 1/11 es una sola semana; una compra del 31/10 cuenta para una consulta del 1/11 si el tope es semanal, y no si es mensual.
- **Tope por compra de $0**: la promoción se descarta con causa `tope_agotado` y base `null` (no hay compras que sostengan un saldo).
- **Tope por compra sin monto informado**: se trata como "no informa tope" (porcentaje completo, como en la issue #36).
- **Acumulables con varias no acumulables**: cada no acumulable genera su propia opción para ese medio; las acumulables forman una sola opción combinada. Una sola promoción acumulable sin otra con qué sumarse es una opción individual normal.
- **Acumulables del mismo grupo**: la suma no supera el saldo del grupo. El saldo se asigna primero a la promoción con mayor ahorro sin tope y, ante empate, a la de menor identificador. Si a una no le queda nada, sigue en la combinada con ahorro $0 (FR-010).
- **Promoción acumulable con tope agotado**: se descarta con causa `tope_agotado` y no entra en la combinación; las demás acumulables se combinan igual.
- **Orden de las opciones**: se mantiene el de la issue #36 (ahorro total de mayor a menor), desempatando por identificador del medio y luego por los identificadores de las promociones de la opción.

## Requirements *(mandatory)*

### Functional Requirements

**Saldo de tope**

- **FR-001**: Cada promoción con tope informado y período mensual, semanal o no informado (que cuenta como mensual, igual que en la issue #36) MUST descontar de un **saldo**: el de su grupo si es **miembro** de un grupo, o uno propio en cualquier otro caso. Es miembro de un grupo una promoción con `alcance` "compartido", `grupoTopeId` no nulo y período distinto de "por compra"; las demás promociones con el mismo `grupoTopeId` no consumen del saldo del grupo ni aportan su monto.
- **FR-002**: El monto de un saldo compartido MUST ser el menor de los topes informados por los miembros del grupo **vigentes en la fecha de la consulta**. Su período MUST ser el más largo entre esos mismos miembros (mensual antes que semanal; sin período informado cuenta como mensual). Los miembros no vigentes (los que la capa externa pasa solo porque una compra los usó) aportan su consumo, pero no su monto ni su período. Si ningún miembro vigente informa tope, el grupo no tiene tope.
- **FR-003**: El consumo de un saldo MUST sumar las compras registradas cuyo `promocionId` pertenece a ese saldo (la misma promoción si es propio, cualquier miembro recibido del grupo, vigente o no, si es compartido), con fecha dentro del período vigente y no posterior a la fecha de la consulta.
- **FR-004**: El consumo de cada compra MUST ser su descuento informado ($0 si es $0 o negativo) o, si no lo informa, su monto por el porcentaje de la promoción con la que se registró, sin superar el monto del saldo. El consumo total nunca supera el monto del saldo y el saldo restante nunca es negativo (igual que la issue #36).
- **FR-005**: La base de un saldo MUST contar las compras que entran en FR-003 y cuántas de ellas no informan descuento.

**Períodos**

- **FR-006**: El período vigente MUST ser, según el período del saldo: **mensual**, desde el primer día del mes de la consulta; **semanal**, desde el lunes de la semana de la consulta (semanas de lunes a domingo). En ambos casos hasta la fecha de la consulta, en hora de Argentina.
- **FR-007**: Una promoción con tope **por compra** MUST limitar su ahorro al monto del tope en cada compra, sin considerar compras anteriores ni grupos. Su tope restante tras la compra y su base MUST ser `null`, y su motivo MUST decir que el tope es por compra e indicar el monto.

**Acumulabilidad**

- **FR-008**: Para cada medio de pago, las promociones que le aplican (que pasan todas las reglas de la issue #36, incluido el tope) y tienen `acumulable === true` MUST formar **una sola opción combinada** si son dos o más. Las que tienen `acumulable` `false` o `null` MUST generar cada una su propia opción, como en la issue #36.
- **FR-009**: El ahorro de cada promoción dentro de una opción MUST calcularse sobre el monto completo de la compra, limitado por su saldo (o su tope por compra). El ahorro total de la opción MUST ser la suma.
- **FR-010**: Si dos o más promociones de una opción combinada descuentan del mismo saldo, la suma de sus ahorros MUST NOT superar el saldo restante. El saldo se asigna en orden de mayor ahorro sin tope (monto de la compra por el porcentaje), y ante empate por identificador de promoción (comparado por código de carácter, como en la issue #36). Una promoción a la que no le queda saldo después de esa asignación MUST quedar en la opción combinada con ahorro $0, y el motivo MUST decirlo (no se descarta: puede aplicar con otro medio del usuario, donde no compite).

**Opción de pago**

- **FR-011**: Cada opción de pago MUST informar el medio de pago, el ahorro total, un motivo y la lista de promociones aplicadas (una o más). Cada promoción aplicada MUST informar su identificador, su ahorro, su tope restante tras la compra y su base, con las reglas de la issue #36 (base `null` solo si no informa tope o si el tope es por compra).
- **FR-012**: Cuando varias promociones de una opción comparten saldo, todas MUST informar el mismo tope restante tras la compra (el saldo menos la suma de sus ahorros) y la misma base (la del saldo).
- **FR-013**: Las opciones MUST ordenarse por ahorro total de mayor a menor; ante igual ahorro, por identificador del medio y luego por la lista de identificadores de promociones de la opción, ordenada y comparada por código de carácter.
- **FR-014**: El motivo de una opción combinada MUST incluir el porcentaje de cada promoción que la compone, en el orden de la lista (por ejemplo, "20% en supermercados + 10% en Coto"), generado por plantilla, nunca por un modelo de lenguaje.

**Descartes**

- **FR-015**: Una promoción cuyo saldo restante antes de la compra es $0 MUST descartarse con causa `tope_agotado` y la base de su saldo, igual que en la issue #36. Una promoción con tope por compra de $0 MUST descartarse con causa `tope_agotado` y base `null`: es la única excepción a la regla de la issue #36 de que todo descarte por tope agotado lleva base (SC-005 y postcondición de `specs/002-motor-recomendar/contracts/recomendar.md`), que esta spec enmienda.

**Restricciones**

- **FR-016**: El motor MUST seguir sin dependencias de runtime, sin red y sin leer el reloj del sistema (constitución §II).
- **FR-017**: MUST existir al menos un test por cada criterio de la issue #37 y por cada escenario de estas historias, incluidos tope compartido vs. exclusivo y acumulabilidad con `null` (constitución §VI).
- **FR-018**: La cobertura de líneas del paquete del motor MUST medirse en el CI y MUST ser de al menos 90%; si baja, el CI falla.

### Key Entities *(include if feature involves data)*

Cambios sobre el contrato de las issues #33 y #36 (`packages/motor/src/tipos.ts`):

- **Regla de base en descartes** *(cambia)*: la regla de la issue #36 "todo descarte `tope_agotado` lleva base" pasa a "salvo los de tope por compra de $0" (FR-015).
- **Opción de pago** *(cambia)*: deja de tener una sola promoción. Pasa a tener medio de pago, ahorro total, motivo y una **lista de promociones aplicadas**. Reemplaza los campos `promocionId`, `topeRestanteTrasCompra` y `base` de la opción de la issue #36, que pasan a cada promoción aplicada. Cambio incompatible: hoy no lo consume nadie (las issues #43 y #38 no empezaron).
- **Promoción aplicada** *(nueva)*: identificador de la promoción, ahorro, tope restante tras la compra (`null` si no informa tope o es por compra) y base del estimado (misma regla).
- **Saldo de tope** *(nuevo, interno)*: monto, período, consumido, restante y base, propio de una promoción o compartido por un grupo. Lo reutiliza la issue #38.

Sin cambios: compra propuesta, perfil, promoción, compra registrada, descarte, causa de descarte y recomendación (salvo que sus opciones tienen la forma nueva).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ninguna promoción con tope semanal agotado en la semana de la consulta aparece como opción, en el 100% de los casos de prueba.
- **SC-002**: Para dos promociones del mismo grupo compartido, el consumo registrado con una reduce el saldo de la otra en exactamente ese monto, en el 100% de los casos de prueba.
- **SC-003**: Ninguna opción combinada supera, para ninguno de sus saldos, el saldo restante, en el 100% de los casos de prueba.
- **SC-004**: Una promoción con acumulabilidad `null` nunca se suma a otra, en el 100% de los casos de prueba.
- **SC-005**: La cobertura de líneas del motor es de al menos 90%, medida en cada ejecución del CI.
- **SC-006**: Siguen cumpliéndose los criterios de la issue #36: mismo resultado para los mismos datos, ningún tope sin su base (salvo sin tope o por compra, incluido el descarte de FR-015) y menos de 1 segundo para 2.000 promociones y 100 compras.

## Assumptions

- La capa externa (Edge Function, ADR-009) le pasa al motor, además de las promociones a evaluar, las promociones referenciadas por las compras registradas del período, aunque ya no estén vigentes. Esas aparecen descartadas (por ejemplo, por vigencia). No se cambia la tabla de compras.
- La capa externa pasa las compras registradas desde el lunes de la semana de la consulta o desde el día 1 del mes, lo que sea anterior. Si pasa solo las del mes, el tope semanal falla en las semanas que cruzan de mes.
- Dos reintegros acumulables se calculan cada uno sobre el monto completo de la compra, no uno sobre el resultado del otro (en MODO son reintegros independientes a la cuenta).
- "Acumulable" se interpreta como acumulable con cualquier otra promoción acumulable que aplique a la misma compra y al mismo medio; la letra chica no distingue con cuáles.
- Un tope "por usuario por semana" o "por banco por semana" es semanal; un tope "por cliente por martes" en una promoción que vale solo los martes equivale a semanal. Mapear esos textos es de la issue #51.
- El ranking es por pesos de ahorro, no por porcentaje (decisión del usuario, 25/10).
- El resto de los supuestos de `specs/002-motor-recomendar/spec.md` sigue vigente (datos validados por la capa externa, compras confirmadas, hora de Argentina, ids únicos).
