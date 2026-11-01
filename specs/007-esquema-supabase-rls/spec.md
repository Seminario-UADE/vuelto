# Feature Specification: Esquema inicial de Supabase con RLS

**Feature Branch**: `claude/supabase-rls-schema-922617` (sobre `main`)

**Created**: 2026-11-01

**Status**: Draft

**Input**: Issue [#34](https://github.com/Seminario-UADE/vuelto/issues/34) — "Esquema inicial de Supabase con RLS (perfiles, medios de pago, promociones, compras, capturas)", más los requisitos de ADR-010 §4 (`docs/decisions/010-motor-en-la-app-y-redux.md`). Refleja el contrato de tipos de `packages/motor/src/tipos.ts` (issue #33).

**Decisión que resuelve (constitución §I)**: es un habilitador. Sin estas tablas la app no puede guardar el perfil ni las compras del usuario, y por lo tanto no puede decidir con qué medio de pago conviene pagar ni cuánto tope de reintegro queda. No muestra promociones por sí mismo: guarda el corpus que el motor evalúa contra una compra concreta.

**Frontera con otras issues**:

- **Contactos, invitaciones y grupo** (ADR-008): tablas y funciones propias en su issue. Esta spec no las crea.
- **Sincronización del corpus en la app** (ADR-010, plan paso 5): esta spec solo deja la base lista (`actualizada_en` en `promociones`); no toca la app. Bajar o cachear **compras** en el celular hoy está prohibido (`privacidad.md` §Qué se persiste: "El celular no descarga ni cachea el historial de compras"; constitución §II): esta spec no agrega nada para eso, y si ADR-010 se aprueba, enmendar `privacidad.md` es parte de esa issue, no de esta.
- **Ingesta** (issue #51 y siguientes): esta spec define dónde se escribe y quién puede escribir; no el script de ingesta.
- **Edge Function `recomendar`**: no se borra ni se modifica (ADR-010 §5).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Que mis datos no los vea nadie más (Priority: P1)

Una persona usa la app con su cuenta y guarda su perfil, sus medios de pago, sus comercios habituales y sus compras. Otra persona con otra cuenta hace lo mismo. Ninguna puede leer, modificar ni borrar los datos de la otra, ni siquiera conociendo sus identificadores.

**Why this priority**: Es la razón de ser de la issue (RNF-07) y el límite de privacidad de `docs/product/privacidad.md`. Sin aislamiento no se pueden guardar datos reales de usuarios de prueba.

**Independent Test**: Se prueba contra una base local con dos usuarios autenticados (A y B) y una compra de cada uno: A consulta las compras y solo ve la suya; A intenta leer, actualizar y borrar la de B y no afecta ninguna fila. No requiere la app.

**Acceptance Scenarios**:

1. **Given** las compras de A y de B, **When** A consulta todas las compras, **Then** recibe solo las suyas.
2. **Given** una compra de B, **When** A intenta actualizarla o borrarla, **Then** no se modifica ninguna fila.
3. **Given** A autenticado, **When** intenta insertar una compra, un medio de pago o un comercio habitual a nombre de B, **Then** la base lo rechaza.
4. **Given** una sesión sin autenticar (rol anónimo), **When** consulta o inserta en cualquier tabla del esquema, **Then** no ve ni escribe nada.
5. **Given** A autenticado, **When** inserta su propia compra, medio de pago o comercio habitual, **Then** se guarda y A puede leerla, actualizarla y borrarla.
6. **Given** A autenticado, **When** consulta `capturas_crudas`, **Then** la base le deniega el acceso (no ve ninguna fila, haya o no datos cargados).
7. **Given** una compra, **When** se inspecciona el esquema, **Then** no existe ninguna columna para la imagen del ticket; sí existe una para el texto extraído.

---

### User Story 2 - Leer el corpus de promociones, sin poder alterarlo (Priority: P1)

Cualquier usuario autenticado puede leer las promociones validadas y los catálogos de bancos y categorías, porque son datos públicos de MODO sin información personal. Ningún usuario autenticado puede crear, modificar ni borrar promociones, bancos ni categorías: eso lo hace solo la ingesta con la service role key.

**Why this priority**: Es el requisito de ADR-010 §4 y RNF-05. Un usuario que pudiera escribir en el corpus podría hacer que el motor recomiende cualquier cosa a los demás.

**Independent Test**: Con un usuario autenticado, se lee `promociones` y se ve el contenido sembrado por la service role; un `insert`, `update` y `delete` de ese mismo usuario sobre `promociones`, `bancos` y `categorias` fallan o no afectan filas.

**Acceptance Scenarios**:

1. **Given** promociones cargadas por la service role, **When** un usuario autenticado las consulta, **Then** las ve todas.
2. **Given** un usuario autenticado, **When** intenta insertar una fila en `promociones`, **Then** la base lo rechaza.
3. **Given** un usuario autenticado, **When** intenta actualizar o borrar una promoción, **Then** no se modifica ninguna fila.
4. **Given** un usuario autenticado, **When** intenta insertar, actualizar o borrar en `bancos` o `categorias`, **Then** no se modifica nada.
5. **Given** la service role, **When** inserta o actualiza promociones, bancos, categorías y capturas crudas, **Then** la operación se completa.
6. **Given** una sesión sin autenticar, **When** consulta `promociones`, **Then** no ve nada.

---

### User Story 3 - Sincronizar solo lo nuevo del corpus (Priority: P2)

La app necesita bajar solo las promociones que cambiaron desde la última sincronización. Cada promoción lleva la marca de cuándo se creó o modificó por última vez, y esa marca se actualiza sola en cada modificación, sin depender de quien escribe.

**Why this priority**: Es el requisito de ADR-010 §4 que la issue no menciona. Sin esto la sincronización incremental (plan paso 5) obligaría a una migración posterior. Es P2 porque la app todavía no consume la marca.

**Independent Test**: Se inserta una promoción, se anota su `actualizada_en`, se actualiza cualquier campo (incluso sin tocar `actualizada_en`, o intentando poner una fecha vieja) y se verifica que la marca avanzó.

**Acceptance Scenarios**:

1. **Given** una promoción recién insertada, **When** se la lee, **Then** `actualizada_en` está completa con la hora de la inserción.
2. **Given** una promoción existente, **When** la service role actualiza cualquier campo sin tocar `actualizada_en`, **Then** `actualizada_en` avanza.
3. **Given** una promoción existente, **When** una actualización intenta fijar `actualizada_en` en una fecha anterior o futura, **Then** igual queda con la hora de la modificación.
4. **Given** promociones con distinta `actualizada_en`, **When** se consultan las posteriores a una marca, **Then** se obtienen solo las modificadas después de ella.
5. **Given** una inserción que trae un valor propio de `actualizada_en` (pasado o futuro), **When** se la lee, **Then** tiene la hora de la inserción, no el valor enviado.
6. **Given** una promoción existente, **When** la ingesta la vuelve a escribir con exactamente los mismos valores (re-ingesta sin cambios), **Then** `actualizada_en` no cambia.

---

### User Story 4 - Reflejar fielmente el contrato del motor y la trazabilidad de la ingesta (Priority: P2)

El esquema guarda lo mismo que describe el contrato de tipos del motor: un dato ausente es `null` explícito donde el tipo lo admite y es obligatorio donde el tipo lo exige. Cada promoción publicada conserva el fragmento fuente de cada campo extraído y apunta a la captura cruda de la que salió.

**Why this priority**: Garantiza que la app y la ingesta puedan convertir filas en objetos del motor sin adaptadores ni valores inventados (constitución §III) y cumple RNF-08. Se prueba con los mismos datos que usan los tests de RLS, por eso es P2.

**Independent Test**: Se inserta con la service role una promoción completa (la forma de `Promocion`) y una con todos los campos opcionales en `null`; ambas se aceptan. Se intenta insertar una sin banco, sin categoría, sin porcentaje, sin vigencia o sin tarjetas y se rechaza.

**Acceptance Scenarios**:

1. **Given** una promoción con todos los campos que el tipo `Promocion` admite como `null` en `null` (comercio, tope, monto mínimo, jurisdicción, canal, acumulable, días), **When** se inserta, **Then** se acepta.
2. **Given** una promoción sin `banco_id`, `categoria_id`, `porcentaje`, `vigencia_desde`, `vigencia_hasta` o sin tarjetas, **When** se inserta, **Then** se rechaza.
3. **Given** una promoción con `banco_id` o `categoria_id` inexistente en los catálogos, **When** se inserta, **Then** se rechaza.
4. **Given** una promoción con porcentaje fuera de 0–100 (ambos extremos incluidos son válidos), con vigencia donde `hasta` es anterior a `desde` (`hasta = desde` es válido), con `dias` como lista vacía, con ambas listas de redes vacías, con una red o un día repetido dentro de su lista, con `tope_monto ≤ 0` o con `monto_minimo < 0`, **When** se inserta, **Then** se rechaza.
5. **Given** una promoción con una captura cruda de origen, **When** se la lee, **Then** se obtiene la referencia a esa captura y el fragmento fuente de cada campo extraído.
6. **Given** una compra con `origen` distinto de `ticket`, `excepcion` o `manual`, **When** se inserta, **Then** se rechaza.
7. **Given** un medio de pago con tipo distinto de `debito`/`credito` o con una red fuera de las 9 que usa MODO, **When** se inserta, **Then** se rechaza.
8. **Given** una compra sin promoción, sin categoría, sin descuento, sin reintegro esperado, sin fecha de acreditación o sin texto extraído, **When** se inserta, **Then** se acepta.
9. **Given** una compra con `monto ≤ 0`, con `descuento_obtenido` o `reintegro_esperado` negativos, o con `comercio` vacío o solo espacios, **When** se inserta, **Then** se rechaza. Ídem una promoción con `titulo` vacío.

---

### User Story 5 - Levantar el esquema limpio, desde cero (Priority: P1)

Cualquier integrante del equipo clona el repositorio, levanta Supabase en local y obtiene el esquema completo, con los catálogos de bancos y categorías sembrados, con un solo comando y sin pasos manuales. Las migraciones están versionadas.

**Why this priority**: Es criterio de aceptación de la issue y lo que permite que las issues bloqueadas (#35, #41, #42, #44, #48, #50) trabajen contra el mismo esquema.

**Independent Test**: Se ejecuta el reinicio de la base local dos veces seguidas sobre una copia limpia del repositorio y ambas terminan sin errores, con las mismas tablas y los mismos datos de catálogo; luego se corre la suite de pruebas de RLS.

**Acceptance Scenarios**:

1. **Given** un repositorio recién clonado, **When** se reinicia la base local, **Then** termina sin errores y existen todas las tablas con RLS activa.
2. **Given** la base ya levantada, **When** se reinicia otra vez, **Then** el resultado es idéntico (idempotente).
3. **Given** el esquema levantado, **When** se consulta `categorias`, **Then** contiene las 13 categorías de `CATEGORIAS_MODO` con su id numérico y nombre.
4. **Given** las migraciones del repositorio, **When** se revisa cada archivo que crea una tabla, **Then** el mismo archivo activa RLS sobre ella y define sus policies.

---

### Edge Cases

- Un usuario borra su cuenta: sus perfil, medios de pago, comercios habituales y compras se borran con ella; las promociones no se ven afectadas.
- Un medio de pago se borra mientras hay compras que lo referencian: **la base lo impide** (decisión adoptada, opción a). Borrar el medio dejaría compras sin medio (`Compra.medioDePagoId` no admite `null`) o haría desaparecer la base de los topes estimados (constitución §V). La pantalla de perfil (#35) debe explicar por qué no se puede. Borrar la cuenta (FR-016) DEBE seguir funcionando aunque el usuario tenga medios con compras: en ese caso se borran las compras y los medios juntos.
- Una captura cruda referenciada por una promoción se intenta borrar: **la base lo impide** (decisión adoptada, opción a), para conservar la trazabilidad de RNF-08. Una captura sin promociones sí se puede borrar. Las promociones de `fuente = 'manual'` no tienen captura.
- Una promoción deja de estar vigente en la fuente o se reemplaza: **no se borra, se da de baja** con una marca (`dada_de_baja_en`, FR-025; decisión adoptada). Así la compra conserva su `promocion_id` y su consumo sigue contando para el tope, y la baja avanza `actualizada_en` y llega a la app por la sincronización incremental. El borrado físico de promociones queda reservado a la service role y la base lo impide si hay compras que la referencian.
- Un usuario intenta crear una compra, o cambiar una propia, para que use un medio de pago de otro usuario: se rechaza (el medio de pago debe ser del mismo dueño). Una clave foránea simple no alcanza: la verificación de la FK no pasa por RLS.
- Un usuario intenta fijar `user_id` distinto del suyo al insertar o al actualizar (cambiar el dueño de una fila propia): se rechaza.
- Montos negativos o porcentajes fuera de rango: se rechazan. Los montos se guardan como decimal exacto (no punto flotante), en pesos.
- Dos usuarios cargan el mismo comercio habitual: no hay conflicto; la unicidad es por usuario. Para la unicidad (FR-021) "Coto", "coto" y " Coto " son el mismo comercio: se compara sin mayúsculas y sin espacios al inicio, al final ni repetidos (decisión adoptada; los acentos no se normalizan).
- El rol anónimo de Supabase nunca accede a ninguna tabla, incluidos los catálogos.
- Un usuario autenticado nuevo todavía no tiene fila de perfil: la app lo crea al primer uso; el esquema no obliga a que exista para operar. Por eso el dueño de `medios_de_pago`, `comercios_habituales` y `compras` referencia la cuenta de autenticación, no la fila de `perfiles`.
- Un usuario intenta insertar una segunda fila de perfil: se rechaza (uno por usuario).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El esquema DEBE tener las tablas `perfiles`, `bancos`, `categorias`, `medios_de_pago`, `comercios_habituales`, `capturas_crudas`, `promociones` y `compras`, versionadas como migraciones del proyecto de Supabase en `supabase/migrations/`.
- **FR-002**: Cada migración que crea una tabla DEBE activar RLS sobre ella y definir sus policies **en el mismo archivo** (RNF-07, constitución §IV). Una tabla que a propósito no tiene ninguna policy (`capturas_crudas`: RLS activa sin policies = nadie salvo la service role) DEBE decirlo con un comentario en ese archivo, para distinguirla de un olvido.
- **FR-003**: `perfiles`, `medios_de_pago`, `comercios_habituales` y `compras` DEBEN ser legibles y escribibles únicamente por su dueño autenticado; el dueño no puede crear filas a nombre de otro ni cambiar el dueño de una fila existente.
- **FR-004**: `bancos`, `categorias` y `promociones` DEBEN ser legibles por cualquier usuario autenticado y escribibles únicamente por la service role. Ningún rol de la app (anónimo o autenticado) puede insertar, actualizar ni borrar en ellas.
- **FR-005**: `capturas_crudas` NO DEBE ser legible ni escribible por ningún rol de la app; solo la service role.
- **FR-006**: El rol anónimo NO DEBE poder leer ni escribir ninguna tabla del esquema.
- **FR-007**: `promociones` DEBE tener una columna `actualizada_en` (fecha y hora con zona) que una regla de la base fija a la hora de la operación al insertar y en cada actualización que cambie algún valor de la fila, ignorando cualquier valor que se intente escribir. Una actualización que deja todos los valores iguales no la mueve (si no, cada corrida de la ingesta haría que la app vuelva a bajar el corpus entero). Esa marca DEBE poder usarse en consultas incrementales de forma eficiente (índice).
- **FR-008**: `promociones` DEBE reflejar el tipo `Promocion` de `packages/motor/src/tipos.ts`: obligatorios (`not null`) `fuente`, `titulo`, `banco_id`, `categoria_id`, `porcentaje`, `vigencia_desde`, `vigencia_hasta` y las redes aceptadas de débito y crédito (con al menos una red en alguno de los dos); nullables `comercio`, `dias`, los cuatro campos del tope (`monto`, `periodo`, `alcance`, `grupoTopeId`), `monto_minimo`, `jurisdiccion`, `canal` y `acumulable`. Los valores cerrados (`fuente`, `jurisdiccion`, `canal`, `periodo`/`alcance` del tope, días, redes) DEBEN estar restringidos a los valores del tipo. Rangos: `0 ≤ porcentaje ≤ 100`; `vigencia_desde ≤ vigencia_hasta`, ambas fechas calendario (sin hora); `tope_monto > 0` si no es `null`; `monto_minimo ≥ 0` si no es `null`; `dias` es `null` o una lista no vacía sin repetidos; cada lista de redes sin repetidos; `titulo` no vacío.
- **FR-009**: `promociones` DEBE guardar, por cada campo extraído, su fragmento fuente (jsonb) y la referencia a su `capturas_crudas` de origen (RNF-08, constitución §III). La referencia es nullable para promociones de `fuente = 'manual'`.
- **FR-010**: `promociones.banco_id` y `compras`/`promociones.categoria_id` DEBEN referenciar los catálogos `bancos` y `categorias`. `bancos.id` es el UUID string del catálogo de MODO; `categorias.id` es el id numérico de MODO. `categorias` se siembra con las 13 categorías de `CATEGORIAS_MODO`.
- **FR-011**: `medios_de_pago` DEBE guardar el banco (referencia a `bancos`), el tipo (`debito` o `credito`) y la red (los 9 valores del tipo `Red`) y pertenecer a un usuario.
- **FR-012**: `compras` DEBE reflejar el tipo `Compra`: obligatorios fecha, monto, comercio, medio de pago y `origen`; nullables `categoria_id`, `promocion_id`, `descuento_obtenido`, `reintegro_esperado`, `fecha_acreditacion_estimada` y `texto_extraido`. `origen` DEBE estar restringido a `ticket`, `excepcion` o `manual`. Rangos: `monto > 0`; `descuento_obtenido ≥ 0` y `reintegro_esperado ≥ 0` si no son `null`; `comercio` no vacío; `fecha` y `fecha_acreditacion_estimada` son fechas calendario (sin hora). Todos los montos de todas las tablas son decimales exactos en pesos, nunca punto flotante.
- **FR-013**: NINGUNA tabla DEBE tener una columna para la imagen de un ticket (RNF-06); `compras.texto_extraido` sí existe.
- **FR-014**: Una compra DEBE referenciar un medio de pago del mismo usuario, al insertarla y al actualizarla; no puede referenciar el de otro. La garantía la da la base (no la app) y no puede depender solo de una clave foránea simple, porque la verificación de una FK no aplica RLS.
- **FR-015**: `perfiles` DEBE guardar el nombre para mostrar como nullable (`Perfil.nombreParaMostrar`) y estar atado a la cuenta de autenticación: como máximo una fila por cuenta, y se borra con ella. Las filas de `medios_de_pago`, `comercios_habituales` y `compras` referencian directamente la cuenta de autenticación, no `perfiles` (un usuario sin perfil puede operar).
- **FR-016**: Borrar la cuenta de un usuario DEBE borrar sus filas de `perfiles`, `medios_de_pago`, `comercios_habituales` y `compras`, también cuando tiene compras que referencian sus medios de pago, sin afectar filas de otros usuarios ni de `promociones`.
- **FR-017**: Reiniciar la base local desde cero DEBE terminar sin errores y de forma repetible, con los catálogos sembrados.
- **FR-018**: DEBE existir una suite de pruebas de RLS automatizada y ejecutable contra la base local que verifique como mínimo: (a) A no lee las compras de B; (b) A no puede modificar ni borrar las de B ni insertar a nombre de B; (c) un usuario autenticado no puede insertar en `promociones`; (d) un usuario autenticado lee `promociones`; (e) `capturas_crudas` deniega el acceso a autenticados y anónimos; (f) el anónimo no accede a nada; (g) `actualizada_en` avanza en cada actualización que cambia valores, ignora el valor enviado y no se mueve en una re-escritura idéntica; (h) A no puede cambiar el `user_id` de una fila propia a B en ninguna de las 4 tablas de dueño; (i) A no puede insertar ni actualizar una compra para que use un medio de pago de B; (j) borrar la cuenta de A (con compras que referencian sus medios) borra sus filas y no toca las de B; (k) un usuario autenticado no puede escribir en `bancos` ni `categorias` ni actualizar o borrar `promociones`. La suite DEBE correr en el CI sin depender de datos preexistentes.
- **FR-019**: Los valores sensibles (service role key, claves) NO DEBEN aparecer en el repositorio; las pruebas usan las credenciales locales efímeras de Supabase CLI o roles de Postgres simulados.
- **FR-020**: La Edge Function `recomendar` y su código DEBEN quedar intactos.
- **FR-021**: Las claves de unicidad DEBEN evitar duplicados evidentes por usuario: el mismo comercio habitual no se repite para un usuario, y el mismo medio de pago (banco, tipo, red) no se repite para un usuario.
- **FR-022**: Toda clave foránea y toda columna usada por una policy DEBEN tener índice, para que las policies y las consultas del dueño no recorran toda la tabla.
- **FR-023**: El esquema NO DEBE abrir caminos que salteen RLS: (a) ninguna vista sobre estas tablas que corra con los permisos de su dueño (toda vista, si la hay, ejecuta con los permisos de quien consulta); (b) ninguna función `security definer` ejecutable por `anon` o `authenticated`; las funciones auxiliares (p. ej. la que mantiene `actualizada_en`) corren con los permisos de quien escribe y con `search_path` fijo. Las funciones `security definer` de contactos (ADR-008) llegan en su propia issue.
- **FR-024**: `capturas_crudas` DEBE guardar el contenido crudo de la captura (no nulo), de dónde se capturó (no nulo), cuándo (no nulo) y, nullable, la salida completa del extractor (jsonb). El fragmento fuente de cada campo vive en la promoción (FR-009) como un objeto jsonb cuyas claves son los nombres de campo y cuyos valores son texto o `null`; el esquema exacto lo fija el extractor de la issue #51 y esta tabla no valida más que la forma de objeto.
- **FR-025**: `promociones` DEBE tener `dada_de_baja_en` (nullable) y una clave natural estable de la fuente (`fuente_id`, texto, no nulo para `fuente = 'modo'`) con unicidad por (`fuente`, `fuente_id`), para que la ingesta actualice una promoción existente en vez de duplicarla. Dar de baja actualiza `actualizada_en`. Una promoción con compras que la referencian no se puede borrar.

### Key Entities

- **Perfil**: datos propios de un usuario además de su cuenta; hoy, el nombre para mostrar (nullable). Uno por usuario.
- **Banco** y **Categoría**: catálogos públicos sembrados desde MODO; la categoría tiene id numérico y nombre, el banco un id UUID y un nombre.
- **Medio de pago**: una tarjeta que declara el usuario (banco, tipo, red).
- **Comercio habitual**: nombre de un comercio donde el usuario compra con frecuencia.
- **Captura cruda**: contenido crudo de una captura de ingesta; solo la service role lo toca. Es la materia prima y la evidencia de cada promoción.
- **Promoción**: elemento del corpus público, con el tipo `Promocion` del motor, el fragmento fuente de cada campo, la referencia a su captura y la marca `actualizada_en`.
- **Compra**: registro del usuario con su origen y el texto extraído; base de los topes estimados. Retención de 90 días declarada en `privacidad.md` (el borrado automático sigue fuera de alcance).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En la suite de pruebas, el usuario A obtiene 0 filas de B en las 4 tablas de dueño (`perfiles`, `medios_de_pago`, `comercios_habituales`, `compras`) en lectura, y 0 filas afectadas en actualización y borrado.
- **SC-002**: Un usuario autenticado tiene 0 operaciones de escritura exitosas sobre `promociones`, `bancos` y `categorias`, y 0 filas visibles de `capturas_crudas`.
- **SC-003**: El 100% de los archivos de migración que crean una tabla activan RLS y definen sus policies en el mismo archivo. Se verifica con una prueba automática de la suite: toda tabla del esquema `public` tiene RLS activa, y toda tabla salvo `capturas_crudas` tiene al menos una policy.
- **SC-004**: Reiniciar la base local desde cero termina con éxito el 100% de las veces, dos veces seguidas, y la suite de RLS pasa completa.
- **SC-005**: Toda la lista de campos del tipo `Promocion` y del tipo `Compra` tiene su columna equivalente, y ninguna columna del esquema admite la imagen de un ticket.
- **SC-006**: Con escrituras sucesivas (no concurrentes), una promoción modificada después de una marca siempre aparece en la consulta de «modificadas después de la marca»; una no modificada, o re-escrita con los mismos valores, nunca. Las escrituras concurrentes (una transacción larga puede quedar con hora anterior a una marca ya leída) se resuelven en la issue de sincronización (ADR-010 paso 5), por ejemplo releyendo con un margen; esta spec solo garantiza el caso secuencial.

## Assumptions

- La sesión del usuario es la de Supabase Auth; el dueño de una fila es el usuario autenticado (`auth.uid()`).
- Los nombres de tabla son en plural, como en la issue (`promociones`, `compras`), no en singular como en el texto de ADR-010. Es una decisión del dueño de la issue; el ADR usa los nombres de forma ilustrativa. `privacidad.md` (§Datos compartidos: "las policies de `perfil`, `compra` e `invitacion`") y `01-data-models.md` (`contacto`, `invitacion`) también usan singular: la issue de contactos debe seguir la convención en plural de esta spec o justificar la excepción.
- El ADR-010 está propuesto (pendiente de aprobación del Product Owner), pero su §4 solo agrega a `promociones` la marca `actualizada_en` y la regla de lectura/escritura; es compatible con cualquier resultado de la decisión de dónde corre el motor y no hay que esperarlo.
- Las tablas `contacto` e `invitacion` y las funciones de grupo (ADR-008) llegan en su propia issue; el campo `nombreParaMostrar` se incluye acá porque es parte de `Perfil` del contrato.
- El campo `grupoTopeId` del tipo `Tope` se guarda como texto nullable; no hay tabla de grupos de tope en este alcance.
- El borrado automático a 90 días de las compras sigue fuera de alcance (`privacidad.md`); esta spec no implementa ningún job de limpieza.
- Las promociones de `fuente = 'modo'` apuntan a su captura cruda; las `manual` pueden no tener captura.
- Las pruebas de RLS corren con la CLI de Supabase local sobre Docker; el CI de este repo hoy no levanta Supabase, y sumarlo a un job es parte del plan. FR-018 exige que corran en el CI: si el plan concluye que el costo del job no lo justifica, tiene que enmendar FR-018 y SC-004 explícitamente, no resolverlo con un paso manual.
- Los datos de seed de `bancos` se cargan con unos pocos bancos del catálogo de MODO **con su `id` real de MODO** (no UUIDs inventados: los medios de pago que se carguen contra un id de ejemplo quedarían huérfanos cuando la ingesta siembre el catálogo real); el catálogo completo lo siembra la ingesta con la service role. Mientras tanto, un usuario cuyo banco no esté sembrado no puede declarar ese medio de pago (la FK lo rechaza).
