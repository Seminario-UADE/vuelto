# Contrato: formato del corpus y comandos

Interfaces que esta feature expone a quien arma el corpus (Santiago, Joaquín) y a las issues que lo consumen (#50, #51, #53). El formato de los archivos está en [data-model.md](../data-model.md); acá se fijan los comandos y sus garantías.

Todos los comandos son scripts del workspace `ingesta`, se corren desde la raíz del repo y **no necesitan red ni secretos salvo `corpus:relevar` (red, sin secretos) y `corpus:cargar --aplicar` (red y service role)**. `npm run … -w ingesta` ejecuta el script con `ingesta/` como directorio de trabajo, así que **ninguna ruta del repo se resuelve contra el directorio actual**: los crudos, el catálogo y los archivos del corpus se buscan desde la raíz del repo (un `--carpeta` explícito sí se resuelve contra el directorio actual).

## `npm run corpus:relevar -w ingesta -- --categorias 1,4`

Baja el listado de MODO de las categorías indicadas, se queda con las promos vigentes de tipo pago, baja el detalle de cada una y guarda el crudo.

| Aspecto | Garantía |
|---|---|
| Red | `GET /promos/api/rewards/slots?...&categories=<id>&page=<n>&limit=100` y `GET /promos/api/rewards/v2/benefit/<slug>` |
| Ritmo | User-Agent `VueltoBot (UADE)`; pausa configurable con `--pausa-ms`, mínimo 1000 |
| Filtro | `calculated_status = RUNNING` y `trigger_type = payment_promotion`; descarta `installments` y `payment_scratch` |
| Identidad | Dos tarjetas con el mismo `slug` o `promo_id` son la misma promo |
| Salida | `supabase/seed/crudo/<slug>.json` y un resumen por consola (candidatas, por categoría y por banco) |
| Fallo | Cada crudo se escribe completo o no se escribe. Un 404 del detalle se cuenta en `detalleInexistente`; un error de servidor o de red que no se recupera tras los reintentos se registra en `detalleConError` y no frena a las demás, pero el comando **sale con código 1** porque el relevamiento quedó incompleto. Un formato que el mapeo no reconoce se informa con su ruta y no invalida el crudo (se guarda para poder reproducirlo) |
| Idempotencia | Repetirlo el mismo día reescribe los mismos archivos |

## `npm run corpus:borrador -w ingesta -- <slug> [<slug> ...]`

Imprime, para cada `slug`, una entrada borrador mapeada por código y las frases candidatas de la letra chica resaltadas. **No escribe** en `promociones.json`: la persona copia, corrige y completa. No usa ningún modelo de lenguaje. Las pistas que salen de la prosa no entran al borrador (el mapeo no lee la letra chica): se muestran aparte, por ejemplo el aviso de que la fecha más reciente del legal ya pasó aunque MODO la liste como vigente. Si el nombre del banco del listado no coincide con el banco del detalle, el borrador lo anota.

## `npm run corpus:cobertura -w ingesta [-- --lista | --casos | --estricto]`

Compara los crudos con el corpus: cuántas promos relevadas tienen entradas, cuántas están excluidas y cuáles faltan revisar. Con `--lista` agrupa las pendientes por comercio, con `--casos` muestra las candidatas reales de cada caso del motor (las de letra chica son solo candidatas) y con `--estricto` sale con código 1 si queda algo pendiente. **Sale siempre con código 1 si una entrada o una exclusión no tiene su crudo** (se rompe la trazabilidad, RNF-08). No escribe nada ni usa la red.

## `npm run corpus:generar -w ingesta`

Valida `promociones.json`, `exclusiones.json` y `grupos-tope.json` y regenera los derivados.

| Salida | Archivo |
|---|---|
| SQL de bancos | `supabase/seed/bancos.sql` |
| SQL de promociones | `supabase/seed/promociones.sql` |
| Fixtures del motor | `packages/motor/src/test/corpus.ts` |
| Formato canónico | Reescribe `promociones.json` con el orden (`categoriaId`, `fuenteId`) y la indentación fijos |

Con `--verificar` no escribe: sale con error si algún derivado no coincide con lo que produciría el JSON. Lo mismo comprueba, sobre los archivos reales del repo, un test de `ingesta/` (`generar.test.ts`), que es el que corre en el CI con `npm run test`.

## `npm run corpus:cargar -w ingesta -- [--aplicar]`

Carga el corpus en el Supabase al que apunta el entorno.

| Aspecto | Garantía |
|---|---|
| Entorno | `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; se pasan con `node --env-file=supabase/.env`. Nunca se leen de un archivo versionado ni se imprimen |
| Modo por defecto | `--dry-run`: lista cuántas filas insertaría, actualizaría, daría de baja y reactivaría. No escribe |
| `--aplicar` | Valida todo **antes** de escribir; si el archivo es inválido no escribe nada |
| Orden | `categorias`, `bancos`, `promociones` |
| Lotes | Hasta 50 filas por pedido, cada uno confirmado por separado y en menos de 5 minutos (contrato de escritura de `04-infrastructure.md`, PR #91); nunca una transacción con todo el corpus |
| Idempotencia | `upsert` por `(fuente, fuente_id)`; correrlo dos veces seguidas deja la base igual y no mueve `actualizada_en` |
| Bajas | Fila `manual` que ya no está en el archivo ⇒ `dada_de_baja_en = now()`; si vuelve, `null`. **Nunca `delete`** |
| Convivencia | No escribe ni reactiva una `manual` cuyo `fuente_id` ya existe como `modo` activa (se compara por el `slug`: una manual partida `slug#b-…` también se omite) |
| Campos que no se envían | `revision` y `fixture` (no son columnas) |
| Salida | Resumen por categoría y por acción; código distinto de cero si algo falla |

## Garantías que otras issues pueden usar

- **#50 / #51**: `resolverBanco(nombre, catalogo)` y la tabla de alias de `ingesta/src/corpus/bancos.ts`; `normalizar` exportada por `@vuelto/motor`; el cliente de MODO de `modo.ts` con pausa y User-Agent; el mapeo `mapear.ts` del detalle de MODO a `BorradorPromocion`.
- **#51**: al publicar `('modo', X)` debe dar de baja `('manual', X)` (D2).
- **#53**: los crudos de `supabase/seed/crudo/` son la entrada del extractor y `promociones.json` es la verdad contra la que se compara; los campos con fragmento en `fragmentosFuente` son los que salen de prosa.
