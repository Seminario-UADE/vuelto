# Contrato: ingesta automática de promociones

> Reescrito el 2026-11-03 por ADR-011: las promos nunca se cargan a mano. Este contrato
> reemplaza los comandos `corpus:relevar`, `corpus:borrador`, `corpus:cobertura`,
> `corpus:generar` y `corpus:cargar` de la versión anterior.

Un solo comando, `ingesta/src/corpus/ingestar.ts` (`npm run ingestar -w @vuelto/ingesta`), lo
corre todos los días el workflow `.github/workflows/ingesta.yml` y se puede correr a mano.

```bash
node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts            # prueba: no escribe
node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts --aplicar  # publica
```

## Disparo

| Aspecto | Garantía |
|---|---|
| Cuándo | Todos los días a las 09:00 UTC (06:00 ART) y a mano desde Actions («Run workflow») |
| Concurrencia | Una corrida por vez (`concurrency: ingesta-promociones`); la segunda espera |
| Secrets | `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del repo. Solo los recibe este workflow (no corre en `pull_request`). Nunca se imprimen ni se versionan |
| Duración | Más de 25 minutos con las 13 categorías (pausa de 1,2 s entre pedidos); tope de 90 hasta medirla (T066) |

## Lectura de MODO

| Aspecto | Garantía |
|---|---|
| Red | `GET /promos/api/rewards/banks` (catálogo de bancos), `/slots-container/active` y `/slots-container/<contenedor>` (las secciones de la web), `/v2/slots?ids=<sección>&page=<n>&limit=100` (cada sección, hasta `pagination.total_pages`), `/slots?...&categories=<id>&page=<n>&limit=100` (el listado anterior, para las 13 categorías) y `/v2/benefit/<slug>` (el detalle). Es la API pública que usa www.modo.com.ar/promos, no scraping de HTML |
| Ritmo | User-Agent `VueltoBot (UADE)`; pausa `--pausa-ms`, mínimo 1000 (RNF-13); reintento ante 5xx o corte de red |
| Filtro | `calculated_status = RUNNING`; reintegro (`benefit.type = cashback` en `/v2/slots`, `trigger_type = payment_promotion` en `/slots`); alguna de las 13 categorías de MODO |
| Identidad | Dos tarjetas con el mismo slug o el mismo id de beneficio son la misma promo, aunque estén en secciones o listados distintos; se queda la tarjeta de la web |
| Slug inválido | Frena la corrida entera antes de pedir ningún detalle |

## Mapeo y validación (sin modelo de lenguaje)

| Aspecto | Garantía |
|---|---|
| Qué se mapea | Banco por id (`requirements.banks.list`), categoría, porcentaje, días, redes, tope y su período, monto mínimo, vigencia y canal. Detalle en [data-model.md](../data-model.md) §Mapeo |
| Qué queda en `null` | `acumulable` y `jurisdiccion`: solo están en la letra chica; los completará el extractor de #51 |
| Partición | Una promo de varios bancos o categorías da una fila por banco y categoría (`fuente_id = slug#b-<8 hex>.c-<cat>`) |
| Tope compartido | Las partes de una promo con tope mensual o semanal comparten un solo saldo: `alcance = compartido`, `grupo_tope_id = modo:<slug>` y la fuente en `fragmentos_fuente["tope.alcance"]` |
| Descartes | Sin persona en el medio (ADR-005). Motivos: `banco_no_determinado`, `nivel_de_cliente`, `transversal` (más de 3 categorías), `no_es_reintegro`, `tope_no_representable` (diario, por toda la promo, o por período más por transacción), `vencida_en_la_fuente` (estado no RUNNING o `stop_date` anterior a hoy), `detalle_inexistente` (404), `formato_desconocido`, `no_publicable` (no pasa la validación) y `otro` |
| Validación | `esPromocionPublicable` del motor más los rangos y reglas de la tabla (`validar.ts`). Si una parte de una promo no pasa, se descarta la promo entera |

## Publicación en Supabase

| Aspecto | Garantía |
|---|---|
| Orden | `categorias`, `bancos` (el catálogo del día), `capturas_crudas`, `promociones`, bajas |
| Capturas | Tarjeta y detalle en JSON canónico; una captura nueva solo si cambió el contenido respecto de la última del mismo origen (la URL del detalle). Se guardan también las de las promos descartadas |
| Promos | `fuente = 'modo'`, `captura_cruda_id` = la captura de la que salió. Upsert por `(fuente, fuente_id)` solo de lo nuevo o cambiado; una captura nueva con los mismos valores no reescribe la fila (no mueve `actualizada_en`) |
| Lotes | Hasta 50 filas por pedido, cada uno confirmado por separado (contrato de escritura de `04-infrastructure.md`) |
| Bajas | Una promo `modo` activa que ya no se publica ⇒ `dada_de_baja_en = now()`; si vuelve, `null`. **Nunca `delete`**. No toca filas `manual` |
| Resguardos | Una promo cuyo detalle falló no se da de baja. Si la corrida publicaría menos de la mitad de las activas (con al menos 20 activas), no escribe nada |
| Idempotencia | Correrlo dos veces seguidas deja la base igual |
| Salida | Resumen JSON por consola y la lista de descartes con su motivo. Código 1 si un detalle falló, si hay un formato desconocido o si el resguardo frenó la escritura (GitHub avisa por mail); un descarte no es un error |

## Garantías que otras issues pueden usar

- **#50 / #51**: el cliente de MODO (`modo.ts`), el listado (`listado.ts`), el mapeo (`mapear.ts`), `resolverBanco` y la tabla de alias (`bancos.ts`), y `publicar.ts`. #51 lee la letra chica de la captura y completa `acumulable` y `jurisdiccion` (con su fragmento) en la misma corrida, antes de validar.
- **#53**: la entrada del extractor son las capturas de `capturas_crudas`. Ya no hay un corpus revisado a mano contra el cual medir: la referencia hay que redefinirla.
