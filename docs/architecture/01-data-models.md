# Data models

Modelo relacional (Postgres vía Supabase). El esquema base (perfiles, bancos,
categorías, medios de pago, comercios habituales, capturas crudas,
promociones y compras, cada una con su RLS) está en `supabase/migrations/`
(issue #34); el detalle de columnas, constraints y quién lee/escribe cada tabla
está en `specs/007-esquema-supabase-rls/data-model.md`. Contactos e invitaciones
(ADR-008) están en `supabase/migrations/20261115000001_contactos.sql`, con su
detalle en `specs/016-gasto-grupo/data-model.md`.

## Promoción

Atributos que necesita sí o sí (contexto §5):

| Campo | Nota |
|---|---|
| Jurisdicción | `nacional`, `caba`, `pba` u `otra_provincia` (o `null` si no se informa). El MVP (CABA y AMBA) acepta `nacional`, `caba`, `pba` y `null`; las de otra provincia se descartan (`JURISDICCIONES_VALIDAS`, issue #36) |
| Tope de reintegro | Con su período, su banco y su alcance (compartido entre promociones del mismo banco, o exclusivo de esta) |
| Vigencia | Fecha de inicio y fin, días de la semana aplicables |
| Comercios y sucursales adheridas | No todas las sucursales de una cadena participan. En el MVP solo comercio; sucursales fuera de alcance (ver abajo) |
| Tarjetas incluidas / excluidas | En el MVP solo incluidas; excluidas fuera de alcance (ver abajo) |
| Acumulable | Si se puede sumar a otro beneficio sobre la misma compra. Default: no |

Campos ausentes en la fuente se guardan `null` explícito — nunca inferidos
(ver regla en `CLAUDE.md`).

El contrato de tipos que usan el motor, la app, la ingesta y las Edge Functions está
en `packages/motor/src/tipos.ts` (issue #33). Decisiones que fija:

- **Campos obligatorios para publicar** (RF-16): `bancoId`, `categoriaId`,
  `porcentaje`, `vigencia.desde`, `vigencia.hasta` y `tarjetas` (con al
  menos una red en débito o crédito). Si alguno falta, la ingesta descarta
  el borrador (`esPromocionPublicable`, `camposFaltantes`). El resto puede
  ser `null`, incluido `tope.monto`: el motor lo trata como "tope no
  informado".
- **`bancoId`** es el `id` del catálogo de bancos de MODO
  (`GET /promos/api/rewards/banks`), un UUID string; no el nombre ni el
  `bcra_code`. Es la misma clave que usa el medio de pago del perfil
  (`specs/001-perfil-billeteras/spec.md`). El listado de MODO solo trae el
  nombre del banco (`name_bank`), pero el **detalle** de cada promo
  (`GET /promos/api/rewards/v2/benefit/<slug>`) lo trae por id en
  `requirements.banks.list`: de ahí sale el `bancoId` cuando se puede.
  Cuando hay que traducir un nombre (el extractor de #51 y el contraste que
  hace la ingesta con el rótulo del listado), se compara contra `name` del catálogo **normalizado** (minúsculas,
  sin acentos, sin espacios de más) **más una tabla de alias explícita**
  (`ingesta/src/corpus/bancos-alias.ts`), porque la comparación normalizada
  sola no alcanza: el listado dice "Banco Macro", "Banco Hipotecario" o "BNA"
  donde el catálogo dice "Macro", "Hipotecario" y "Banco Nación". Nunca se
  compara por coincidencia parcial. Si no resuelve o es ambiguo ("Ciudad /
  Buepp" son dos bancos del catálogo; "Bancos adheridos" no es un banco),
  `bancoId` queda `null` y la promo no se publica. Un nivel de cliente dentro
  de un banco ("Macro Selecta") tampoco se resuelve: el perfil no lo distingue.
- **Categorías como datos**: `categoriaId` es el id numérico de MODO y el
  catálogo vive en una tabla `categorias`, sembrada desde MODO como
  `bancos`. Una categoría nueva no requiere cambiar el motor.
- **Red**: los 9 valores tal cual los usa MODO en `debit_list` /
  `credit_list`.
- **Monto opcional** (issue #75): `CompraPropuesta.monto` es `number | null`,
  requerido y nullable. Con `null` el motor recomienda igual: ahorro $0, el
  tope disponible con su base y el orden por porcentaje y tope disponible
  (`specs/002-motor-recomendar/contracts/recomendar.md`, «Sin monto»).

**Fuera de alcance del MVP:** sucursales adheridas y tarjetas excluidas.
MODO no las trae estructuradas y ninguna historia del MVP las usa; quedan
para cuando se sumen fuentes que las informen.

## Compra (registro por ticket, contexto §4.4)

| Campo | Nota |
|---|---|
| Monto | — |
| Comercio | — |
| Medio de pago | Si el ticket no lo identifica, se pregunta — nunca se infiere |
| Promoción aplicada | — |
| Descuento obtenido | — |
| Reintegro esperado | No se usa en el MVP, habilita seguimiento futuro sin migración |
| Fecha estimada de acreditación | Ídem |
| Origen del registro | `ticket` \| `excepción` (usuario acepta una recomendación) \| `manual` |

La imagen del ticket **no se persiste** (se manda a Gemini y se descarta).
Sí se persiste el texto extraído, junto al registro.

Decisiones del esquema (issue #34): una promoción que deja de estar en la
fuente **se da de baja** (`dada_de_baja_en`), no se borra, para que las compras
conserven su referencia y la baja llegue por sincronización; `actualizada_en` la
fija un trigger y solo se mueve si cambia algún valor; la clave natural de una
promo de MODO es `(fuente, fuente_id)`.

## `capturas_crudas` (tabla de ingesta)

Contenido crudo de cada captura de Playwright, con la service role key.
Es la materia prima que Gemini procesa en la etapa de extracción. Se
persiste junto con la extracción y el fragmento fuente de cada campo, para
trazabilidad (no hay aprobación humana, ADR-005).

## Perfil de usuario (contexto §4.1)

Declarado manualmente, en tres capas de prioridad:

1. **Medios de pago** (obligatoria) — billeteras, bancos y tarjetas que tiene
2. **Comercios recurridos** (alta) — dónde compra habitualmente
3. **Gustos y preferencias** (diferible, no entra al MVP)

## Grupo (contexto §4.5 — nivel 1 del alcance, ADR-008, spec 016)

Integrantes: quien pide, contactos vinculados y, opcionalmente, personas sin
cuenta, solo con un nombre que no sale del teléfono ni se guarda. El motor
(`recomendarGrupo`) evalúa a cada integrante con cuenta con su propio tope y
decide sobre las cifras que se muestran. Un integrante sin cuenta no paga, pero
cuenta para la división. El grupo no es una tabla: existe solo durante el
cálculo.

## Invitación (`invitaciones`)

| Campo | Nota |
|---|---|
| Emisor | Usuario que generó el link/QR |
| Hash del token | `sha256` en hexadecimal (texto: la regla de estructura prohíbe columnas binarias). Nunca el token en claro |
| Vence | 24 h desde la creación |
| Usada | Fecha de aceptación, `null` si no se usó. Un solo uso |

Como mucho una invitación sin usar por cuenta: crear otra borra la anterior.

## Contacto (`contactos`)

Vínculo simétrico entre dos cuentas (un par ordenado `usuario_a < usuario_b`,
sin duplicados ni auto-vínculo), con fecha de creación. Se borra si
cualquiera de los dos lo quita o borra su cuenta. Las dos tablas llevan RLS
en la misma migración que las crea: `contactos`, visible y borrable por sus
dos integrantes; `invitaciones`, visible solo para su emisor. Crear, ver y
aceptar invitaciones, y listar los contactos con su nombre, pasa por funciones
`security definer` en el schema `contactos_privado`, con envoltorios
`security invoker` en `public` (ADR-008 §Actualización).

Los datos de un contacto no se leen por RLS: la Edge Function
`recomendar-grupo` llama a `datos_de_contactos`, que verifica el vínculo con
`auth.uid()`, exige la clave de servidor y devuelve solo el nombre para
mostrar, los medios de pago y las compras del período reducidas a promoción,
fecha, monto y descuento (ver `../product/privacidad.md`). El perfil suma el
campo **nombre para mostrar**, que elige el usuario.
