# Research: Corpus de promociones sembrado a mano desde MODO

Fase 0 del plan. Cada decisión resuelve un hallazgo de [critica.md](critica.md) (A = alto, M = medio). Los datos salen de una muestra de 14 detalles de promo (de 111 comercios distintos entre las dos categorías) y del relevamiento completo del listado, ambos del 2026-11-02.

## Lo que se verificó en la muestra

| Hecho | Evidencia | Consecuencia |
|---|---|---|
| El detalle trae lo estructurado y los legales | `GET /promos/api/rewards/v2/benefit/<slug>`: `terms_and_conditions` (HTML), `offers[0].limits.period_cap`, `.requirements.amount_range.min`, `.requirements.banks.list`, `conditions.payment_flow`, `conditions.schedule` | Todo lo que no es prosa se mapea por código (constitución §III). |
| `requirements.banks.list` trae ids del catálogo | Petrelli: 1 id. Doña Catalina: **24 ids** | El banco sale del detalle, no de un nombre. Una promo con varios bancos se parte en una entrada por banco (D3). |
| `reset_by` toma los valores `month`, `week` y **`day`** | Mensual (Supervielle, Hipotecario), semanal (Petrelli, A La Mesa), diario (Monarca, Cooperativa Obrera, La Coope) | El motor solo conoce mensual, semanal y por compra. El diario se aproxima (D8). |
| `offer_caps` viene vacío en toda la muestra | 14 de 14 | No sirve para detectar tope compartido. El alcance sale de la prosa (D5). |
| La prosa decide la acumulabilidad | «NO ACUMULABLE CON OTRAS PROMOCIONES» (A La Mesa, Monarca, Hipotecario–Bembo/Delimart, Cooperativa Obrera, Tienda Nova); «podrá ser acumulable con otros descuentos bancarios» (Doña Catalina) | Hay ejemplos reales de `false` y de `true`; el resto queda `null`. |
| La prosa casi nunca dice dónde rige | Las menciones de «CABA» son el domicilio legal del banco (por ejemplo «Florida 99, CABA»), no una zona de validez | `jurisdiccion` queda `null` en la mayoría (decisión 3 de la spec). La exclusión por zona sale del comercio, no del texto (D4). |
| Las fechas estructuradas pueden contradecir la prosa | Petrelli: `schedule.stop_date = 2026-12-31`, el legal dice «hasta el 30/09/2026» | Prevalece la letra chica (US2-5). Es un ejemplo real de por qué la revisión es humana, y es candidata natural a la promo «vencida» del corpus. |
| La tarjeta `0` no significa «sin tope» | Tienda Nova–Macro: tarjeta `0`, detalle y legal `$10.000 por usuario por mes` | Siempre se lee el detalle (decisión 5 de la spec). |
| «Exclusivo con» en la tarjeta es exclusividad **de banco** | La tarjeta lee `Exclusivo con · 10000 · ICBC` | **No** es el alcance del tope. Corrige una lectura equivocada anterior: el alcance del tope (`compartido` o `exclusivo`) no sale de la tarjeta. |
| Condiciones que el contrato no representa | `segmentations.whitelist` incluye `user_national_id` (clientes con sueldo en el banco), `bin` y `mcc`; el legal exige pagar con MODO | Se registran como limitaciones (D10). Solo se excluyen los **niveles** declarados por nombre (Selecta N2). |
| `robots.txt` | `Disallow: /api/` y no `/promos/api/`; la ruta no coincide | Permitido por omisión, no autorizado expresamente. Se mantiene User-Agent `VueltoBot (UADE)` y pausa ≥ 1 s. |

## Decisiones

### D1 — Mecanismo JSON → base y fuente de verdad (A2, M13)

**Decisión.** La fuente de verdad es `supabase/seed/promociones.json`. Un generador (`corpus:generar`) escribe `supabase/seed/promociones.sql`, `supabase/seed/bancos.sql` y `packages/motor/src/test/corpus.ts`. `config.toml` pasa a `sql_paths = ["./seed.sql", "./seed/bancos.sql", "./seed/promociones.sql"]`. Un test de `ingesta/` regenera en memoria y compara byte a byte con lo versionado; si difieren, falla y dice qué comando correr. La carga remota (`corpus:cargar`) lee el mismo JSON.

**Por qué.** `db reset` solo lee SQL. Generar el SQL deja que **el job `supabase-rls` ya existente valide cada fila contra los `check` y las claves foráneas reales de Postgres**, dos veces seguidas, sin escribir nada nuevo en el CI. Un script posterior al reset exigiría credenciales y dejaría de ser un solo comando.

**Alternativas.** (a) Solo script de carga: pierde la validación gratis del CI y rompe el criterio «`db reset` las carga». (b) SQL escrito a mano como fuente de verdad: dos mitades editando SQL y sin tipos. (c) El JSON como fuente y nada derivado: no hay reinicio local con corpus.

**Transaccionalidad (M13).** Los archivos SQL se ejecutan en el reset: una fila inválida hace fallar el reset entero, no carga a medias. La carga remota calcula todo en memoria, valida **antes** de escribir y falla sin escribir nada si el archivo es inválido. La escritura va en **lotes de hasta 50 filas, cada uno en su propio pedido (un commit por lote)**, nunca en una sola transacción: es el contrato de escritura que fija el PR #91 en `04-infrastructure.md` (cada lote se confirma en menos de 5 minutos, porque la app relee con un margen de 10 minutos sobre `actualizada_en`). Como es idempotente, repetirla tras un corte termina la tarea.

**Carga remota.** `--dry-run` por defecto: imprime qué insertaría, actualizaría y daría de baja. `--aplicar` escribe. Lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno (`node --env-file=supabase/.env`). Antes de escribir `promociones`, hace *upsert* de `categorias` (de `CATEGORIAS_MODO`) y de `bancos` (del catálogo crudo), porque en el Supabase alojado el `seed.sql` no corre. Baja = `dada_de_baja_en = now()` para las filas `manual` que ya no están en el archivo; si reaparece, vuelve a `null`. Nunca hace `delete`.

### D2 — Convivencia con la ingesta (A3)

**Decisión.** El corpus manual y las promos que publique #51 coexisten sin duplicarse con dos reglas, una para cada lado:

- **#51** (al publicar `('modo', X)`): si existe `('manual', X)` activa, la da de baja en la misma operación.
- **La carga remota**: no escribe ni reactiva una entrada manual cuyo `fuente_id` ya existe como `modo` activa.

El corpus manual **no se borra** del JSON: sigue siendo la verdad contra la que #53 mide al extractor.

**Por qué.** Con ambas filas activas el motor vería dos promos iguales y el tope restante saldría optimista (constitución §V).

**Alternativa descartada.** Que el manual solo exista en una base de demo: la demo ya corre contra la base alojada, que es la que va a recibir la ingesta.

### D3 — Cómo se escribe `comercio`, y las promos con varios comercios, bancos o categorías (A5, M7)

**Decisión (comercio).** Nombre de marca corto como lo diría una persona o aparece en el ticket: sin prefijos genéricos («Supermercados», «Farmacias», «Super»), sin sufijos societarios («S.A.»), con los acentos y las mayúsculas habituales. Ejemplos: `Paladini`, `Farmacity`, `ChangoMás`, `Petrelli`. El motor compara normalizado (sin acentos ni mayúsculas), así que solo importa el nombre base. `null` solo si la promo vale en **toda** la categoría, y nunca si la fuente nombra comercios.

**Decisión (varios comercios).** Si el detalle nombra una lista **cerrada** de comercios, se carga **una entrada por comercio**; todas comparten el mismo grupo de tope si el tope es el mismo beneficio (D5). Si la lista es **abierta** («comercios adheridos», «farmacias adheridas»), se **excluye** con motivo `comercio_no_determinado`.

**Decisión (varios bancos).** `requirements.banks.list` con varios ids se parte en **una entrada por banco**. El tope es por usuario, así que todas comparten grupo de tope (el saldo se descuenta una sola vez aunque la persona tenga tarjetas de varios bancos). Sin ningún banco en la lista («Bancos adheridos» sin ids) se excluye con motivo `banco_no_determinado`.

**Decisión (varias categorías).** Una entrada por categoría que la promo lista, con el comercio nombrado; si lista más de tres y el comercio es genérico («A La Mesa», 11 categorías) se excluye como `transversal`. Cada categoría tiene dueño (Santiago 1 y 4); las entradas de las demás las carga Joaquín.

**Convención de `fuente_id`.** `<slug>` y, si la promo se parte, `<slug>#` seguido de las partes en este orden, separadas por `.`: `b-<8 primeros hex del bancoId>`, `c-<categoriaId>`, `m-<comercio en kebab sin acentos>`. Es determinista y legible, y evita colisiones entre las dos mitades.

**Revisión de la spec.** Esto reemplaza la regla de la spec de excluir toda promo con más de un banco (FR-007, US3-4): ahora se excluye solo si no hay ningún banco determinado, o si es un **nivel** nombrado (Selecta). «Ciudad / Buepp» del listado se resuelve por el detalle.

### D4 — Jurisdicción y zona (A7)

**Decisión.** Una promo sin zona en la letra chica entra con `jurisdiccion = null` (decisión 3). Se **excluye** si el comercio, verificado en su sitio, **no tiene sucursales en CABA ni en el conurbano**, con motivo `fuera_de_zona` y la fuente anotada. `pba` solo se carga si el texto dice «Provincia de Buenos Aires» de forma general; una cadena de otra ciudad de la provincia (Bahía Blanca) se excluye aunque el enum la dejaría pasar. `nacional` solo si el texto dice «República Argentina» **y** el comercio opera en la zona.

**Verificaciones obligatorias antes de listarlas en `alcance-mvp.md`**: Cooperativa Obrera (cadena de Bahía Blanca y la Patagonia), Unicoop (cooperativa de Córdoba), Petrelli, Monarca, Doña Catalina, Tiendas de Cercanía, The Food Market, Tienda Nova, Alvear, Ferias de la Ciudad y las farmacias menores. Cada una queda con una URL de respaldo en `revision.notas`.

### D5 — `grupoTopeId` y tope compartido (A8)

**Decisión.** `alcance: "compartido"` ⇒ `grupoTopeId` obligatorio, y viceversa (el motor ignora el grupo si el alcance no es `compartido`). Formato: `<banco>:<clave>` donde `<banco>` es el nombre del banco en kebab (`macro`, `supervielle`) y `<clave>` identifica el saldo (por ejemplo, el slug base de un beneficio partido, o una clave corta de la letra chica, como `modo-mensual`). Todos los ids se registran en `supabase/seed/grupos-tope.json` con banco, clave, la frase de la letra chica que lo sostiene y quién lo creó. Se consulta el registro antes de crear uno; el dueño es el que lo creó primero.

**Detección.** `offer_caps` viene vacío, así que el alcance compartido solo se lee de la prosa («tope compartido», «en conjunto con otras promociones»). Si nadie lo encuentra en el corpus, la matriz lo marca «sin ejemplo real vigente» (FR-013).

**Límite.** Si un grupo tiene miembros fuera del corpus (excluidos), el saldo sale optimista. Se anota en `corpus-semilla.md`.

### D6 — Qué bancos se siembran (M6)

**Decisión.** El catálogo completo de **82 bancos**, con id y nombre tal cual los publica MODO, fechado (`docs/product/data/modo-bancos-raw.json`, que la issue #34 citaba pero no está en `main`). El generador produce `supabase/seed/bancos.sql` desde ese JSON y se saca el insert suelto de Galicia de `seed.sql` (su nombre difería del catálogo: «Banco Galicia» frente a «Galicia»).

**Por qué.** El perfil de la demo (spec 001) deja elegir banco entre los sembrados: con solo los bancos usados por el corpus, una persona con Santander no podría declarar su tarjeta. Con 82 filas reales no hay ids inventados.

**Alternativa.** Solo los 32 con `on_hub_list`: filtro de presentación, no de datos; cambia si MODO cambia su hub.

### D7 — Esquema del archivo y validación (M1)

**Decisión.** Cada entrada es `Promocion` (sin `id`) más un bloque de trazabilidad que **no** va a la base. Se valida en tiempo de ejecución, porque un JSON importado no tiene las uniones literales de TypeScript. El validador (`validar.ts`) comprueba, además de `esPromocionPublicable` y `camposInvalidos` del motor: enums (`Red`, `Dia`, `Jurisdiccion`, `CanalPromo`); fechas ISO calendario reales y `desde ≤ hasta`; `0 < porcentaje ≤ 100` (el `check` de la tabla admite 0; el corpus no); coherencia del tope (`monto` ⇒ `periodo`; `compartido` ⇔ `grupoTopeId`; `monto > 0`); `fuenteId` no vacío y único; `bancoId` en el catálogo; `categoriaId` en `CATEGORIAS_MODO`; `comercio` no vacío si no es `null`; y que todo campo cargado desde la letra chica tenga su fragmento (SC-003). Las fixtures generadas son `Promocion[]` tipadas, así que `tsc` verifica la forma de lo que sale del JSON.

Detalle de campos: [data-model.md](data-model.md).

### D8 — `tope.periodo` (M2)

**Decisión.** El período sale de `limits.period_cap.reset_by`: `month` → `mensual`; `week` → `semanal`; `day` y `promo` **no se aproximan: se proponen para excluir** con `tope_no_representable`. *(Decisión del equipo del 2026-11-02, tras la observación de `rules-guardian`: un tope diario tratado como «por compra» o como semanal puede sobrestimar el saldo restante, porque el motor no acumula consumo entre compras del mismo día; es preferible perder 4 promos a prometer de más, constitución §V. Antes se cargaba como «por compra» con una nota de aproximación.)* Un `transaction_cap` mayor que 0 sin tope por período es `por_compra`. **Nunca** se deja `monto` con `periodo = null`: el motor usaría `mensual` en silencio. Un tope diario sin monto (0) no es un tope y no se excluye. Si la letra chica contradice a `reset_by` (Petrelli dice «por día» y la estructura «week»), prevalece la letra chica (US2-5) y se registra la contradicción.

**Revisión de la spec.** La regla de la spec de «excluir si hay contradicción» (caso de borde del tope) queda reemplazada por esta: se carga lo de la letra chica y un reinicio que el motor no representa se propone para excluir, sin aproximar.

### D9 — Ids estables (M3)

**Decisión.** `id` es un UUID v5 calculado con `node:crypto`, desde un espacio de nombres fijo en el código y el texto `manual:<fuenteId>`. No se escribe en el JSON: lo calcula el generador y la carga. El seed y las fixtures usan la misma función, así que coinciden siempre y un merge no puede reescribirlo. El validador exige `fuenteId` único y no vacío (la base lo permite `null` para `manual`).

### D10 — Dónde se anotan las limitaciones del contrato (M10)

**Decisión.** Un solo documento, `docs/product/corpus-semilla.md`, con tres secciones: matriz de cobertura (FR-013), resumen del registro de exclusiones (el detalle va en `supabase/seed/exclusiones.json`, validado por un test: cada exclusión tiene un motivo del conjunto cerrado) y limitaciones. Limitaciones ya conocidas: promos que exigen pagar con MODO (QR o NFC); beneficios solo para clientes con sueldo en el banco (`user_national_id`); topes diarios aproximados; saldos de grupo optimistas; vigencia verificada en una fecha.

**Motivos de exclusión** (conjunto cerrado): `fuera_de_zona`, `comercio_no_determinado`, `banco_no_determinado`, `nivel_de_cliente`, `transversal`, `no_es_reintegro`, `tope_no_representable`, `vencida_en_la_fuente`, `detalle_inexistente`, `otro` (con nota obligatoria).

### D11 — Dónde vive la traducción de banco (M5)

**Decisión.** `ingesta/src/corpus/bancos.ts` (`resolverBanco`) y `bancos-alias.ts`. `normalizar` se **exporta** del motor (`index.ts`) en vez de copiarla: una definición, sin riesgo de que las dos diverjan. `resolverBanco` normaliza nombre y catálogo, resuelve alias explícitos, y **si dos entradas del catálogo normalizan igual o el alias apunta a un nombre que no existe, falla** (ambigüedad = excluir). El detalle trae el banco por id; la función sirve para #51 y para contrastar el `name_bank` del listado con ese id.

**Documentación a corregir**: el comentario de `BancoId` en `tipos.ts` y `docs/architecture/01-data-models.md` (§ `bancoId`), que dicen que la traducción es solo normalizada. *(Hecho en T016.)*

**Resultado sobre datos reales (T017, 2026-11-02).** Sobre las 186 tarjetas de pago vigentes de las categorías 1 y 4 (21 nombres de banco distintos), `resolverBanco` con el catálogo de 82 resuelve 165. Las 21 que no, son exactamente las esperadas: «Bancos adheridos» (13), «Ciudad / Buepp» y «Ciudad/Buepp» (6) y «Macro Selecta» (2). Tabla de alias final: `Banco Macro`, `Banco Hipotecario`, `Banco Comafi`, `Banco Credicoop`, `BNA` y `Columbia`. Hay un test contra el catálogo real que falla si un alias deja de apuntar a un banco que existe.

### D12 — Fecha y revisor fuera de la base (A9)

**Decisión.** Van en el bloque `revision` del JSON versionado (`verificadaEl`, `revisor`, `notas`), que el generador y la carga descartan. Git ya da la autoría. La base solo recibe `fragmentos_fuente` (`{ campo: texto | null }`, la forma que #53 va a comparar). `captura_cruda_id` queda `null` para las manuales.

### D13 — Fechas (M8)

**Decisión.** Se usa `conditions.schedule.start_date` y `.stop_date`, que ya son fechas calendario en hora de Argentina. Solo si hubiera que convertir un instante UTC (el listado), se usa `fechaArgentina` del motor (ya exportada), con casos de prueba en el borde de medianoche. Los días salen de `days_of_week` (`monday`…); siete días equivalen a `null`.

### D14 — Fixtures y `ahora` fijo (M4)

**Decisión.** El generador emite `packages/motor/src/test/corpus.ts` con las entradas marcadas `fixture: true` (hasta 8 a 10 por mitad, 15 a 20 en total), tipadas como `Promocion[]` y con `fuenteId`. No es una copia a mano: es una **foto fechada y generada**, con verificación de desfase. Los tests del motor usan un `AHORA` fijo (`2026-11-04`) y se escriben contra esas fixtures, así que cambiar el corpus no cambia sus resultados salvo que se quite una fixture seleccionada. Esto responde a la objeción de la crítica de que «copiar y exigir igualdad es importar»: la copia existe para que el motor no dependa de `ingesta/` ni de `supabase/`.

### D15 — Crudo versionado (M9)

**Decisión.** Por cada promo usada, `supabase/seed/crudo/<slug>.json` con `{ capturadoEl, url, tarjeta, detalle }`. ~170 archivos de ~6 KB (≈1 MB). Cumple RNF-08 para las manuales (que no tienen `captura_cruda_id`) y es la entrada que #53 le da al extractor para medir su precisión.

### D16 — Qué se cambia fuera de `ingesta/` y `supabase/` (M12)

`docs/design/DESIGN.md` §9 usa «Coto, miércoles, $24.500» y los fixtures de la app usan Coto, Jumbo y Carrefour, que no tienen promos vigentes en MODO. Se agrega una nota en `DESIGN.md` §9 y se actualiza la fila de RF-18 en `requisitos.md` («falta verificar sucursales reales»). **No** se cambian los fixtures de la app ni la compra de ejemplo: es decisión de la spec 006 y del diseño. Se abre una issue (o se avisa en #35) para que el equipo decida si el pitch muestra un supermercado con promo real.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las 2 aserciones `count` de `rls.test.sql` (líneas 80 y 127) rompen con el corpus cargado | Pasan a contar solo las filas del propio test (J7); se corre `supabase test db` antes de abrir el PR. |
| El volumen de revisión manual (~170 candidatos) | Helper que deja un borrador por promo con los fragmentos resaltados, tandas por prioridad y SC-007 como muestra fija, no como medición de todo. |
| MODO cambia el formato del detalle | `mapear.ts` falla de forma explícita ante campos que no reconoce, sin cargar a medias; los crudos fechados permiten reproducir. |
| Una promo vence antes del pitch | Se revalida antes de la demo (carga remota con baja); las fixtures tienen `AHORA` fijo. |
| Conflictos de merge con Joaquín en el JSON | Orden y formato deterministas (J6); el generador reescribe el archivo y cada uno solo toca las entradas de sus categorías. |
| `@supabase/supabase-js` en `ingesta/` aumenta la superficie | Es el único runtime nuevo, solo en el script de carga, con el cliente inyectable en los tests; #50 y #51 lo van a necesitar igual. |
