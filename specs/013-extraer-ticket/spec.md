# Feature Specification: Leer los datos de un ticket a partir de su foto

**Feature Branch**: `claude/48-ticket-groq`

**Created**: 2026-11-10 · **Revisada**: 2026-11-10 (dos pasadas de `spec-critic`)

**Status**: Draft

**Input**: Issue [#48](https://github.com/Seminario-UADE/vuelto/issues/48) — "Edge Function que extrae los datos del ticket (sin guardar la imagen)", con el proveedor que decide el ADR-012 (`docs/decisions/012-groq-lee-los-tickets.md`, PR #126, propuesto). Se conecta al flujo de compra por confirmar de la spec 012.

**Decisión que resuelve (constitución §I)**: registrar una compra sin tipear, para que el tope consumido de cada medio quede al día y la próxima recomendación sea correcta (ADR-006). Sin compras registradas, el tope no se puede estimar.

**Frontera con otras issues** (acordada con el dueño de la issue):

- **Issue #49**: la cámara, la galería, la pantalla «Revisá tu compra» y el cruce del medio de pago del ticket con las tarjetas del perfil. Conecta este servicio a la pantalla que hoy usa el lector simulado. Esta spec define solo el servicio y su contrato.
- **El lector simulado de la app** (`leerTicket` y el tipo `LecturaTicket` en `apps/mobile/src/data/`, issue #39) devuelve el medio ya convertido en una tarjeta del perfil, porque no había lectura real. El ticket real no dice qué tarjeta del perfil es: dice, por ejemplo, "VISA DEBITO ****1234". Este servicio devuelve eso, y la issue #49 adapta `LecturaTicket` y hace el cruce.
- **Issue #10**: medir la precisión con 10 a 20 tickets reales, incluido si queda algún dato personal sin tapar en el texto.
- **Issue #85**: la key del proveedor ya está cargada en los secrets del servidor.
- **Texto vs. issue** (decisiones del usuario, 10/11):
  - La issue nombra a Gemini; manda el ADR-012 (Groq).
  - **Sin descuento.** La issue pedía leer el descuento del ticket. Se saca: casi ninguna promo bancaria aparece en el ticket (son reintegros que llegan después), y los descuentos que sí aparecen pueden ser del comercio y no consumir tope. El reintegro lo sigue calculando el motor cuando el usuario confirma la compra (`reintegroEsperado`).
  - **Un solo pago por ticket.** El monto es el total.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sacarle una foto al ticket y recibir los datos (Priority: P1)

La app manda la foto de un ticket y recibe, ya separados, el monto, el comercio, la fecha y el medio de pago tal como lo dice el ticket (banco, débito o crédito, red y últimos 4 dígitos), más el texto del ticket. Lo que el ticket no dice llega vacío, nunca adivinado.

**Why this priority**: Es la vía más confiable para registrar una compra (ADR-006) y, sin compras, no hay control de topes, que es el diferencial del producto.

**Independent Test**: Se prueba con 3 tickets de ejemplo inventados y el proveedor simulado, verificando que el servicio valide y limpie la respuesta del proveedor como dicen los requisitos.

**Acceptance Scenarios**:

1. **Given** un ticket que imprime total "$24.500,00", comercio "COTO", fecha "14/10/2026" y "VISA DEBITO ****1234", **When** se lee, **Then** la respuesta trae monto 24500, comercio "COTO", fecha "2026-10-14", medio {banco: vacío, tipo: "debito", red: "visa", ultimos4: "1234"} y el texto del ticket.
2. **Given** un ticket que no dice con qué se pagó, **When** se lee, **Then** el medio llega con sus cuatro datos vacíos y el resto con lo que sí dice. La app pregunta el medio (#49, RF-10).
3. **Given** un ticket que dice "TARJETA DE CREDITO" sin red ni dígitos, **When** se lee, **Then** el medio llega con tipo "credito" y banco, red y últimos 4 vacíos.
4. **Given** un ticket con subtotal, total y vuelto, **When** se lee, **Then** el monto es el total.
5. **Given** un ticket que imprime "MASTERCARD", **When** se lee, **Then** la red es "master": el servicio traduce lo que está escrito.
6. **Given** un ticket con el número de tarjeta "4509 ****" sin el nombre de la red, **When** se lee, **Then** la red llega vacía: deducirla por los primeros dígitos no está permitido.
7. **Given** un ticket con fecha "14/10/26", **When** se lee, **Then** la fecha es "2026-10-14". **Given** "14/10" sin año, **Then** la fecha llega vacía.
8. **Given** una respuesta del proveedor con un dato imposible (fecha posterior a hoy, monto 0 o negativo, "últimos 4" que no son 4 dígitos, una red que no existe), **When** se lee, **Then** ese campo llega vacío y los demás no cambian.

---

### User Story 2 - Que mi ticket no quede guardado en ningún lado ni exponga mis datos (Priority: P1)

La foto se usa solo mientras dura la lectura y se descarta. El texto del ticket que se devuelve (y que la app guarda con la compra) no muestra números de tarjeta completos, CUIT o CUIL de personas ni DNI.

**Why this priority**: Es una regla dura del proyecto (constitución §IV) y lo que se le promete al usuario en `docs/product/privacidad.md`.

**Independent Test**: Se prueba con tickets de ejemplo que contienen datos personales inventados, verificando el texto devuelto, y revisando que ningún camino escriba la imagen.

**Acceptance Scenarios**:

1. **Given** cualquier lectura, con éxito o con error, **Then** la imagen no se escribe en disco, almacenamiento, base de datos ni registros del servidor.
2. **Given** un texto con "4509 9535 6623 3704", **Then** el texto devuelto muestra "****3704".
3. **Given** un texto con "CUIT 20-12345678-6" o "20123456786" (de una persona, dígito verificador válido), **Then** el texto devuelto muestra "CUIT [DATO PERSONAL]" o "[DATO PERSONAL]".
4. **Given** un texto con el CUIT del comercio "30-54808315-6", **Then** queda visible.
5. **Given** un texto con "DNI: 12345678" o "D.N.I. 12.345.678", **Then** el texto devuelto muestra "DNI: [DATO PERSONAL]" o "D.N.I. [DATO PERSONAL]".
6. **Given** un texto con "Cliente: Juan Pérez", **Then** el pedido al proveedor le indica reemplazar el nombre; si no lo reemplaza, las reglas no lo tapan (limitación conocida, se mide en #10).
7. **Given** un texto con "Cód. 12345678" (no anunciado como DNI), **Then** el número queda visible.

---

### User Story 3 - Saber qué pasó cuando la lectura no funciona (Priority: P2)

Si la foto no sirve, es demasiado grande, la lectura tarda demasiado o el servicio no está disponible, la app recibe un error distinto para cada caso, para mostrar un mensaje claro y ofrecer «Probar de nuevo» o «Confirmar a mano» (spec 012, US2-8).

**Why this priority**: Sin esto, una lectura fallida deja al usuario sin saber qué hacer; con «Confirmar a mano» siempre hay salida.

**Independent Test**: Se prueba forzando cada falla con el proveedor simulado y pedidos armados a mano.

**Acceptance Scenarios**:

1. **Given** un pedido sin sesión, o con la key pública de la app en lugar de la sesión de un usuario, **Then** responde `no_autenticado` y no se llama al proveedor.
2. **Given** un pedido sin imagen o con un cuerpo mal formado, **Then** responde `invalido`.
3. **Given** una imagen de más de 2.500.000 bytes, **Then** responde `imagen_demasiado_grande` y no se llama al proveedor.
4. **Given** un archivo que no es JPEG, PNG ni WebP, **Then** responde `formato_no_soportado`.
5. **Given** un archivo que dice ser una imagen pero está dañado, **Then** responde `imagen_danada` y no se llama al proveedor.
6. **Given** una foto en la que el proveedor no encuentra monto, comercio ni fecha (los tres vacíos), **Then** responde `ticket_ilegible`.
7. **Given** una respuesta del proveedor que no cumple el esquema, **Then** responde `ticket_ilegible` y registra el motivo sin copiar ningún valor del ticket.
8. **Given** un proveedor que no responde en 20 segundos, **Then** responde `tardo_demasiado`.
9. **Given** un proveedor que rechaza por límite de uso pidiendo esperar 12 segundos o menos, y la espera más una lectura entran en los 20 segundos, **Then** espera ese tiempo y reintenta una sola vez. **Given** que pide esperar más, que no entra en los 20 segundos, que el reintento vuelve a fallar o que el proveedor no está disponible, **Then** responde `no_disponible`.

### Edge Cases

- **Ticket con dos medios de pago**: no se espera (un solo pago por ticket). Si aparece, el medio llega vacío y la app pregunta; el monto es el total.
- **Foto de algo que no es un ticket**: `ticket_ilegible`.
- **Ticket en otra moneda** (dólares): el monto llega vacío; el producto trabaja en pesos.
- **Importes**: se leen con el formato argentino (punto de miles, coma decimal): "24.500,00" es 24500. Un importe que no se puede interpretar sin dudas llega vacío.
- **Banco impreso de forma abreviada** ("BCO GALICIA"): llega como texto, tal cual; el cruce con el catálogo es de la app (#49).
- **Nombre del local y razón social** ("Pucciano's" arriba y "GRAFARMAR S.A." abajo): el comercio es el nombre del local, que es el que reconoce el usuario y el que cruza con la compra por confirmar (spec 012 FR-013). Si el ticket no tiene nombre de local, la razón social. Salió de la prueba con un ticket real (10/11).
- **Texto muy largo**: primero se tapan los datos personales y después se recorta a 10.000 caracteres, terminando en "[…]".
- **Dos pedidos con la misma foto**: se leen los dos; no hay caché, porque guardaría la imagen o su resultado.
- **Usuario sin cuenta**: no puede leer tickets (`no_autenticado`); la app le ofrece «Confirmar a mano».

## Requirements *(mandatory)*

### Functional Requirements

**Pedido**

- **FR-001**: El servicio MUST aceptar un pedido de un usuario con cuenta, verificado contra el servicio de autenticación; la key pública de la app no alcanza. Sin eso responde `no_autenticado` y no llama al proveedor.
- **FR-002**: El pedido MUST traer una sola imagen de ticket, codificada como texto dentro del cuerpo, con su tipo (JPEG, PNG o WebP). La imagen decodificada MUST pesar como máximo 2.500.000 bytes: codificada como texto ocupa unos 3,4 millones de caracteres, con margen bajo los 4 MB que se suelen citar como límite del proveedor para imágenes dentro del pedido (su documentación solo publica 20 MB para imágenes por URL; se confirma en la prueba de FR-019).

**Respuesta**

- **FR-003**: Ante una lectura exitosa, el servicio MUST devolver monto, comercio, fecha, medio de pago (banco, tipo, red y últimos 4 dígitos) y texto del ticket. Todos los campos MUST estar siempre presentes; el que el ticket no dice MUST llegar vacío (`null`), nunca inventado ni deducido (constitución §III). La única excepción es el texto del ticket: si el proveedor no devuelve transcripción llega como texto vacío (`""`), porque la app lo guarda como texto con la compra.
- **FR-004**: El proveedor MUST devolver cada dato **tal como está impreso** (el importe, la fecha, la red, el tipo y los dígitos como texto), sin convertirlo. La normalización la hace el servicio, con reglas determinísticas y probadas:
  - la red, por una tabla de nombres impresos ("MASTERCARD", "MASTER", "MC" → "master"; "VISA" → "visa"; etc.);
  - el tipo, por las palabras impresas ("DEBITO", "DÉBITO", "DEB" → "debito"; "CREDITO", "CRÉDITO", "CRED" → "credito");
  - la fecha, desde "dd/mm/aaaa" o "dd/mm/aa" (año de 2 dígitos → 20aa), con separador `/`, `-` o `.`, aunque venga junto con la hora;
  - el importe, en formato argentino (punto de miles, coma decimal).

  Lo que no está en la tabla o no tiene ese formato queda vacío. Deducir lo que no está escrito MUST NOT estar permitido: la red por los dígitos de la tarjeta, un año ausente, el tipo por la red. Cada caso tiene un test (US1-5, US1-6, US1-7).
- **FR-005**: El monto MUST ser el total pagado, en pesos.
- **FR-006**: El servicio MUST NOT decidir a qué tarjeta del perfil corresponde el medio: devuelve lo que dice el ticket. El banco llega como texto, tal cual aparece.
- **FR-007**: El proveedor MUST recibir un esquema donde todos los campos son requeridos y aceptan vacío, y el servicio MUST validar la respuesta contra ese mismo esquema antes de usarla. Si no lo cumple, responde `ticket_ilegible`.
- **FR-008**: Después de validar el esquema, el servicio MUST vaciar los campos con valores imposibles: monto ≤ 0 o con más de 2 decimales; fecha que no existe o posterior a hoy en Argentina según el reloj del servidor (las fechas pasadas se aceptan todas; decidir si un ticket viejo sirve es de la app, spec 012); tipo distinto de débito o crédito; red fuera de las del producto; últimos 4 que no sean exactamente 4 dígitos.
- **FR-009**: Si monto, comercio y fecha quedan los tres vacíos, el servicio MUST responder `ticket_ilegible`.

**Privacidad**

- **FR-010**: La imagen MUST existir solo en memoria durante el pedido y MUST NOT escribirse en disco, almacenamiento, base de datos ni registros, ni en caso de error (constitución §IV).
- **FR-011**: El pedido al proveedor MUST indicarle que transcriba el ticket reemplazando nombres de personas, DNI y números de tarjeta (salvo los últimos 4) por `[DATO PERSONAL]`.
- **FR-012**: Después, reglas determinísticas MUST tapar en el texto, en este orden y antes de recortarlo (la tarjeta queda como `****` y los últimos 4; lo demás se reemplaza por `[DATO PERSONAL]`, conservando la palabra que lo anuncia):
  - tarjetas: queda `****` y los últimos 4. Los números agrupados como se imprimen las tarjetas (de a 4, o 4-6-5) se tapan siempre, aunque el proveedor haya leído mal un dígito. Los de 13 a 19 dígitos juntos, solo si cumplen la cuenta de control de las tarjetas (Luhn), porque así se imprimen también los códigos de barras. Las tarjetas ya enmascaradas (`****`, `XXXX`) quedan como `****` y los últimos 4;
  - CUIT o CUIL de personas (prefijo 20, 23, 24 o 27) con dígito verificador válido, con o sin guiones;
  - 7 u 8 dígitos, con o sin puntos de miles, precedidos por "DNI", "D.N.I.", "DOC" o "Documento".

  MUST NOT tapar CUIT de empresas (prefijo 30, 33 o 34) ni números sin esas condiciones.
- **FR-013**: Los registros del servidor MUST NOT incluir la imagen, el texto del ticket ni valores leídos; sí el resultado (éxito o código de error), la duración y, para un error de esquema, qué campo falló y por qué, sin su valor.

**Errores y tiempos**

- **FR-014**: Cada falla MUST tener un código estable y un estado HTTP, que la app traduce a un mensaje: `no_autenticado` (401), `invalido` (400), `formato_no_soportado` (415), `imagen_demasiado_grande` (413), `imagen_danada` (422), `ticket_ilegible` (422), `tardo_demasiado` (504), `no_disponible` (503), `metodo_no_permitido` (405) e `interno` (500). Un rechazo del proveedor por límite de uso o caída es `no_disponible`, salvo el reintento de FR-015; cualquier otro rechazo del proveedor (pedido inválido, demasiado grande) es `interno` y se registra, porque el servicio ya validó el pedido antes. Un 5xx del proveedor es una caída: `no_disponible`. La respuesta de error MUST traer solo el código, sin datos del ticket; con `invalido`, además el campo del pedido que falta (`body`, `imagen` o `tipo`).
- **FR-015**: La lectura, incluido un reintento, MUST durar como máximo 20 segundos: si el proveedor no contesta a tiempo, el servicio corta y responde `tardo_demasiado`. Ante un rechazo por límite de uso, el servicio MUST reintentar una sola vez si el proveedor pide esperar 12 segundos o menos y la espera más 5 segundos de lectura entran en los 20 (en la prueba manual, el proveedor pidió entre 8 y 10 segundos). Medido en el servidor, el servicio MUST responder siempre en menos de 25 segundos: un límite de 24 segundos cubre el pedido completo (la sesión, la lectura del cuerpo y el proveedor) y responde `tardo_demasiado` si se cumple.

**Estructura y verificación**

- **FR-016**: El proveedor MUST quedar detrás de una interfaz propia, de modo que cambiarlo (ADR-012, respaldo) no cambie el contrato, la validación ni las reglas de privacidad (ADR-009).
- **FR-017**: La suite de tests MUST correr sin red ni key, con el proveedor simulado y 3 tickets de ejemplo inventados que no contengan datos de ninguna persona real. Lo que se prueba es lo que hace el servicio con la respuesta del proveedor (validación, normalización, vaciado de valores imposibles, tapado de datos personales y errores), no la lectura del proveedor.
- **FR-018**: El contrato (pedido, respuesta y errores) MUST quedar documentado en `docs/architecture/02-api-routes.md` y en la carpeta de contratos de esta spec, para que la issue #49 lo implemente en la app.
- **FR-019**: Antes de escribir el servicio, una prueba manual MUST confirmar que el proveedor lee fotos de tickets reales respetando el esquema estricto. La corre el usuario fuera de la sesión de IA, con la key en una variable de entorno de su terminal, y comparte solo el resultado. **Pasa si**, con 3 fotos de tickets reales, las 3 respuestas cumplen el esquema y el monto es correcto en al menos 2. Si falla con el modo estricto, se repite con el modo de JSON libre (FR-007 queda como única garantía del esquema). Si también falla, no se implementa el servicio: se vuelve al equipo con el respaldo del ADR-012 (leer el texto en el celular y mandar a Gemini solo el texto sin datos personales).

### Key Entities

- **Lectura de ticket**: el resultado de leer una foto. Monto (pesos o vacío), comercio (texto o vacío), fecha (día o vacía), medio de pago y texto del ticket con los datos personales tapados. No se guarda en el servidor: la app la usa para armar la compra (#49).
- **Medio de pago leído**: banco (texto tal cual), tipo (débito o crédito), red (una de las del producto) y últimos 4 dígitos; cada uno puede llegar vacío por separado.
- **Error de lectura**: un código estable por tipo de falla (FR-014), sin datos del ticket.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el proveedor simulado devolviendo las respuestas de los 3 tickets de ejemplo, incluidas variantes con valores imposibles y mal escritos, la respuesta del servicio coincide campo por campo con la esperada.
- **SC-002**: En el 100% de los caminos (éxito y cada error), la imagen no se escribe en ningún lado: verificado por revisión de código y por `rules-guardian`.
- **SC-003**: En los textos de ejemplo con datos personales inventados, quedan 0 tarjetas completas, 0 CUIT o CUIL de personas y 0 DNI anunciados en el texto devuelto.
- **SC-004**: Medido en el servidor, el 100% de los pedidos recibe respuesta, de éxito o de error, en menos de 25 segundos.
- **SC-005**: Cada código de error de FR-014 se produce en al menos un test.
- **SC-006**: La prueba manual con el proveedor real (FR-019) pasa antes de implementar. La precisión con 10 a 20 tickets reales se mide en la issue #10.

## Assumptions

- La key `GROQ_API_KEY` está en los secrets del servidor (issue #85), con «Zero Data Retention» activado en el proveedor; vence el 8/2/2027.
- La app achica la foto antes de mandarla (#49); 2,5 MB alcanzan para una foto de ticket legible.
- Los límites del plan gratis del proveedor alcanzan para el volumen del MVP (decenas de tickets por día). No hay límite propio por usuario en esta versión: lo acota que haga falta una cuenta.
- El ADR-012 se aprueba (PR #126). Si el PO decidiera seguir con Gemini para los tickets, cambia solo la implementación detrás de la interfaz (FR-016).
- Las redes válidas son las del motor: visa, master, american_express, dinners_club, maestro, cabal, naranja, confiable y tarjeta_sol.
- El texto devuelto es el que la app guarda como `textoExtraido` junto a la compra, 90 días (`docs/product/privacidad.md`).
- El reintegro de la compra no sale del ticket: lo calcula el motor al confirmar (`reintegroEsperado`).
