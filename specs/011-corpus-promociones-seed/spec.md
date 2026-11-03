# Feature Specification: Corpus de promociones de MODO (antes «sembrado a mano»; hoy ingesta automática)

> **Reemplazada en parte por [ADR-011](../../docs/decisions/011-corpus-siempre-automatico.md) (2026-11-03).**
> Las promos nunca se cargan a mano: las publica la ingesta automática todos los días
> (`ingesta/src/corpus/ingestar.ts`, `.github/workflows/ingesta.yml`). Lo que este documento dice
> sobre `promociones.json`, revisión humana, exclusiones y grupos de tope a mano, crudos en el repo,
> seed de promociones y fixtures del motor ya no rige. Siguen vigentes el mapeo del detalle de MODO,
> la validación, los ids estables, el contrato de escritura y las reglas de tope y jurisdicción.
> El contrato actual está en [contracts/corpus.md](contracts/corpus.md).

**Feature Branch**: `feat/35-corpus-promociones-seed` (sobre `main`)

**Created**: 2026-11-02

**Status**: Draft

**Input**: Issue [#35](https://github.com/Seminario-UADE/vuelto/issues/35) — "Corpus de promociones sembrado a mano desde MODO (seed para la demo)", en la parte que le toca a Santiago (spazos32) según el reparto de la issue: categorías **Supermercados (id 1)** y **Farmacias, Perfumerías y Peluquerías (id 4)**, el catálogo de bancos que esas promos necesitan y la reconciliación de cadenas de supermercado en `docs/product/alcance-mvp.md`. Joaquín (Joaconz) toma Gastronomía, Combustibles y el resto sobre el mismo `supabase/seed/promociones.json`.

**Decisiones del equipo (2026-11-02)**:

1. Las promos sembradas a mano llevan `fuente = 'manual'`.
2. El corpus incluye **solo promos vigentes de CABA/AMBA**. Se descartan las de otras provincias aunque queden pocas; no se completa con promos fuera de alcance.
3. **Jurisdicción**: si el texto de la promo no aclara dónde rige, se la trata como global: `jurisdiccion = null`, que el motor deja pasar. Solo se excluye una promo cuando el texto o el comercio indican otra provincia o una zona fuera de CABA/AMBA (resuelve el bloqueante B2 de `critica.md`).
4. **Base de la demo**: la demo del pitch corre contra el **Supabase alojado**. El corpus se carga con un paso de carga remota idempotente (clave natural `(fuente, fuente_id)`), no solo con el reinicio local; retirar una promo es darla de baja (`dada_de_baja_en`), nunca borrarla (resuelve A1).
5. **Tope ausente**: si ni la letra chica ni los límites estructurados de la promo informan un tope de reintegro, se entiende que no tiene tope (descuento fijo) y se carga `tope.monto = null`. La recomendación lo dice como «la promo no informa tope» (constitución §V). Un `0` en la tarjeta del listado **no** cuenta como «sin tope»: es un dato no cargado, y el tope real se toma del detalle (verificado con Tienda Nova–Macro, cuya tarjeta decía `0` y cuyo detalle dice $10.000 por usuario por mes) (resuelve A4).

**Decisión que resuelve (constitución §I)**: es un habilitador. Sin un corpus real y revisado, el motor no tiene sobre qué decidir en la demo: la persona que pregunta «¿con qué pago compro en Paladini o en Farmacity?» recibiría una lista vacía. La spec no muestra promociones por sí misma; deja cargado el corpus que el motor evalúa contra una compra concreta, y que después sirve de verdad de referencia para medir el extractor (issue #53).

**Frontera con otras issues**:

- **Gastronomía, Combustibles y el resto de las categorías**: parte de Joaquín en el mismo archivo. Esta spec fija el formato y las reglas que ambos siguen, pero no carga esas categorías.
- **Ingesta automática** (#50 captura, #51 extractor): fuera de esta spec. El seed no depende de ella y sigue funcionando con la ingesta apagada. La regla de traducción de `name_bank` al banco del catálogo que se define acá la reutiliza #51.
- **Sincronización del corpus en la app** (ADR-010 §4): la app lee lo que haya en `promociones`; esta spec no toca la app.
- **Esquema de Supabase** (#34, ya mergeado): no se rediseña. Si el seed necesita algún ajuste del esquema, se detecta en el plan y se hace como migración aparte.
- **Motor** (`packages/motor`): no se modifica su lógica. Solo se le agregan datos de prueba (fixtures) copiados del corpus.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Demo con promos reales y la ingesta apagada (Priority: P1)

Quien prepara la demo levanta la base local desde cero y el corpus de Supermercados y Farmacias queda cargado, con sus bancos, sin correr ningún scraper ni llamar a MODO ni a Gemini. La app recomienda con estas promos el día del pitch.

**Why this priority**: Es la razón de ser de la issue (RF-18, ADR-005 §Consequences): la demo no puede depender de la ingesta.

**Independent Test**: Reiniciar la base local desde cero (sin red) y consultar `promociones`: están todas las promos del archivo del corpus, cada `banco_id` y `categoria_id` existe en su catálogo, y repetir el reinicio da el mismo resultado. Con esas promos, el motor recomienda en al menos tres compras de prueba (ver SC-004).

**Acceptance Scenarios**:

1. **Given** una base local limpia, **When** se reinicia, **Then** termina sin errores y `promociones` contiene todas las promos de Supermercados y Farmacias del corpus, con `fuente = 'manual'`.
2. **Given** el reinicio ya hecho, **When** se vuelve a cargar el seed, **Then** no hay filas duplicadas ni errores.
3. **Given** el seed cargado, **When** se consulta cada promo, **Then** su banco y su categoría existen en `bancos` y `categorias` (ningún id inventado).
4. **Given** una máquina sin conexión a internet, **When** se reinicia la base local, **Then** el seed carga igual: nada del seed descarga datos de MODO.

---

### User Story 2 - Cada promo es fiel a la fuente y la revisó una persona (Priority: P1)

Cada promo sembrada fue revisada por una persona contra lo que publica MODO (la tarjeta del listado y la letra chica de la promo). Lo que la fuente dice queda cargado; lo que no dice queda `null`. Nada se infiere.

**Why this priority**: Este corpus es el «de verdad» contra el que se mide después la precisión del extractor (#53). Un error acá contamina esa medición y la recomendación de la demo.

**Independent Test**: Para cualquier promo del archivo, una persona que no la cargó puede reconstruir de dónde salió cada dato sin buscar de nuevo: la promo de MODO a la que corresponde, qué fragmento de texto sostiene cada campo y quién y cuándo la revisó.

**Acceptance Scenarios**:

1. **Given** una promo del corpus, **When** se inspecciona, **Then** tiene el identificador de la promo en MODO, la fecha en que se verificó contra la fuente y quién la revisó.
2. **Given** una promo cuyo texto no dice si el tope es compartido o exclusivo, **When** se la carga, **Then** el alcance del tope queda `null`, no un valor supuesto.
3. **Given** una promo cuyo texto no menciona acumulabilidad, **When** se la carga, **Then** `acumulable` queda `null` (el motor la trata como no acumulable, RF-04).
4. **Given** un campo cargado a partir de la letra chica (tope compartido o exclusivo, acumulabilidad, jurisdicción), **When** se inspecciona la promo, **Then** guarda el fragmento de texto del que sale. El monto mínimo y el canal salen de campos estructurados del detalle y no lo exigen. *(Ajustado en la revisión de código.)*
5. **Given** una promo en la que la tarjeta del listado y la letra chica se contradicen (por ejemplo, un tope distinto), **When** se decide el valor, **Then** se carga el de la letra chica y la contradicción queda registrada en la revisión.

---

### User Story 3 - Cada promo apunta al banco correcto del catálogo de MODO (Priority: P1)

El listado de MODO trae el banco como texto libre (`name_bank`), con variantes de escritura. Cada promo del corpus referencia el banco por su id del catálogo de MODO, traducido con una regla explícita. Las promos que no se pueden atribuir a un único banco se dejan afuera y queda registro del motivo.

**Why this priority**: El medio de pago del usuario referencia al banco por ese id. Si el banco de la promo no coincide, la promo no le aparece a quien debería, y el error es silencioso.

**Independent Test**: Tomar todos los `name_bank` distintos de las promos candidatas y aplicar la regla: cada uno da un banco del catálogo o una exclusión documentada; ninguno queda sin resolver. Un test automático prueba la regla con variantes de formato ("BANCOR" vs. "Bancor", espacios de más, acentos) y con los alias.

**Acceptance Scenarios**:

1. **Given** un banco escrito con mayúsculas, acentos o espacios distintos a los del catálogo, **When** se traduce, **Then** se resuelve al mismo banco (comparación sin mayúsculas, sin acentos y sin espacios de más).
2. **Given** un nombre que difiere del catálogo por algo más que el formato (por ejemplo "Banco Macro" frente a "Macro", "Banco Hipotecario" frente a "Hipotecario", "BNA" frente a "Banco Nación"), **When** se traduce, **Then** se resuelve mediante una tabla de alias explícita y revisada, no por coincidencia parcial.
3. **Given** una promo de «Bancos adheridos» (sin banco único), **When** se arma el corpus, **Then** se excluye y se registra con el motivo.
4. **Given** una promo cuyo detalle lista varios bancos por id (por ejemplo, 24 bancos), **When** se arma el corpus, **Then** se carga una entrada por banco, todas con el mismo grupo de tope, porque el contrato de tipos tiene un solo banco por promo. Un nivel de cliente nombrado dentro de un banco (por ejemplo "Macro Selecta", niveles 2 y 3) **se excluye** y se registra con el motivo, porque el perfil del usuario no distingue niveles. *(Ajustado por el plan, D3.)*
5. **Given** un nombre de banco que no resuelve ni por formato ni por alias, **When** se arma el corpus, **Then** la promo se excluye; nunca se asigna un banco por aproximación.

---

### User Story 4 - El corpus cubre los casos que el motor tiene que resolver (Priority: P2)

El corpus incluye ejemplos reales de las situaciones que el motor distingue, para que la demo y los tests muestren cada regla con datos de verdad.

**Why this priority**: Es lo que hace útil al corpus para el motor y para el pitch. Pero depende de qué haya vigente en MODO, así que se reporta lo cubierto y lo no cubierto en vez de forzarlo.

**Independent Test**: Existe una matriz de cobertura con los casos de la issue y, para cada uno, qué promo del corpus lo ilustra o por qué no hay ninguna. Se puede verificar abriendo esa promo.

**Acceptance Scenarios**:

1. **Given** el corpus de esta spec, **When** se revisa la matriz, **Then** cada caso tiene una promo real que lo ilustra o está marcado como «sin ejemplo real vigente», con la fecha de la verificación.
2. **Given** los casos tope **compartido** entre 2 o más promos del mismo banco, tope **exclusivo**, promo **no acumulable**, `acumulable = null`, solo ciertos **días**, solo **débito**, solo **crédito**, **monto mínimo** y promo **vencida**, **When** se reparte con Joaquín, **Then** juntos los dos cubren cada caso; ninguno se inventa para llenar la matriz.
3. **Given** la promo vencida del corpus, **When** el motor evalúa una compra en una fecha posterior a su vigencia, **Then** la descarta por vigencia.

---

### User Story 5 - Los tests del motor usan promos reales del corpus (Priority: P2)

Entre 15 y 20 promos del corpus (sumando la parte de Joaquín) se copian como datos de prueba del motor, para que sus tests se escriban contra casos reales y no solo contra promos sintéticas.

**Why this priority**: Es un criterio de aceptación de la issue. Detecta temprano que el motor y los datos reales no hablen el mismo idioma.

**Independent Test**: La suite del motor corre sin red, valida que cada fixture sea una promo publicable y ejercita al menos las compras de prueba de SC-004.

**Acceptance Scenarios**:

1. **Given** los datos de prueba copiados, **When** corre la suite del motor, **Then** todos pasan `esPromocionPublicable` y la suite sigue sin red.
2. **Given** una fixture que es copia de una promo del corpus, **When** cambia esa promo en el seed, **Then** hay una verificación que avisa que la copia quedó desfasada.
3. **Given** el motor, **When** evalúa compras de prueba contra las fixtures, **Then** el resultado es el esperado y está escrito en el test (no es un snapshot ciego).

---

### User Story 6 - Las cadenas de supermercado del alcance son las que realmente tienen promo (Priority: P2)

`docs/product/alcance-mvp.md` pasa de una lista de cadenas «por presencia genérica en CABA/AMBA» a la lista de cadenas que tienen promo vigente en MODO, para que nadie planifique la demo sobre promos que no existen.

**Why this priority**: Es un criterio de la issue y un pendiente declarado del documento. Además cambia lo que se puede mostrar en el pitch.

**Independent Test**: Cada cadena de la lista del documento está respaldada por al menos una promo del corpus o por la verificación fechada de que no tiene promo vigente.

**Acceptance Scenarios**:

1. **Given** el documento actualizado, **When** se lo lee, **Then** lista las cadenas con promo vigente en MODO que sirven en CABA/AMBA y las cadenas de la lista previa que hoy no tienen ninguna, con la fecha de verificación.
2. **Given** el pendiente «reconciliar paginando la categoría Mercados completa», **When** se actualiza el documento, **Then** el pendiente queda resuelto con el método que se usó, o sigue abierto con lo que falta.
3. **Given** que las grandes cadenas (Coto, Carrefour, Jumbo, Disco, Vea, Día) no tengan promo vigente, **When** se actualiza el documento, **Then** queda dicho de forma explícita junto con su consecuencia para el flujo de supermercado de la demo.

---

### Edge Cases

- **Promo vencida entre la carga y la demo**: una promo vigente el día de la carga puede dejar de estarlo antes del pitch. La vigencia verificada lleva fecha, y el corpus se revalida antes de la demo (ver Assumptions).
- **Misma promo repetida en el listado**: el listado de MODO repite la misma promo en varias tarjetas. El corpus no debe tener duplicados: una promo, una fila.
- **Promo con varias categorías**: algunas promos figuran en más de una categoría. Se carga bajo una sola categoría, y se documenta cuál y por qué.
- **Tope informado en $0 o ausente**: un tope de $0 en la tarjeta del listado no es un tope real (el motor no lo publica) ni significa «sin tope»: se lee el tope del detalle de la promo (límites estructurados y letra chica). Si el detalle tampoco informa ninguno, el tope queda `null` (decisión 5). No se carga `$0` ni se inventa un valor. Si el período del tope (por ejemplo «por día») no es uno de los que el motor representa (mensual, semanal, por compra), la promo **se propone para excluir** (`tope_no_representable`) en vez de aproximarse, porque la aproximación puede sobrestimar el saldo; si la letra chica contradice a los datos estructurados, prevalece la letra chica y se registra la contradicción. Nunca se carga un monto sin período. *(Ajustado por el plan, D8, y por decisión del equipo del 2026-11-02.)*
- **Tipos de promo que no son reintegro**: cuotas sin interés y sorteos o «raspá y ganá» no son un reintegro con porcentaje y tope. Quedan fuera.
- **Promos de otra provincia**: supermercados regionales (por ejemplo de Córdoba) no entran. Se excluyen y se registran las promos cuyo texto o cuyo comercio indican otra provincia o una zona fuera de CABA/AMBA (incluida la provincia de Buenos Aires fuera del conurbano, aunque el motor la deje pasar).
- **Jurisdicción no aclarada**: cuando la fuente no dice nada, la jurisdicción queda `null` y la promo se trata como global (decisión 3). Solo se carga un valor si el texto lo sostiene.
- **Porcentaje con nivel o condición** (por ejemplo "30% Nivel 2"): si el beneficio depende de un nivel del cliente que el perfil no representa, se trata como segmento (se excluye).
- **Dos promos del mismo comercio y banco con distinto porcentaje y tope**: pueden ser niveles, o topes que se comparten. Se revisa la letra chica para decidir si comparten saldo; no se asume.
- **Cambio de formato de MODO**: si el listado trae campos nuevos o faltantes, la carga se detiene y lo informa; no carga a medias.
- **El mismo archivo lo editan dos personas**: el formato y el orden son deterministas para que los cambios de uno no choquen con los del otro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Esta spec DEBE producir las promos de las categorías Supermercados (id 1) y Farmacias, Perfumerías y Peluquerías (id 4), en el archivo compartido del corpus (`supabase/seed/promociones.json`), que Joaquín completa con el resto de las categorías. Solo entran promos de pago con reintegro vigentes en CABA/AMBA el día de la verificación, más la promo vencida del caso de prueba (FR-008).
- **FR-002**: Cada promo del archivo DEBE tener la forma del tipo `Promocion` de `@vuelto/motor` y pasar `esPromocionPublicable` (campos obligatorios no `null`, al menos una red en débito o crédito, y `tope.monto` `null` o mayor que 0). Además DEBE cumplir los rangos que `esPromocionPublicable` no verifica y que la tabla `promociones` sí exige con `check` (`porcentaje` entre 0 y 100, `vigencia.desde ≤ vigencia.hasta`, `montoMinimo` `null` o ≥ 0, valores de los enums). Un test automático lo verifica sobre todo el archivo.
- **FR-003**: Toda promo del corpus DEBE tener `fuente = 'manual'`, porque la revisa una persona y no viene de la ingesta automática.
- **FR-004**: Cada promo DEBE ser trazable: identificador de la promo en MODO, fecha de verificación contra la fuente, persona que la revisó y, por cada campo que sale de la letra chica, el fragmento de texto de origen (RNF-08). El identificador de MODO va en la columna `fuente_id` (clave natural, `unique (fuente, fuente_id)`), no nulo aunque la base lo permita para `fuente = 'manual'`; los fragmentos, en `fragmentos_fuente`, con la forma `{ campo: texto | null }` que ya tiene la columna. Dónde se guardan la fecha de verificación y el revisor queda abierto (ver `critica.md`).
- **FR-005**: Un dato que la fuente no informa DEBE quedar `null` explícito, nunca inventado ni inferido (constitución §III). En particular, el alcance del tope, la acumulabilidad, la jurisdicción, el monto mínimo y el canal solo se cargan si el texto de la promo los sostiene.
- **FR-006**: El corpus NO DEBE contener promos que el texto o el comercio indiquen como de otra provincia o de una zona fuera de CABA/AMBA. Una promo que no aclara dónde rige entra con `jurisdiccion = null` (decisión 3). NO DEBE contener sorteos, cuotas ni promos sin reintegro con porcentaje.
- **FR-007**: El banco de cada promo DEBE ser el id del catálogo de bancos de MODO, traducido desde `name_bank` comparando sin mayúsculas, sin acentos y sin espacios de más, más una **tabla de alias explícita** para las diferencias que no son de formato. La regla DEBE estar implementada como una función con tests (variantes de formato, alias, un nombre que no resuelve), pensada para que #51 la reutilice. El `bancoId` sale del detalle de la promo (lista de ids del catálogo) y la función de traducción lo contrasta con el `name_bank` del listado. Una promo con varios bancos se carga como una entrada por banco; una promo sin ningún banco determinado (promos de «Bancos adheridos» sin ids), un nivel de cliente dentro de un banco o un banco que no resuelve (o es ambiguo en el catálogo) se EXCLUYE. *(Ajustado por el plan, D3 y D11.)*
- **FR-008**: El corpus DEBE incluir al menos una promo vencida, marcada como tal, para probar que el motor la descarta por vigencia.
- **FR-009**: Cada promo excluida por cualquier regla de esta spec DEBE quedar en un registro de exclusiones con su identificador de MODO, el banco o comercio y el motivo, para poder auditar qué se dejó afuera y por qué (y para el informe de #53).
- **FR-010**: Todo `bancoId` y `categoriaId` del corpus DEBE existir en los catálogos de la base. El seed DEBE cargar los bancos que el corpus de esta parte necesita, con su **id real del catálogo de MODO** y el nombre tal como figura en el catálogo; nunca ids inventados (el seed actual solo trae a Galicia, y con un nombre que difiere del catálogo). Si Joaquín carga bancos en el mismo archivo, ambos conviven sin duplicarse.
- **FR-011**: El corpus DEBE poder cargarse (a) en la base local al reiniciarla desde cero, sin errores y sin red, y (b) en el Supabase alojado con un paso de carga remota idempotente por `(fuente, fuente_id)`: correrlo dos veces no duplica filas ni cambia nada la segunda vez, y una promo que sale del corpus se da de baja (`dada_de_baja_en`), no se borra. El mecanismo concreto (el seed de la base local solo lee SQL, así que el JSON necesita un generador o un script) lo fija el plan, con una única fuente de verdad y una verificación automática de que no se desfasan.
- **FR-012**: Los ids de las promos del corpus DEBEN ser estables entre reinicios y entre el seed y las fixtures del motor, para que una fixture pueda decir de qué promo del seed es copia.
- **FR-013**: DEBE existir una matriz de cobertura de los casos del motor (compartido, exclusivo, no acumulable, `acumulable = null`, días, solo débito, solo crédito, monto mínimo, vencida), con una promo real por caso o la marca «sin ejemplo real vigente» y la fecha. Un caso sin ejemplo real NO se rellena con una promo inventada: queda reportado (el motor ya tiene fábricas sintéticas para sus tests, `packages/motor/src/test/fabricas.ts`).
- **FR-014**: Entre 15 y 20 promos del corpus (sumando la parte de Joaquín) DEBEN copiarse como datos de prueba del motor, en la ubicación que corresponda a la convención real del paquete (hoy los datos de prueba compartidos viven en `packages/motor/src/test/`, no en `packages/motor/test/fixtures/` como dice la issue; el plan fija el lugar y se avisa en la issue). Un test DEBE verificar que cada copia es publicable y coincide con su promo del seed.
- **FR-015**: Los tests DEBEN cubrir, con las fixtures reales, al menos las compras de prueba de SC-004 y el descarte de la promo vencida, sin red (constitución §VI).
- **FR-016**: `docs/product/alcance-mvp.md` DEBE actualizarse con la lista real de cadenas de supermercado con promo vigente en MODO que sirven en CABA/AMBA, las cadenas de la lista previa sin promo vigente, la fecha y el método de verificación, y la consecuencia para la demo. El pendiente de reconciliar la categoría Mercados queda resuelto o con lo que falta.
- **FR-017**: El formato del archivo del corpus DEBE ser determinista (mismo orden, misma indentación) y dejar identificable qué promos cargó cada persona, para minimizar los conflictos de merge entre las dos mitades.
- **FR-018**: El corpus NO DEBE usar ningún modelo de lenguaje. El reinicio local no requiere secretos; la carga remota usa la service role key desde el entorno de quien la ejecuta (nunca en el repo ni en la app, constitución §IV) y es el único camino que la necesita. Ninguna ruta de la app escribe en `promociones`.
- **FR-019**: Si hay un script que baja el JSON de MODO para ayudar a armar el corpus, DEBE respetar el scraping respetuoso (User-Agent identificado, pausa entre pedidos) y NO es parte del camino del seed: el seed lee solo el archivo versionado.

### Key Entities

- **Promo del corpus**: una promoción de reintegro con la forma de `Promocion`, revisada por una persona, con su trazabilidad (identificador de MODO, fecha de verificación, revisor y fragmentos de texto de origen).
- **Banco del catálogo**: banco de MODO con id UUID y nombre; el corpus lo referencia por id.
- **Alias de banco**: equivalencia revisada entre un nombre de banco que trae el listado y el banco del catálogo, para las diferencias que no son de formato.
- **Exclusión**: promo candidata que no entra al corpus, con identificador de MODO, comercio o banco y motivo.
- **Matriz de cobertura**: tabla de los casos del motor y la promo real que ilustra a cada uno, o su ausencia.
- **Fixture del motor**: copia de una promo del corpus usada como dato de prueba, atada a su promo de origen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reiniciar la base local desde cero dos veces seguidas termina con éxito y deja el mismo número de promos de Supermercados y Farmacias en `promociones`, sin conexión a internet.
- **SC-002**: El 100% de las promos del corpus pasa la validación de publicable del motor y apunta a un banco y una categoría existentes en los catálogos.
- **SC-003**: El 100% de las promos del corpus tiene identificador de MODO, fecha de verificación, revisor y fragmento de origen para cada campo de letra chica; y el 100% de las promos candidatas descartadas figura en el registro de exclusiones con su motivo.
- **SC-004**: Con las fixtures reales, el motor resuelve correctamente, con el resultado esperado escrito en el test, al menos tres compras de prueba: una de supermercado con un banco y una tarjeta que tienen promo, una de farmacia, y una en la que la promo está vencida o no rige ese día y por eso se descarta.
- **SC-005**: Cada uno de los casos de la matriz tiene una promo real o está marcado explícitamente como sin ejemplo vigente; cero promos del corpus fueron creadas solo para llenar un caso.
- **SC-006**: Entre las dos partes del reparto, el archivo del corpus llega a 40–60 promos reales vigentes (criterio de la issue), o el informe de cobertura explica con datos por qué no se alcanza.
- **SC-007**: Una persona que no cargó una promo puede verificarla contra la fuente en menos de 2 minutos usando solo lo registrado en la promo.

## Assumptions

- **Fecha de referencia**: el relevamiento previo a esta spec se hizo el 2026-11-02 contra la API pública de MODO (sin autenticación, `robots.txt` lo permite). De 2412 tarjetas de Supermercados, 132 estaban vigentes y 117 eran promos de pago únicas; de 1240 de Farmacias, 55 promos de pago vigentes. El listado trae mucho histórico: se filtra por estado vigente y tipo de promo de pago.
- **Grandes cadenas**: Coto, Carrefour, Jumbo, Disco, Vea y Día tenían 0 promos vigentes ese día; ChangoMás, 1 (Credicoop, Cabal, solo jueves). Las cadenas vigentes que sirven en CABA/AMBA son, a falta de confirmar jurisdicción, Paladini, Tiendas de Cercanía, The Food Market, Tienda Nova, Alvear Supermercados, Cooperativa Obrera, Unicoop y Ferias de la Ciudad. La mayor parte de lo vigente en Supermercados es de supermercados regionales de Córdoba (Villa María, Río Cuarto, La Carlota, Lario y otros) y queda fuera por la decisión 2.
- **Banco**: los nombres que trae el listado no siempre coinciden con el catálogo (verificado el 2026-11-02 con el catálogo de 82 bancos): "Banco Macro" y "Macro" frente a "Macro"; "Banco Hipotecario" frente a "Hipotecario"; "BNA" frente a "Banco Nación"; "Ciudad / Buepp" cubre dos bancos del catálogo (Ciudad y Buepp); "Bancos adheridos" no es un banco. Por eso la comparación normalizada que sugiere la issue no alcanza sola y se agrega la tabla de alias. Se avisa a #51 porque comparte la regla.
- **Segmentos de un banco**: los beneficios por nivel de cliente (Macro Selecta, «Nivel 2», «Nivel 3») no se pueden representar con el contrato de tipos actual (un banco por promo) ni con el perfil del usuario (banco, tipo, red). Se excluyen en vez de arriesgar recomendar un beneficio que la persona no tiene. Si el equipo quiere representarlos, es un cambio de contrato (issue aparte).
- **Letra chica** (resuelve el bloqueante B1 de `critica.md`): la tarjeta del listado no trae los legales, pero MODO sí tiene un endpoint de detalle por promo: `GET /promos/api/rewards/v2/benefit/<slug>` (el `slug` es el de la tarjeta del listado; los que se probaron antes eran rutas distintas y daban 404). Verificado el 2026-11-02 con dos promos, devuelve los **legales completos** (`terms_and_conditions`), los **límites estructurados** (`limits.period_cap`: monto, período de reinicio y base por usuario), el **monto mínimo** (`requirements.amount_range`), el **canal** (`conditions.payment_flow`: presencial u online), los **días y las redes por tipo de tarjeta** y la lista de **bancos por id del catálogo** (`requirements.banks.list`), además de `GET .../<slug>/banks`. Lo que sigue sin estar estructurado (tope compartido o exclusivo entre promos, acumulabilidad, jurisdicción) se lee de los legales: por ejemplo, la promo de Tienda Nova–Macro dice «NO ACUMULA CON OTRA PROMOCIÓN» (caso real de promo no acumulable). El detalle es la fuente que revisa la persona; el crudo de cada promo usada se versiona fechado junto al corpus (RNF-08, hallazgo M9). `robots.txt` de MODO permite la ruta y el relevamiento se hace con User-Agent identificado y pausa entre pedidos.
- **Pago con MODO**: los legales revisados (ICBC–Petrelli, Macro–Tienda Nova) condicionan el beneficio a **pagar a través de MODO** (QR o NFC), no con la tarjeta física a secas. Esa condición no está en el contrato de tipos ni en el perfil. Se carga la promo igual, porque es lo que MODO publica como beneficio de la tarjeta, y se deja registrada como limitación del corpus para el pitch (hallazgo M10; si el equipo prefiere otra cosa, es una decisión aparte).
- **Identidad de la promo**: `fuente_id` es el `slug` de la promo en MODO (estable y legible); dos tarjetas del listado con el mismo `slug` o el mismo id de beneficio son la misma promo (también si aparecen en secciones distintas de la web). Cuando una promo se parte en varias entradas (por banco, categoría o comercio), el `fuente_id` lleva un sufijo determinista (`<slug>#b-…`, `.c-…`, `.m-…`; plan, D3). Un `slug` que no existe más en el detalle se excluye.
- **Bancos por id**: como el detalle trae el banco como id del catálogo, el corpus toma el `bancoId` de ahí y usa la tabla de alias solo para verificar que coincide con el `name_bank` del listado. Una promo con varios bancos se parte en una entrada por banco; solo se excluye la que no tiene ningún banco determinado o es un nivel de cliente nombrado (FR-007; plan, D3).
- **«Exclusivo con»**: en la tarjeta del listado significa exclusividad de banco, **no** el alcance del tope. El alcance del tope (`compartido` o `exclusivo`) y la acumulabilidad solo salen de la letra chica.
- **Fixtures**: la issue dice `packages/motor/test/fixtures/`, pero el paquete guarda sus datos de prueba en `packages/motor/src/test/` y no los compila a `dist/`. Se sigue la convención real del paquete y se avisa en la issue.
- **Catálogo crudo**: la issue #34 menciona `docs/product/data/modo-bancos-raw.json`, pero ese archivo no está en `main`. El plan decide si se versiona una copia fechada del catálogo (de la que salen los ids del seed) o si se toman los ids directo de la API; en ambos casos con fecha y fuente.
- **Reparto con Joaquín**: se coordina en la issue qué casos del motor cubre cada uno y quién carga los bancos de sus categorías. Un solo archivo compartido y, si hace falta, un PR por persona.
- **Vigencia hasta el pitch**: se revalida el corpus antes de la demo; una promo que venció se mueve al caso «vencida» o se da de baja (`dada_de_baja_en`), nunca se borra. La fecha del pitch no está fijada en esta spec.
- **Nombres de bancos del seed actual**: el catálogo llama «Galicia» a lo que el seed actual llama «Banco Galicia»; el seed adopta el nombre del catálogo.
- **Alcance del motor**: no se cambia su lógica. Si al cargar promos reales aparece un caso que el motor no puede representar, se registra como hallazgo, no se resuelve en esta spec.
- **Dependencias resueltas**: #33 (contrato de tipos), #34 (esquema con RLS y seed de catálogos) y #9 (secrets) están mergeadas.
