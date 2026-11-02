# Feature Specification: Registrar una compra — borrar, promo aplicada y subida a la cuenta

**Feature Branch**: `claude/elegant-hermann-7c2dcf`

**Created**: 2026-11-02 · **Revisada**: 2026-11-02 (hallazgos de `spec-critic`: B1–B5, I1–I8, M1–M8)

**Status**: Draft

**Input**: Issue [#44](https://github.com/Seminario-UADE/vuelto/issues/44) — "Registrar una compra aceptando la recomendación o cargándola a mano", sobre el estado real de `main` el 02/11/2026 (store de Redux de la spec 008 y esquema de Supabase de la spec 007 ya mergeados). La captura local de una compra **ya existe** (`revisa.tsx`, `guardarCompra`, slice `compras`, orígenes `excepcion` / `manual` / `ticket`). Esta spec cubre lo que la issue pide y todavía no está: borrar una compra, la promo aplicada visible y corregible en la carga manual, y la subida a la cuenta del usuario con una cola para cuando no hay red.

**Decisión que resuelve (constitución §I)**: después de pagar, el usuario deja registrado con qué medio pagó (con un toque si siguió la recomendación, o a mano si pagó distinto) y puede corregir un error, para que el tope consumido —y con él la próxima recomendación— sea el real, y para que ese registro no se pierda si cambia de teléfono o se queda sin señal.

## Contexto y alcance

- **Ya está** (specs 006 y 008): la hoja «Revisá tu compra», el thunk `guardarCompra`, el slice `compras` (`{ lista }`), «Mis compras», la persistencia local del período en curso y los topes derivados de las compras. Una compra sin guardar no cambia ningún tope porque solo entra a `compras` al confirmar (RF-09). **Esta spec no rehace nada de eso.**
- **Esta spec agrega**: (1) borrar una compra, (2) la promo aplicada visible y quitable, (3) una cola persistida de operaciones (guardar / borrar) que se sube a la tabla `compras` cuando hay sesión y red, (4) la conversión de una compra a la fila de esa tabla y (5) la función que mezcla lo pendiente con lo que baja del servidor.
- **Bloqueado por otras issues, sin inventar su resultado**: el medio de pago de la app es un id del catálogo de la app, pero la tabla `compras` referencia filas de `medios_de_pago` del usuario (con banco y red). Esa correspondencia sale de la sincronización del perfil (#41), y el usuario de la sesión, de #40. Y la promo de la app es hoy un id de datos de ejemplo, no un id del corpus del servidor (#42, #35). Hasta que existan, la subida real queda desconectada (FR-020).
- **Coordinación con #42**: la lectura y sincronización de `compras` es de #42. Esta spec **no cambia la forma del slice `compras`**; la cola es un estado aparte, y esta spec entrega la función `aplicarPendientes` que #42 debe usar (FR-018).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Borrar una compra mal cargada y ver los topes corregirse (Priority: P1)

Martín cargó a mano una compra de $42.000 en Carrefour con el medio equivocado. Entra a «Mis compras», la borra y confirma. La compra desaparece de la lista y los topes que consumía vuelven a su valor anterior, al instante y sin conexión.

**Why this priority**: sin poder corregir, un error de carga distorsiona el tope para el resto del mes y la app deja de ser confiable. Es la parte de la issue #44 que hoy falta para cerrar el registro local.

**Independent Test**: con el store de ejemplo y un fixture de tope compartido, guardar una compra, ver bajar el tope restante, borrarla y verificar que el tope vuelve al valor original y que «Mis compras» ya no la lista. Funciona en modo avión.

**Acceptance Scenarios**:

1. **Given** una compra guardada en «Mis compras», **When** el usuario elige borrarla y confirma, **Then** la compra sale de la lista y los topes, el «Gastaste» y el «Te devolvieron» se recalculan sin ella en ese momento.
2. **Given** el mismo caso, **When** cancela la confirmación, **Then** no cambia nada.
3. **Given** un tope compartido entre dos promos que esa compra consumía, **When** se borra, **Then** la base del estimado («según N compras registradas») baja en uno y, si era la única, se dice explícitamente que no hay base (constitución §V).
4. **Given** una compra borrada, **When** el usuario vuelve a «¿Con qué pago?» para el mismo comercio, **Then** la recomendación ya usa el tope sin esa compra.
5. **Given** que la lista queda vacía, **Then** se muestra el estado vacío de «Mis compras».
6. **Given** una compra del período de topes que cae fuera del mes en curso (la semana que cruza el 1º, o un ticket con fecha de otro mes), **Then** también aparece en «Mis compras» y se puede borrar (FR-003).

---

### User Story 2 - Que lo registrado llegue a mi cuenta aunque no haya señal (Priority: P1)

Martín paga en un subsuelo sin señal y guarda la compra. La app la muestra y la cuenta en sus topes de inmediato. Al recuperar la conexión, la compra se sube sola a su cuenta; si el envío se reintenta, no se duplica.

**Why this priority**: la issue pide «se guarda en `compras` (Supabase) y en el cache local; si no hay red, queda en cola y se sube al volver». Sin esto el registro vive solo en el teléfono.

**Independent Test**: con un repositorio remoto en memoria que falla, se cuelga o responde según el caso, guardar y borrar compras, cerrar y reabrir la app en cada punto de la tabla de la verificación (SC-002) y comprobar que cada compra queda una sola vez en el remoto y que lo borrado no reaparece.

**Acceptance Scenarios**:

1. **Given** sesión iniciada y red, **When** el usuario guarda una compra, **Then** aparece en «Mis compras» y en los topes sin esperar a la red, y se sube a su cuenta en segundo plano.
2. **Given** sin red, **When** guarda una compra, **Then** entra igual a los topes, queda en la cola y se muestra con la marca «Sin subir».
3. **Given** compras en la cola, **When** la app se abre, vuelve a primer plano o se inicia sesión, **Then** se intentan subir y, al lograrlo, la marca desaparece.
4. **Given** una subida que se cortó (la compra llegó al servidor pero la app no recibió la respuesta), **When** se reintenta, **Then** la compra queda una sola vez en el servidor y el reintento cuenta como éxito.
5. **Given** una compra guardada y borrada **antes** de que se haya empezado a subir, **Then** no se hace ninguna llamada al servidor para ella.
6. **Given** una compra cuyo envío ya salió y no tiene respuesta, **When** el usuario la borra, **Then** se encola un borrado después del envío (no se descarta el guardado), y la compra no reaparece cuando la #42 relea el período.
7. **Given** una compra ya subida que el usuario borra, **When** hay red, **Then** se borra también de su cuenta; sin red, el borrado queda en la cola y la compra no reaparece al sincronizar.
8. **Given** una compra que el servidor rechaza por inválida, **Then** no se reintenta sola: queda como «No se pudo subir», con las acciones «Reintentar» y «Quitar compra» (FR-012).
9. **Given** el servidor que no responde, **Then** el envío se abandona a los 10 segundos y se reintenta en el próximo disparador, sin bloquear la interfaz.

---

### User Story 3 - Saber qué promo se aplicó y poder corregirla (Priority: P2)

Al cargar a mano una compra de Farmacity con Galicia Visa, la hoja «Revisá tu compra» muestra qué promo detecta el motor para ese comercio, ese medio y **la fecha de la compra**, con su reintegro estimado. Si en realidad no la usó, la quita y la compra deja de consumir ese tope.

**Why this priority**: la issue pide «promo aplicada (opcional)». Hoy el guardado la asocia sola y el usuario no la ve ni puede sacarla, lo que puede consumir un tope que no consumió. Es un ajuste de precisión, no bloquea el registro.

**Independent Test**: en la hoja, para un comercio y un medio con promo, ver la propuesta, quitarla, guardar y verificar que la compra no tiene promo ni reintegro esperado y que ningún tope cambia.

**Acceptance Scenarios**:

1. **Given** un comercio conocido y un medio con promo vigente **en la fecha de la compra**, **When** el usuario elige el medio, **Then** la hoja muestra la promo propuesta con su reintegro estimado y su base («≈$X, según N compras registradas»), sin guardarla todavía.
2. **Given** la promo propuesta, **When** el usuario la quita y guarda, **Then** la compra queda sin promo ni reintegro esperado y ningún tope cambia.
3. **Given** que el usuario cambia de medio, **Then** la propuesta se recalcula para el nuevo medio y una promo quitada antes **vuelve a proponerse**.
4. **Given** un comercio desconocido, un medio sin promo o una promo con el tope agotado a esa fecha, **Then** la hoja no propone ninguna y guardar funciona igual.
5. **Given** un ticket con fecha de un día anterior, **Then** la promo propuesta y la guardada son la misma: la vigente en la fecha de la compra, no en la de hoy.
6. **Given** que el motor propone varias promos acumulables, **Then** la hoja las muestra todas y quitar las quita todas.
7. **Given** el origen `excepcion`, **Then** viene con la promo de la recomendación y se puede quitar igual.
8. **Given** el origen `ticket` o `manual`, **Then** nunca queda un reintegro presentado como cobrado: `descuentoObtenido` sigue en `null`.

---

### Edge Cases

- **Compra de ejemplo**: la compra cuyo id está entre los datos de ejemplo se puede borrar de la lista local, pero nunca entra a la cola ni se manda al servidor. El criterio es la pertenencia a los datos de ejemplo, no el formato del id.
- **Compras guardadas antes de esta feature** (ids `n1`, `n2`… ya persistidos en el dispositivo): al abrir la app se les asigna un identificador nuevo y se encolan una vez (FR-007).
- **Sin cuenta todavía**: las operaciones se encolan sin dueño. La primera cuenta que inicia sesión en el dispositivo las adopta **después de un aviso y una confirmación** («Tenés N compras de este teléfono. ¿Subirlas a tu cuenta?»); si dice que no, quedan solo en el teléfono.
- **Otra cuenta en el mismo teléfono**: una operación con dueño X nunca se sube con la sesión de Y.
- **Cerrar sesión**: vacía la cola junto con el resto del estado. Si hay operaciones sin subir, antes avisa cuántos guardados y cuántos borrados hay y pide confirmación (FR-016).
- **Medio de pago sin correspondencia en la cuenta** (por ejemplo, Mercado Pago, que no es un banco con red): la compra queda como «Solo en este celular»; cuenta para los topes, pero no se sube ni se reintenta ni se marca como error.
- **Promo que no está en el corpus del servidor** (compra guardada contra datos de ejemplo): también queda «Solo en este celular»; no se sube sin promo para no falsear lo registrado.
- **Doble toque en «Guardar compra»**: queda una sola compra (FR-005).
- **Dos compras idénticas hechas a propósito** (mismo comercio, monto, fecha y medio): son compras distintas, cada una con su identificador.
- **Reloj del teléfono desfasado**: la fecha es la que eligió el usuario; los reintentos no dependen de la hora del dispositivo.
- **Cola con operaciones bloqueadas o rechazadas**: no traban a las demás (FR-009).
- **Operaciones muy viejas**: las de compras de más de 90 días se descartan (FR-019).
- **Filas del servidor que ya están pendientes en el teléfono** (lo mezcla #42): no se duplican ni se pierden, y el borrado pendiente no reaparece (FR-018).
- **Dos dispositivos en la misma cuenta**: un borrado hecho en uno no deja rastro en la tabla; el otro lo ve cuando #42 relea el período completo (se deja escrito en el contrato de FR-018).

## Requirements *(mandatory)*

### Functional Requirements

**Borrar**

- **FR-001**: El usuario MUST poder borrar una compra desde «Mis compras», con una confirmación explícita antes de borrar.
- **FR-002**: Al borrar, la compra MUST salir de `compras` y de la persistencia local, y los topes, «Gastaste» y «Te devolvieron» MUST recalcularse en ese momento, sin red y sin guardar ningún valor derivado (constitución §II).
- **FR-003**: «Mis compras» MUST listar todas las compras que cuentan para los topes (el período que guarda el store), no solo las del mes en curso, de modo que ninguna compra que consume un tope quede sin poder verse o borrarse. «Gastaste» y «Te devolvieron» siguen siendo los del mes en curso.

**Guardar**

- **FR-004**: Cada compra MUST tener un identificador único generado en el dispositivo al guardarla (con un generador inyectable, determinista en los tests) que sirva de clave de la fila en el servidor.
- **FR-005**: Pulsar «Guardar compra» varias veces seguidas MUST producir una sola compra.
- **FR-006**: Una compra sin confirmar MUST NOT entrar a `compras` ni a la cola (RF-09, ya vigente).
- **FR-007**: Al abrir la app, las compras guardadas antes de esta feature (id no uuid y no de ejemplo) MUST migrarse una sola vez: reciben un identificador nuevo y se encolan.

**Cola de subida**

- **FR-008**: Guardar y borrar una compra MUST registrar una operación en una cola persistida en el dispositivo, con su dueño (la cuenta de la sesión, o ninguna si no hay cuenta), su fecha y un estado entre `pendiente`, `enviando`, `rechazada` y `bloqueada` (con su motivo: medio sin correspondencia en la cuenta, promo fuera del corpus del servidor, o decisión del usuario de no subirla; sin sesión simplemente no se intenta). Una operación de guardar MUST llevar la compra completa.
- **FR-009**: El orden se exige solo entre operaciones de la **misma** compra. Las operaciones `bloqueada` y `rechazada` MUST NOT impedir que se envíen las demás.
- **FR-010**: Debe haber un único vaciado de la cola a la vez; los disparadores (guardar o borrar, abrir la app, volver a primer plano, iniciar sesión) MUST pedir un vaciado y no lanzar uno paralelo.
- **FR-011**: Solo se compacta (se anulan entre sí, sin llamar al servidor) un guardar `pendiente` con su borrado. Si el guardar está `enviando`, el borrado MUST encolarse como operación posterior.
- **FR-012**: El resultado de cada envío MUST clasificarse así:

  | Resultado del servidor | Acción |
  |---|---|
  | Guardado correcto | Quitar la operación |
  | Ya existe una fila con ese identificador (reintento de un envío que sí llegó) | Éxito; quitar la operación |
  | Borrado correcto, o no había nada para borrar | Éxito; quitar la operación |
  | Sin conexión, sin respuesta a los 10 s, sesión vencida, servidor caído | Transitorio; la operación vuelve a `pendiente` para el próximo disparador |
  | Dato inválido, violación de una restricción, medio o promo inexistentes | `rechazada`; no se reintenta sola |

  Una operación `rechazada` MUST ofrecer «Reintentar» (la vuelve a `pendiente`) y «Quitar compra» (la saca de `compras` y de los topes y descarta la operación; no hay nada que borrar en el servidor).
- **FR-013**: La compra MUST entrar a los topes en el mismo momento de guardarla, esté o no subida. Compra y operación MUST quedar consistentes tras un cierre de la app en cualquier punto: al abrir, una operación de guardar cuya compra no esté en `compras` MUST restaurarla, y una de borrar cuya compra siga en `compras` MUST sacarla.
- **FR-014**: «Mis compras» MUST marcar las compras `pendiente` / `enviando` / `rechazada` como «Sin subir» y las `bloqueada` por medio o promo como «Solo en este celular», y mostrar el recuento de cada una. Mientras la subida esté desconectada (FR-020) no se muestra ninguna marca ni recuento.
- **FR-015**: La cola MUST ser independiente del slice `compras` y tener su propio almacenamiento local.
- **FR-016**: Al cerrar sesión, si hay operaciones sin subir, la app MUST avisar cuántas compras guardadas y cuántos borrados hay pendientes y pedir confirmación antes de vaciar el estado local, y la cola MUST vaciarse junto con el resto del estado.

**Conversión a la fila del servidor**

- **FR-017**: Una función pura, sin acceso a la red, MUST convertir una compra a la fila de la tabla `compras`, respetando sus restricciones: monto mayor a 0, comercio no vacío, origen en `ticket` / `excepcion` / `manual`, medio de pago de la cuenta del usuario (recibido como entrada), promoción del corpus del servidor (recibida como entrada) o ausente, y `texto_extraido` sin imagen. El usuario de la fila MUST salir de la sesión, no de la app. Una compra que no se puede convertir porque falta el medio o la promo del servidor MUST quedar `bloqueada`, no rechazada.
- **FR-018**: Una función pura `aplicarPendientes(filasDelServidor, cola)` MUST devolver la lista de compras mezclada: las guardadas pendientes se agregan una sola vez, las rechazadas se conservan y las que tienen un borrado pendiente no aparecen. La #42 MUST usarla al sincronizar y MUST releer el período completo en cada sincronización (la tabla no avisa de los borrados).
- **FR-019**: Las operaciones de compras con fecha de más de 90 días MUST descartarse, y `privacidad.md` MUST documentar la clave nueva y qué guarda (`docs/product/privacidad.md`).
- **FR-020**: El acceso al servidor MUST ir detrás de una interfaz inyectable (ADR-009), con una versión en memoria para los tests y otra sobre Supabase con la sesión del usuario (nunca la service role). Hasta que existan la sesión (#40), la correspondencia de medios (#41) y el corpus del servidor (#42), la versión sobre Supabase MUST permanecer desconectada y la cola solo acumular; MUST NOT aparecer ningún dato falso para suplir lo que falta.
- **FR-021**: El job `supabase-rls` MUST probar con pgTAP lo que esta feature asume de la tabla: insertar con un identificador propio, volver a insertar el mismo (sin duplicar), borrar un identificador que no existe, y que otra cuenta no pueda leer ni pisar esa fila.

**Promo aplicada**

- **FR-022**: Una sola función pura MUST calcular la promo propuesta para un comercio, un medio y **la fecha de la compra**; la hoja «Revisá tu compra» y el guardado MUST usar esa misma función.
- **FR-023**: La hoja MUST mostrar la propuesta (todas las promos acumulables) con su reintegro estimado y su base, y MUST permitir quitarla antes de guardar. Cambiar de medio MUST recalcular la propuesta.
- **FR-024**: El guardado MUST recibir la promo elegida (ninguna, o la propuesta) en el borrador. Una compra sin promo MUST NOT consumir ningún tope ni guardar reintegro esperado. `descuentoObtenido` MUST seguir en `null` salvo que el usuario lo informe (fuera de esta spec).
- **FR-025**: El reintegro y la promo mostrados MUST ser estimados, con su base (constitución §V); nunca una cifra presentada como cobrada.

**Privacidad**

- **FR-026**: La cola y la fila subida MUST NOT contener la imagen del ticket ni datos de otros usuarios (Principio IV, `privacidad.md`). Solo viaja el texto extraído que ya forma parte de la compra.

### Key Entities

- **Compra**: lo que el usuario pagó (fecha, monto, comercio, categoría, medio, promo, reintegro esperado, origen, texto extraído). Ya existe en el motor. Gana un identificador único generado en el dispositivo.
- **Operación pendiente**: guardar (con la compra completa) o borrar una compra, con su dueño, su fecha, su estado y, si está bloqueada, su motivo.
- **Cola de subida**: la lista de operaciones del dispositivo, persistida, separada del slice `compras`.
- **Fila de la cuenta**: la compra tal como la guarda la tabla `compras`, a nombre del usuario de la sesión.
- **Repositorio remoto de compras**: la interfaz por la que la app guarda y borra compras en la cuenta; hay una versión en memoria y una sobre Supabase.
- **Promo propuesta**: la o las promos que el motor asocia a un comercio, un medio y una fecha, con su reintegro estimado y su base.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al borrar una compra, los topes y los totales de «Mis compras» se actualizan en menos de 1 segundo y sin conexión.
- **SC-002**: Una compra guardada sin conexión queda en la cuenta una sola vez, y lo borrado no reaparece, en el 100 % de los casos de esta tabla: reintento tras un envío que sí llegó; 3 reintentos seguidos; envío colgado y borrado en el medio; cierre de la app entre la escritura de la compra y la de la operación; cierre con operaciones `enviando`.
- **SC-003**: Guardar y borrar una compra antes de enviarla no produce ninguna llamada al servidor.
- **SC-004**: Ninguna compra sin confirmar ni de ejemplo llega a la cola ni al servidor.
- **SC-005**: Con el modo avión activado, el usuario puede guardar, ver y borrar compras y su recomendación y sus topes siguen siendo correctos.
- **SC-006**: Una compra que el usuario deja sin promo no cambia ningún tope.
- **SC-007**: La promo que muestra la hoja es la misma que queda guardada en el 100 % de los casos, incluso con un ticket de fecha anterior.
- **SC-008**: Una operación bloqueada o rechazada no retrasa el envío de las demás.

## Assumptions

- **Identificador**: se genera en el dispositivo con `expo-crypto` en producción y uno determinista en los tests. Las compras de ejemplo no se suben.
- **Sin conexión**: se detecta por el fallo del envío, con un plazo de 10 s, no por una consulta previa al estado de red.
- **Medios sin correspondencia** (billeteras como Mercado Pago, que no tienen banco ni red en `medios_de_pago`): se registran solo en el teléfono. Una migración que acepte billeteras queda fuera de esta spec.
- **Promo fuera del corpus del servidor**: la compra queda en el teléfono hasta que la promo exista en el corpus sincronizado; no se sube sin promo, porque eso cambiaría los topes de otro dispositivo.
- **Cuenta**: el dueño de una operación es el usuario de la sesión de Supabase (#40), no el email.
- **Orden**: solo importa entre operaciones de la misma compra.
- **«Te devolvieron»** cuenta como base todas las compras del mes (incluidas las sin promo): es el comportamiento vigente y no cambia acá.
- **Escritura de la compra y de la cola**: la cola se escribe antes que el slice; FR-013 lo cubre al reconciliar.
- **La implementación sobre Supabase se prueba contra un cliente falso y, para lo que asume del esquema, con pgTAP (FR-021)**; se conecta cuando #40, #41 y #42 estén en `main`.
- **Coordinación**: esta spec es dueña de la escritura (guardar, borrar, cola, subida); #42, de la lectura y sincronización. El contrato compartido es FR-018.
