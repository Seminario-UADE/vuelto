# Feature Specification: Registrar una compra con la foto del ticket

**Feature Branch**: `claude/49-ticket-app`

**Created**: 2026-11-14 · **Revisada**: 2026-11-14 (dos pasadas de `spec-critic`)

**Status**: Draft

**Input**: Issue [#49](https://github.com/Seminario-UADE/vuelto/issues/49) — "Registrar una compra sacándole una foto al ticket y confirmando los datos". Conecta la app al servicio de la issue #48 (`specs/013-extraer-ticket/`, contrato en `contracts/extraer-ticket.md`, PR #133) y reemplaza la lectura simulada de la pantalla «Escanear ticket». La confirmación sigue el flujo de la spec 012 («Revisá tu compra», compra por confirmar).

**Decisión que resuelve (constitución §I)**: registrar la compra que el usuario acaba de pagar sin tipear, para que el tope consumido de cada medio quede al día y la próxima recomendación sea correcta (ADR-006).

**Frontera con otras specs** (acordada con el usuario):

- **Spec 013 (issue #48)**: el servicio que lee la foto. Esta spec lo usa tal como está: no cambia su contrato.
- **Spec 012**: «Revisá tu compra», la compra por confirmar y el cruce del ticket con ella (FR-007, FR-013, US2) siguen igual, salvo dos cambios de esta spec: el medio leído del ticket pasa a ser una sugerencia (FR-008) y la fecha se puede cambiar (FR-010).
- **Constitución 3.0.2** (aclaración del Principio IV, decisión del usuario, 14/11): en el celular, los archivos temporales de la cámara, la galería y el achicado se borran en cuanto termina la lectura y no cuentan como persistir la foto. Se enmienda en el mismo PR, con `privacidad.md`, `CLAUDE.md` y `rules-guardian`.
- **Texto vs. issue** (decisiones del usuario, 14/11):
  - **Sin descuento** en la confirmación: no se lee del ticket (spec 013) y el reintegro lo calcula el motor al confirmar.
  - **La cámara y la galería son las del sistema**: la cámara deja repetir la foto antes de confirmarla. No hay un visor propio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sacarle una foto al ticket y confirmar la compra (Priority: P1)

Martín pagó en Coto. Toca «Escanear ticket», saca la foto con la cámara del celular (si sale movida, la repite) y la confirma. A los pocos segundos ve «Revisá tu compra» con el monto, el comercio y la fecha del ticket. La pregunta «¿Con qué pagaste?» arranca sin medio marcado, con su Galicia Visa débito destacada como «El que dice el ticket». La toca y guarda.

**Why this priority**: Es la vía más confiable de registro (ADR-006) y lo que mantiene el tope al día.

**Independent Test**: Con el servicio simulado devolviendo una lectura fija, sacar o elegir una foto, verificar «Revisá tu compra» con esos datos, la sugerencia del medio y la compra guardada con origen `ticket` y el texto del ticket.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión, **When** toca «Escanear ticket», **Then** ve «Sacar foto» (abre la cámara del celular) y «Elegir de la galería».
2. **Given** una foto confirmada, **When** el servicio la lee bien, **Then** se abre «Revisá tu compra» con el monto, el comercio y la fecha que devolvió. Si el escaneo es de una compra por confirmar, lo que el ticket no trae se completa con los datos de esa compra (spec 012 FR-007). Si es un ticket suelto, un monto o un comercio vacíos quedan vacíos y «Guardar compra» dice qué falta («Falta el monto», «Falta el comercio»), como hoy; una fecha vacía toma el día de hoy.
3. **Given** que el ticket dice «VISA DEBITO ****1234» y el perfil tiene una sola tarjeta Visa débito, **Then** «¿Con qué pagaste?» arranca **sin medio marcado** y esa tarjeta lleva la nota «El que dice el ticket». «Guardar compra» se habilita cuando el usuario toca un medio (RF-10).
4. **Given** que el ticket dice «VISA» y el perfil tiene dos tarjetas Visa (débito y crédito), **Then** ninguna lleva nota y aparece «El ticket dice Visa, pero no sabemos cuál de tus tarjetas es».
5. **Given** que el ticket no dice el medio, **Then** aparece «El ticket no dice el medio de pago» y, si hay compra por confirmar, la tarjeta que eligió al simular lleva «El que elegiste al simular» (spec 012 FR-008).
6. **Given** que la tarjeta que dice el ticket es distinta de la que eligió al simular, **Then** la del ticket lleva «El que dice el ticket», la otra no lleva nota, y aparece «El ticket dice otro medio de pago que el que elegiste al simular».
7. **Given** que la tarjeta que dice el ticket es la misma que eligió al simular, **Then** lleva una sola nota: «El que dice el ticket».
8. **Given** la compra guardada, **Then** queda con origen `ticket`, el texto del ticket tal como lo devolvió el servicio (ya con los datos personales tapados) y los topes se recalculan.
9. **Given** «Elegir de la galería» y una foto del carrete, **Then** sigue igual que con la cámara.
10. **Given** «Revisá tu compra», **When** el usuario toca la fecha, **Then** puede elegir otro día dentro del rango de FR-010.

---

### User Story 2 - Que la foto no quede guardada en el celular (Priority: P1)

La foto se usa solo para leerla. Después de la lectura, salga bien o mal, no queda en la memoria de la app ni se agrega a la galería. Las fotos que el usuario ya tenía en su galería no se tocan.

**Why this priority**: Es una regla dura del proyecto (constitución §IV) y lo que pide la issue #49.

**Independent Test**: Con el sistema de archivos simulado, verificar que cada archivo temporal que se crea se borra en todos los caminos (éxito, cada error, cancelación).

**Acceptance Scenarios**:

1. **Given** una foto sacada con la cámara, **Then** no se agrega a la galería del celular.
2. **Given** cualquier lectura (con éxito, con error o cancelada antes de mandar), **Then** las copias temporales de la foto en la carpeta privada de la app se borran antes de que el usuario pueda seguir.
3. **Given** una foto elegida de la galería, **Then** la foto original del carrete del usuario queda intacta: solo se borra la copia temporal de la app.
4. **Given** cualquier lectura, **Then** la foto no se guarda en el estado de la app, en su persistencia ni en los registros.
5. **Given** una foto en HEIC (iPhone) o de varios megabytes, **Then** la app la achica y la convierte a JPEG antes de mandarla, y lo que manda pesa como máximo 2,5 MB.

---

### User Story 3 - Saber qué hacer cuando la lectura no funciona (Priority: P2)

Si no hay sesión, no hay conexión, la foto no se puede leer o el servicio no está disponible, el usuario ve un mensaje claro y siempre tiene una salida: probar de nuevo o cargar la compra a mano (spec 012 US2-8).

**Why this priority**: Con «Cargar a mano» siempre hay salida; sin mensajes claros, el usuario abandona.

**Independent Test**: Forzar cada error con el servicio simulado y los escenarios de desarrollo, y verificar el mensaje y las salidas.

**Acceptance Scenarios**:

1. **Given** un usuario sin sesión, **When** toca «Escanear ticket», **Then** ve «Iniciá sesión para leer tickets» con «Iniciar sesión» y «Cargar a mano», y no se abre la cámara.
2. **Given** que el usuario no da permiso para la cámara, **Then** ve «Para sacar la foto necesitamos permiso para usar la cámara» y puede elegir de la galería o cargar a mano.
3. **Given** que el usuario cierra la cámara o la galería sin elegir una foto, **Then** vuelve a «Escanear ticket» sin error.
4. **Given** cada código de error del contrato, **Then** se muestra el mensaje de la tabla de FR-011 con sus salidas.
5. **Given** que el pedido no llega al servicio (sin conexión o la conexión se corta a mitad de camino), **Then** se muestra «Sin conexión no podemos leer el ticket. Probá de nuevo cuando tengas internet o cargá la compra a mano.».
6. **Given** que el servicio no responde en 30 segundos, **Then** se muestra el mensaje de `tardo_demasiado`.
7. **Given** una lectura en curso, **Then** se ve «Leyendo el ticket…» y no se puede disparar otra hasta que termine.

### Edge Cases

- **Comercio del ticket que no coincide con la compra por confirmar** y **fecha anterior a la simulación**: siguen la spec 012 (US2-5, US2-6, FR-013).
- **El banco del ticket** («BCO GALICIA») se compara con el de la tarjeta («Banco Galicia») sin las palabras «banco», «bco» ni «bco.», sin mayúsculas, tildes ni puntuación. Si la tarjeta no tiene banco cargado, el banco no filtra.
- **El ticket trae solo el tipo** («TARJETA DE CREDITO», sin red): sigue FR-008 igual que con la red. Si el perfil tiene una sola tarjeta de crédito, lleva «El que dice el ticket»; si tiene ninguna o varias, aparece «El ticket dice crédito, pero no sabemos cuál de tus tarjetas es».
- **El ticket trae últimos 4 dígitos**: el perfil no los guarda, así que no cambian la sugerencia. Se ven en el texto del ticket.
- **La foto no se puede achicar a 2,5 MB**: se muestra el mensaje de `imagen_demasiado_grande` sin mandarla.
- **El usuario cierra la app durante la lectura**: si quedara una copia temporal, se borra la próxima vez que se abre «Escanear ticket» (FR-007).
- **La sesión vence durante la lectura**: el servicio responde `no_autenticado` y se ofrece «Iniciar sesión».
- **Web (la app publicada en vuelto.expo.app)**: «Sacar foto» y «Elegir de la galería» abren el selector de archivos del navegador; no hay archivos temporales que borrar.
- **Fecha leída de otro año o muy vieja**: se acepta (el servicio ya descarta las futuras); el usuario la puede cambiar (FR-010).

## Requirements *(mandatory)*

### Functional Requirements

**Sacar la foto**

- **FR-001**: «Escanear ticket» MUST ofrecer «Sacar foto», que abre la cámara del sistema, y «Elegir de la galería», que abre las fotos del sistema. La cámara MUST dejar repetir la foto antes de confirmarla y MUST NOT agregarla a la galería.
- **FR-002**: Sin sesión, «Escanear ticket» MUST mostrar «Iniciá sesión para leer tickets» con «Iniciar sesión» y «Cargar a mano», y MUST NOT abrir la cámara ni llamar al servicio.
- **FR-003**: Si el usuario no da permiso para la cámara, la app MUST mostrar «Para sacar la foto necesitamos permiso para usar la cámara» y ofrecer la galería y «Cargar a mano». Si cierra la cámara o la galería sin elegir, MUST volver a «Escanear ticket» sin error.

**Preparar y mandar**

- **FR-004**: Antes de mandarla, la app MUST achicar la foto y convertirla a JPEG, de modo que pese como máximo 2,5 MB (el límite del servicio). Si no lo logra, MUST mostrar el mensaje de `imagen_demasiado_grande` sin mandarla.
- **FR-005**: La app MUST mandar la foto al servicio de la spec 013 con la sesión del usuario y MUST NOT tener ni mandar la key del proveedor (RNF-04).
- **FR-006**: Mientras lee, la app MUST mostrar «Leyendo el ticket…» y MUST NOT permitir disparar otra lectura. Si el servicio no responde en 30 segundos, MUST mostrar el mensaje de `tardo_demasiado`.

**Privacidad de la foto**

- **FR-007**: Las copias temporales de la foto en la carpeta privada de la app (la que dejan la cámara o la galería y la achicada) MUST borrarse en cuanto termina la lectura, con éxito, con error o cancelada, y antes de que el usuario pueda seguir. Al abrir «Escanear ticket», la app MUST borrar las que hubieran quedado de una lectura interrumpida: las copias achicadas viven en una carpeta propia de la app para fotos de tickets, que se vacía entera, y la carpeta donde el selector de fotos deja sus copias se vacía también, porque la app no la usa para nada más. La foto MUST NOT agregarse a la galería ni guardarse en el estado de la app, en su persistencia ni en los registros, y la app MUST NOT tocar las fotos que el usuario ya tenía en su galería (constitución 3.0.2 §IV).

**Confirmar**

- **FR-008**: El medio de pago del ticket MUST mostrarse como **sugerencia**, nunca marcado (RF-10, constitución §III). Una tarjeta del perfil lleva «El que dice el ticket» solo si es **la única** que coincide con todo lo que el ticket dice de red, tipo y banco (el banco comparado como en *Edge Cases*); un dato que el ticket no trae no filtra, pero el ticket tiene que traer al menos la red o el tipo. Los mensajes de cada caso:
  - el ticket no trae red ni tipo: «El ticket no dice el medio de pago»;
  - trae red o tipo, pero coincide con ninguna o con más de una tarjeta: «El ticket dice ‹lo leído›, pero no sabemos cuál de tus tarjetas es», donde ‹lo leído› es la red y el tipo que trae, con su nombre para mostrar («Visa», «Mastercard», «American Express», «Diners Club», «Maestro», «Cabal», «Naranja», «Confiable», «Tarjeta Sol»; «débito», «crédito»): por ejemplo, «Visa débito», «Visa» o «crédito»;
  - coincide con una sola: la nota «El que dice el ticket» en esa tarjeta.

  Si hay compra por confirmar y su medio difiere del que dice el ticket, MUST avisar «El ticket dice otro medio de pago que el que elegiste al simular.». Si coinciden, una sola nota. Sin sugerencia del ticket, vale la de la spec 012 FR-008. Esto reemplaza, para el medio, el "se usa el del ticket" de la spec 012 FR-009. El aviso de monto distinto queda, con su propio cierre: «El monto del ticket es distinto al que simulaste: usamos el del ticket.». Si aparecen los dos, van uno debajo del otro.
- **FR-009**: «Revisá tu compra» MUST recibir el monto, el comercio, la fecha y el medio leído del ticket, y MUST guardar la compra con origen `ticket` y el texto del ticket tal como lo devolvió el servicio. Un monto o un comercio vacíos se completan a mano antes de guardar, como hoy. No hay campo de descuento.
- **FR-010**: En «Revisá tu compra», la fecha MUST poder cambiarse tocándola y eligiendo un día de un calendario. El rango es:
  - **con una compra por confirmar**: entre el día de la simulación y hoy, en hora de Argentina. Amplía la spec 012 FR-017, que solo ofrecía esos dos días, y respeta su FR-013: la compra no puede ser anterior a la simulación;
  - **sin compra por confirmar** (ticket suelto, recomendación o carga a mano): cualquier día hasta hoy.

  Nunca un día futuro. La compra se guarda con la fecha elegida.

**Errores**

- **FR-011**: Cada resultado de la lectura que no es un éxito MUST mostrar este mensaje y estas salidas:

  | Resultado | Mensaje | Salidas |
  |---|---|---|
  | `no_autenticado` | «Tu sesión venció. Iniciá sesión para leer el ticket.» | «Iniciar sesión», «Cargar a mano» |
  | `invalido`, `formato_no_soportado`, `imagen_danada` | «No pudimos abrir la foto. Sacala de nuevo.» | «Probar de nuevo», «Cargar a mano» |
  | `imagen_demasiado_grande` | «La foto es muy pesada para leerla.» | «Cargar a mano» |
  | `ticket_ilegible` | «No pudimos leer el ticket. Probá con más luz o cargá la compra a mano.» | «Probar de nuevo», «Cargar a mano» |
  | `no_disponible` | «El lector no está disponible ahora. Probá en un rato o cargá la compra a mano.» | «Probar de nuevo», «Cargar a mano» |
  | `tardo_demasiado` o 30 s sin respuesta | «Tardó demasiado. Probá de nuevo.» | «Probar de nuevo», «Cargar a mano» |
  | Sin conexión (el pedido no llegó al servicio o se cortó) | «Sin conexión no podemos leer el ticket. Probá de nuevo cuando tengas internet o cargá la compra a mano.» | «Probar de nuevo», «Cargar a mano» |
  | `interno`, `metodo_no_permitido` o una respuesta que no está en el contrato | «Algo falló. Probá de nuevo o cargá la compra a mano.» | «Probar de nuevo», «Cargar a mano» |

  «Probar de nuevo» vuelve a «Escanear ticket» para elegir otra foto. `imagen_demasiado_grande` no ofrece «Probar de nuevo»: la app ya achica la foto, así que repetir daría lo mismo.

**Desarrollo y demo**

- **FR-012**: Los escenarios de desarrollo «Ticket ilegible» y «Sin red» MUST seguir simulando esos resultados, con los mensajes de FR-011, sin abrir la cámara ni llamar al servicio. MUST sumarse «Ticket de ejemplo», que devuelve una lectura de ejemplo de hoy con un medio leído («VISA DEBITO»), sin cámara ni servicio, para la demo, los tests y la web sin cámara. En el escenario normal, la app usa la cámara y el servicio real.

### Key Entities

- **Foto del ticket**: existe solo mientras dura la lectura, como copia temporal en la carpeta privada de la app; nunca se guarda.
- **Lectura del ticket en la app**: o bien un éxito con monto, comercio, fecha, medio leído (banco, tipo, red, últimos 4, tal como los devolvió el servicio) y texto; o bien un resultado de error de la tabla de FR-011. Reemplaza la forma actual del lector simulado (`LecturaTicket`), que devolvía una tarjeta del perfil y un texto de error.
- **Sugerencia de medio**: la tarjeta del perfil que coincide con el medio leído, o ninguna, con el mensaje de FR-008. La calcula la app a partir del medio leído y el perfil; nunca es una elección.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con 4G o Wi-Fi, desde que la app recibe la foto confirmada (con la cámara o la galería) hasta que el usuario ve «Revisá tu compra» pasan menos de 8 segundos en al menos 9 de 10 lecturas de una prueba manual con tickets reales (el servicio tarda unos 2 s; el resto es achicar y mandar).
- **SC-002**: Después de cualquier lectura (éxito, cada error y cancelación) quedan 0 copias temporales de la foto, verificado con un test por camino.
- **SC-003**: Cuando el ticket trae monto, comercio, fecha y un medio que coincide con una sola tarjeta, registrar la compra lleva 2 toques después de confirmar la foto: la tarjeta sugerida y «Guardar compra».
- **SC-004**: Cada resultado de la tabla de FR-011 muestra su mensaje y sus salidas, verificado con un test por fila.
- **SC-005**: La búsqueda de la key del proveedor en el paquete de la app da 0 resultados (RNF-04).

## Assumptions

- El servicio de la spec 013 está desplegado (lo está desde el 14/11) y el PR #133 se aprueba sin cambiar el contrato.
- El usuario tiene sus tarjetas cargadas en el perfil (issue #41), con su banco. Si no tiene ninguna, «¿Con qué pagaste?» funciona como hoy.
- Achicar la foto a unos 2.000 píxeles de lado mayor deja el ticket legible y por debajo de 2,5 MB.
- El límite de 30 segundos de la app cubre los 25 del servicio más la subida. Si la app corta antes, el servicio puede terminar igual y gastar cupo del proveedor: es aceptable para el MVP.
- Los límites del plan gratis del proveedor (unos 2 a 3 tickets por minuto para toda la app, ADR-012) alcanzan para el MVP; si se superan, el usuario ve el mensaje de `no_disponible`.
- La foto codificada para mandarla vive en memoria hasta que termina el pedido (hasta unos 3,4 MB); no se escribe a disco.
