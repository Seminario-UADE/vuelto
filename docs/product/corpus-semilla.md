# Corpus sembrado a mano (issue #35): cobertura, exclusiones y limitaciones

Este documento acompaña a `supabase/seed/promociones.json`, el corpus de promociones sembrado a mano desde MODO para la demo (ADR-005 §Consecuencias, spec `specs/011-corpus-promociones-seed/`). Cubre las categorías **Supermercados (1)** y **Farmacias, Perfumerías y Peluquerías (4)**; Gastronomía, Combustibles y el resto los carga Joaquín en el mismo archivo.

> **Estado: borrador.** Las cifras de este documento salen del relevamiento automático del 2026-11-02. La columna «Estado» de la matriz pasa de «candidata» a «confirmada» a medida que una persona revisa la letra chica de cada promo. Se regenera la parte automática con `npm run corpus:cobertura -w ingesta -- --casos`.

## Qué se relevó

El 2026-11-02, con `npm run corpus:relevar -w ingesta -- --categorias 1,4` (User-Agent `VueltoBot (UADE)`, pausa de 1,2 s), sobre la API pública de MODO:

| | Supermercados (1) | Farmacias (4) | Total |
|---|---|---|---|
| Promos de pago vigentes (una por `slug`) | 117 | 54 | **171** |

El listado trae unas 3.470 tarjetas más, casi todas vencidas o repetidas (una promo aparece en varias tarjetas) y 29 que no son de pago (cuotas y sorteos), que se descartan. De cada una de las 171 se guardó la tarjeta del listado y el detalle completo en `supabase/seed/crudo/<slug>.json` (RNF-08).

Con esos crudos, el mapeo automático da **399 entradas candidatas de 159 promos** (las otras 12 se proponen como exclusión). 147 promos dan de una a tres entradas y **12 promos «multibanco» dan 246** (la misma promo para 19 a 25 bancos: Farmacias Chester, Gassmann, Santa Ana, Embon, La Banderita, Tauil y similares). Muchas de esas son cadenas regionales que probablemente caigan por zona al verificarlas; hasta entonces el tamaño final del corpus no se puede decir.

## Matriz de cobertura de los casos del motor

Cada caso es una situación que el motor distingue (constitución §VI, RF-04). **«Candidatas»** son promos reales relevadas que parecen ilustrar el caso. Lo que sale de campos estructurados de MODO es firme; lo que sale de la letra chica lo marca el código con frases del texto y **lo confirma una persona**. No se inventa ninguna promo para llenar un caso (FR-013).

| Caso | Cómo se detecta | Candidatas | Ejemplo | Estado |
|---|---|---|---|---|
| Solo débito | Sin ninguna red de crédito | 20 | `10-farmashop-macro-jul26` | candidata |
| Solo crédito | Sin ninguna red de débito | 74 | `10-6csi-getthelook-bbva-jul26` | candidata |
| Solo ciertos días | `days_of_week` distinto de los siete | 138 | `10-ciudad-buepp-juleriaque-ene26` | candidata |
| Monto mínimo | `amount_range.min` > 0 | 7 | `dona-catalina-nov26` | candidata |
| Tope mensual | `reset_by = month` | 120 | `10-parfumerie-yoy-oct26` | candidata |
| Tope semanal | `reset_by = week` | 23 | `20-icbc-thefoodmarket-oct25` | candidata |
| Tope por compra | Tope por transacción, sin tope por período | 5 | `10-credicoop-donemilio-oct25` | candidata |
| Sin tope informado | Sin tope por período ni por transacción: `monto = null` | 11 | `10-ciudad-buepp-juleriaque-ene26` | candidata |
| Solo online | `flows` solo `online` | 8 | `15off-farmacity-macro-online-nov26` | candidata |
| Presencial y online | `flows` con ambos o `all` | 35 | `10-farmashop-macro-jul26` | candidata |
| **No acumulable** | Frase «no acumula», «no será acumulable»… en la letra chica | 97 | `10-comafi-juleriaque-mar25` | candidata, a confirmar |
| **Acumulable** (`acumulable = true`) | Mención afirmativa: «podrá ser acumulable con…» | 23 | `10-lasmargaritas-bbva-sep26` | candidata, a confirmar |
| `acumulable = null` | La letra chica no dice nada | la mayoría | cualquiera sin las frases anteriores | por construcción |
| **Tope compartido** | Frase «el tope es compartido…» en la letra chica | 3 | `15-bbva-tiendas-cercania-ago26` (y `-jul26`, `-sep26`) | candidata, a confirmar |
| Tope exclusivo | Solo lo dice la letra chica | sin candidatas automáticas | — | por revisar |
| **Vencida** | La letra chica da por terminada una promo que MODO aún lista (ver más abajo) | 21 | `10-icbc-juleriaque-abr25` | candidata |

Notas sobre los casos:

- **Tope compartido.** Las tres promos de Tiendas de Cercanía con BBVA dicen «el tope es compartido y distribuido entre los comercios adheridos a esta promoción», con $10.000 por usuario por mes. Son tres versiones publicadas con vigencias que se superponen (jul, ago y sep). Hay que decidir con la letra chica si son la misma promo republicada o tres, y si comparten un solo saldo: en ese caso van con el mismo `grupoTopeId` registrado en `grupos-tope.json`.
- **Tope exclusivo.** El texto «Exclusivo con» de la tarjeta del listado es exclusividad **de banco**, no el alcance del tope; no sirve para detectar este caso.
- **Vencida.** Es el caso que testea que el motor descarta por vigencia. La candidata natural es una de las promos que MODO lista con fecha estructurada futura pero cuya letra chica ya dio por terminada (por ejemplo, Petrelli: estructura hasta 2026-12-31, letra chica hasta el 30/09/2026). Se carga con `vigencia.hasta` igual a la fecha de la letra chica. Para que la app la reciba, esa fecha tiene que caer dentro del período en curso; si no, sirve solo para los tests del motor.

## Hallazgo: promos que MODO sigue listando después de su fecha de cierre

De las 171 promos vigentes según MODO, **21 tienen en su letra chica una fecha de fin ya pasada** (20 de ellas dan borrador, con la nota; la otra ya se propone como exclusión) mientras que el dato estructurado (`schedule.stop_date`) está en el futuro. Ejemplos: ICBC–Juleriaque (estructura hasta 2027-01-31, letra chica hasta el 30/09/2026), BBVA–The Food Market (estructura hasta 2026-11-30, letra chica hasta el 31/10/2026). Por la regla de la spec (la letra chica prevalece sobre los datos estructurados, US2-5), estas promos **no son vigentes**: se excluyen con motivo `vencida_en_la_fuente` o, una o dos, se dejan como el caso «vencida». El borrador de cada una trae una nota que lo avisa.

La fecha se toma de la fecha más reciente que aparece en el texto: es una pista, no una conclusión. Una persona la confirma leyendo la letra chica.

## Limitaciones del corpus

Condiciones reales de las promos que el contrato de tipos (`Promocion`) y el perfil del usuario (banco, tipo, red) **no representan**. Las promos se cargan igual, porque es lo que MODO publica, y se dejan registradas acá para que nadie las ignore en el pitch.

| Limitación | Alcance (de las 171) | Efecto sobre la recomendación |
|---|---|---|
| **Hay que pagar con MODO** (QR o NFC), no con la tarjeta física a secas | 121 promos (`flows` sin `physical-card`); 49 valen con tarjeta física y 1 en todos los canales | La app puede recomendar «pagá con tu Visa de Macro» cuando en realidad hay que pagar con MODO. El borrador de cada promo anota cuál es el caso. |
| **Restricción por rango de tarjeta (BIN)** | 62 promos | El beneficio puede valer solo para ciertos productos de la tarjeta del banco; el perfil no distingue. |
| **Condición sobre el cliente** (`user_national_id`: por ejemplo, sueldo acreditado en el banco) | 11 promos | La recomendación asume que el usuario cumple la condición. |
| **Niveles de cliente** (Selecta, Platinum…) | 5 promos | No se cargan: el mapeo las propone como exclusión `nivel_de_cliente` por el nombre, el rótulo del banco o la descripción interna. |
| **Tope diario** (`reset_by = day`) | 4 promos | No se cargan: el motor no representa el tope por día y aproximarlo puede sobrestimar el saldo restante. Se proponen para excluir (`tope_no_representable`). |
| **Tope para toda la duración de la promo** (`reset_by = promo`) | 1 promo | No se puede representar (no se renueva por mes ni por semana): se propone excluirla (`tope_no_representable`). |
| **Tope por período y además tope por transacción** | 0 promos al 2026-11-02 | El contrato guarda un solo tope, y quedarse con el del período sobrestima el reintegro de una compra grande: si aparece, se propone excluirla (`tope_no_representable`). |
| **Red que el contrato no tiene** (`patagonia_365`) | 2 promos | Se ignora la red con una nota; si es la única, se excluye la promo. |
| **Saldo de grupo optimista** | Promos con grupo de tope | Si un grupo de tope tiene miembros fuera del corpus (excluidos), el saldo restante sale optimista (constitución §V). |
| **Vigencia verificada en una fecha** | Todo el corpus | Cada promo lleva su fecha de verificación; antes del pitch hay que volver a relevar. |
| **Categoría 15** | A La Mesa y similares | MODO usa una categoría 15 que no está entre las 13 del repo; la tabla `categorias` la rechazaría. Afecta a promos transversales, no a Supermercados ni Farmacias. |

## Exclusiones

El registro de exclusiones está en `supabase/seed/exclusiones.json`, con el slug, un motivo de un conjunto cerrado (`fuera_de_zona`, `comercio_no_determinado`, `banco_no_determinado`, `nivel_de_cliente`, `transversal`, `no_es_reintegro`, `tope_no_representable`, `vencida_en_la_fuente`, `detalle_inexistente`, `otro`), la fecha y quién lo verificó. Un test del repo comprueba que ninguna entrada ni exclusión pierda su crudo. Que ningún crudo quede sin destino lo verifica `npm run corpus:cobertura -w ingesta -- --estricto`, que se corre a mano antes del PR final (no en el CI mientras el corpus se revisa).

Exclusiones que el mapeo propone solas al 2026-11-02 (todas las confirma una persona):

| Motivo | Promos |
|---|---|
| `nivel_de_cliente` (Selecta, Platinum…) | 5 |
| `transversal` (vale en más de 3 categorías) | 1 |
| `vencida_en_la_fuente` (el detalle la da por inactiva) | 1 |
| `tope_no_representable` (el tope se reinicia por día, 4, o vale para toda la promo, 1) | 5 |

Las exclusiones por zona, por nivel de cliente y por letra chica vencida salen de la revisión humana y se agregan a medida que se revisa.

## Cómo se actualiza este documento

1. `npm run corpus:relevar -w ingesta -- --categorias 1,4` renueva los crudos.
2. `npm run corpus:cobertura -w ingesta -- --lista` muestra las promos pendientes por comercio.
3. `npm run corpus:cobertura -w ingesta -- --casos --todos` regenera las candidatas de la matriz.
4. Al terminar la revisión, la columna «Estado» de la matriz queda en «confirmada» con su promo, o en «sin ejemplo real vigente» con la fecha.
