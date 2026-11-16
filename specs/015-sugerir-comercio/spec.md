# Feature Specification: Sugerir el comercio del catálogo cuando el nombre no coincide

**Feature Branch**: `claude/134-sugerir-comercio`

**Created**: 2026-11-15 · **Revisada**: 2026-11-15 (una pasada de `spec-critic`)

**Status**: Draft

**Input**: Issue [#134](https://github.com/Seminario-UADE/vuelto/issues/134) — "Sugerir el comercio del catálogo cuando el nombre del ticket no coincide exacto". Sale de la prueba de la issue #49: el ticket dice «COTO C.I.C.S.A.», el catálogo dice «Coto», y la compra se guarda sin promo.

**Decisión que resuelve (constitución §I)**: que la compra registrada quede asociada al comercio correcto, así el reintegro y el tope consumido se calculan bien y la próxima recomendación es correcta. No muestra promociones: solo ayuda a elegir el comercio de una compra ya hecha.

**Frontera con otras specs** (acordada con el usuario, 15/11):

- **Spec 014 (issue #49)** y **issue #144**: «Revisá tu compra» sigue igual (la sugerencia del medio, la fecha, el texto de cada tarjeta). Esta spec suma la sugerencia del comercio debajo del campo «Comercio».
- **Spec 012**: con compra por confirmar, el comercio es el que se simuló (FR-007 de esa spec) y esta spec no lo cambia.
- **Spec 013 (issue #48)**: el lector ya pide la marca y no la razón social, salvo que el ticket no tenga marca. No cambia.
- **Fuera de alcance**: recordar la elección del usuario para la próxima vez (decisión del usuario: no se hace, ni acá ni en otra issue); la pantalla de recomendación antes de comprar; búsquedas con modelos de lenguaje; un registro de razones sociales cargado a mano.

## Definiciones

- **Coincide exacto**: el nombre, sin mayúsculas, tildes ni espacios de más (como compara hoy la app), es igual al de un comercio del catálogo. «coto» y « Coto » coinciden exacto con «Coto»; «COTO S.A.» no.
- **Nombre limpio**: el nombre sin formas societarias («S.A.», «SA», «S.R.L.», «SRL», «S.A.S.», «C.I.C.S.A.», «CICSA»), sin sucursal («SUC.», «SUCURSAL») ni números, sin tildes, mayúsculas ni puntuación. Solo se usa para encontrar sugerencias, nunca para decidir si coincide exacto.
- **Terminar de escribir**: salir del campo «Comercio» (tocar otro lugar de la pantalla o cerrar el teclado).
- **Catálogo**: los comercios (con su rubro) de las promos vigentes que la app ya tiene, sin red. Los rubros sin comercio («Supermercados» como opción de rubro) **no** son comercios y nunca se sugieren.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el comercio sugerido con un toque (Priority: P1)

Martín escanea un ticket de Coto. El lector trae «COTO C.I.C.S.A.». En «Revisá tu compra», debajo del campo «Comercio», aparece un recuadro: «No lo encontramos entre los comercios con promo. ¿Cuál es?», con «Coto · Supermercados» primero. Lo toca: el campo pasa a «Coto», el recuadro se cierra y aparece la promo de Galicia de los miércoles.

**Why this priority**: es el caso que motivó la issue; sin esto, la compra de un ticket real casi nunca toma la promo.

**Independent Test**: con un catálogo fijo y la lectura «COTO C.I.C.S.A.», verificar que la primera sugerencia es «Coto», que tocarla cambia el comercio y el rubro, y que se recalcula la promo propuesta.

**Acceptance Scenarios**:

1. **Given** un comercio leído del ticket que no coincide exacto con ninguno del catálogo, **When** se abre «Revisá tu compra», **Then** debajo del campo aparece el recuadro «No lo encontramos entre los comercios con promo. ¿Cuál es?» con hasta 3 sugerencias, cada una con su nombre y su rubro, ninguna marcada.
2. **Given** el recuadro, **When** el usuario toca una sugerencia, **Then** el campo toma el nombre del catálogo, la compra toma ese rubro, el recuadro se cierra, aparece la línea de confirmación (US1-4) y se recalculan la promo propuesta y el texto de cada tarjeta (issue #144).
3. **Given** el recuadro, **When** el usuario no toca nada y guarda, **Then** la compra se guarda con el nombre como está escrito, igual que hoy: sugerir no bloquea guardar.
4. **Given** un comercio que coincide exacto con uno del catálogo en un solo rubro, o uno ya elegido de una sugerencia, **Then** no aparece el recuadro: solo una línea chica debajo del campo con el nombre y el rubro («Coto · Supermercados»).
5. **Given** el ticket dice «INC S.A.» en el campo comercio y «CARREFOUR» en otra línea del texto, **Then** la primera sugerencia es «Carrefour».
6. **Given** el usuario eligió una sugerencia, **When** cambia el texto del campo, **Then** la elección se borra (nombre y rubro) y, al terminar de escribir, se vuelve a buscar.
7. **Given** un ticket de «Kansas» y el usuario edita el comercio a «FarmaPlu», **When** termina de escribir, **Then** la primera sugerencia es «FarmaPlus»: el texto del ticket ya no se usa (FR-002).
8. **Given** una promo de FarmaPlus solo online, **When** el usuario elige «Online» en «¿Dónde pagaste?», **Then** aparece la promo y el reintegro se recalcula (FR-015).

---

### User Story 2 - Buscar otro comercio o dejar el nombre como está (Priority: P2)

Ninguna de las tres sugerencias es la correcta. Martín toca «Buscar otro comercio», escribe «jum» y elige «Jumbo». Otra vez, compró en una verdulería que no tiene promos: toca «No está en la lista» y el recuadro se cierra.

**Why this priority**: sin una salida, una sugerencia equivocada empuja a elegir mal; el buscador y el «No está» evitan eso.

**Independent Test**: con el recuadro abierto, buscar un nombre y elegir un resultado; y por separado, tocar «No está en la lista» y guardar.

**Acceptance Scenarios**:

1. **Given** el recuadro, **When** el usuario toca «Buscar otro comercio», **Then** aparece en el mismo lugar un buscador, vacío y con el teclado abierto, y una lista de resultados que se actualiza mientras escribe, cada uno con su nombre y su rubro.
2. **Given** el buscador, **When** el usuario escribe «jum», **Then** «Jumbo» está entre los resultados.
3. **Given** el buscador, **When** el usuario toca un resultado, **Then** pasa lo mismo que al tocar una sugerencia (US1-2).
4. **Given** el buscador sin resultados para lo escrito, **Then** dice «No encontramos comercios con promo con ese nombre» y sigue ofreciendo «No está en la lista».
5. **Given** el recuadro o el buscador, **When** el usuario toca «No está en la lista», **Then** el recuadro se cierra, el campo queda como estaba y la compra se guarda sin promo, como hoy.
6. **Given** el usuario cerró el recuadro con «No está en la lista», **When** cambia el texto del campo, **Then** al terminar de escribir se vuelve a buscar con el nombre nuevo.

---

### User Story 3 - La misma ayuda al cargar la compra a mano (Priority: P3)

Martín carga a mano «coto sucursal 5». Al terminar de escribir aparece el mismo recuadro, con «Coto» primero.

**Why this priority**: el mismo problema aparece al escribir; la lógica es la misma, solo cambia de dónde sale el nombre.

**Independent Test**: en la carga a mano, escribir «coto sucursal 5», salir del campo y verificar el recuadro con «Coto» primero.

**Acceptance Scenarios**:

1. **Given** la carga a mano, **When** el usuario escribe un nombre que no coincide exacto y termina de escribir, **Then** aparece el recuadro (US1-1). Mientras escribe, no aparece.
2. **Given** una compra por confirmar (con o sin ticket) o una recomendación («Usar…»), **Then** el comercio es el que vino y no aparece el recuadro, aunque el texto del ticket nombre otro comercio. Si el usuario cambia el nombre, la ayuda funciona como en la carga a mano.

---

### Edge Cases

- **Un comercio que está en dos rubros** (por ejemplo, «Coto» en Supermercados y en Tecnología): cada rubro es una sugerencia aparte, con su rubro al lado, en el orden del catálogo (por categoría), y cuentan dentro de las 3. Si el nombre coincide exacto pero el rubro no se sabe (ticket o carga a mano), aparece el recuadro con el título «¿En qué rubro?» y una opción por rubro; si el usuario no elige, se guarda como hoy (el primero por categoría). Si el rubro ya se sabe (compra por confirmar, recomendación o una sugerencia elegida), no se pregunta.
- **El texto del ticket nombra a dos comercios del catálogo** (por ejemplo, «Disco» en el encabezado y «Jumbo» en una promo impresa): los dos son sugerencias, en el orden en que aparecen en el texto.
- **Nombres de 3 letras o menos** (como «Día»): en el texto del ticket solo cuentan si ocupan una línea entera (sin contar espacios ni puntuación), para no encontrarlos en «día de la semana». En el comercio leído o escrito, sí cuentan como palabra entera.
- **Ninguna sugerencia pasa el umbral de parecido**: el recuadro dice «No lo encontramos entre los comercios con promo» y ofrece solo «Buscar otro comercio» y «No está en la lista».
- **El catálogo todavía no se sincronizó** (primera vez, sin red): se usa el catálogo que haya, como el resto de «Revisá».
- **Guardar con el teclado abierto**: guardar no espera a la sugerencia; se guarda el nombre como está escrito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: En «Revisá tu compra», cuando el comercio no coincide exacto con uno del catálogo, la app MUST mostrar debajo del campo un recuadro con hasta 3 sugerencias del catálogo, cada una con su nombre y su rubro, ninguna marcada, con el título «No lo encontramos entre los comercios con promo. ¿Cuál es?». Si el comercio está vacío pero el texto del ticket nombra uno o más comercios del catálogo, MUST mostrar el recuadro con el título «¿Es alguno de estos?». Si el comercio está vacío y el texto no nombra ninguno, no hay recuadro.
- **FR-002**: Las sugerencias MUST salir, en este orden y sin repetir, de:
  1. los comercios del catálogo cuyo nombre aparece como palabras enteras **dentro del texto completo del ticket** (solo con ticket y **solo mientras el comercio sea el que leyó el ticket o esté vacío**: si el usuario lo edita, manda lo que escribió y el texto ya no se usa; con la regla de *Edge Cases* para los nombres cortos), en el orden en que aparecen;
  2. los comercios cuyo nombre aparece como palabras enteras **dentro del nombre limpio** del comercio leído o escrito;
  3. los más **parecidos** por escritura al nombre limpio, que superen un umbral de parecido.
- **FR-003**: La sugerencia MUST ser determinística (el mismo nombre, texto y catálogo dan siempre las mismas sugerencias, en el mismo orden) y calcularse en el celular, sin red y sin modelos de lenguaje.
- **FR-004**: La app MUST NOT cambiar el comercio sin que el usuario toque una sugerencia o un resultado (constitución §III). Guardar no exige elegir.
- **FR-005**: Al tocar una sugerencia o un resultado del buscador, el campo MUST tomar el nombre del catálogo y la compra MUST quedar con ese rubro hasta que el usuario cambie el texto del campo; el recuadro MUST cerrarse y la promo propuesta y el texto de cada tarjeta MUST recalcularse con ese comercio y ese rubro.
- **FR-006**: Si el comercio coincide exacto con uno del catálogo en un solo rubro, o fue elegido de una sugerencia, MUST verse una línea con su nombre y su rubro y MUST NOT verse el recuadro.
- **FR-007**: El recuadro MUST ofrecer «Buscar otro comercio», que abre en el mismo lugar un buscador de los comercios del catálogo: primero los que contienen lo escrito en su nombre («jum» encuentra «Jumbo»), después los parecidos por escritura que superen el umbral; con resultados que se actualizan mientras se escribe, y el mensaje de US2-4 si no hay ninguno.
- **FR-008**: El recuadro y el buscador MUST ofrecer «No está en la lista», que los cierra y deja el campo como está.
- **FR-009**: Cambiar el texto del campo MUST borrar la elección anterior (nombre y rubro elegidos, o el «No está en la lista») y, al terminar de escribir, volver a buscar. Mientras el usuario escribe, el recuadro MUST NOT aparecer. Con ticket, el recuadro MUST aparecer al abrir «Revisá tu compra».
- **FR-010**: Con compra por confirmar (con o sin ticket) o desde una recomendación, el recuadro MUST NOT aparecer mientras el comercio sea el que vino, aunque el texto del ticket nombre otro comercio.
- **FR-011**: Un comercio en dos rubros MUST tratarse como en *Edge Cases*.
- **FR-012**: La app MUST NOT recordar las elecciones del usuario entre compras.
- **FR-013**: Los rubros sin comercio del catálogo MUST NOT sugerirse ni aparecer en el buscador.
- **FR-015** *(agregado el 15/11 después de la prueba del usuario)*: «Revisá tu compra» MUST preguntar «¿Dónde pagaste?» con «En el local» y «Online». Con ticket o carga a mano arranca en «En el local»; desde una recomendación o una compra por confirmar, con el que se eligió al simular. Al cambiarlo, la promo propuesta y el texto de cada tarjeta MUST recalcularse, y la compra MUST guardarse con ese canal.
- **FR-014**: Accesibilidad: el lector de pantalla MUST anunciar la aparición del recuadro, y cada sugerencia y cada resultado MUST ser un botón cuya etiqueta lleva el nombre y el rubro.

### Key Entities

- **Sugerencia de comercio**: un comercio del catálogo (nombre y rubro) propuesto para la compra, con el motivo por el que se sugiere (está en el texto del ticket, está contenido en el nombre, o se parece). Nunca es una elección.
- **Comercio elegido**: el nombre y el rubro del catálogo que el usuario tocó; vale hasta que cambie el texto del campo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre la lista de medición del Anexo A (20 nombres como los de tickets reales, cuyo comercio está en el catálogo de prueba del anexo), el correcto aparece entre las 3 sugerencias en al menos 18 (90%) y primero en al menos 15 (75%). Esta lista no se usa para ajustar el umbral.
- **SC-002**: Sobre la lista de medición del Anexo B (10 nombres que no están en el catálogo de prueba y no se parecen a ninguno), no aparece ninguna sugerencia en al menos 9 (90%). Esta lista tampoco se usa para ajustar el umbral.
- **SC-003**: Elegir el comercio sugerido lleva un solo toque desde que se abre «Revisá tu compra».
- **SC-004**: En el 100% de los casos, el comercio de la compra guardada es el que el usuario eligió o escribió: nunca uno que la app eligió sola.
- **SC-005**: Con un catálogo de 1.000 comercios y un texto de ticket de 60 líneas, calcular las sugerencias tarda menos de 100 ms en la computadora de los tests (una cota holgada para que en el celular no se note).

## Assumptions

- El catálogo es el que la app ya arma a partir de las promos sincronizadas (cientos de comercios); no hace falta red para sugerir.
- El texto completo del ticket es el que devuelve el lector (ya con los datos personales tapados) y ya viaja a «Revisá tu compra».
- El umbral de parecido se ajusta en el plan con **otra** lista de nombres, distinta de los anexos, y queda fijo en los tests.
- Los nombres de los anexos son de cadenas conocidas o inventados, sin datos personales.

## Anexo A — Lista de medición: el comercio está en el catálogo

Catálogo de prueba: Coto, Carrefour, Jumbo, Disco, Vea, Día, Farmacity, YPF, Shell, Axion, Easy, Frávega, Musimundo, Havanna, Freddo, Mostaza, Café Martínez, Grido, Dexter, Open 25.

| # | Nombre leído o escrito | Texto del ticket (además del nombre) | Correcto |
|---|---|---|---|
| 1 | COTO C.I.C.S.A. | — | Coto |
| 2 | Coto Suc. 112 | — | Coto |
| 3 | COTO SA | — | Coto |
| 4 | INC S.A. | una línea «CARREFOUR MARKET» | Carrefour |
| 5 | Carrefur | — | Carrefour |
| 6 | JUMBO RETAIL ARGENTINA S.A. | — | Jumbo |
| 7 | Cencosud S.A. | una línea «DISCO» | Disco |
| 8 | Supermercados Vea | — | Vea |
| 9 | DIA ARGENTINA S.A. | — | Día |
| 10 | Farmacity Suc 45 | — | Farmacity |
| 11 | FARMACITY S A | — | Farmacity |
| 12 | YPF Estacion 1234 | — | YPF |
| 13 | Shel | — | Shell |
| 14 | AXION ENERGY | — | Axion |
| 15 | Easy Sucursal Palermo | — | Easy |
| 16 | Fravega SACIeI | — | Frávega |
| 17 | Musimundo S.R.L. | — | Musimundo |
| 18 | Havana | — | Havanna |
| 19 | Cafe Martinez | — | Café Martínez |
| 20 | Open25 | — | Open 25 |

## Anexo B — Lista de medición: el comercio no está en el catálogo

Mismo catálogo de prueba que el Anexo A.

| # | Nombre leído o escrito |
|---|---|
| 1 | Verdulería Don Pepe |
| 2 | Perfumería Raffe |
| 3 | Kiosco El Sol |
| 4 | Ferretería Industrial Norte |
| 5 | Panadería La Espiga |
| 6 | Librería Rayuela |
| 7 | Lavadero Burbujas |
| 8 | Carnicería Los Hermanos |
| 9 | Pinturería Arcoíris |
| 10 | Bicicletería Pedal |
