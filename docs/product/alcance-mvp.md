# Alcance del MVP

**Dentro:** CABA/AMBA (restricción de zona para todo el producto, no solo
para supermercado), corpus de promociones de las 13 categorías que publica
MODO (ver detalle abajo), flujo de compra optimizado para esas 13 categorías
(no solo supermercado), una sola billetera como fuente de ingesta (MODO),
cadenas de supermercado, ingesta asistida con revisión humana, perfil
declarado por el usuario, registro por ticket, gasto en grupo nivel 0 (ver
abajo).

**Fuera:** integración bancaria, lectura de resúmenes, publicación sin
revisión humana, cobertura nacional, app nativa (se usa Expo).

## Rubro, billeteras y cadenas concretas

### Billetera: se reduce de 6 a 1 (MODO)

El alcance original consideraba 6 billeteras/bancos como fuentes de
ingesta. El relevamiento técnico y legal (`fuentes-promos.md`, issue #12)
encontró que la mitad de esas fuentes no se pueden scrapear sin más:
Mercado Pago prohíbe explícitamente el uso de robots/scraping en sus
términos, y Santander y BBVA bloquean el acceso automatizado a nivel de red
(WAF) incluso con un navegador real. De las 3 restantes, automatizables sin
objeción legal ni técnica (MODO, Cuenta DNI, Galicia), **se decide acotar el
MVP a una sola: MODO**.

Se procede así en vez de sostener las 3 fuentes automatizables porque
mezclar automatización parcial con captura manual de las fuentes bloqueadas
agregaba complejidad de ingesta que no aporta al objetivo del MVP (demostrar
el motor de reglas y el control de topes, no maximizar cobertura de
fuentes). Queda **fuera de alcance del MVP, para más adelante**: coordinar
con los bancos/billeteras bloqueados para conseguir permiso explícito de
scraping (o un acuerdo de acceso a datos), y recién ahí reincorporarlos.

### Rubro: se amplía a las 13 categorías que publica MODO

La primera pasada de este research (con Playwright, sobre el HTML
renderizado de `modo.com.ar/promos`) había concluido erróneamente que
restaurantes/gastronomía no existía en MODO — esa conclusión estaba mal:
solo faltaba mirar en el lugar correcto. La página de promos de MODO no es
solo una SPA para renderizar con Playwright: **expone una API REST pública,
sin autenticación**, que arma el listado (`04-infrastructure.md` tiene el
detalle técnico), con 13 categorías fijas. En vez de curar un subconjunto de
rubros a mano, **se decide ingestar las 13 categorías completas** — es la
misma API y el mismo mecanismo de paginación para todas, así que filtrar
rubros no ahorra complejidad de ingesta, solo reduce cobertura sin motivo.

Conteo de promos activas por categoría, vía
`GET /promos/api/rewards/slots?...&categories=<id>` (relevado el 2026-09-21,
va a variar con el tiempo):

| Categoría | id (API) | Promos activas |
|---|---|---|
| Gastronomía | 2 | 646 |
| Indumentaria | 3 | 310 |
| Supermercados (categoría "Mercados" en la API) | 1 | 226 |
| Farmacias, Perfumerías y Peluquerías | 4 | 170 |
| Entretenimiento (categoría "Turismo y Entretenimiento" en la API) | 14 | 124 |
| Hogar | 7 | 115 |
| Electro y Tecnología | 10 | 95 |
| Jugueterías y Librerías | 13 | 54 |
| Automóviles | 8 | 45 |
| Mascotas | 12 | 29 |
| Combustibles | 5 | 22 |
| Deportes | 6 | 18 |
| Ferretería y Pinturerías | 11 | 10 |

Total: **~1864 promos activas** en MODO en este momento, repartidas en estas
13 categorías. **El flujo de compra optimizado cubre las 13 categorías, no
solo supermercado** — la recomendación (RF-03/RF-04) ya era genérica por
compra, no específica de un rubro; restringir el "flujo optimizado" a
supermercado no tenía un motivo técnico, era simplemente el recorte de
alcance original. Con el corpus completo ya ingestado desde una sola fuente,
no hay razón para seguir tratando a las otras 12 categorías como de segunda
clase.

Gastronomía en particular quedó confirmada con evidencia directa: incluye el
caso puntual que se pidió verificar, Kansas (6 promos activas, hasta 30% de
reintegro, encontrado con `search_text=Kansas`).

Lección del error original: alcanzaba con probar la API con el **id
numérico** de categoría — el intento inicial con el *slug* de texto
(`categories=gastronomia`) devolvía 0 resultados por un detalle de la
implementación de MODO, lo cual llevó a la conclusión incorrecta de que el
rubro no existía. Queda como nota para cuando se diseñe el ingestor real: no
asumir que un filtro "vacío" significa "sin datos" sin probar la variante
numérica.

### Cadenas de supermercado: la lista previa no está validada contra MODO

La lista de "presencia confirmada en CABA/AMBA" (Coto, Carrefour, Jumbo,
Disco, Vea, Día, Changomas) salió de research general de presencia en la
zona, no de las promos reales de MODO. Se intentó reconciliarla contra la
API real (`search_text=<cadena>` sobre el endpoint de promos) con resultado
mixto:

| Cadena | Promos encontradas (`search_text`) |
|---|---|
| Vea | 3 |
| Coto | 2 |
| Jumbo | 2 |
| Changomas | 2 |
| Disco | 1 |
| Carrefour | 0 |
| Día | no concluyente (ver abajo) |

**Esto no es una reconciliación confiable todavía**: `search_text=Día`
devolvió 369 resultados, pero ninguno de los títulos revisados menciona a la
cadena Día — el parámetro de búsqueda no filtra bien términos cortos o
comunes. Peor todavía: `search_text=La Anónima` dio 0 resultados, a pesar de
que esa cadena **sí apareció** directamente en el HTML renderizado de la
página en una corrida anterior de este mismo research ("20% de reintegro en
La Anónima"). La búsqueda por texto de esta API no es confiable para esta
tarea.

**Pendiente, antes de fijar el corpus sembrado a mano (RF-18)**: reconciliar
la lista de cadenas paginando por completo la categoría "Mercados" (id 1,
226 promos totales) y revisando los nombres de comercio uno por uno, en vez
de confiar en `search_text` por cadena. Importa qué cadena participa
efectivamente en MODO, no su presencia genérica en CABA/AMBA — y eso puede
afectar qué tan útil es el flujo de compra de supermercado si las cadenas
grandes (Coto, Carrefour, Jumbo, Disco, Vea, Día) tienen poca o ninguna
promoción vigente vía MODO.

## Gasto en grupo (nivel 0, última prioridad del MVP)

Responde "¿quién de nosotros debería pagar hoy?", no "con cuál de mis
tarjetas". El motor evalúa los medios de pago de todo el grupo (declarados
de antemano, sin cuentas ni topes ajenos en nivel 0) y la división se
genera sola a partir del resultado — nunca se carga a mano.

El registro de gastos y saldos es andamiaje mínimo: el producto es la
decisión de quién paga, no la gestión del gasto compartido.
