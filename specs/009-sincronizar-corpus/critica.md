# Crítica de `spec.md` (009, issue #42) — spec-critic, 2026-11-02

Revisión adversarial contra el código y los documentos del repo. Cada hallazgo lleva la cita de
la spec, la evidencia (archivo:línea) y la corrección que se propone. No se modificó `spec.md`.

## Resumen

| # | Severidad | Dónde | Problema en una línea |
|---|---|---|---|
| B1 | Bloqueante | FR-007 | La marca sin margen pierde filas de transacciones largas; la 007 le dejó explícitamente ese problema a esta issue |
| B2 | Bloqueante | FR-006, FR-004 | Sacar del corpus las promos dadas de baja o vencidas borra el consumo de los topes compartidos (§V) |
| B3 | Bloqueante | US1-1, FR-004, Edge Cases | La primera sincronización "mezcla por id" con el corpus de ejemplo, que es vigente hasta el 31/12 |
| B4 | Bloqueante | FR-009, FR-012 | La primera sincronización calcula la ventana con el reloj fijo del 14/10, y en un arranque en frío no se sabe qué reloj usar |
| I1 | Importante | FR-005 | Paginación sin método: OFFSET pierde filas, `>` solo pierde empates y `max_rows = 1000` recorta en silencio |
| I2 | Importante | FR-011 | El reemplazo de `compras.lista` borra las compras locales: hoy nadie escribe `pendientes` y la persistencia los descarta |
| I3 | Importante | Edge Cases, FR-017 | Cambio de cuenta o cierre de sesión con una sincronización en vuelo: los datos de A quedan con B o en el disco |
| I4 | Importante | FR-009 | La ventana `hoy − N` no es el período: contradice `privacidad.md`, ADR-010 y `aPersistir` |
| I5 | Importante | FR-013, FR-016 | Todo el store va en una sola clave: un corpus grande impide guardar también el perfil y las compras |
| I6 | Importante | FR-008 | Una fila inválida que es una actualización o una baja deja la versión vieja para siempre |
| I7 | Importante | FR-004, Assumptions | Un borrado físico o una nueva siembra nunca llega al dispositivo y duplica el corpus |
| I8 | Importante | FR-004 | Ambigüedad: ¿la consulta incremental filtra por vigencia? Además, ADR-010 pide filtrar por jurisdicción |
| I9 | Importante | SC-001, SC-002, US2 | Criterios que no se pueden verificar sin #40, #35 y #41, y no figuran como bloqueados |
| M1 | Menor | FR-013 | La compatibilidad con lo guardado está bien pedida, pero el validador actual devuelve `undefined`, no `null`; no hay que subir la versión |
| M2 | Menor | US3, FR-015 | "hace X" sin umbrales, con diferencias negativas posibles y con `ahora` congelado mientras la app está abierta |
| M3 | Menor | FR-001, FR-002, FR-003 | La espera de 5 minutos no dice con qué reloj se mide; "hay red" no se puede detectar y no hay timeout |
| M4 | Menor | FR-005 vs. SC-005 | No está definido si la unidad atómica es el corpus solo o el corpus junto con las compras |
| M5 | Menor | US4-1 | La causa "vencida" no existe (es `vigencia`) y una promo de otro rubro se descarta antes por `categoria` |
| M6 | Menor | FR-016 | No dice con qué credencial corre el script de medición (no puede ser la service role) |
| M7 | Menor | Edge Cases (medio desconocido) | «Mis compras» suma en "Gastaste" compras que no muestra |
| M8 | Menor | Varias | Requisitos sin escenario, referencias rotas (`data-model.md`, "Ver FR-010") y checklist en `[x]` falso |

---

## Bloqueantes

### B1. La marca sin margen pierde filas de transacciones largas, y era la tarea de esta issue

- **Cita**: FR-007, "La marca de sincronización MUST ser la mayor `actualizada_en` recibida del servidor, no la hora del teléfono." FR-004: "Las siguientes MUST pedir solo lo posterior a la marca (`actualizada_en`)".
- **Evidencia**:
  - `supabase/migrations/20261101000006_promociones.sql:17-19`: el trigger pone `clock_timestamp()`, que es la hora en que se escribe la fila, no la del commit.
  - `specs/007-esquema-supabase-rls/spec.md:182` (SC-006): "Las escrituras concurrentes (una transacción larga puede quedar con hora anterior a una marca ya leída) **se resuelven en la issue de sincronización (ADR-010 paso 5), por ejemplo releyendo con un margen**; esta spec solo garantiza el caso secuencial."
  - `specs/007-esquema-supabase-rls/research.md:24`: "Lo resuelve la issue de sincronización con un margen de relectura."
- **Problema**: la ingesta escribe la promo P a las t1 dentro de una transacción que commitea a las t3. Entre medio, a las t2, la app sincroniza, ve filas de otras transacciones ya commiteadas y deja la marca en M > t1. Cuando P commitea, su `actualizada_en` (t1) queda por debajo de la marca: P no llega nunca, o llega solo si se vuelve a modificar. Si P era una baja, la promo se sigue recomendando. La 007 cerró su SC-006 apoyándose en que esta spec lo resolvía, y esta spec no lo menciona. Es una obligación heredada que se perdió.
- **Corrección propuesta**: agregar a FR-007 lo siguiente: "La consulta incremental MUST pedir `actualizada_en > M − margen`. El margen MUST ser mayor que la duración máxima de una transacción de escritura de `promociones`, y el script de ingesta y el de siembra (#35) MUST respetar ese máximo. Por ejemplo, un commit por promo o lotes de menos de X segundos. Releer filas es idempotente porque el servidor solo tiene la versión vigente de cada una." Sumar un caso de prueba con el repositorio en memoria: una fila con `actualizada_en` menor que M, publicada después de la sincronización anterior, tiene que aparecer en la siguiente. **Decisión que hace falta**: el valor del margen y el contrato con la ingesta, que hoy no tiene issue asignada para eso.

### B2. Las bajas y la poda borran el consumo de los topes compartidos

- **Cita**: FR-006, "Una promo dada de baja MUST salir del corpus. Una promo con `vigencia.hasta` anterior a hoy menos 7 días MUST podarse del store". FR-004: "La primera sincronización MUST bajar las promos **vigentes** [...] y no dadas de baja."
- **Evidencia**:
  - `specs/007-esquema-supabase-rls/spec.md:124`: la promo "no se borra, se da de baja [...]. **Así la compra conserva su `promocion_id` y su consumo sigue contando para el tope**".
  - `packages/motor/src/tope.ts:101-103`: en un grupo, "**Los vencidos solo aportan sus compras.**"
  - `packages/motor/src/tope.test.ts:215-217`: "una compra de una promo que el motor no recibió no descuenta".
  - `.specify/memory/constitution.md:107-113` (§V): ninguna cifra falsamente precisa.
- **Problema**: hay un tope mensual compartido G con dos promos: P1, vigente del 1/11 al 10/11, y P2, vigente todo el mes. El 5/11 el usuario consume $6.000 de $10.000 con P1. El 18/11 la poda saca P1 (10/11 < 18/11 − 7), el motor deja de recibirla y sus compras ya no descuentan del grupo: la app muestra ≈$10.000 disponibles con P2. Pasa lo mismo si P1 se da de baja a mitad de mes, y desde el primer día si el usuario instala la app después del 10/11, porque FR-004 solo baja promos vigentes. El resultado es un restante optimista, lo que viola §V, y contradice el motivo por el que la 007 eligió dar de baja en vez de borrar.
- **Corrección propuesta**:
  1. La poda y la primera descarga usan el inicio del período, no "hoy − 7": se bajan y se conservan las promos con `vigencia_hasta >= desde`, donde `desde` es el inicio del período (el más temprano entre el mes y la semana, como en `comprasDelPeriodo`, `apps/mobile/src/data/calculo.ts:239-244`). Así cualquier promo que pueda tener compras del período está en el corpus.
  2. Una promo dada de baja que tenga compras del período **no** se puede borrar del corpus sin perder el consumo. **Decisión que hace falta (PO)**: (a) conservarla de forma que el motor no la recomiende pero sí cuente sus compras, por ejemplo mapeando la baja a `vigencia.hasta = día anterior a dada_de_baja_en`, sin cambiar el motor; (b) aceptar la pérdida y documentarla como excepción a §V; o (c) cambiar el motor, lo que contradice el supuesto "Sin cambios en el motor".
  3. Agregar un escenario: con un tope compartido y un miembro dado de baja que tiene compras del mes, el restante no sube.

### B3. La primera sincronización se mezcla con el corpus de ejemplo, que no está vencido

- **Cita**: US1-1, "se piden solo las promos con `actualizada_en` posterior a `M` y se mezclan en el corpus por `id`". Independent Test de US1: "disparar la sincronización con el store de ejemplo [...] 1 modificada y 1 dada de baja". Edge Cases: "hoy el reloj de la app está fijo en el 14/10/2026 **porque las promos de ejemplo vencen en octubre**".
- **Evidencia**:
  - `apps/mobile/src/data/fixtures.ts:155`: `vigencia: { desde: "2026-10-01", hasta: "2026-12-31", dias }`. Lo mismo en `specs/008-motor-app-redux/data-model.md:84-85`. Las promos de ejemplo **no** vencen en octubre: son vigentes hasta el 31/12.
  - `apps/mobile/src/store/corpus.ts:6-9` y `persistencia.ts:154-161`: cada instalación actual ya tiene persistido el corpus de ejemplo, porque el listener escribe al hidratar.
  - `specs/008-motor-app-redux/spec.md:123` (FR-011): si la parte del corpus guardado está corrupta, se vuelve a "los de ejemplo".
- **Problema**: FR-004 no dice si la primera sincronización **reemplaza** o **mezcla**, y el Independent Test de US1 da a entender que mezcla sobre el store de ejemplo. Si mezcla, las cuatro promos de ejemplo (`promo-galicia-super-mie`, etc., con `bancoId` en slug) sobreviven, porque nunca llegan como baja. Con el reloj real no vencen hasta el 31/12 y la poda de 7 días las saca recién el 8/1/2027. Mientras tanto, con el perfil de ejemplo (que también usa slugs) se siguen **recomendando como reales**, bajo la leyenda "Promos actualizadas hace unos minutos" (FR-015). Lo mismo pasa si a un usuario ya sincronizado se le corrompe la parte del corpus: vuelve a promos inventadas sin que nada lo advierta. La premisa del Edge Case "Reloj" es falsa y la spec se apoya en ella.
- **Corrección propuesta**: (1) en FR-004, "Con la marca en `null`, la sincronización MUST **reemplazar** el corpus entero por lo recibido; la mezcla por `id` solo aplica con marca no nula". (2) Reescribir el Independent Test de US1 para que parta de un corpus ya sincronizado con marca `M`, no del store de ejemplo. (3) Si un usuario ya sincronizado tiene la parte del corpus corrupta, queda con un corpus vacío y la marca en `null`, no con el de ejemplo; el escenario va en el Edge Case de persistencia. (4) Corregir el Edge Case: las promos de ejemplo son vigentes hasta el 31/12/2026; lo que es de octubre son las compras.

### B4. La primera sincronización calcula con el reloj de ejemplo, y en un arranque en frío no se sabe qué reloj usar

- **Cita**: FR-009, "La resta MUST ser de días de calendario sobre la fecha de Argentina de `ahora`". FR-012: "Mientras el corpus sea el de ejemplo (nunca hubo una sincronización), la app MUST seguir con el reloj fijo de ejemplo. Desde la primera sincronización exitosa, `sesion.ahora` MUST salir del reloj real."
- **Evidencia**:
  - `apps/mobile/src/store/sesion.ts:22`: `ahora: new Date(RELOJ_EJEMPLO)`, y en las líneas 9-11: "No se persiste".
  - `apps/mobile/src/hooks/use-reloj.ts:12,18`: la fuente por defecto es el reloj fijo.
  - `apps/mobile/src/app/_layout.tsx:28,62`: `rehidratar()` es asincrónico y `useReloj()` corre en el primer render, antes o en paralelo a la rehidratación.
- **Problema**:
  1. **El huevo y la gallina**: en la primera sincronización, `ahora` vale por definición (FR-012) 2026-10-14. FR-009 pide entonces las compras desde el 13/09 hasta el 14/10, no las de noviembre, y FR-004 y FR-006 calculan "hoy" y la poda con el 14/10. Después el reloj pasa al real y `compras.lista` (ya reemplazada según FR-011) no tiene ninguna compra del mes: los topes dicen "sin compras" hasta la próxima sincronización, que llega en 5 minutos o más.
  2. **Arranque en frío sin señal (US2)**: `ahora` no se persiste y arranca en el 14/10. FR-012 no dice qué dato guardado decide que "ya hubo una sincronización". Si lo decide algo de la sesión en curso, abrir en modo avión calcula con el 14/10 sobre el corpus real y US2-1 falla. Además, `useReloj` marca antes de que llegue `rehidratado`, así que hay al menos un render con el reloj equivocado.
- **Corrección propuesta**: (1) "Los parámetros de la sincronización (hoy, ventana de compras, poda) MUST calcularse con el reloj real en la capa imperativa, nunca con `sesion.ahora`. FR-012 solo gobierna el reloj de los selectores." (2) "La fuente del reloj se decide por la marca persistida del corpus (`marca !== null` ⇒ reloj real), leída después de `rehidratado`; el reloj cambia en el mismo tick en que se aplica la primera sincronización." (3) Escenarios: primera sincronización con el reloj de ejemplo activo, que trae las compras del período real; y reapertura en modo avión de un usuario ya sincronizado, cuyo `ahora` sale del reloj real.

---

## Importantes

### I1. Paginación sin método y con el tope de 1000 filas

- **Cita**: FR-005, "La respuesta MUST pedirse paginada". US1-5: "más filas que el tope de una respuesta".
- **Evidencia**: `supabase/config.toml:18` tiene `max_rows = 1000`. `docs/product/pendientes.md:37` estima el corpus en "~2.000 filas", así que la primera sincronización pagina siempre. `promociones` no tiene unicidad sobre `actualizada_en` (`migrations/...06_promociones.sql:80,97`).
- **Problema**:
  - **OFFSET** (`range(1000, 1999)` con `order=actualizada_en`): si entre la página 1 y la 2 la ingesta modifica una fila de la página 1, esa fila se va al final y todas las demás se corren un lugar. La fila que estaba en la posición 1001 queda en la 1000, nadie la lee y la marca la pasa de largo.
  - **Keyset solo con `actualizada_en > última`**: pierde las filas que empatan en el borde. No está garantizado que no haya empates: la resolución es de microsegundos, no hay unicidad y una carga masiva escribe cientos de filas por milisegundo.
  - **`>=`**: no pierde filas, pero repite.
  - **Sin un criterio de fin**: si se pide un tamaño de página mayor que `max_rows`, PostgREST devuelve 1000 filas sin error y el cliente cree que terminó.
  - **La marca convertida con `Date`**: pierde los microsegundos, así que una comparación por igualdad en el keyset nunca da verdadero.
- **Corrección propuesta**: "Paginación por cursor `(actualizada_en, id)`, con `order=actualizada_en.asc,id.asc` y el filtro `or=(actualizada_en.gt.T,and(actualizada_en.eq.T,id.gt.I))`. El tamaño de página es ≤ `max_rows` y la descarga termina cuando una página trae menos filas que ese tamaño. La marca y el cursor se guardan como el texto exacto que devuelve PostgREST, sin pasar por `Date`." Agregar un caso de prueba con empates en el borde de página y otro con una fila modificada entre dos páginas. Aplicar lo mismo a las compras: FR-009 no menciona paginación y el recorte en 1000 es silencioso.

### I2. El reemplazo de `compras.lista` borra las compras locales

- **Cita**: FR-011, "`compras.lista` MUST reemplazarse por la del servidor **conservando** las compras cuyo id figure en `compras.pendientes` (compras locales todavía sin subir; las administra #44)". Frontera: "El contrato que comparten (los slices) está en [`data-model.md`] §Contrato con #44".
- **Evidencia**:
  - `specs/009-sincronizar-corpus/` solo contiene `spec.md` y `checklists/`: **`data-model.md` no existe**, así que el contrato con #44 no está escrito.
  - `apps/mobile/src/store/thunks.ts:17-21`: `guardarCompra` genera ids `n${n}` y despacha `compraAgregada`. Nadie escribe `pendientes`.
  - `apps/mobile/src/store/compras.ts:21`: el escenario de desarrollo vuelve a las compras de ejemplo.
  - `apps/mobile/src/store/persistencia.ts:39-47`: `aPersistir` escribe `{ lista: comprasDelPeriodo(...) }`, de modo que **no persiste `pendientes`** y filtra por período también las compras pendientes.
  - `supabase/migrations/20261101000007_compras.sql:6`: `id uuid`.
- **Problema**:
  1. Entre el merge de esta spec y el de #44, cualquier compra que el usuario guarde en el teléfono desaparece en la próxima sincronización, porque `pendientes` siempre está vacío.
  2. **Concurrencia**: si el usuario guarda una compra mientras hay una sincronización en vuelo, el reemplazo se arma con el estado del inicio y la pierde. Si #44 sube una compra y la saca de `pendientes` entre que se pidió la lista y que se aplica, la compra desaparece hasta la próxima sincronización. Si la lista ya la trae pero el id local (`n5`) no coincide con el UUID del servidor, queda duplicada y descuenta dos veces del tope.
  3. Un ticket de ayer cargado el día 1 está fuera del período: `aPersistir` lo descarta del disco antes de subirlo, y si se mata la app se pierde.
  4. Además de volver a las compras de ejemplo, el escenario de desarrollo borra las pendientes.
- **Corrección propuesta**: (1) crear `data-model.md` con el contrato de #44: ids UUID generados en el cliente y enviados en el insert (así el id local y el del servidor coinciden), quién agrega y quién saca de `pendientes`, y deduplicación por id. (2) En FR-011: "El merge se hace en el reducer al aplicar, sobre el estado de ese momento: `servidor ∪ (locales cuyo id está en pendientes y no está en servidor)`." (3) En FR-013: "`pendientes` y las compras pendientes se persisten sin filtrar por período." (4) Hasta #44, decidir una de dos: que esta spec marque como pendiente toda compra de `compraAgregada`, o que **no** reemplace `compras.lista` y solo la complete. **Decisión que hace falta**.

### I3. Cambio de cuenta o cierre de sesión con una sincronización en vuelo

- **Cita**: Edge Cases, "**Cambio de cuenta o cierre de sesión**: `sesionCerrada` ya vuelve el store al estado inicial; el corpus y las compras del usuario anterior no sobreviven".
- **Evidencia**:
  - `apps/mobile/src/store/corpus.ts:19-21`: el slice `corpus` **no** atiende `sesionCerrada`. Solo atiende `rehidratado`, y el test `slices.test.ts:55-74` no revisa el corpus. La afirmación de la spec es falsa para el corpus, aunque como el corpus es público no es un problema de privacidad, sí de la marca y del reloj (B4).
  - `apps/mobile/src/store/acciones.ts:7`: `Cuenta = { email, proveedor }`. El store no guarda el id del usuario dueño de `compras`.
  - `persistencia.ts:150-166`: cualquier cambio de `compras` se escribe al disco.
- **Problema**:
  1. Si la sincronización de A todavía está en vuelo cuando se cierra la sesión, el resultado llega después, se aplica al store "cerrado" y se **persiste**: las compras de A quedan en el disco sin sesión.
  2. Si la sesión de A vence y entra B sin pasar por `sesionCerrada` (es responsabilidad de #40), FR-011 reemplaza la lista con las compras de B pero **conserva las pendientes de A**, y #44 las subiría con la cuenta de B. Eso contradice `privacidad.md:62-64` ("un usuario no puede leer el registro de otro") y §IV.
- **Corrección propuesta**: "El slice `compras` guarda el `userId` dueño. Antes de aplicar, la sincronización verifica que el usuario de la sesión siga siendo el mismo que la disparó y el mismo dueño del slice; si no, descarta el resultado. Si el dueño cambió, `compras` y `pendientes` vuelven al estado inicial antes de sincronizar." Corregir el Edge Case sobre el corpus o agregar `sesionCerrada` a `corpus.ts`, decidiendo qué pasa con la marca y el reloj. Agregar escenarios: cerrar sesión durante una sincronización y cambiar de cuenta con compras pendientes.

### I4. La ventana `hoy − N` no es el período en curso

- **Cita**: FR-009, "con `fecha` mayor o igual que `hoy − N días`, donde N es la cantidad de días del mes calendario en curso". Key Entities: "el rango de fechas `[hoy − N, hoy]`". SC-003: "aunque la compra sea de la madrugada del día límite".
- **Evidencia**:
  - `docs/product/privacidad.md:50-51`: "El celular guarda **en el store de Redux** solo esas compras **del período**".
  - `docs/decisions/010-motor-en-la-app-y-redux.md:50`: `compras` = "Compras del período en curso (mes o semana, lo que empiece antes)".
  - `apps/mobile/src/data/calculo.ts:239-244`: `comprasDelPeriodo` usa `min(inicio del mes, inicio de la semana)`, y es lo que filtra `aPersistir`.
  - `specs/008-motor-app-redux/spec.md:96`: "Podar el estado es de #42."
  - `supabase/migrations/20261101000007_compras.sql:8`: `fecha date`, sin hora.
- **Problema**: el 2/11, N = 30 y la ventana empieza el 3/10. El store en memoria guarda un mes de compras anteriores al período, lo que contradice la letra de `privacidad.md` y de ADR-010. Hay además dos definiciones de ventana: el store en línea tiene compras de octubre y el store reabierto sin señal no (porque `aPersistir` las filtra), así que el estado depende de si hubo señal. SC-003 prueba un borde que no existe: la compra es un `date` sin hora. El borde real es la hora de `ahora` (por ejemplo 00:30 en Argentina, que en UTC es 03:30 del mismo día, contra 22:00 en Argentina, que en UTC ya es el día siguiente). Tampoco queda claro si se piden compras con `fecha > hoy`: FR-009 solo pone el límite inferior y Key Entities pone los dos.
- **Corrección propuesta**: "La ventana de compras MUST ser `[desde, hoy]` con `desde = inicioDelPeriodo` (el más temprano entre el mes y la semana), la misma función que usa `aPersistir`; al sincronizar, el store se poda a esa ventana." Reescribir SC-003 sobre la hora de `ahora` (23:59 y 00:00 en Argentina) en el primer día del mes y en un lunes que cruza de mes. Si el PO quiere la ventana rodante de N días, hay que enmendar `privacidad.md` y ADR-010 en este PR.

### I5. Todo el store va en una sola clave de AsyncStorage, y la medición queda para después

- **Cita**: FR-013, "El slice `corpus` MUST sumar la marca [...] La persistencia MUST tolerar [...]". FR-016: "la fracción del tope de 6 MB (total) y 2 MB (un valor) [...] con la medición real cuando exista #35". Edge Cases: "**Almacenamiento lleno o no disponible**: la app funciona en memoria".
- **Evidencia**:
  - `apps/mobile/src/store/persistencia.ts:26,161`: **una sola clave**, `vuelto.store.v1`, con `perfil`, `corpus`, `compras` y la cuenta en un único JSON.
  - `persistencia.ts:162-164`: cualquier error al escribir se traga en silencio.
  - `docs/product/pendientes.md:37,40-43`: ~2.000 filas, y la decisión sigue pendiente.
- **Problema**: el límite de 2 MB por valor que cita la propia spec se aplica al **store entero**, no al corpus. Si el corpus real lo supera, no falla solo el corpus: dejan de guardarse también el perfil, la cuenta y las compras pendientes (I2), y la falla no se ve. "La app funciona en memoria" esconde que, al matar la app, se pierden datos del usuario que todavía no se subieron. Mientras tanto, FR-016 manda la medición a #35, pero esta spec ya persiste el corpus real. Es el patrón de dejar en `pendientes.md` una decisión que bloquea.
- **Corrección propuesta**: decidir ahora, sin esperar la medición, que el corpus se persiste en **una clave aparte** de perfil, compras y cuenta, para que una falla del corpus no se lleve el resto. Agregar: "si no se puede escribir el corpus, la marca guardada no avanza", así la próxima apertura vuelve a bajar todo en vez de quedar con una marca que apunta a un corpus que no existe. Agregar escenarios: falla al escribir el corpus, y perfil y compras siguen persistidos. **Decisión que hace falta**: si se adopta este cambio en esta spec. El script de US5 puede seguir esperando a #35.

### I6. Una fila inválida que es una actualización o una baja deja la versión vieja

- **Cita**: FR-008, "una fila que no cumple el contrato se descarta y se cuenta". Edge Cases: "se descarta esa fila y se cuenta; no rompe la sincronización".
- **Evidencia**: FR-007 (la marca es la mayor `actualizada_en` recibida, sin excluir las descartadas) y FR-006 (la baja saca la promo).
- **Problema**: si la fila descartada es la nueva versión de una promo que ya está en el corpus, la vieja queda, la marca la pasa de largo y no se corrige hasta que alguien vuelva a modificar la fila. Si la fila descartada trae `dada_de_baja_en` no nulo pero algún otro campo inválido, la baja no se aplica y la promo se sigue recomendando. "Se cuenta" no tiene destino: no dice dónde queda el contador ni quién lo ve, y no hay forma de dar pass o fail. El ejemplo de la spec ("`porcentaje` fuera de rango") no puede pasar: la base lo impide con `check (porcentaje between 0 and 100)` (`...06_promociones.sql:55`).
- **Corrección propuesta**: "La baja se procesa por `id` antes de validar el resto de la fila. Una actualización inválida **saca** del corpus la versión anterior de ese `id`. El conteo de descartadas se expone en un lugar concreto (por ejemplo, un campo de diagnóstico del slice, o en el log de desarrollo) y tiene un test." Cambiar el ejemplo por uno que la base sí permita: una red o una jurisdicción que la versión del motor de la app no conoce.

### I7. Un borrado físico o una nueva siembra nunca llega al dispositivo

- **Cita**: Assumptions, "La sincronización incremental ya está soportada por el esquema [...], así que no cuesta más que la completa." Assumptions: "Sin cambios de esquema".
- **Evidencia**:
  - `specs/007-esquema-supabase-rls/spec.md:124`: "El borrado físico de promociones queda reservado a la service role" (está permitido si nadie la referencia).
  - `...06_promociones.sql:46`: `id uuid ... default gen_random_uuid()`.
  - `.specify/memory/constitution.md:139-140`: la demo corre "con el corpus sembrado".
- **Problema**: un `delete`, o una nueva siembra con `supabase db reset` (que regenera los UUID salvo que la siembra los fije), no mueve ninguna marca hacia el dispositivo. Con una nueva siembra, el teléfono recibe las promos nuevas, que tienen una marca posterior, y **conserva las viejas** con ids distintos: cada promo queda dos veces, las compras nuevas apuntan solo a una de las dos y el tope de la otra aparece entero. En la preparación de una demo esto es lo más probable.
- **Corrección propuesta**: agregar una regla de resincronización completa. Opción barata, sin cambiar el esquema: cada sincronización pide además `select=id` de las promos vigentes (unos 2.000 UUID, alrededor de 80 KB) y saca del corpus los ids que el servidor ya no tiene. Otra opción: una resincronización completa forzada cada N días. Agregar un escenario: el corpus del servidor se vuelve a sembrar y el del teléfono no queda con duplicados.

### I8. ¿La consulta incremental filtra por vigencia? ¿Y por jurisdicción?

- **Cita**: FR-004, "La primera sincronización MUST bajar las promos **vigentes** (`vigencia_hasta` mayor o igual que la fecha de hoy en Argentina) y no dadas de baja. Las siguientes MUST pedir solo lo posterior a la marca".
- **Evidencia**: `docs/decisions/010-motor-en-la-app-y-redux.md:85-88`: "pide solo las promos con `actualizada_en` posterior, más las que vencieron, para sacarlas. **Se filtra por vigencia y por jurisdicción**". `packages/motor/src/tipos.ts:47-50`: el motor siempre descarta `otra_provincia`.
- **Problema**: se puede leer de dos maneras.
  - **Lectura A**: la consulta incremental mantiene el filtro de vigencia. Entonces una promo a la que la fuente le **acortó** la vigencia (terminó antes) no llega, queda en el corpus con la fecha vieja y se sigue recomendando.
  - **Lectura B**: no lo mantiene. Entonces llegan las modificaciones de promos vencidas hace tiempo, y la spec no dice si se agregan al corpus antes o después de podar.
  
  Además, la spec no filtra por jurisdicción, aunque ADR-010 lo pide para que el corpus sea chico (y eso pesa en I5). "Fecha de hoy en Argentina" tampoco dice con qué reloj (ver B4).
- **Corrección propuesta**: "La consulta incremental NO filtra por vigencia. Se aplica la mezcla y después la poda (con el criterio de B2). Las dos consultas excluyen `jurisdiccion = 'otra_provincia'`." O, si se descarta el filtro por jurisdicción, registrarlo como desvío de ADR-010 §4. Agregar un escenario: a una promo del corpus se le acorta la vigencia a ayer y deja de recomendarse.

### I9. Criterios que no se pueden verificar sin #40, #35 y #41

- **Cita**: SC-001, "En modo avión, después de haber sincronizado una vez, la recomendación para cualquier comercio es idéntica a la que daba con señal (prueba manual documentada en el PR)". SC-002: "Una promo dada de baja en la fuente deja de recomendarse después de la siguiente sincronización con señal." US2 Independent Test (prueba manual en el teléfono). US1: "la recomendación y los topes se calculan con eso".
- **Evidencia**:
  - FR-001 exige una sesión de Supabase, y `apps/mobile/src/lib/supabase.ts:6-7` dice "Todavía no hace consultas". El login es #40.
  - `seed.sql` no tiene promos (según la propia spec en Assumptions; es #35).
  - El perfil usa slugs que no matchean con los `banco_id` UUID (Assumptions; es #41, y `specs/008-motor-app-redux/data-model.md:80`).
- **Problema**: en la app, sin #40 la sincronización nunca corre. Con #40 pero sin #35, el corpus queda vacío. Con #35 pero sin #41, ninguna promo matchea con el perfil y la recomendación sale vacía. SC-001 se cumple trivialmente (vacío contra vacío) y SC-002 no se puede ejecutar: no hay ninguna promo recomendada que dar de baja. Ninguno de los dos está marcado como bloqueado. A esto se suma B3: si #40 llega antes que #35, un usuario con sesión sincroniza un corpus vacío, el reloj pasa al real y la app deja de recomendar lo que hoy recomienda.
- **Corrección propuesta**: (1) Reformular SC-001 y SC-002 como tests sobre el store con el repositorio en memoria inyectado (FR-014), que no dependen de nada externo. (2) Dejar la prueba manual en el teléfono como "bloqueada por #40, #35 y #41", con la lista de qué issue destraba qué. (3) **Decisión que hace falta**: qué hace la app con un corpus del servidor vacío. Propuesta: una sincronización completa que devuelve 0 promos no reemplaza el corpus de ejemplo ni cambia el reloj.

---

## Menores

### M1. Compatibilidad de `vuelto.store.v1`: está bien pedida, pero hay que verificarla

- **Cita**: FR-013, "La persistencia MUST tolerar guardados anteriores sin esos campos (se leen como `null` y `[]`)."
- **Evidencia**: `persistencia.ts:69-73,75-79`. `corpusValido` y `comprasValidas` hacen `x as EstadoCorpus` sin completar los campos que faltan, así que salen como `undefined`, no como `null`. `persistencia.ts:97` descarta **todo** lo guardado si `version !== 1`, incluido el perfil (`specs/008-motor-app-redux/spec.md:123`).
- **Problema y respuesta a la pregunta**: no hay que subir la versión. Subirla haría que todos los usuarios repitan el onboarding. Lo que hay que exigir es normalizar explícitamente: si la marca llega como `undefined` y el código pregunta `marca !== null`, un guardado viejo se toma como "sincronizado", lo que activa el reloj real sobre el corpus de ejemplo (B3 y B4). Además, `cargadoEn` (`acciones.ts:24-28`) ya existe y se superpone con "la fecha de la última sincronización exitosa".
- **Corrección propuesta**: "Se mantiene `version: 1`. El validador completa `marca: null`, `sincronizadoEn: null` y `pendientes: []` cuando faltan, y valida sus tipos. Hay un test con un guardado v1 real (con el corpus de ejemplo y sin los campos nuevos) que deja el store en 'nunca sincronizado'." Decidir si `cargadoEn` se reemplaza o se reutiliza.

### M2. "Promos actualizadas hace X": umbrales, relojes y diferencias negativas

- **Cita**: US3, "'hace unos minutos', 'hace 2 horas', 'hace 3 días'"; US3-2: "hace 26 horas → 'hace 1 día'". FR-015: "en un lugar visible sin ocupar una pantalla propia".
- **Evidencia**: `apps/mobile/src/hooks/use-reloj.ts:15-17`: `ahora` solo se actualiza al abrir la app, al volver a primer plano y a la medianoche.
- **Problema**: faltan los cortes. ¿59 minutos es "unos minutos"? ¿Cómo se dicen 1 hora y 23:59? ¿Hay singular y plural? Si la fecha de la sincronización sale del reloj del sistema al terminar y `ahora` se marcó antes, al volver a primer plano, la diferencia da negativa. Con la app abierta tres horas, `ahora` no avanza y la leyenda sigue diciendo "hace unos minutos". "Un lugar visible" no se puede verificar.
- **Corrección propuesta**: una tabla de cortes (menos de 60 min, entre 1 y 23 h, 24 h o más, con redondeo hacia abajo y plurales), diferencias negativas tratadas como 0, fijar de qué reloj sale la fecha de la sincronización y nombrar la pantalla y el lugar donde va la leyenda.

### M3. Disparo: la espera de 5 minutos, la detección de red y el timeout

- **Cita**: FR-001, "solo si hay sesión de Supabase y red. Entre dos sincronizaciones al volver a primer plano MUST pasar al menos 5 minutos". US1-3: "pasaron menos de 5 minutos desde la última sincronización".
- **Evidencia**: `apps/mobile/package.json:20`: solo `@supabase/supabase-js`; no hay NetInfo ni `expo-network`. `sesion.ts:22`: con el reloj fijo, `ahora` siempre vale lo mismo.
- **Problema**: ¿"La última sincronización" es el último intento o el último éxito? Si los 5 minutos se miden con `sesion.ahora` bajo el reloj fijo, la diferencia siempre es 0 y nunca se vuelve a sincronizar al volver a primer plano. "Hay red" no se puede saber sin una dependencia nueva. Sin timeout, una sincronización colgada con poca señal en la caja del súper mantiene bloqueadas todas las siguientes por FR-002.
- **Corrección propuesta**: "La espera se mide con el reloj del sistema en la capa imperativa, desde el inicio del último intento. 'Sin red' significa que el pedido falla; no se agrega detección previa. Cada pedido tiene un timeout de X segundos y vencido cuenta como falla."

### M4. ¿Qué es "todo o nada": el corpus solo, o el corpus con las compras?

- **Cita**: FR-005, "si alguna página falla, el store y la marca MUST quedar como estaban". SC-005: "deja el corpus, las compras y la marca idénticos a antes".
- **Problema**: FR-005 habla de las páginas de promos y SC-005 incluye las compras. Si las promos se aplican y las compras fallan, queda el corpus real con el reloj real y las compras de ejemplo de octubre (o las del período anterior). La spec no define ese estado.
- **Corrección propuesta**: declarar que la unidad atómica es el corpus junto con las compras, o bien que son dos unidades independientes y el reloj solo cambia si se aplicaron las dos. Agregar un escenario.

### M5. US4-1 no puede pasar tal como está escrito

- **Cita**: US4-1, "aparece entre las descartadas con causa 'vencida'".
- **Evidencia**: `packages/motor/src/tipos.ts:196-205`: la causa es `"vigencia"` y las reglas se evalúan en orden, con `categoria` primero. `apps/mobile/src/data/calculo.ts:169`: la vista filtra las descartadas por `categoria`.
- **Corrección propuesta**: escribir "con causa `vigencia`" y precisar que la promo vencida es del mismo rubro que el comercio.

### M6. Credencial del script de medición

- **Cita**: US5, "un script que, apuntado a un Supabase con el corpus cargado, baja las promos vigentes".
- **Evidencia**: `.specify/memory/constitution.md:98` dice que la service role "la usa solo el proceso de ingesta". `...06_promociones.sql:108-114` da `select` solo a `authenticated`.
- **Corrección propuesta**: "El script usa la anon key con la sesión de un usuario de prueba, nunca la service role."

### M7. «Mis compras» suma lo que no muestra

- **Cita**: Edge Cases, "hoy `compraVista` omite esas compras de «Mis compras» en silencio. Esta spec no cambia esa pantalla".
- **Evidencia**: `apps/mobile/src/data/calculo.ts:314-322`: "Gastaste" y "devolvieron" suman `delMes` completo, pero la lista usa `compraVista`, que descarta las compras con un medio desconocido (`calculo.ts:295-297`).
- **Problema**: con compras de la base cuyo medio es un UUID, el total no coincide con la suma de la lista. El dato nuevo de esta spec es lo que destapa el problema.
- **Corrección propuesta**: o bien esta spec muestra esas compras con un medio "sin identificar", o bien deja escrito y aceptado que el total no coincide hasta #41.

### M8. Requisitos sin escenario, referencias rotas y checklist autoaprobada

- **Evidencia**:
  - FR-011 (pendientes), FR-012 (reloj), FR-013 (compatibilidad), FR-014 (implementación real) y FR-017 (privacidad) no tienen ningún escenario de aceptación ni ningún SC.
  - Frontera, línea 16: "[`data-model.md`] §Contrato con #44" apunta a un archivo que no existe.
  - Edge Cases, línea 109: dice "Ver FR-010", que es el mapeo de compras; el del reloj es FR-012.
  - `checklists/requirements.md:27`: "[x] Cada requisito funcional tiene un criterio de aceptación" y la línea 17: "[x] Los requisitos son comprobables y no ambiguos". Los dos quedan desmentidos por lo de arriba y por I8.
- **Corrección propuesta**: un escenario por cada FR huérfano (los de B4, I2, I3 y M1 ya cubren la mayoría), crear `data-model.md`, corregir la referencia a FR-012 y volver a marcar el checklist después de corregir.

---

## Respuestas a las preguntas puntuales

1. **¿Alcanza `actualizada_en`?** No tal como está. Hacen falta un margen de relectura (B1, que la 007 le dejó explícitamente a esta issue) y paginación por cursor `(actualizada_en, id)` con un tamaño de página ≤ 1000 y un criterio de fin (I1). OFFSET pierde filas y `>` solo pierde los empates.
2. **¿Las bajas llegan siempre?** Las que se hacen con un update sí, porque el trigger mueve la marca, y dar de baja y volver a dar de alta funciona con la mezcla por id. No llegan: las de un borrado físico o una nueva siembra (I7), las bajas en una fila que no pasa la validación (I6), las que quedan en una transacción larga (B1) y los acortamientos de vigencia si la consulta incremental filtra por vigencia (I8). Y el problema más grave es el opuesto: sacar las bajas y las vencidas del corpus borra el consumo de los topes compartidos (B2).
3. **¿La ventana y `pendientes` chocan con el código?** Sí. `aPersistir` no persiste `pendientes` y descarta las compras pendientes fuera del período. Hoy nadie escribe `pendientes`, así que el reemplazo borra las compras locales (I2). La ventana `hoy − N` no es el período de `comprasDelPeriodo`, ni el de `privacidad.md`, ni el de ADR-010 (I4). La 008 deja la poda a esta issue (`spec.md:96`). `sesionCerrada` no resetea el corpus y no protege contra una sincronización en vuelo (I3).
4. **¿El reloj deja un estado inconsistente?** Sí. La primera sincronización calcula con el 14/10 (B4). Las promos de ejemplo **no** vencen en octubre sino el 31/12, así que si se mezclan sobreviven y se recomiendan como reales (B3). Con un corpus vacío del servidor, la app deja de recomendar lo que hoy recomienda (I9).
5. **¿Hay que subir la versión?** No: subirla borra el perfil de todos los usuarios. Hay que normalizar los campos que faltan a `null` y `[]` en el validador y tener un test con un guardado v1 real (M1).
6. **Privacidad y RLS.** La ventana de compras es más ancha que el período que declara `privacidad.md` (I4). Hay compras de A que pueden quedar persistidas después de cerrar sesión o pasar a la cuenta de B (I3). El script de medición no puede usar la service role (M6). No encontré lecturas que salteen RLS: `promociones` y `compras` se leen con la sesión del usuario.
7. **¿Hay criterios que no se pueden verificar sin la base?** Sí: SC-001, SC-002, el Independent Test de US2 y la frase de US1 sobre la recomendación y los topes (I9). Ninguno está marcado como bloqueado.

## Veredicto

**La spec no está lista para `/speckit-plan`.** Hay cuatro bloqueantes, y los cuatro producen datos incorrectos por cómo están escritos los requisitos, no por un detalle de implementación:

- **B1**: se pierden filas de la sincronización incremental, y era una obligación explícita que la 007 le dejó a esta issue.
- **B2**: el restante de los topes compartidos sale optimista, lo que viola §V y contradice la razón de ser de `dada_de_baja_en` en la 007.
- **B3**: las promos de ejemplo se recomiendan como reales bajo la leyenda de "actualizadas".
- **B4**: la primera sincronización trae la ventana de compras equivocada, y al reabrir sin señal se calcula con el reloj fijo.

Antes de planificar hay que tomar las decisiones de B2 (qué hacer con las bajas que tienen compras del período), I2 (qué pasa con las compras locales hasta #44), I5 (claves separadas en el almacenamiento) e I9 (qué hacer con un corpus vacío del servidor).
