# Data Model: Corpus de promociones sembrado

Fase 1 del plan. No hay tablas nuevas: el corpus se carga en `bancos`, `categorias` y `promociones` de la issue #34. Este documento define el **archivo** del corpus, sus derivados y el mapeo desde MODO.

## Entidades

### Entrada del corpus (`supabase/seed/promociones.json`)

Una entrada es una `Promocion` del motor (`packages/motor/src/tipos.ts`) **sin `id`** y con tres agregados: la clave natural, los fragmentos de la letra chica y un bloque de revisión que **no viaja a la base**.

```jsonc
{
  "version": 1,
  "promociones": [
    {
      "fuenteId": "20-paladini-icbc-ago26",        // clave natural: slug de MODO (+ sufijo #… si se parte)
      "fuente": "manual",
      "titulo": "20% en Paladini",
      "bancoId": "bcfcac03-6f79-4995-bfab-7b8916b0747a",
      "categoriaId": 1,
      "comercio": "Paladini",                        // string | null (null = toda la categoría)
      "porcentaje": 20,
      "tarjetas": { "debito": ["visa"], "credito": ["visa", "master"] },
      "vigencia": { "desde": "2026-08-07", "hasta": "2027-01-30", "dias": ["vie"] },
      "tope": { "monto": 10000, "periodo": "mensual", "alcance": null, "grupoTopeId": null },
      "montoMinimo": null,
      "jurisdiccion": null,
      "canal": "presencial",
      "acumulable": null,
      "fragmentosFuente": {                          // { campo: texto | null }; clave = ruta del campo en Promocion
        "tope.monto": "TOPE DE REINTEGRO $10.000 POR USUARIO POR MES",
        "acumulable": null
      },
      "fixture": false,                              // true = el generador la copia al motor
      "revision": {                                  // SOLO en el JSON: la carga y el SQL la descartan
        "verificadaEl": "2026-11-02",
        "revisor": "spazos32",
        "notas": ["Sucursales en CABA verificadas en el sitio de la cadena."]
      }
    }
  ]
}
```

Reglas de validación (las aplica `validar.ts` y las repite la base donde hay `check`):

| Regla | Por qué |
|---|---|
| Todas las claves de `Promocion` presentes; un dato ausente es `null`, **nunca** una clave faltante | Constitución §III |
| `fuente = "manual"`; `fuenteId` no vacío y único en todo el archivo | `unique (fuente, fuente_id)` |
| `esPromocionPublicable` y `camposInvalidos` del motor sin hallazgos | RF-16 |
| `0 < porcentaje ≤ 100` | El `check` admite 0; el corpus no |
| `vigencia.desde` y `.hasta` son fechas ISO reales y `desde ≤ hasta`; `dias` es `null` o una lista no vacía sin repetidos | `check` de la tabla |
| `tarjetas`: al menos una red entre débito y crédito, sin repetidos, solo valores de `Red` | `check` de la tabla |
| `tope.monto > 0` si no es `null`; `monto ≠ null` ⇒ `periodo ≠ null`; `periodo = null` ⇒ `monto = null` | El motor usaría `mensual` en silencio |
| `tope.alcance = "compartido"` ⇔ `grupoTopeId ≠ null`, y el id existe en `grupos-tope.json` | El motor ignora el grupo si no es compartido |
| `bancoId` está en el catálogo de 82; `categoriaId` está en `CATEGORIAS_MODO` | Claves foráneas |
| `montoMinimo ≥ 0` si no es `null`; `jurisdiccion`, `canal` dentro de su enum | `check` de la tabla |
| Todo campo que solo sale de la letra chica (`acumulable`, `tope.alcance`, `jurisdiccion`) y es distinto de `null` tiene su fragmento no vacío en `fragmentosFuente`. `montoMinimo`, `canal` y `tope.periodo` salen de campos estructurados del detalle y no lo exigen (si la persona los corrige a partir de la prosa, conviene dejar el fragmento, pero el validador no puede saberlo) | RNF-08, SC-003 |
| `revision.verificadaEl` es una fecha ISO; `revision.revisor` no vacío | SC-003 |
| `comercio` no vacío si no es `null`; dos entradas con el mismo banco, categoría y comercio normalizado y vigencias superpuestas se avisan (no es error: pueden ser niveles) | Revisión humana |

### Exclusión (`supabase/seed/exclusiones.json`)

```jsonc
{ "slug": "30-credicoop-cooperativaobrera-oct25", "motivo": "fuera_de_zona",
  "detalle": "Cadena de Bahía Blanca; sin sucursales en CABA/AMBA.", "verificadaEl": "2026-11-02", "revisor": "spazos32" }
```

`motivo` pertenece al conjunto cerrado de la D10 de `research.md`; `otro` exige `detalle`. Un `slug` no puede estar a la vez en `promociones.json` y en `exclusiones.json` (salvo que el motivo sea de una entrada partida; el validador lo distingue por el sufijo).

### Grupo de tope (`supabase/seed/grupos-tope.json`)

```jsonc
{ "macro:modo-mensual": { "banco": "macro", "clave": "modo-mensual",
    "fragmento": "TOPE DE DEVOLUCIÓN $10.000 POR USUARIO, POR MES", "creadoPor": "spazos32" } }
```

### Crudo (`supabase/seed/crudo/<slug>.json`)

```jsonc
{ "capturadoEl": "2026-11-02", "url": "https://www.modo.com.ar/promos/api/rewards/v2/benefit/<slug>",
  "tarjeta": { /* tarjeta del listado, tal cual */ }, "detalle": { /* detalle, tal cual */ } }
```

### Banco (catálogo)

`docs/product/data/modo-bancos-raw.json`: la respuesta de `GET /promos/api/rewards/banks?source=app_modo` con `{ capturadoEl, url, bancos: [...] }`. Se carga en `bancos(id, nombre)` con el `name` del catálogo.

## Derivados (generados, versionados, con verificación de desfase)

| Archivo | Contenido | Quién lo usa |
|---|---|---|
| `supabase/seed/bancos.sql` | `insert … on conflict (id) do update` de los 82 bancos | `supabase db reset` |
| `supabase/seed/promociones.sql` | `insert … on conflict (fuente, fuente_id) do update` de cada entrada, sin `revision` ni `fixture` | `supabase db reset` |
| `packages/motor/src/test/corpus.ts` | `export const PROMOS_CORPUS: Promocion[]` con las entradas `fixture: true` y su `id` UUID v5 | Tests del motor |

`id` = UUID v5 (espacio de nombres fijo en `ids.ts`) de `manual:<fuenteId>`. No se guarda en el JSON.

## Mapeo desde el detalle de MODO (por código, `mapear.ts`)

| Campo de la entrada | Origen en el detalle | Regla |
|---|---|---|
| `fuenteId` | `slug` | Sufijo `#…` si se parte (D3) |
| `titulo` | `name` | Tal cual |
| `bancoId` | `offers[0].requirements.banks.list[i]` | Un id por entrada; lista vacía ⇒ exclusión |
| `categoriaId` | `offers[0].categories` (ids como texto) | Una entrada por categoría (D3); solo se emiten las del dueño de la corrida |
| `comercio` | Primera celda de la tarjeta del listado (`row[0]`), **corregido a mano** | D3 |
| `porcentaje` | `offers[0].outcomes.cashback.amount` | Solo si `amount_type = "percent"`; otro tipo ⇒ exclusión `no_es_reintegro` |
| `tarjetas` | `conditions.payment_methods.methods[]` | `debit_card` → `debito`, `credit_card` → `credito`; `issuer` = `Red` |
| `vigencia.desde/hasta` | `conditions.schedule.start_date/stop_date` | Ya son fechas de Argentina (D13) |
| `vigencia.dias` | `conditions.schedule.days_of_week` | `monday`→`lun` …; los 7 días ⇒ `null` |
| `tope.monto` | `limits.period_cap.amount_by_period`, o `limits.transaction_cap.amount_by_transaction` | `0` ⇒ `null` |
| `tope.periodo` | `limits.period_cap.reset_by` | `month`→`mensual`, `week`→`semanal`; `day` y `promo` ⇒ exclusión `tope_no_representable` (D8); `monto = null` ⇒ `null` |
| `tope.alcance`, `tope.grupoTopeId` | — | `null`; los completa la persona desde la letra chica (D5) |
| `montoMinimo` | `offers[0].requirements.amount_range.min` | `0` ⇒ `null` |
| `canal` | `conditions.payment_flow.flows` | solo `instore`/`instore_nfc` ⇒ `presencial`; solo `online` ⇒ `online`; ambos ⇒ `ambos` |
| `jurisdiccion` | — | `null`; la persona la completa si el texto lo sostiene (D4) |
| `acumulable` | — | `null`; la persona lo completa desde la letra chica |
| `fragmentosFuente` | `terms_and_conditions` | El helper resalta frases candidatas («NO ACUMULABLE», «TOPE», «COMPARTID», «MÍNIMO», «ONLINE»); la persona copia el fragmento |

Lo que sale de la letra chica (`tope.alcance`, `grupoTopeId`, `jurisdiccion`, `acumulable`) lo carga una persona. El helper no infiere nada de la prosa: solo marca dónde mirar. Las pistas que salen de la prosa (las frases resaltadas y la fecha de cierre del legal) las muestra `corpus:borrador`; `mapear.ts` no lee la letra chica.

Exclusiones que el mapeo **propone** (las confirma una persona): `vencida_en_la_fuente` (`real_status` distinto de `RUNNING`), `no_es_reintegro`, `banco_no_determinado`, `transversal` (más de tres categorías, solo si alguna es del dueño de la corrida), `nivel_de_cliente` («Selecta», «Platinum», «Black», «Signature», «Infinite» o «Nivel N» en el nombre, el rótulo del banco del listado o la descripción interna de la promo), `tope_no_representable` (`reset_by = promo`) y `otro` (más de una oferta, o solo redes que el contrato no representa).

## Transiciones de estado en la base

Una entrada `manual` tiene tres estados en `promociones`: **activa** (`dada_de_baja_en is null`), **dada de baja** (ya no está en el JSON) y **reactivada** (volvió al JSON). La carga remota las mueve; el trigger `set_actualizada_en` solo adelanta `actualizada_en` si cambia algún valor, así que correr la carga dos veces seguidas no hace que la app vuelva a bajar el corpus.
