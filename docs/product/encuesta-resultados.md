# Encuesta: resultados y análisis

Fuente: "Proyecto Vuelto: Encuesta sobre el uso de promociones y billeteras
virtuales" (Google Forms). **51 respuestas**, recolectadas entre el
2026-09-08 y el 2026-09-20. Cubre el research listado en `research.md`
("Encuesta — alto volumen por lo transversal del problema").

> Sesgo de muestra: 62.7% tiene entre 18 y 25 años — casi seguro la
> encuesta circuló por la red de contactos del equipo (compañeros de
> facultad). Los porcentajes de abajo describen a esa población, no
> necesariamente al público objetivo completo de Vuelto. Sirve para
> validar la existencia del problema, no para dimensionar el mercado.

## Resumen ejecutivo

- **El problema existe y es medible**: 98% (68.6% "alguna vez" + 29.4%
  "seguido") pagó una compra y se enteró después de que había una promo
  mejor disponible. Casi nadie (7.8%) lleva un registro exacto de su tope de
  reintegro consumido.
- **Hay una contradicción reveladora**: 51% dice sentirse "seguro" de qué
  tarjeta conviene usar al pagar, pero eso no se sostiene con cómo controlan
  el tope (92% no lleva un registro riguroso) ni con que casi todos hayan
  perdido una promo mejor alguna vez. La "seguridad" percibida no coincide
  con el control real — es el hueco exacto que Vuelto ataca.
- **La solución que la gente pide es la propuesta de valor de Vuelto, no
  un listado de promos**: la opción más elegida para "qué te daría
  tranquilidad" es que la app le diga directamente con qué pagar en el
  momento (41.2%), no un buscador unificado de promociones (15.7%, la
  opción menos elegida junto con "saber el tope").
- **La heurística real de la gente ignora el tope consumido**: 68.6% elige
  la tarjeta con mayor % de descuento nominal; solo 13.7% mira si le queda
  tope disponible. Es exactamente el error que corrige el motor de reglas.
- **Intención de uso muy alta, aunque esperable**: 96.1% dice que sí usaría
  una app así, 3.9% "tal vez", 0% que no — normal en una encuesta de
  intención, pesa menos que los datos de comportamiento de arriba.

## Hallazgos por tema

### 1. El problema es real, no solo percibido

| Pregunta | Resultado |
|---|---|
| ¿Alguna vez pagaste y te enteraste después de una mejor promo? | 68.6% "alguna vez", 29.4% "seguido", 2.0% "nunca" |
| ¿Cómo llevás el control del tope consumido? | 47.1% no lleva ningún control, 25.5% cálculo mental, 19.6% revisa el historial de cada app a mano, 7.8% lleva registro exacto |
| Mayor frustración | 54.9% "llegar a la caja y darte cuenta de que la promo era con otra app / no aplicaba hoy / no leíste la letra chica" — domina muy por encima del resto (21.6% demora/estrés al calcular, 21.6% no recibir el reintegro por tope superado, 11.8% plata esparcida en varias cuentas) |

Confirma el diagnóstico de `problema.md`: "el usuario paga con el primer
medio disponible y pierde plata sin darse cuenta — el problema no es la
falta de información, es la decisión."

### 2. La gente ya intenta optimizar, pero a ciegas

- 54.9% dice estar de acuerdo o totalmente de acuerdo con planificar sus
  días de compra en función de los descuentos bancarios (Q4).
- Pero al momento de elegir entre dos tarjetas con promo, 68.6% usa una
  heurística de un solo factor — el % de descuento nominal — sin mirar si
  le conviene guardar tope para otra compra (solo 13.7% lo considera) ni
  el tope nominal restante (13.7%) (Q12).
- Se enteran de las promos por canales dispersos y no confiables: redes
  sociales de bancos/billeteras (41.2%), carteles en el local (31.4%),
  notificaciones push (27.5%) (Q5, multi-respuesta). Refuerza el problema
  de letra chica difícil de seguir que motiva `logica-de-negocio.md` y el
  circuito de ingesta con revisión humana (`decisions/005-*.md`).

### 3. Lo que piden valida la propuesta de valor, no un buscador de promos

Pregunta 11 (multi-respuesta), ordenada:

| % | Opción |
|---|---|
| 41.2% | Que una app le diga directamente "Pagá con la billetera X" en el momento, sin hacer cuentas |
| 39.2% | Que le avisen automáticamente qué días comprar en sus locales preferidos |
| 15.7% | Saber, antes de pagar, si todavía tiene tope disponible |
| 15.7% | Unificar todas las promociones en un buscador confiable |

Las dos opciones más elegidas son literalmente la recomendación activa de
Vuelto. La opción que más se parece a "mostrar promociones" — justo lo que
la regla de oro de `CLAUDE.md` dice que este producto **no** es — queda
última, empatada. Es evidencia a favor de la decisión de producto, no solo
una intuición del equipo.

### 4. Multiplicidad de medios de pago: valida el motor de reglas

43.1% usa 3 o más tarjetas/billeteras por mes (27.5% usa 3-4, 7.8% usa 5 o
más) (Q3). Sin un motor que compare combinaciones, elegir entre esa
cantidad de medios en el momento de pagar es exactamente el "abrumado/a y
ansioso/a" que reportó el 11.8% en Q6 (y el 23.5% "dudoso" que se suma).

### 5. Riesgo a marcar: tensión con notificaciones

39.2% + 41.2% de la gente pide, en esencia, algún tipo de aviso proactivo
(qué días comprar / con qué pagar en el momento). Pero `riesgos.md` ya
registra que solo 16% de los usuarios acepta permisos de notificaciones
push (Web Almanac 2025). Hay una brecha entre lo que la gente dice que
quiere y lo que históricamente acepta habilitar — no se resuelve acá, pero
conviene tenerlo presente cuando se defina "cómo se dispara el momento de
uso" (pendiente en `pendientes.md`).

## Lo que esta encuesta NO aporta

- No preguntó qué billeteras/bancos usa cada quien — no sirve para
  reforzar ni objetar la lista de 6 billeteras de `alcance-mvp.md`. Si se
  repite la encuesta, vale la pena agregar esa pregunta.
- No preguntó por rubros más allá de supermercado — no aporta evidencia
  sobre combustible/restaurantes (eso se resolvió por otra vía, ver
  `alcance-mvp.md`).
- Es intención declarada, no comportamiento medido — el 96.1% de "sí la
  usaría" (Q13) pesa menos que los datos de comportamiento real de las
  secciones 1 y 2. El auto-registro de una semana con cifra real en pesos
  (pendiente en `pendientes.md`) sigue siendo necesario para complementar
  esto con datos no auto-reportados.

## Qué cambia en el producto

Nada de esto contradice una decisión ya tomada — todo lo contrario, valida
el diagnóstico de `problema.md`, el alcance de `alcance-mvp.md` y la regla
de oro de `CLAUDE.md`. Sirve como evidencia para el pitch y para la entrega
de research de la cátedra, no como input que fuerce un cambio de alcance.
