# Precisión del lector de tickets

> Informe de la issue #10 (RNF-09). Lector: Edge Function `extraer-ticket` con Groq
> (`qwen/qwen3.8-27b`, structured outputs estrictos; ADR-012, spec 013). Los tickets usados **no
> se suben al repo** (privacidad): acá solo van los resultados.

## Resumen

| Campo | Tickets con el dato | Acertados | Acierto |
|---|---|---|---|
| Monto (total) | 5 | 5 | **5 de 5** |
| Fecha | 5 | 5 | **5 de 5** |
| Comercio | 5 | 5 | **5 de 5** (ver nota sobre la razón social) |
| Medio de pago (red y tipo) | 3 | 3 | **3 de 3** (en 2 tickets el medio no figuraba) |

**Muestra: 5 tickets medidos campo por campo**, por debajo de los 15 a 20 que pide RNF-09. El
equipo decidió cerrar la issue #10 con esta muestra; el resultado es un indicio, no una medición
con margen de error chico. Ver *Límites*.

## Detalle por ticket

| # | Comercio | Cuándo | Monto | Comercio | Fecha | Medio de pago | Observaciones |
|---|---|---|---|---|---|---|---|
| 1 | (ticket de prueba 1) | Script de la issue #48 | ✓ | ✓ | ✓ | ✓ (la red; el tipo vino vacío porque el ticket no lo dice) | Al principio leyó la razón social; ver *Observaciones* |
| 2 | (ticket de prueba 2) | Script de la issue #48 | ✓ | ✓ | ✓ | ✓ (red y débito, con los últimos 4) | — |
| 3 | (ticket de prueba 3) | Script de la issue #48 | ✓ | ✓ | ✓ | ✓ (red y débito, con los últimos 4) | — |
| 4 | Pastasole | 17/11, app en el celular | ✓ | ✓ | ✓ | — (no figura) | No está entre los comercios con promo: la app ofreció «Buscar otro comercio» y «No está en la lista», que es lo esperado (spec 015) |
| 5 | Cardano | 17/11, app en el celular | ✓ | ✓ | ✓ | — (no figura) | Ticket muy arrugado |

✓ = coincide con el ticket. — = el ticket no trae el dato, y el lector devolvió `null` como
corresponde (constitución §III: nunca se inventa).

En los tickets 1 a 3 (issue #48) se escapó, en uno de ellos, el nombre de un mozo en el texto
(ver *Privacidad*). El tipo de tarjeta vacío del ticket 1 es correcto: el ticket no lo decía y el
lector no lo dedujo.

## Observaciones

- **Comercio: marca o razón social.** En las primeras pruebas Groq devolvía la razón social
  («… S.A.») en vez del nombre del local. Se ajustó la instrucción para que priorice el nombre del
  local y use la razón social solo si no hay otro (issue #48). Aun así, muchos tickets imprimen el
  nombre con la forma societaria («COTO C.I.C.S.A.», «Bonafide S A I C»): eso ya no es un error
  de lectura, y lo resuelve la sugerencia de comercio de la app, que lo compara contra el
  catálogo y propone el comercio con promo (issue #134, spec 015).
- **Fecha: un ticket anterior a la simulación no se descarta solo.** Si la fecha leída es de antes
  de la compra que se simuló, la app avisa y deja elegir, por si se leyó mal (issue #110).
- **Robustez:** un ticket muy arrugado (Cardano) se leyó completo.
- **Tiempo:** en las pruebas en el celular, la lectura tardó pocos segundos (medido a ojo, issue #49).

## Privacidad

- **Un dato personal se escapó en el texto:** en uno de los tickets 1 a 3, el nombre de un mozo quedó sin tapar
  en `textoExtraido`. Se sumó a la instrucción de Groq que tape nombres de personas (también de
  mozos o cajeros), además de las reglas de código que tapan tarjetas, CUIT de personas y DNI
  (spec 013). En los tickets 4 y 5 no se revisó el texto completo, porque la app no lo muestra.
- La foto no se guarda en ningún paso (constitución §IV, spec 014) y los tickets de esta prueba no
  están en el repo.

## Límites

- **Muestra chica:** 5 tickets medidos, con 3 que traían medio de pago. Con esta cantidad, «5 de
  5» es compatible con un acierto real bastante menor; hace falta una muestra mayor para afirmar
  un porcentaje.
- **Pocos rubros:** gastronomía y algunos supermercados. Faltan estaciones de servicio,
  farmacias y tickets muy largos.
- **Tickets probados sin anotar:** en las pruebas de las issues #49, #134 y #110 se leyeron otros
  tickets (Coto, Kansas, Bonafide, FarmaPlus) que «leyeron bien», pero sin registrar el resultado
  campo por campo; no entran en la tabla.

## Cómo seguir midiendo

Para ampliar la muestra, con la app en el escenario «Normal»: escanear el ticket, comparar
«Revisá tu compra» con el ticket y anotar una línea por ticket (sin datos personales y sin la
foto). Dejar unos 30 segundos entre tickets por el límite del plan gratis de Groq.

| # | Comercio | Monto | Comercio | Fecha | Medio de pago | Observaciones |
|---|---|---|---|---|---|---|
| 6 | | | | | | |
