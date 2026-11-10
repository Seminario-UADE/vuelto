# Feature Specification: Flujo directo — compra por confirmar, tres tabs y onboarding con primera respuesta real

**Feature Branch**: `012-flujo-directo`

**Created**: 2026-11-05 · **Revisada**: 2026-11-05 (hallazgos de `spec-critic`: B1–B4, I1–I12, M1–M9)

**Status**: Draft

**Input**: Sección «Flujo de usuario nuevo y de compra» de `docs/design/ideas-ux.md` (auditoría del 05/11/2026 sobre el código de `main`) y las issues [#105](https://github.com/Seminario-UADE/vuelto/issues/105) (compra pendiente), [#103](https://github.com/Seminario-UADE/vuelto/issues/103) (barra inferior, márgenes, barra de estado) y [#79](https://github.com/Seminario-UADE/vuelto/issues/79) (pasada general de UX).

**Decisión que resuelve (constitución §I)**: el usuario está por pagar y quiere saber con qué medio. La app se lo dice con un toque desde Inicio, y la compra cuenta para los topes recién cuando el usuario confirma que pagó, no cuando la simula. Un usuario nuevo ve una recomendación real, con sus medios y en un comercio donde compra, antes de que se le pida nada más.

## Contexto y alcance

- **Ya está** (specs 006, 008 y 010): Inicio con el buscador de comercios y la respuesta en la misma tarjeta, el detalle «Con qué pagar», la hoja «Revisá tu compra» con los orígenes `excepcion` / `manual` / `ticket`, «Escanear ticket» (con el lector simulado), «Mis compras», los topes derivados de las compras confirmadas y la cola de subida de la spec 010, con su estado «Sin subir». **Esta spec no cambia el motor ni la forma de una compra confirmada.**
- **Esta spec cambia**:
  1. «Usar [medio]» deja una **compra por confirmar**, que no cuenta para los topes, en lugar de guardar la compra antes de pagar.
  2. La navegación pasa a **Inicio · Compras · «+» · Comercios · Perfil**, con el «+» (comprar) al centro, y comprar es un flujo de un paso por pantalla (rediseño v7, US3). La tab Comprar desaparece.
  3. El onboarding pierde la pantalla Comercios, su primera respuesta deja de estar fija en Coto, pide el nombre y, como meta (US5), deja la cuenta para el final.
  4. Los ajustes de #103: foco de color en la tab activa (tab bar nativa), márgenes con la zona inferior del teléfono y barra de estado del color de la app.
- **Vocabulario**: esta spec dice **«por confirmar»** para una compra simulada que todavía no se pagó. «Pendiente» y «Sin subir» siguen siendo, como en la spec 010, operaciones de la cola que no llegaron al servidor. Son cosas distintas y la UI nunca las llama igual.
- **Diseño visual**: las pantallas siguen `docs/design/DESIGN.md` **v6** (esmeralda, en claro y en oscuro, con la decisión como única superficie invertida). Implementar los temas y los componentes base es la issue [#115](https://github.com/Seminario-UADE/vuelto/issues/115), que va antes de la parte visual de esta spec.
- **Fuera de alcance**: el gasto en grupo (#54) y la lectura real del ticket con la cámara (#48, #49). Esta spec define qué hace el escaneo con una compra por confirmar, no cómo se lee el ticket.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simular, pagar y confirmar a mano (Priority: P1)

Martín está en la fila de Coto. Abre la app, toca Coto en Inicio y ve «Te conviene Galicia» con el botón «Usar Galicia». Lo toca: la app le dice «Pagá con Galicia» y deja la compra por confirmar arriba de Inicio. Paga. Al salir, toca «Ya pagué» en esa tarjeta, revisa los datos (que ya vienen de la simulación), carga el monto que faltaba y guarda. Recién ahí bajan sus topes.

**Why this priority**: es el corazón del producto (decidir en la caja) y hoy está mal: «Usar» registra la compra antes de pagar y descuenta tope aunque la compra no se haga. Sin esta historia, los topes mienten.

**Independent Test**: con un store de prueba, sin compras de ejemplo y con el reloj controlado, tocar un comercio en Inicio, tocar «Usar [medio]» y verificar los casos de SC-003. Después, «Ya pagué» → guardar, y verificar que la compra está en Compras con origen `excepcion` y que los topes se recalcularon. Funciona sin red.

**Acceptance Scenarios**:

1. **Given** un comercio con recomendación en la tarjeta de Inicio, **When** el usuario toca «Usar [medio]», **Then** se crea una compra por confirmar con el comercio, el medio elegido y el monto (si lo había cargado), se muestra el aviso «Pagá con [medio]», la simulación de Inicio se limpia y la compra por confirmar aparece arriba de Inicio y al principio de Compras.
2. **Given** una compra por confirmar recién creada, **Then** no cambia ningún tope, ninguna base de estimado («según N compras»), ningún total de Compras ni ninguna recomendación (RF-09, constitución §V).
3. **Given** una compra por confirmar, **When** toca «Ya pagué», **Then** se abre «Revisá tu compra» con el comercio, el medio, el monto y la fecha cargados y editables.
4. **Given** «Revisá tu compra» abierta desde una compra por confirmar sin monto, **Then** «Guardar compra» queda deshabilitado hasta que se cargue el monto, con la razón a la vista.
5. **Given** el mismo caso, **When** guarda con el medio y el comercio sin cambios, **Then** la compra queda con origen `excepcion`, la compra por confirmar desaparece y los topes se recalculan.
6. **Given** el mismo caso, **When** cambia el medio o el comercio antes de guardar, **Then** la compra queda con origen `manual`.
7. **Given** una compra por confirmar, **When** toca «Descartar» y confirma, **Then** desaparece y no cambia nada más.
8. **Given** una compra por confirmar, **When** cierra «Revisá tu compra» sin guardar, **Then** sigue igual.
9. **Given** que el usuario toca «Guardar compra» dos veces, o que la app se cierra justo después de guardar, **Then** la compra queda registrada una sola vez y la compra por confirmar no reaparece.
10. **Given** una tarjeta de un comercio sin promo para sus medios, **Then** no hay «Usar» y la compra se registra desde Compras → «Cargar a mano».
11. **Given** el detalle «Con qué pagar» de un comercio, **When** toca «Usar [medio]», **Then** pasa lo mismo que desde Inicio (escenario 1) y vuelve a Inicio.
12. **Given** una compra por confirmar en Coto, **When** vuelve a tocar «Usar» en Coto, **Then** la nueva reemplaza a la anterior y el aviso lo dice: «Actualizamos tu compra en Coto».

---

### User Story 2 - Confirmar la compra con el ticket (Priority: P1)

Lucía pagó en Carrefour con la tarjeta que le recomendó la app. Toca «Escanear ticket» en la tarjeta de esa compra por confirmar, la app lee el ticket y le muestra «Revisá tu compra» con el monto del ticket. El ticket no dice el medio de pago, así que la app le pregunta con qué pagó y le sugiere el que había elegido al simular. Ella lo toca y guarda.

**Why this priority**: el ticket es la vía más confiable de registro (ADR-006), y hoy no sabe nada de la simulación: pide todo de nuevo.

**Independent Test**: con una compra por confirmar y el lector de ticket simulado (que devuelve la fecha de hoy), escanear desde la tarjeta y verificar que «Revisá» combina los datos con el ticket primero, que exige elegir el medio y que, al guardar, la compra queda con origen `ticket` y la compra por confirmar desaparece.

**Acceptance Scenarios**:

1. **Given** una compra por confirmar, **When** toca «Escanear ticket» y la lectura sale bien, **Then** «Revisá tu compra» muestra el comercio, el monto y la fecha del ticket; donde el ticket no trae un dato, usa el de la compra por confirmar.
2. **Given** que el usuario simuló con monto y el ticket trae otro, **Then** se usa el del ticket y se avisa la diferencia: «Simulaste $X; el ticket dice $Y». Si no simuló con monto, no se muestra ese aviso.
3. **Given** un ticket que no identifica el medio, **Then** la pregunta «¿Con qué pagaste?» aparece **sin ningún medio seleccionado**. El medio de la simulación se destaca como sugerencia («El que elegiste al simular»), y «Guardar compra» se habilita recién cuando el usuario toca un medio (RF-10, constitución §III).
4. **Given** un ticket que identifica un medio distinto del simulado, **Then** se usa el del ticket y se avisa que difiere.
5. **Given** un ticket cuyo comercio no coincide con el de la compra por confirmar (según FR-013), **Then** la app pregunta «¿Este ticket es de tu compra en [comercio]?». Si dice que sí, sigue como en el escenario 1. Si dice que no, el ticket sigue como suelto y la compra por confirmar queda igual.
6. **Given** un ticket con fecha anterior al día de la simulación, **Then** no se cruza: la app avisa que el ticket es de antes de la simulación y lo trata como suelto.
7. **Given** la compra guardada desde el ticket, **Then** queda con origen `ticket`, la compra por confirmar desaparece y los topes se recalculan.
8. **Given** que la lectura del ticket falla, **Then** la compra por confirmar sigue igual y se ofrecen «Probar de nuevo» y «Confirmar a mano», que abre lo mismo que «Ya pagué».
9. **Given** una compra por confirmar que coincide con el comercio del ticket (FR-013), **When** el usuario escanea desde Compras y no desde la tarjeta, **Then** la app pregunta «¿Es tu compra por confirmar en [comercio]?». Si dice que sí, sigue como en el escenario 1. Si dice que no, o si ninguna coincide, el ticket sigue como suelto.
10. **Given** cualquier camino del ticket, **Then** la imagen no se guarda en ningún lado (constitución §IV).

---

### User Story 3 - Comprar al centro y un paso por pantalla (Priority: P2)

> Reescrita el 09/11/2026 (rediseño v7, `docs/design/plan-rediseno-v7.md`). Reemplaza «Tres tabs con Inicio al centro»: el usuario vio la v6 y pidió que comprar sea la acción principal, al centro, y que cada pantalla tenga un solo propósito.

El usuario abre la app y ve una barra flotante con Inicio, Compras, un botón «+» más grande y verde al centro, Comercios y Perfil. Toca «+» y compra en cuatro pasos, uno por pantalla, con una barra de avance: elige el comercio, pone el monto (o sigue sin él), ve con qué pagar y, después de pagar, confirma la compra escaneando el ticket o cargándola a mano.

**Why this priority**: la app apilaba demasiada información en cada pantalla y el usuario se perdía navegando. No bloquea la US1: la compra por confirmar es la misma.

**Independent Test**: abrir la app con sesión, verificar el orden de la barra, hacer una compra completa desde «+» y verificar que Inicio y Topes se actualizan.

**Acceptance Scenarios**:

1. **Given** la app abierta con sesión y el onboarding completo, **Then** la barra inferior muestra, en este orden, Inicio · Compras · «+» · Comercios · Perfil, con Inicio seleccionada, y el «+» se distingue como acción principal.
2. **Given** cualquier pestaña activa, **Then** se distingue por el color del acento además del ícono relleno, y el lector de pantalla la anuncia como pestaña seleccionada. El «+» se anuncia como «Comprar».
3. **Given** el «+», **When** lo toca, **Then** se abre el flujo de compra en el paso 1 («¿Dónde estás comprando?»), con volver, cerrar y la barra de avance de 4 pasos.
4. **Given** el paso 1, **When** toca un comercio, **Then** pasa al paso 2 («¿Cuánto vas a pagar?»), donde puede escribir el monto con el teclado numérico o seguir sin él.
5. **Given** el paso 3, **Then** ve solo la respuesta: con qué pagar, cuánto le devuelven (≈, con su base) y una razón. «Otras opciones» y «¿Pagan entre varios?» están plegadas.
6. **Given** el paso 3, **When** toca «Voy a pagar con [medio]», **Then** se crea la compra por confirmar (FR-002) y el paso 3 se reemplaza por el paso 4 («Pagá con [medio]»): desde ahí no se puede volver, solo cerrar.
7. **Given** el paso 4, **Then** tiene una sola decisión: «Escanear ticket» (principal), «Cargar a mano» o «Lo confirmo después». Al guardar, ve «Compra guardada» con cuánto le van a devolver y cuánto tope le queda en ese medio, con su base.
8. **Given** Comercios, **When** toca uno de sus comercios, **Then** se abre el flujo en el paso 2 con ese comercio elegido.
9. **Given** los dispositivos de FR-023, **Then** ni el contenido ni la barra se superponen con las zonas del sistema.

---

### User Story 4 - Primera respuesta real y con nombre (Priority: P2)

Sofía instala la app. Después de elegir sus medios, la app le pregunta «¿Dónde comprás seguido?» con comercios para tocar. Toca Día y ve al instante con qué le conviene pagar ahí hoy. Toca Farmacity y lo ve también. Los dos quedan como sus comercios habituales. En el alta le piden su nombre, y la app la saluda por su nombre desde Inicio.

**Why this priority**: hoy la primera impresión es una respuesta fija en Coto, que puede ser «Hoy no hay promo», y un «Hola, Martín» para todo el mundo. Arreglarlo es barato y no depende de mover la cuenta (US5).

**Independent Test**: hacer el onboarding con medios sin promo en Coto, tocar un comercio donde sí tienen y verificar que la respuesta es la del motor para ese comercio y día. Terminar y verificar que Inicio y Perfil muestran el nombre cargado y que Perfil lista los comercios marcados.

**Acceptance Scenarios**:

1. **Given** el paso de primera respuesta, **Then** muestra «¿Dónde comprás seguido?» con comercios del catálogo agrupados por rubro y un buscador, sin ninguna respuesta precalculada.
2. **When** toca un comercio, **Then** aparece en la misma pantalla la recomendación del motor para ese comercio, hoy y con sus medios, y el comercio queda marcado como habitual.
3. **When** toca otro comercio, **Then** la respuesta pasa a ese comercio y los dos quedan marcados. Tocar un comercio ya marcado muestra su respuesta y **no** lo desmarca.
4. **When** toca la × de un comercio marcado, **Then** se desmarca. Si era el de la respuesta, la respuesta pasa al último marcado que queda, o desaparece si no queda ninguno.
5. **Given** que no marcó ningún comercio, **Then** puede seguir igual con «Seguir sin elegir» y queda sin habituales.
6. **Given** un comercio sin promo para sus medios, **Then** se dice con claridad y se sugiere probar otro comercio.
7. **Given** el alta de la cuenta, **Then** se pide un nombre obligatorio de 1 a 40 caracteres (sin contar los espacios a los costados), que es el que ven sus contactos.
8. **Given** Perfil, **When** toca su nombre, **Then** lo puede editar con las mismas reglas, y el cambio queda guardado en su cuenta.
9. **Given** un usuario sin nombre (cuentas creadas antes de esta spec), **Then** ninguna pantalla muestra un nombre inventado: Inicio saluda sin nombre y Perfil muestra «Cargá tu nombre».
10. **Given** el onboarding, **Then** el indicador de pasos cuenta los pasos reales y la pantalla Comercios ya no forma parte del onboarding (los habituales se editan desde Perfil).

---

### User Story 5 - Probar antes de crear la cuenta (Priority: P3)

Sofía toca «Empezar» en Bienvenida sin crear cuenta. Elige sus medios, ve su primera respuesta real y recién después la app le dice «Guardá tu perfil para no perderlo» y le pide nombre, email y contraseña. Al crear la cuenta, sus medios y comercios quedan guardados en ella.

**Why this priority**: es la mejora de conversión más grande, porque la cuenta se pide cuando ya vio el valor. También es la más cara: los catálogos y las promociones tienen que poder leerse sin cuenta, y lo elegido tiene que vivir en el teléfono hasta que la cuenta exista. Si el plan concluye que no es viable en el cuatrimestre, se entregan las US1 a US4 y esta queda anotada.

**Independent Test**: desde una instalación limpia, tocar «Empezar», elegir medios y un comercio, crear la cuenta y verificar que el perfil remoto tiene esos medios y habituales y que Inicio funciona. Repetirlo con un proyecto que exige confirmar el email.

**Acceptance Scenarios**:

1. **Given** Bienvenida, **Then** ofrece «Empezar» (sigue sin cuenta) y «Ya tengo cuenta» (entra a una existente).
2. **Given** «Empezar», **Then** el usuario elige medios (con la lista de bancos) y ve la primera respuesta (US4), calculada con las promociones reales, sin haber creado nada en el servidor.
3. **Given** la primera respuesta, **When** toca «Seguir», **Then** se abre «Guardá tu perfil», con nombre, email y contraseña.
4. **When** crea la cuenta, **Then** los medios, los habituales y el nombre elegidos se guardan en ella y el usuario llega a Inicio sin repetir pasos.
5. **Given** un proyecto que exige confirmar el email, **When** crea la cuenta, **Then** ve una pantalla que dice a qué email se mandó la confirmación y qué hacer, con «Ya confirmé, entrar». Lo elegido sigue en el teléfono y se guarda en la cuenta al primer ingreso.
6. **Given** que en «Guardá tu perfil» elige «Ya tengo cuenta», **Then** la regla se aplica por separado a medios y a habituales: si la cuenta ya los tiene, prevalecen los de la cuenta y se avisa que la selección de este teléfono no se aplicó; si no los tiene, se guardan los elegidos.
7. **Given** que cierra la app en medio del onboarding sin cuenta, **When** la vuelve a abrir, **Then** retoma donde estaba, con lo elegido.
8. **Given** que falla el guardado de lo elegido después de crear la cuenta, **Then** el usuario no pierde la selección y puede reintentar, sin quedar en un estado a medias que lo haga repetir el alta.

---

### Edge Cases

- **Varias compras por confirmar**: puede haber varias, siempre en comercios distintos (una por comercio, FR-012).
- **Vencimiento**: una compra por confirmar vence cuando `ahora − creación ≥ 48 h` (FR-011). Si vence con «Revisá tu compra» abierta, se puede guardar igual.
- **Día distinto**: la fecha propuesta es el día de la simulación en hora de Argentina. Si el usuario confirma otro día, «Revisá» le deja elegir entre ese día y hoy. La promo se evalúa en la fecha elegida, como hoy (spec 010, FR-022).
- **Promo que dejó de estar vigente** al confirmar: la compra se guarda igual, porque el usuario pagó. La promo propuesta en «Revisá» es la de la fecha de la compra, puede no haber ninguna, y se dice.
- **Dos compras por confirmar con el mismo medio y un tope compartido**: la recomendación las ignora a propósito (FR-003), porque no se sabe si se pagaron. El riesgo de pasarse del tope se acepta, y la base del estimado lo deja a la vista.
- **Otro usuario en el mismo teléfono**: cada compra por confirmar es de un usuario. Las de otro usuario se descartan al abrir la app (FR-014).
- **Cerrar sesión con compras por confirmar**: el aviso de cierre dice cuántas se van a perder (FR-014).
- **Sin red**: crear, confirmar a mano y descartar funciona sin red. La compra confirmada entra en la cola de la spec 010. Escanear necesita red y, sin ella, ofrece «Confirmar a mano».
- **Comercio escrito a mano sin rubro** (un habitual que no está en el catálogo): no hay recomendación, así que tampoco hay «Usar».
- **Medio borrado del perfil** después de crear la compra por confirmar: «Revisá» no lo preselecciona y pide elegir otro, así que la compra queda `manual`.
- **Texto grande o lector de pantalla**: la tarjeta de la compra por confirmar y sus tres acciones se leen en orden, y cada acción tiene un área táctil de al menos 44 pt.
- **Invitación abierta antes de tener cuenta** (`i/[token]`): se conserva durante el onboarding y se abre al terminar, como hoy.
- **Borrador del onboarding sin terminar** (US5): si nunca se crea la cuenta, se borra a los 30 días o al tocar «Ya tengo cuenta» y entrar.

## Requirements *(mandatory)*

### Functional Requirements

**Compra por confirmar**

- **FR-001** *(v7)*: La recomendación MUST mostrarse sola en el paso 3 del flujo de compra, con «Voy a pagar con [medio]» cuando hay un medio recomendado, y «Otras opciones» y «¿Pagan entre varios?» plegadas. Inicio no muestra recomendaciones.
- **FR-002**: «Usar [medio]», desde Inicio o desde el detalle del comercio, MUST crear una compra por confirmar y MUST NOT crear una compra confirmada. La compra por confirmar guarda el usuario, el comercio (del catálogo), el medio elegido, el monto (si lo había) y el momento de creación. Después, la simulación de Inicio se limpia.
- **FR-003**: Una compra por confirmar MUST NOT modificar ningún tope, base de estimado, total ni recomendación.
- **FR-004**: Al crear una compra por confirmar, la app MUST mostrar un aviso breve: «Pagá con [medio]».
- **FR-005** *(v7)*: Cada compra por confirmar vigente MUST mostrarse en Inicio como una fila (comercio, monto si lo hay, medio y antigüedad). Tocarla abre el paso 4 («Pagá con [medio]»), que tiene una sola decisión: «Escanear ticket», «Cargar a mano» o «Lo confirmo después».
- **FR-006**: «Ya pagué» MUST abrir «Revisá tu compra» con los datos de la compra por confirmar cargados y editables. El origen MUST ser `excepcion` si el medio y el comercio finales son los de la compra por confirmar, y `manual` en cualquier otro caso.
- **FR-007**: «Escanear ticket» desde una compra por confirmar MUST abrir el escaneo y, si la lectura sale bien, «Revisá tu compra» con los datos del ticket y, donde el ticket no traiga un dato, los de la compra por confirmar. Guardar MUST registrar la compra con origen `ticket`.
- **FR-008**: Si el ticket no identifica el medio, la pregunta «¿Con qué pagaste?» MUST arrancar sin medio seleccionado y MUST destacar el medio de la simulación como sugerencia. «Guardar compra» MUST quedar deshabilitado hasta que el usuario toque un medio.
- **FR-009**: Si el monto o el medio del ticket difieren de los de la compra por confirmar, la app MUST usar los del ticket y avisar la diferencia. El aviso de monto solo aparece si se simuló con monto.
- **FR-010**: «Descartar» MUST pedir confirmación y eliminar la compra por confirmar sin otro efecto.
- **FR-011**: Una compra por confirmar MUST dejar de mostrarse cuando `ahora − creación ≥ 48 h`, medido con el reloj del store, y MUST borrarse del teléfono al abrir la app. Las 48 h se definen en un único lugar del código.
- **FR-012**: Hay como máximo una compra por confirmar por comercio del catálogo. Crear otra en el mismo comercio MUST reemplazar la anterior y avisarlo.
- **FR-013**: Un ticket coincide con una compra por confirmar si el nombre del comercio del ticket, normalizado (minúsculas, sin tildes, sin puntuación y con los espacios colapsados), contiene como palabra entera el nombre normalizado del comercio de la compra. Además, la fecha del ticket no puede ser anterior al día de la simulación. Este cruce se aplica a todo escaneo que no salga de la tarjeta de una compra por confirmar (US2-9). Desde la tarjeta, si no coincide, se pregunta (US2-5).
- **FR-014**: Las compras por confirmar MUST guardarse solo en el teléfono y sobrevivir a cerrar y abrir la app. MUST NOT subirse a la cuenta. MUST descartarse al abrir la app si son de otro usuario, y al cerrar sesión, con un aviso que diga cuántas se pierden.
- **FR-015**: Crear, confirmar a mano y descartar una compra por confirmar MUST funcionar sin red.
- **FR-016**: Confirmar MUST ser idempotente: la compra registrada usa la identidad de la compra por confirmar. Si una compra con esa identidad ya existe, la compra por confirmar se elimina y no se registra otra.
- **FR-017**: La fecha propuesta al confirmar MUST ser el día de la simulación en hora de Argentina. Si hoy es otro día, «Revisá» MUST permitir elegir entre ese día y hoy.

**Navegación**

- **FR-018** *(v7)*: La barra inferior MUST tener, en este orden: Inicio, Compras, «+» (comprar), Comercios y Perfil. Inicio MUST ser la pestaña inicial. El «+» no es una pestaña: abre el flujo de compra. Topes MUST abrirse desde Inicio («Tus topes › Ver todos») y desde Compras («Te devolvieron»).
- **FR-019** *(v7)*: La pestaña activa MUST distinguirse por el color del acento además del ícono, con contraste ≥ 3:1 contra la barra en los dos temas, y su etiqueta ≥ 4.5:1. El «+» MUST ser más grande que las pestañas, en el acento, con la etiqueta accesible «Comprar». La barra es propia (una cápsula flotante), porque la nativa no admite un botón central destacado; MUST anunciarse como pestañas, tener áreas táctiles de 44 pt o más y ocultarse con el teclado.
- **FR-020** *(v7)*: La tab Comprar MUST eliminarse. Lo que ofrecía MUST seguir disponible: elegir comercio, escanear y cargar a mano (flujo del «+»), pagar entre varios (paso 3) y las últimas compras (Inicio › Últimas compras y la pestaña Compras).
- **FR-021** *(v7)*: El flujo de compra MUST tener un paso por pantalla con barra de avance de 4 pasos: comercio, monto (opcional), recomendación y «Pagá con [medio]». Si se entra a mitad de camino (desde Comercios o desde Inicio), los pasos anteriores se ven completos.
- **FR-022** *(v7)*: Perfil MUST ser una pestaña con el nombre, los medios de pago y Contactos; Mis compras MUST NOT estar dentro de Perfil. Los comercios habituales MUST tener su pestaña, Comercios, donde tocar uno abre el flujo en el paso del monto y «Hoy te conviene» muestra la recomendación sin monto del motor para cada uno (y los más usados, hasta seis).
- **FR-023**: El contenido y la barra inferior MUST respetar las zonas seguras de arriba y abajo. La barra de estado MUST mostrar el fondo de la app (`canvas`) en iOS con notch, en Android con navegación por gestos y en Android con tres botones (Android 15 o más, *edge-to-edge*). En Android anterior a 15, donde no se dibuja debajo de la barra, MAY quedar el color del sistema.

**Onboarding y perfil**

- **FR-024**: El onboarding MUST NOT incluir la pantalla de comercios habituales. Los habituales se editan desde Perfil.
- **FR-025**: La primera respuesta MUST permitir marcar comercios del catálogo y mostrar, para el último tocado, la recomendación del motor de hoy con los medios del usuario. Tocar un comercio lo marca y muestra su respuesta. Desmarcar se hace con un control aparte en el comercio marcado. Los marcados MUST quedar como habituales.
- **FR-026**: La primera respuesta MUST permitir seguir sin marcar comercios.
- **FR-027**: El alta MUST pedir un nombre obligatorio de 1 a 40 caracteres (sin contar los espacios a los costados). MUST guardarse en el perfil de la cuenta, donde el largo también se valida.
- **FR-028**: Perfil MUST permitir editar el nombre con las mismas reglas.
- **FR-029**: Ninguna pantalla MUST mostrar un nombre que el usuario no cargó. El estado inicial del perfil MUST tener el nombre vacío. El nombre de la demo solo aparece con un escenario de demo elegido a propósito.
- **FR-030**: El indicador de progreso del onboarding MUST reflejar los pasos reales.
- **FR-031** *(US5)*: Bienvenida MUST ofrecer «Empezar» sin cuenta. Los medios, los habituales y el nombre elegidos sin cuenta MUST guardarse en el teléfono, sobrevivir a cerrar la app y guardarse en la cuenta al crearla o en el primer ingreso. Si nunca se crea la cuenta, se borran a los 30 días.
- **FR-032** *(US5)*: Los bancos, las categorías y las promociones vigentes MUST poder leerse sin cuenta, solo para lectura. Ninguna tabla con datos de usuarios cambia sus permisos.
- **FR-033** *(US5)*: Si el proyecto exige confirmar el email, la app MUST mostrar a qué dirección se mandó y cómo seguir, sin perder lo elegido.
- **FR-034** *(US5)*: Al entrar con «Ya tengo cuenta» después de elegir sin cuenta, la regla se aplica por separado a medios y a habituales: si la cuenta ya los tiene, prevalecen los de la cuenta y se avisa; si no, se guardan los elegidos.

**Estados vacíos y privacidad**

- **FR-035** *(v7)*: Sin compras confirmadas, Inicio MUST decir que todavía no hay compras y que se empieza con el «+».
- **FR-036** *(v7)*: Sin compras, Topes y Mis compras MUST decir que se empieza con el «+».
- **FR-037**: `docs/product/privacidad.md` MUST declarar los datos locales nuevos (las compras por confirmar y el borrador del onboarding): qué guardan, dónde y por cuánto tiempo.

### Key Entities

- **Compra por confirmar**: la intención de pagar en un comercio con un medio, creada al tocar «Usar». Tiene una identidad propia, el usuario, el comercio (del catálogo), el medio elegido, el monto (opcional) y el momento de creación. Vive solo en el teléfono y no cuenta para los topes. Termina confirmada (se convierte en una compra con su misma identidad), descartada o vencida.
- **Compra** (existente): lo que ya se registra hoy, con origen `excepcion`, `manual` o `ticket`. Esta spec solo cambia cómo se llega a ella.
- **Borrador del onboarding** *(US5)*: los medios, habituales y nombre elegidos antes de tener cuenta. Vive en el teléfono hasta que se guarda en la cuenta, como máximo 30 días.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde Inicio, el usuario pasa de tocar un comercio a tener su compra por confirmar creada en 2 toques (comercio → «Usar»).
- **SC-002**: Desde la tarjeta de una compra por confirmar con monto, confirma a mano en 2 toques («Ya pagué» → «Guardar compra»).
- **SC-003**: Los topes, las bases de estimado, los totales y la recomendación quedan exactamente iguales en cada uno de estos casos: compra por confirmar creada con monto, creada sin monto, reemplazada, vencida, descartada, y «Revisá» cerrada sin guardar.
- **SC-004**: En el alta sin confirmación de email, un usuario nuevo ve una recomendación real, para un comercio que eligió, en la tercera pantalla después de Bienvenida o antes. Con confirmación de email se suma solo esa pantalla.
- **SC-005**: Con el estado inicial y sin escenario de demo, ninguna pantalla muestra «Martín» ni otro nombre que el usuario no cargó.
- **SC-006**: La app tiene 3 tabs, y cada acción que había en la tab Comprar se alcanza en 2 toques o menos desde alguna tab.
- **SC-007**: En los tres dispositivos de FR-023, ningún elemento se superpone con las zonas del sistema. Se documenta con capturas de antes y después.
- **SC-008**: Confirmar dos veces la misma compra por confirmar, o reabrir la app justo después de confirmar, deja exactamente una compra registrada.
- **SC-009** *(US5)*: Desde una instalación limpia, el 100 % de los medios, habituales y el nombre elegidos antes de la cuenta están en la cuenta después de crearla, con o sin confirmación de email.

## Assumptions

- **48 horas de vencimiento**: alcanza para confirmar al día siguiente una compra hecha de noche, y evita que una simulación que no terminó en compra quede para siempre. El valor vive en un solo lugar.
- **Compras por confirmar solo en el teléfono**: son una intención, no un registro. Subirlas sumaría una tabla con RLS y sincronización sin que nadie más las necesite. Si el usuario cambia de teléfono, las pierde, y es aceptable.
- **Origen `excepcion`**: coincide con RF-12 («acepta una recomendación») solo si el medio y el comercio no cambiaron.
- **Sugerencia de medio cuando el ticket no lo dice**: no es una inferencia, porque el medio arranca vacío y el usuario elige con un toque (RF-10, constitución §III).
- **Las compras por confirmar no afectan la recomendación**: es a propósito. No se sabe si se pagaron, y la recomendación usa solo compras confirmadas, como hoy.
- **El lector de tickets sigue simulado**: esta spec cambia solo que devuelva la fecha de hoy, para que el cruce se pueda probar. Además se suma un escenario de demo «sin red» para probar el camino sin conexión.
- **US5 depende de** que se habilite la lectura sin cuenta de bancos, categorías y promociones vigentes (FR-032). Son datos públicos de MODO y no hay datos de usuarios en esas tablas. Si el plan concluye que no se puede, US5 se posterga y el onboarding queda así: Bienvenida → cuenta (con nombre) → medios → primera respuesta.
- **Diseño visual**: el «más directo» de esta spec sale de quitar pasos y pantallas. La forma la da `DESIGN.md` v6 (`docs/design/direccion-visual-v6.md`), y los temas se implementan en #115.
