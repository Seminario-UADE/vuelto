# Feature Specification: Motor — estimar el tope restante, con su base

**Feature Branch**: `claude/motor-estimar-topes-38`

**Created**: 2026-10-26 · **Revisada**: 2026-10-26 (hallazgos de `spec-critic`)

**Status**: Draft

**Input**: Issue [#38](https://github.com/Seminario-UADE/vuelto/issues/38) — "Motor: estimar el tope restante por banco/promo, con su base". Usa los saldos de tope de la issue #37 (`specs/003-motor-topes-acumulables/`, `packages/motor/src/tope.ts`) y el diseño de «Mis topes» (`docs/design/DESIGN.md` §5 "Indicador de tope" y `docs/design/screens/5-topes.png`).

**Decisión que resuelve (constitución §I)**: cuánto tope de reintegro le queda al usuario en cada uno de sus topes, para decidir si todavía le conviene usar ese medio de pago, sin que la app le muestre una cifra falsamente precisa.

**Frontera con otras issues** (acordada con el dueño de la issue):

- **Issue #37** (ya mergeada): define los saldos (propios o de grupo, mensuales o semanales). Esta spec los reutiliza sin duplicar el cálculo.
- **Issue #45** (pantalla «Mis topes»): la Edge Function `GET /topes` llama a estas funciones y la app pinta el resultado. Son de la issue #45: el **resumen del encabezado** ("Te devolvieron · Te quedan · Tope total del mes"), el filtro por rubro, el orden de las tarjetas, el detalle de compras de un tope y las **etiquetas de cada pantalla** ("de tope disponible", "Queda poco", "Tope agotado", "de $10.000 / mes"), que se eligen a partir del estado que devuelve el motor.
- **Texto vs. issue**: donde el cuerpo de la issue #38 (anterior al diseño) y `DESIGN.md` difieren, manda el diseño (decisión del usuario, 26/10): redondeo a centenas, sin cifra cuando no hay compras y sin "N de ellas estimadas" en el texto.
- **Error del diseño**: la tabla de datos de `DESIGN.md` marca "queda poco" a un tope de $8.000 con $2.300 restantes (28,75%), contra su propia regla del 20% (§5). Esta spec respeta la regla (decisión del usuario, 26/10).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber cuánto tope me queda en cada uno (Priority: P1)

El motor recibe las promociones, las compras del período, el perfil del usuario y la fecha, y devuelve una estimación por cada tope que se va gastando: cuánto es el tope, cuánto se consumió, cuánto queda, en qué compras se basa, en qué período y con qué medios del usuario se usa. Un tope compartido por varias promociones aparece una sola vez.

**Why this priority**: Es el dato de «Mis topes» (issue #45), el diferencial del producto (`docs/product/problema.md`).

**Independent Test**: Se prueba con promociones y compras fijas y una fecha, verificando la lista de estimaciones y cada uno de sus valores.

**Acceptance Scenarios** (consulta el miércoles 21/10/2026, salvo que se indique otra fecha):

1. **Given** una promoción de Galicia de 20% con tope mensual de $10.000 que aplica a la tarjeta Galicia Visa crédito del usuario, y 3 compras de octubre que consumieron $3.500, **When** se estiman los topes, **Then** hay una estimación con tope $10.000, consumido $3.500, restante $6.500, base 3 compras, período mensual del 1/10 al 31/10 y el medio Galicia Visa crédito.
2. **Given** dos promociones vigentes del mismo grupo compartido, **When** se estiman los topes, **Then** hay **una sola** estimación para el grupo, con las dos promociones listadas.
3. **Given** una promoción con tope semanal de $5.000, **When** se estiman los topes, **Then** su período va del lunes 19/10 al domingo 25/10.
4. **Given** una promoción que no aplica a ningún medio del usuario, **When** se estiman los topes con su perfil, **Then** no aparece. **When** se estiman sin perfil (`null`), **Then** aparece, con la lista de medios vacía.
5. **Given** un perfil sin ningún medio de pago, **When** se estiman los topes, **Then** la lista es vacía.
6. **Given** una promoción sin tope informado, una con tope por compra, una vencida y una que todavía no empezó, **When** se estiman los topes, **Then** ninguna tiene estimación propia (las no vigentes solo aportan sus compras a su grupo, como en la issue #37).
7. **Given** un grupo con una promoción vigente que no aplica a los medios del usuario y otra vencida que sí aplicaba, **When** se estiman los topes con su perfil, **Then** el grupo no aparece.
8. **Given** una consulta del jueves 1/10/2026 y una promoción con tope semanal, **When** se estiman los topes, **Then** su período va del lunes 28/9 al domingo 4/10, y una compra del 29/9 cuenta en la base.
9. **Given** los mismos datos de entrada, **When** se estiman dos veces o con las listas en otro orden, **Then** el resultado es idéntico.

---

### User Story 2 - Leer el tope como estimado, con su base (Priority: P1)

Para cada estimación, el motor arma los textos que la pantalla necesita, siguiendo `DESIGN.md`: la cifra con "≈", la base en palabras y el estado del tope.

**Why this priority**: Es la regla de la constitución §V y de RF-07: ningún tope sin "≈" y sin su base. Si el texto lo arma cada pantalla, la regla se puede romper en cualquiera.

**Independent Test**: Se prueba con estimaciones fijas, verificando los textos exactos.

**Acceptance Scenarios** (consulta en octubre, salvo que se indique otra fecha):

1. **Given** un tope mensual de $10.000 con $6.540 restantes según 3 compras de octubre, **When** se formatea, **Then** la cifra es "≈$6.500", la base es "según 3 compras de octubre" y el estado es `disponible`.
2. **Given** un tope de $8.000 con $1.600 restantes según 4 compras de octubre, **When** se formatea, **Then** el estado es `queda_poco` (exactamente el 20%) y la cifra es "≈$1.600".
3. **Given** un tope de $10.000 con $2.050 restantes, **When** se formatea, **Then** la cifra es "≈$2.000" y el estado es `disponible` (el umbral se compara con el restante exacto, no con la cifra redondeada).
4. **Given** un tope mensual agotado según 2 compras de octubre, **When** se formatea, **Then** la cifra es `null`, el estado es `agotado` y la base es "según 2 compras de octubre · vuelve el 1/11".
5. **Given** un tope semanal de $5.000 sin compras esta semana, **When** se formatea, **Then** la cifra es `null`, el estado es `sin_compras` y la base es "Sin compras registradas esta semana: todavía no podemos estimar cuánto te queda."
6. **Given** una sola compra, **When** se formatea, **Then** la base dice "según 1 compra de octubre" (singular).
7. **Given** un tope semanal con 2 compras, consultado el 1/10, **When** se formatea, **Then** la base dice "según 2 compras de esta semana" y, si está agotado, " · vuelve el 5/10".
8. **Given** un tope de $10.000 con $40 restantes, **When** se formatea, **Then** el estado es `queda_poco` y la cifra es "menos de $100".
9. **Given** un tope mensual agotado en diciembre, **When** se formatea, **Then** la base termina en " · vuelve el 1/1".

---

### Edge Cases

- **Redondeo de la cifra**: el restante se redondea **hacia abajo** a la centena ($6.540 → "≈$6.500"), para nunca mostrar más tope del que queda. Los importes numéricos de la estimación no se redondean (pesos con a lo sumo dos decimales, como en la issue #36).
- **Menos de $100 sin estar agotado**: la cifra es "menos de $100" en lugar de "≈$0" (decisión del usuario, 26/10).
- **Tope de $0**: siempre `agotado` (FR-008 evalúa agotado antes que sin compras). Sin compras, la base dice "según 0 compras de octubre · vuelve el 1/11".
- **Grupo con miembros de distintos bancos**: el banco de la estimación es `null`. Solo cuentan los miembros vigentes.
- **Grupo donde solo una promoción vigente aplica a los medios del usuario**: la estimación aparece (el saldo es del grupo) y lista solo los medios del usuario que sirven para alguna promoción vigente del grupo.
- **Mes en el texto**: el nombre del mes es el de la fecha de la consulta en hora de Argentina, en minúscula ("de octubre"). "Vuelve el" es el día siguiente al fin del período: el 1 del mes siguiente si es mensual, el lunes siguiente si es semanal, cambiando de año si hace falta.

## Requirements *(mandatory)*

### Functional Requirements

**Estimación**

- **FR-001**: El motor MUST ofrecer una función `estimarTopes(promociones, comprasDelPeriodo, perfil, ahora)` que devuelva una lista de estimaciones de tope. Aplican las precondiciones de la issue #37: la capa externa (issue #45) pasa también las promociones referenciadas por las compras del período, y las compras desde el lunes de la semana de la consulta o desde el día 1 del mes, lo que sea anterior.
- **FR-002**: MUST haber una estimación por cada **saldo** de la issue #37 que tenga al menos una promoción **vigente** en la fecha de la consulta que, si hay perfil, aplique a al menos un medio del perfil. Las promociones sin tope informado, con tope por compra o no vigentes (vencidas o que todavía no empezaron) no generan estimación propia.
- **FR-003**: Cada estimación MUST informar: el grupo (o `null` si el saldo es propio), el banco (o `null` si los miembros vigentes son de bancos distintos), los identificadores de las promociones vigentes del saldo, los identificadores de los medios del usuario que sirven para alguna de ellas (lista vacía sin perfil), el tope, lo consumido y lo restante (en pesos), la base y el período (tipo, desde y hasta).
- **FR-004**: Con perfil `null`, la función MUST no filtrar por medios de pago. Uso previsto: estimar los topes de un conjunto de promociones sin depender de un usuario (tests, herramientas del equipo). La issue #45 siempre pasa el perfil. Con un perfil sin medios, la lista es vacía.
- **FR-005**: El período MUST ir del inicio del período de la issue #37 hasta su último día: el último día del mes si es mensual, el domingo si es semanal.
- **FR-006**: El orden de la lista MUST ser fijo: por el identificador del grupo, o de la promoción si el saldo es propio, comparado por código de carácter.

**Textos** (`DESIGN.md` §5 y §8)

- **FR-007**: El motor MUST ofrecer una función `formatearEstimacion(estimacion, ahora)` que devuelva el **estado** (`disponible`, `queda_poco`, `agotado` o `sin_compras`), la **cifra** (texto o `null`) y la **base** en palabras, generados por plantilla, nunca por un modelo de lenguaje (constitución §II). Las etiquetas que rodean a esos textos en cada pantalla son de la issue #45.
- **FR-008**: Estado, evaluado en este orden con los importes exactos en centavos: `agotado` si el restante es 0; si no, `sin_compras` si la base tiene cero compras; si no, `queda_poco` si el restante es menor o igual al 20% del tope (`restante × 5 ≤ tope`); si no, `disponible`.
- **FR-009**: Cifra, en los estados `disponible` y `queda_poco`: "≈$X" con el restante redondeado hacia abajo a la centena y separador de miles con punto; si ese redondeo da $0, "menos de $100". En `agotado` y `sin_compras`, `null`.
- **FR-010**: Base: "según N compras de <mes>" si el período es mensual, "según N compras de esta semana" si es semanal (singular con 1 compra). En `agotado` se agrega " · vuelve el D/M" (día siguiente al fin del período, sin ceros a la izquierda). En `sin_compras` la base es "Sin compras registradas este mes: todavía no podemos estimar cuánto te queda." (o "esta semana").
- **FR-011**: Invariante comprobable de la constitución §V: si la cifra no es `null`, la base no es vacía; y la cifra, cuando existe, nunca representa más que el restante.

**Unificación del tope** (pendiente de la revisión de la issue #37)

- **FR-012**: El motor MUST tener una única función `clasificarTope(promo)` que diga si la promoción no informa tope, tiene tope por compra (con su monto) o tiene un tope que se acumula (con su monto, su período y su grupo si es miembro de uno). El cálculo de saldos, la recomendación y los motivos MUST usarla, y fuera de ella el motor no lee `tope.monto`, `tope.periodo`, `tope.alcance` ni `tope.grupoTopeId`. Se verifica en la revisión de código (búsqueda de esos campos fuera de la función).
- **FR-013**: La suite de las issues #36 y #37 MUST seguir pasando sin cambios en sus expectativas después de FR-012.

**Restricciones**

- **FR-014**: El motor MUST seguir sin dependencias de runtime, sin red y sin leer el reloj del sistema (constitución §II); la cobertura de líneas MUST seguir en al menos 90% (issue #37).
- **FR-015**: MUST existir tests de cada escenario de US1 y US2, incluidos 0, 1 y N compras, el grupo compartido que aparece una sola vez, cada estado, el redondeo y el filtro por perfil (con perfil, sin perfil y con perfil sin medios).

### Key Entities *(include if feature involves data)*

- **Estimación de tope** *(nueva, pública)*: grupo, banco, promociones, medios del usuario, tope, consumido, restante, base y período (tipo, desde, hasta). Parte de la forma que proponía la issue #38, con tres cambios: el tope nunca es `null` (los topes sin informar no generan estimación), suma los medios del usuario y el período dice su tipo.
- **Texto de una estimación** *(nuevo, público)*: estado, cifra y base.
- **Clasificación del tope** *(nueva, interna)*: sin tope, por compra o acumulable (FR-012).

Sin cambios: el contrato de `recomendar()` (issues #36 y #37).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los casos de prueba, cada saldo con promociones vigentes aplicables aparece exactamente una vez.
- **SC-002**: En el 100% de los casos de prueba se cumple el invariante de FR-011.
- **SC-003**: Para los mismos datos, el resultado es idéntico en el 100% de las ejecuciones, sin importar el orden de las listas de entrada.
- **SC-004**: Los textos de los escenarios de US2 se reproducen exactamente.
- **SC-005**: La suite de las issues #36 y #37 sigue pasando sin cambios en sus expectativas (FR-013).

## Assumptions

- Los grupos de tope compartido son de un mismo banco; si no, el banco de la estimación es `null`.
- Fechas en hora de Argentina, como en las issues anteriores.
- "Queda poco" usa el umbral de 20% de `DESIGN.md` §5.
