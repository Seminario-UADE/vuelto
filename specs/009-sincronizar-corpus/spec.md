# Feature Specification: App — sincronizar el corpus y las compras del período

**Feature Branch**: `claude/magical-knuth-39fc08`

**Created**: 2026-11-02 · **Revisada**: 2026-11-02 (hallazgos de `spec-critic` en [`critica.md`](critica.md): B1–B4, I1–I9, M1–M8)

**Status**: Draft

**Input**: Issue [#42](https://github.com/Seminario-UADE/vuelto/issues/42) (reabierta el 01/11/2026) — "Sincronizar el corpus de promociones al celular para recomendar sin señal". Paso 5 del plan de [ADR-010](../../docs/decisions/010-motor-en-la-app-y-redux.md), con la constitución 3.0.0 (Principio II). Se apoya en el store de la [spec 008](../008-motor-app-redux/spec.md) y en el esquema de la [spec 007](../007-esquema-supabase-rls/spec.md).

**Decisión que resuelve (constitución §I)**: con qué medio de pago conviene pagar una compra concreta, **con las promos y las compras de verdad**, y que esa respuesta siga ahí cuando el usuario está en la caja del súper sin señal. Es un habilitador: no agrega una pantalla de promos, cambia de dónde salen los datos que ya usa la recomendación.

**Frontera con otras issues**:

- **Esta spec es dueña de la lectura**: bajar el corpus y las compras del período a los slices `corpus` y `compras`, y guardar el corpus en el dispositivo.
- **#44 (registrar una compra)** es dueña de la escritura: la compra nueva, la cola sin red y la subida. Esta spec no sube nada. El contrato que comparten está en [`data-model.md`](data-model.md) §Contrato con #44.
- **#35 (corpus sembrado)**: sin ella la base no tiene promos. Esta spec no siembra ni mide con datos inventados.
- **#40 (login)**: la lectura exige una sesión de Supabase. Sin sesión no se sincroniza.
- **#41 (perfil con medios en la base)**: hasta entonces el `medioDePagoId` de una compra de la base (UUID) no se traduce al medio de la app y los `bancoId` del perfil de ejemplo son slugs, no los UUID de MODO.
- **#43 / #45**: consumen el store; no se tocan.

**Qué se puede verificar y qué no hasta que lleguen #40, #35 y #41**:

| Verificación | Sin esas issues | Necesita |
|---|---|---|
| Toda la lógica (paginación, marca, mezcla, bajas, ventana, mapeo, reloj, persistencia, leyenda) | Sí: tests con el repositorio en memoria | — |
| Lectura real de `promociones` y `compras` con `supabase-js` | Sí, contra un Supabase local con filas sembradas por el propio test (no es el corpus de la demo) | Docker |
| Sincronizar en el teléfono con un usuario real | No | #40 |
| Que haya promos para sincronizar | No | #35 |
| Que la recomendación sincronizada matchee con el perfil | No | #41 |
| Medición del tamaño del corpus real | No: queda una proyección rotulada | #35 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Al abrir la app con señal, los datos se ponen al día solos (Priority: P1)

Martín abre Vuelto con señal. Sin tocar nada, la app baja las promos nuevas o modificadas desde la última vez y las compras de su período, y la recomendación y los topes se calculan con eso.

**Why this priority**: sin esto el motor en la app calcula sobre datos de ejemplo para siempre. Cierra ADR-010.

**Independent Test**: con un repositorio en memoria y un corpus ya sincronizado con marca `M`, que tiene 3 promos nuevas, 1 modificada y 1 dada de baja posteriores a `M`, disparar la sincronización: el corpus queda con lo esperado y la marca avanza. Una segunda sincronización sin cambios no cambia el corpus.

**Acceptance Scenarios**:

1. **Given** un corpus sincronizado con marca `M`, **When** se sincroniza, **Then** se piden las promos con `actualizada_en` posterior a `M` menos el margen de relectura (FR-007) y se mezclan en el corpus por `id`.
2. **Given** que nunca se sincronizó (`marca = null`), **When** llega la primera sincronización con promos, **Then** el corpus de ejemplo **se reemplaza entero** por lo recibido (no se mezcla).
3. **Given** que la primera sincronización devuelve **cero promos**, **When** termina, **Then** el corpus de ejemplo, la marca (`null`) y el reloj no cambian y no se muestra la leyenda (FR-013).
4. **Given** más promos que el tope de una respuesta (1000 filas), **When** se sincroniza, **Then** se leen todas las páginas con el cursor `(actualizada_en, id)` y el store se actualiza una sola vez.
5. **Given** dos filas con el mismo `actualizada_en` justo en el borde de una página, **When** se sincroniza, **Then** ninguna se pierde ni se aplica dos veces.
6. **Given** una fila escrita antes de la marca pero confirmada después de la sincronización anterior (transacción larga), **When** se sincroniza de nuevo, **Then** llega, porque el margen de relectura la cubre.
7. **Given** que una página falla, o que fallan las compras, **When** termina, **Then** el corpus, las compras y la marca quedan como estaban: la unidad atómica es el corpus **junto con** las compras (FR-005).
8. **Given** una sincronización en vuelo, **When** llega otro disparo, **Then** se ignora.
9. **Given** el corpus del servidor re-sembrado (los mismos promos con `id` nuevos), **When** se sincroniza, **Then** el teléfono no queda con duplicados: saca los `id` que el servidor ya no tiene (FR-009).

---

### User Story 2 - Sin señal, la recomendación sigue funcionando (Priority: P1)

Martín está en la caja del súper, en modo avión. Elige el comercio y la app le recomienda con lo último que guardó, igual que con señal.

**Why this priority**: es la razón de ser de RNF-02 y de ADR-010.

**Independent Test**: con un store ya sincronizado y guardado, reabrir la app sin red (repositorio que falla): el corpus, las compras y el reloj real se rehidratan, y la recomendación es idéntica a la de antes de cerrar.

**Acceptance Scenarios**:

1. **Given** datos sincronizados antes, **When** la app se abre sin red, **Then** la recomendación sale del corpus guardado, con el reloj real, y no se muestra error.
2. **Given** sin red, **When** falla la sincronización, **Then** el store queda intacto y no se reintenta en bucle (se intenta de nuevo en el próximo arranque o al volver a primer plano, FR-002).
3. **Given** que nunca se sincronizó, **When** se abre la app, **Then** sigue con el estado de ejemplo y el reloj de ejemplo, sin error.
4. **Given** sin sesión de Supabase o sin variables de entorno, **When** se abre la app, **Then** no se intenta sincronizar y no hay error.
5. **Given** un arranque en frío sin señal de un usuario ya sincronizado, **When** el store se rehidrata, **Then** el reloj pasa al real en cuanto se lee la marca guardada (no queda en el 14/10).

---

### User Story 3 - Se sabe qué tan frescas son las promos (Priority: P2)

Martín mira de reojo la pantalla de Inicio y ve, discreto, "Promos actualizadas hace 2 horas".

**Why this priority**: una recomendación sin señal puede estar basada en datos viejos; el usuario tiene que poder verlo (constitución §V: nada falsamente preciso).

**Independent Test**: una función pura, dado `ahora` y la fecha de la última sincronización exitosa, devuelve el texto según la tabla de cortes de FR-016; con corpus de ejemplo no devuelve nada.

**Acceptance Scenarios**:

1. **Given** una sincronización hace 10 minutos, **Then** dice "Promos actualizadas hace unos minutos".
2. **Given** hace 1 hora y 20 minutos, **Then** dice "hace 1 hora"; hace 5 horas, "hace 5 horas".
3. **Given** hace 26 horas, **Then** dice "hace 1 día"; hace 3 días, "hace 3 días".
4. **Given** una diferencia negativa (el teléfono cambió la hora), **Then** se trata como 0 y dice "hace unos minutos".
5. **Given** el corpus de ejemplo sin sincronizar, **Then** no se muestra la leyenda.
6. **Given** una sincronización fallida con datos guardados, **Then** la leyenda sigue mostrando la hora de la última exitosa.

---

### User Story 4 - Una promo que ya no sirve no se recomienda, y su consumo sigue contando (Priority: P1)

Un tope compartido tiene dos promos. Una se da de baja a mitad de mes. Martín ya había gastado $6.000 de $10.000 con ella. La app deja de recomendar esa promo, pero el restante del tope sigue siendo $4.000, no $10.000.

**Why this priority**: sacar la promo del corpus haría que el motor ignore sus compras y mostraría un restante optimista, que viola el Principio V. Por eso la 007 eligió dar de baja en vez de borrar.

**Independent Test**: con un grupo de tope compartido P1 (dada de baja) y P2 vigente, y compras del mes de P1, el restante calculado por el motor con el corpus sincronizado es el mismo que antes de la baja, y P1 no se recomienda.

**Acceptance Scenarios**:

1. **Given** una promo con `dada_de_baja_en` en el corpus, **When** llega la sincronización, **Then** queda en el corpus con `vigencia.hasta` = día anterior a la baja (en Argentina), no se recomienda (causa `vigencia`) y sus compras siguen descontando del tope compartido.
2. **Given** una promo cuya vigencia terminó antes del inicio del período en curso, **When** termina una sincronización, **Then** ya no está en el store (nadie puede tener compras del período con ella).
3. **Given** una promo vencida (del mismo rubro que el comercio) en un corpus viejo, **When** se pide la recomendación, **Then** aparece entre las descartadas con causa `vigencia` y no se recomienda; el filtro es del motor, no se reimplementa.
4. **Given** que a una promo del corpus la fuente le acorta la vigencia a ayer, **When** llega, **Then** deja de recomendarse (la consulta incremental no filtra por vigencia).
5. **Given** una fila inválida que es una actualización de una promo del corpus, **When** llega, **Then** la versión anterior de esa promo **sale** del corpus y la descartada se cuenta; si la fila inválida trae `dada_de_baja_en`, la baja se aplica igual (FR-010).

---

### User Story 5 - Compras y cuentas se mantienen separadas (Priority: P1)

Las compras que Martín guardó en el teléfono y todavía no subió no desaparecen al sincronizar, y las compras de una cuenta nunca llegan a otra.

**Why this priority**: perder una compra local falsea los topes; mezclar cuentas viola la privacidad (§IV).

**Independent Test**: con una compra agregada localmente (en `pendientes`) y una sincronización en vuelo, la compra sigue en `compras.lista` después de aplicar el resultado. Cambiar de cuenta deja `compras` y `pendientes` en el estado inicial antes de sincronizar.

**Acceptance Scenarios**:

1. **Given** una compra local en `pendientes` y el servidor sin ella, **When** se sincroniza, **Then** `compras.lista` = compras del servidor ∪ esa compra, sin duplicados.
2. **Given** una compra local que el servidor ya devuelve con el mismo `id`, **When** se sincroniza, **Then** queda la versión del servidor y sale de `pendientes`.
3. **Given** que el usuario guarda una compra mientras una sincronización está en vuelo, **When** se aplica el resultado, **Then** la compra nueva no se pierde (el merge se hace sobre el estado de ese momento).
4. **Given** que se cierra la sesión mientras una sincronización está en vuelo, **When** llega el resultado, **Then** se descarta y no se persiste nada del usuario anterior.
5. **Given** que la cuenta cambió (dueño distinto del slice `compras`), **When** se sincroniza, **Then** `compras` y `pendientes` vuelven al estado inicial antes de aplicar, y las pendientes de la cuenta anterior no se suben con la nueva.
6. **Given** una compra pendiente de ayer (de fuera del período) , **When** se persiste, **Then** se guarda igual, sin filtrar por período, hasta que se suba.

---

### User Story 6 - El equipo sabe dónde guardar el corpus (Priority: P3)

Antes de fijar el tamaño del corpus en el dispositivo, el equipo tiene el instrumento para medirlo y una decisión escrita.

**Why this priority**: es una decisión de arquitectura y depende de #35. Se deja el instrumento y una proyección rotulada, sin inventar una medición.

**Independent Test**: el script, contra un repositorio en memoria, reporta cantidad, bytes totales, promedio y máximo por promo y la fracción de 6 MB y 2 MB. La decisión está en `docs/product/pendientes.md` y `docs/architecture/03-frontend.md`.

**Acceptance Scenarios**:

1. **Given** un corpus de N promos, **When** corre el script, **Then** informa N, bytes totales, promedio, máximo y qué fracción del tope es.
2. **Given** que no hay corpus real, **Then** la documentación dice "medición pendiente de #35" y muestra una **proyección** rotulada, calculada con promos de ejemplo.
3. **Given** que el corpus no se puede escribir (almacenamiento lleno), **When** falla la escritura, **Then** el perfil, la cuenta y las compras pendientes siguen persistidos (claves separadas) y la marca guardada no avanza.

---

### Edge Cases

- **Datos de ejemplo**: las promos de ejemplo son vigentes hasta el 31/12/2026; lo que es de octubre son las **compras** de ejemplo y el reloj fijo. Por eso, la primera sincronización reemplaza y no mezcla.
- **Guardado anterior (`vuelto.store.v1`)**: puede traer el corpus de ejemplo adentro. Se ignora ese corpus: desde esta spec el corpus vive en su propia clave. Un guardado viejo se lee como "nunca sincronizado". No se sube la versión del guardado (subirla borraría el perfil de todos).
- **Corpus guardado corrupto de un usuario ya sincronizado**: queda con el corpus vacío y la marca en `null` (se vuelve a descargar todo), no con el de ejemplo.
- **Marca**: la fija el servidor, como el texto exacto que devuelve PostgREST, sin pasar por `Date` (pierde microsegundos).
- **Reloj**: los parámetros de la sincronización (hoy, ventana, poda) salen del reloj real en la capa imperativa, nunca de `sesion.ahora`. El reloj de los selectores sale del real si la marca guardada no es `null`; si no, del de ejemplo.
- **Compra de la base con un medio desconocido** (hasta #41): `compraVista` la omite de la lista de «Mis compras» pero «Gastaste» la suma: los totales no coinciden con la lista hasta #41. Queda aceptado y documentado; no se cambia esa pantalla en esta spec.
- **Borrado físico de una promo** en el servidor: no mueve ninguna marca; lo cubre la reconciliación de ids (FR-009).
- **Fin de mes / lunes que cruza de mes**: la ventana de compras es el período en curso (el más temprano entre el inicio del mes y el de la semana); al cambiar, las compras que quedan fuera salen del store (salvo las pendientes).
- **Almacenamiento lleno o no disponible**: la app funciona en memoria; la escritura del corpus falla sin llevarse el resto.
- **Cierre de sesión**: el corpus es público y no se borra; `compras`, `pendientes` y el dueño vuelven al estado inicial (`sesionCerrada` ya lo hace para compras).

## Requirements *(mandatory)*

### Functional Requirements

**Disparo**

- **FR-001**: La app MUST sincronizar al abrirse (después de rehidratar el store) y al volver a primer plano, solo si hay cliente de Supabase y sesión. "Sin red" significa que el pedido falla o vence; no se agrega detección previa de red.
- **FR-002**: La espera de 5 minutos entre sincronizaciones al volver a primer plano MUST medirse con el reloj del sistema, desde el inicio del último intento; la de apertura no tiene espera. MUST haber una sola sincronización en vuelo; un disparo durante otra se ignora. Cada pedido MUST tener un timeout de 15 segundos y vencido cuenta como falla.
- **FR-003**: Sin sesión, sin cliente o sin red, la app MUST NOT mostrar error ni tocar el store.

**Corpus**

- **FR-004**: Con la marca en `null`, la sincronización MUST pedir las promos con `vigencia_hasta` mayor o igual que el inicio del período en curso (incluidas las dadas de baja) y, si recibe al menos una, MUST **reemplazar** el corpus. Con la marca no nula, MUST pedir lo posterior a la marca menos el margen (FR-007), **sin filtrar por vigencia**, y mezclar por `id`. Ambas consultas excluyen `jurisdiccion = 'otra_provincia'` (ADR-010 §4).
- **FR-005**: La unidad atómica es el corpus junto con las compras: si falla cualquier página o el pedido de compras, el store, la marca y el reloj MUST quedar como estaban. El resultado se aplica con una sola acción.
- **FR-006**: La paginación MUST ser por cursor `(actualizada_en, id)` con `order=actualizada_en.asc,id.asc`, tamaño de página 500 (menor que `max_rows`) y fin cuando una página trae menos filas que ese tamaño. La marca y el cursor se guardan como el texto exacto de PostgREST. Lo mismo vale para las compras.
- **FR-007**: La consulta incremental MUST pedir `actualizada_en > marca − 10 minutos`. El margen cubre transacciones de escritura largas (el trigger usa `clock_timestamp()` y la fila queda con la hora de la escritura, no la del commit). Releer es idempotente. La ingesta y la siembra (#35) MUST confirmar cada lote en menos de 5 minutos; ese es el contrato con ellas (se documenta en `docs/architecture/04-infrastructure.md`).
- **FR-008**: La marca nueva MUST ser la mayor `actualizada_en` recibida, incluidas las filas descartadas por inválidas.
- **FR-009**: Cada sincronización MUST pedir también los `id` de las promos del período (mismo filtro que FR-004) y sacar del corpus los `id` que el servidor ya no tiene (borrado físico o re-siembra).
- **FR-010**: Una fila con `dada_de_baja_en` no nulo MUST mapearse a una promo con `vigencia.hasta` = el día anterior a la baja en Argentina (o la `vigencia_hasta` original si es anterior). La promo no sale del corpus; el motor la descarta por vigencia y sus compras siguen contando en el tope compartido. La baja se procesa por `id` **antes** de validar el resto de la fila. Una actualización inválida MUST sacar del corpus la versión anterior de ese `id`, y las descartadas MUST contarse en `corpus.descartadas` (visible en el log de desarrollo y en los tests).
- **FR-011**: En cada sincronización MUST podarse del corpus toda promo con `vigencia.hasta` anterior al inicio del período en curso.
- **FR-012**: Las filas de `promociones` MUST mapearse a `Promocion` del motor en una función pura, sin inventar datos: lo ausente es `null`, los arreglos de redes se vuelven `TarjetasAceptadas`. Una fila que no cumple el contrato del motor (por ejemplo, una red o jurisdicción que esta versión de la app no conoce) se descarta según FR-010.

**Primera vez y corpus vacío**

- **FR-013**: Una sincronización completa que devuelve **cero promos** MUST NOT reemplazar el corpus de ejemplo, MUST NOT mover la marca ni el reloj, y MUST NOT mostrar la leyenda.

**Compras**

- **FR-014**: La ventana de compras MUST ser `[inicioDelPeriodo, hoy]` (el más temprano entre el inicio del mes y el de la semana, la misma función que `comprasDelPeriodo`), con `hoy` la fecha de Argentina del reloj real. La resta de días MUST ser de calendario. Al sincronizar, `compras.lista` MUST podarse a esa ventana, salvo las pendientes. Este requisito reemplaza la ventana "los últimos N días del mes" del texto original de la issue: cubre lo mismo que la privacidad declara y no guarda un mes de más. La función `diasDelMes` se conserva solo si el plan encuentra un uso real.
- **FR-015**: `compras.lista` MUST resultar de `servidor ∪ (pendientes que el servidor no devolvió)`, calculado en el reducer al aplicar, sobre el estado de ese momento. `pendientes` y las compras pendientes MUST persistirse sin filtrar por período. El slice `compras` MUST guardar el `duenoId`; si la cuenta de la sesión cambió, `compras` y `pendientes` vuelven al estado inicial antes de aplicar. Un resultado que llega después de cerrar sesión o de cambiar de cuenta MUST descartarse. El contrato con #44 está en `data-model.md`.

**Reloj**

- **FR-016**: Los parámetros de la sincronización (hoy, ventana, poda, espera) MUST calcularse con el reloj real, nunca con `sesion.ahora`. El reloj de los selectores MUST ser el real si el `corpus.marca` guardado no es `null` (leído después de `rehidratado`), y el de ejemplo si es `null`. Pasa a real en el mismo tick en que se aplica la primera sincronización exitosa.

**Estado y persistencia**

- **FR-017**: El corpus MUST persistirse en una **clave propia** (`vuelto.corpus.v1`) con su marca y su fecha de sincronización dentro del mismo valor, de modo que si la escritura falla la marca guardada no avanza. `vuelto.store.v1` conserva `perfil`, `compras` (con `pendientes` y `duenoId`) y `cuenta`; sigue en `version: 1` y MUST ignorar un `corpus` viejo. El validador MUST completar `marca: null`, `sincronizadoEn: null`, `pendientes: []` y `duenoId: null` cuando faltan y MUST validar sus tipos.
- **FR-018**: El acceso a Supabase MUST estar detrás de una interfaz inyectada (`Extra`), con una implementación en memoria para los tests. La implementación real usa `supabase-js` con la sesión del usuario: nunca la service role key. Nada derivado se guarda.

**Interfaz**

- **FR-019**: La app MUST mostrar "Promos actualizadas hace X" en la pantalla de Inicio, discreta y bajo el contenido principal, solo cuando la marca no es `null`. X sale de una función pura con estos cortes (redondeo hacia abajo, diferencia negativa = 0): menos de 60 minutos → "unos minutos"; de 1 a 23 horas → "N hora(s)"; 24 horas o más → "N día(s)". La fecha de la sincronización es la del reloj del sistema al terminar.

**Medición**

- **FR-020**: MUST existir un script de medición del corpus que use la anon key con la sesión de un usuario de prueba (nunca la service role) y reporte cantidad, bytes totales, promedio y máximo por promo y la fracción de 6 MB y de 2 MB. La decisión de dónde persistir MUST quedar documentada en `docs/product/pendientes.md` y `docs/architecture/03-frontend.md`: la medición real si hay #35, o una proyección rotulada.

**Privacidad**

- **FR-021**: Al dispositivo MUST llegar solo el corpus (público) y las compras **del propio usuario** del período en curso, leídas con su sesión y el RLS. No se persiste el historial de los 90 días (`docs/product/privacidad.md`).

### Key Entities

- **Corpus sincronizado**: promos del período con su marca (texto exacto del servidor), la fecha de la última sincronización exitosa y el conteo de descartadas.
- **Ventana de compras**: `[inicioDelPeriodo, hoy]`.
- **Repositorio de sincronización**: interfaz que entrega promos por cursor, los `id` del período, las compras desde una fecha y el id del usuario de la sesión; una implementación en memoria y otra sobre Supabase.
- **Compras pendientes**: ids de compras locales todavía no confirmadas por el servidor. Las agrega la compra local y las saca #44 al subirlas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el repositorio en memoria, reabrir la app sin red después de una sincronización produce una recomendación idéntica a la de antes de cerrar, con el reloj real y sin error (test). La prueba manual en el teléfono queda **bloqueada por #40, #35 y #41**.
- **SC-002**: Una promo dada de baja deja de recomendarse en la sincronización siguiente y el restante de su tope compartido no cambia (test con motor real). Verificarlo en el teléfono queda bloqueado por #40, #35 y #41.
- **SC-003**: `inicioDelPeriodo`/ventana son correctos para un mes de 28 días (febrero de 2026), uno bisiesto de 29 (febrero de 2028), uno de 30 (abril), uno de 31 (mayo), el primer día del mes a las 00:00 y a las 23:59 de Argentina, y un lunes que cruza de mes.
- **SC-004**: Tipear un monto no genera ningún pedido al repositorio (test): la sincronización solo se dispara al abrir y al volver a primer plano.
- **SC-005**: Ante una falla (sin red, página caída, timeout, resultado después de cerrar sesión) el corpus, las compras, la marca y el reloj quedan idénticos a antes en el 100% de los casos probados.
- **SC-006**: Cero pérdida de filas en los casos de borde: empate en el borde de página, fila modificada entre dos páginas y transacción larga (tests de paginación y de margen).
- **SC-007**: Existe, versionado, el script de medición y la decisión de persistencia con números: medidos si hay corpus real, o proyectados y rotulados como tales.

## Assumptions

- **Dónde se muestra la leyenda**: Inicio, bajo el contenido principal; el texto exacto se ajusta en el plan sin cambiar la spec.
- **Valores por defecto** (ajustables en el plan): espera de 5 minutos, timeout de 15 segundos, página de 500, margen de relectura de 10 minutos, lote de la ingesta de menos de 5 minutos.
- **Decisiones tomadas en esta revisión y revisables por el PO**: (1) las bajas se mapean a vencidas y quedan en el corpus; (2) ventana = período, no "los últimos N días"; (3) el corpus va en una clave aparte; (4) un corpus vacío del servidor no reemplaza el de ejemplo; (5) las compras locales no se pierden al sincronizar.
- **Los topes no dependen de `medioDePagoId`**: el motor usa `promocionId` y `descuentoObtenido`; solo «Mis compras» lo necesita para mostrar el medio.
- **Corpus real**: no existe todavía (#35 abierta); `supabase/seed.sql` solo trae catálogos. Los tests de integración siembran sus propias filas en un Supabase local y nunca se usan para medir ni para la demo.
- **Sin cambios en el motor ni en el esquema**: `recomendar`, `estimarTopes` y el filtro de vigencia no se tocan; la base ya tiene `actualizada_en`, `dada_de_baja_en` y el índice.
