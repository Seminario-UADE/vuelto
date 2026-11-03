# Relevamiento de MODO del 2026-11-03 (issue #35): qué publica MODO en Supermercados y Farmacias

Foto de lo que MODO publicaba el 2026-11-03 en **Supermercados (1)** y **Farmacias, Perfumerías y Peluquerías (4)**, y de qué casos del motor se pueden ilustrar con promos reales. Sirve para el pitch y para saber qué esperar de la ingesta.

> **Las promos no se cargan a mano (ADR-011).** Este relevamiento ya no es la base de un corpus revisado por una persona: las promos las publica la ingesta automática todos los días (`ingesta/src/corpus/ingestar.ts`) y lo que devuelve MODO queda en `capturas_crudas`. Las cifras de abajo son de ese día; las promos cambian cada mes.

## Qué se relevó

El 2026-11-03, con el relevamiento de la ingesta (User-Agent `VueltoBot (UADE)`, pausa de 1,2 s), sobre la API pública de MODO. El relevamiento lee **las seis secciones que muestra la web de promos** (carrusel principal, destacadas, supermercados, exclusivas online, financiación y más promos, por `/v2/slots`) y **además el listado anterior por categoría** (`/slots`), que trae algunas promos vigentes que la web no muestra (`docs/product/fuentes-promos.md`):

| | Supermercados (1) | Farmacias (4) | Total |
|---|---|---|---|
| Reintegros vigentes (uno por `slug`) | 235 | 102 | **336** (una promo vale en las dos) |
| Comercios distintos (según la tarjeta) | 138 | 56 | |

**Corrección del relevamiento anterior.** El del 2026-11-02 leía solo la sección «más promos» y dio 171 promos. Ahí no aparecen las cadenas grandes: Coto, Jumbo, Disco, Vea, Día y La Anónima están en carrusel, destacadas y supermercados. Ese relevamiento concluyó por error que no tenían promos vigentes. Al revés, 4 promos vigentes según su detalle solo están en el listado anterior (dos de farmacias para jubilados del BNA, Grupo Farmacity con Hipotecario y Lácteos El Puente con Macro).

Se descartaron 3.881 tarjetas vencidas, 594 que no son reintegros (cuotas, sorteos) y 1.245 de otras categorías, contando cada promo una vez. De cada una de las 336 se bajó la tarjeta del listado y el detalle completo (RNF-08); hoy la ingesta los guarda en `capturas_crudas`.

Con esos crudos, el mapeo automático da **1.279 entradas de 311 promos** (las otras 25 se descartan solas) y ninguna falla por un formato desconocido. **69 promos «multibanco»** se parten en una entrada por banco (hasta 25 bancos: Supermercados Delca, Farmacias Santa Ana, Gassmann, Chester y las promos «Bancos adheridos» de las cadenas grandes). Muchas son cadenas regionales: quedan publicadas con `jurisdiccion = null` hasta que el extractor de #51 lea la zona en la letra chica. Desde ADR-011 las partes de una promo multibanco comparten un solo tope.

## Cadenas grandes de supermercado

| Cadena | Promos vigentes | Qué ofrecen (2026-11-03) |
|---|---|---|
| Coto | 3 | 25% los martes con bancos adheridos (sin tope); 25% los lunes con Ciudad/Buepp (tope $30.000 por semana); 5% los martes con Columbia |
| Jumbo | 2 | 20% martes y jueves con bancos adheridos (tope $25.000 por mes); 25% los martes con Hipotecario |
| Disco | 2 | 20% viernes y sábado con bancos adheridos (tope $25.000 por mes, compra mínima $100.000); 25% los martes con Hipotecario |
| Vea | 2 | 20% los viernes con bancos adheridos (tope $25.000 por mes); 25% los martes con Hipotecario |
| Día | 1 | 20% viernes y sábado con bancos adheridos (tope $20.000 por mes) |
| La Anónima | 4 | 20% viernes y sábado con bancos adheridos; 25% los martes con Hipotecario (dos publicaciones); 20% los jueves con ICBC |
| ChangoMás | 6 | 20% los lunes con bancos adheridos; 25% los martes con Hipotecario (dos publicaciones); Comafi, YOY y Credicoop |
| Carrefour | 0 | — |

Las promos «Bancos adheridos» valen para unos 19 bancos cada una: el mapeo las parte en una entrada por banco.

## Matriz de cobertura de los casos del motor

Cada caso es una situación que el motor distingue (constitución §VI, RF-04). **«Candidatas»** son promos reales relevadas que parecen ilustrar el caso. Lo que sale de campos estructurados de MODO es firme; lo que sale de la letra chica se marcó buscando frases del texto y es solo indicio hasta que lo lea el extractor de #51 (nadie lo revisa a mano). No se inventa ninguna promo para llenar un caso (FR-013).

| Caso | Cómo se detecta | Candidatas | Ejemplo | Estado |
|---|---|---|---|---|
| Solo débito | Sin ninguna red de crédito | 46 | `20-la-anonima-icbc-abr26` | candidata |
| Solo crédito | Sin ninguna red de débito | 105 | `25off-coto-ciudad-buepp-sep26` | candidata |
| Solo ciertos días | `days_of_week` distinto de los siete | 279 | `coto-noviembre26` (martes) | candidata |
| Monto mínimo | `amount_range.min` > 0 | 32 | `disco-noviembre26` ($100.000) | candidata |
| Tope mensual | `reset_by = month` | 244 | `jumbo-noviembre26` | candidata |
| Tope semanal | `reset_by = week` | 44 | `20-la-anonima-icbc-abr26` | candidata |
| Tope por compra | Tope por transacción, sin tope por período | 9 | `10-credicoop-donemilio-oct25` | candidata |
| Sin tope informado | Sin tope por período ni por transacción: `monto = null` | 14 | `coto-noviembre26` | candidata |
| Solo online | `flows` solo `online` | 22 | `15off-farmacity-macro-online-nov26` | candidata |
| Presencial y online | `flows` con ambos o `all` | 61 | `jumbo-noviembre26` | candidata |
| **No acumulable** | Frase «no acumula», «no será acumulable»… en la letra chica | 173 | `coto-noviembre26` | indicio (lo confirma #51) |
| **Acumulable** (`acumulable = true`) | Mención afirmativa: «podrá ser acumulable con…» | 67 | `jumbo-noviembre26` | indicio (lo confirma #51) |
| `acumulable = null` | La letra chica no dice nada | el resto | cualquiera sin las frases anteriores | por construcción |
| **Tope compartido** | Frase «el tope es compartido…» en la letra chica | 4 | `15-bbva-tiendas-cercania-oct26` (y `-jul26`, `-ago26`, `-sep26`) | indicio (lo confirma #51) |
| Tope exclusivo | Solo lo dice la letra chica | sin candidatas automáticas | — | sin indicio |
| **Vencida** | La letra chica da por terminada una promo que MODO aún lista (ver más abajo) | 28 | `10-icbc-juleriaque-abr25` | indicio (se publica hasta #51) |

Notas sobre los casos:

- **Tope compartido.** Las cuatro promos de Tiendas de Cercanía con BBVA dicen «el tope es compartido y distribuido entre los comercios adheridos a esta promoción», con $10.000 por usuario por mes. Son cuatro versiones publicadas con vigencias que se superponen (jul, ago, sep y oct). Hoy la ingesta solo agrupa el tope de las partes de una misma promo multibanco (`grupoTopeId = modo:<slug>`), así que estas cuatro se publican con un tope cada una. Agrupar promos distintas que comparten un saldo queda para el extractor de #51, que lee la letra chica.
- **Tope exclusivo.** El texto «Exclusivo con» de la tarjeta del listado es exclusividad **de banco**, no el alcance del tope; no sirve para detectar este caso.
- **Vencida.** Es el caso que testea que el motor descarta por vigencia. La ingesta toma `vigencia.hasta` de `schedule.stop_date`, así que una promo que MODO lista con fecha futura pero cuya letra chica ya dio por terminada se publica como vigente hasta que #51 lea la fecha de la letra chica. Lo que la ingesta sí descarta solo es la promo con `stop_date` pasado o `real_status` distinto de `RUNNING` (`vencida_en_la_fuente`).

## Hallazgo: promos que MODO sigue listando después de su fecha de cierre

De las 336 promos vigentes según MODO, **28 tienen en su letra chica una fecha de fin ya pasada** mientras que el dato estructurado (`schedule.stop_date`) está en el futuro. Ejemplos: ICBC–Juleriaque (estructura hasta 2027-01-31, letra chica hasta el 30/09/2026), BBVA–The Food Market (estructura hasta 2026-11-30, letra chica hasta el 31/10/2026). Si la letra chica prevalece, estas promos **no son vigentes**, pero la ingesta todavía no lee la letra chica: hoy **se publican** con la fecha estructurada. Es el riesgo aceptado en ADR-011 (lo que la API declara pero la letra chica contradice se publica hasta que el extractor de #51 lea la letra chica, sin revisión humana).

La cifra sale de buscar la fecha más reciente que aparece en el texto: es un indicio, no una conclusión. Lo resuelve #51.

## Limitaciones del corpus

Condiciones reales de las promos que el contrato de tipos (`Promocion`) y el perfil del usuario (banco, tipo, red) **no representan**. La ingesta las publica igual, porque es lo que MODO publica, y se dejan registradas acá para que nadie las ignore en el pitch.

| Limitación | Alcance (de las 336) | Efecto sobre la recomendación |
|---|---|---|
| **Cómo se paga** (QR o NFC de MODO, tarjeta física, online) | 263 promos exigen pagar con MODO (`flows` sin `physical-card`); 72 valen con la tarjeta física y 1 en todos los canales | El dato está en cada promo (`payment_flow`) pero el contrato no lo guarda, así que la app no puede decir **cómo** pagar. Pendiente: sumarlo al contrato y a la recomendación. |
| **Restricción por rango de tarjeta (BIN)** | 107 promos (`segmentations.whitelist` con `bin`) | El beneficio puede valer solo para ciertos productos de la tarjeta del banco; el perfil no distingue. |
| **Condición sobre el cliente** (`user_national_id`: por ejemplo, sueldo acreditado en el banco) | 49 promos | La recomendación asume que el usuario cumple la condición. |
| **Niveles de cliente** (Selecta, Platinum…) | 6 promos | No se publican: el mapeo las descarta solo (`nivel_de_cliente`) por el nombre, el rótulo del banco o la descripción interna. |
| **Tope diario** (`reset_by = day`) | 6 promos | No se publican: el motor no representa el tope por día y aproximarlo puede sobrestimar el saldo restante. El mapeo las descarta solo (`tope_no_representable`). |
| **Tope para toda la duración de la promo** (`reset_by = promo`) | 12 promos (casi todas del Cyber Monday) | No se puede representar (no se renueva por mes ni por semana): el mapeo las descarta solo (`tope_no_representable`). |
| **Tope por período y además tope por transacción** | 0 promos | El contrato guarda un solo tope, y quedarse con el del período sobrestima el reintegro de una compra grande: si aparece, el mapeo la descarta sola (`tope_no_representable`). |
| **Red que el contrato no tiene** (`patagonia_365`) | 2 promos | Se ignora la red con un aviso; si es la única, el mapeo descarta la promo. |
| **Tope compartido entre promos distintas** | Por ejemplo, las 4 de Tiendas de Cercanía | La ingesta solo agrupa las partes de una misma promo multibanco, y las publica todas o ninguna. Si dos promos distintas comparten un saldo, cada una sale con su tope y el saldo restante es optimista (constitución §V) hasta #51. |
| **Vigencia verificada en una fecha** | Todo el corpus | La ingesta diaria da de baja las que vencen; muchas de noviembre vencen el 30/11. |
| **Categoría 15** | A La Mesa (ICBC) | MODO usa una categoría 15 que no está entre las 13 del repo; la tabla `categorias` la rechazaría. Afecta a promos transversales, no a Supermercados ni Farmacias. |

## Descartes

La ingesta descarta sola, sin revisión, y deja el motivo en el registro de cada corrida (`specs/011-corpus-promociones-seed/contracts/corpus.md`). Lo que el mapeo descartaba el 2026-11-03:

| Motivo | Promos |
|---|---|
| `nivel_de_cliente` (Selecta, Platinum…) | 6 |
| `transversal` (vale en más de 3 categorías) | 1 |
| `tope_no_representable` (el tope se reinicia por día, 6, o vale para toda la promo, 12) | 18 |

Las promos de otra provincia y las que la letra chica da por vencidas no se descartan todavía: hace falta leer la letra chica (#51).
