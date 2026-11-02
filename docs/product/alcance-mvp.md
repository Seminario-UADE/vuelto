# Alcance del MVP

**Dentro:** CABA/AMBA (restricción de zona para todo el producto, no solo
para supermercado), corpus de promociones de las 13 categorías que publica
MODO (ver detalle abajo), flujo de compra optimizado para esas 13 categorías
(no solo supermercado), una sola billetera como fuente de ingesta (MODO),
cadenas de supermercado, ingesta 100% automática (sin revisión humana,
validada contra esquema), perfil declarado por el usuario, registro por
ticket, gasto en grupo nivel 1 con contactos vinculados (ver abajo).

**Fuera:** integración bancaria, lectura de resúmenes, cobertura nacional,
app nativa (se usa Expo).

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

Total: **~1864 promos activas** en MODO en ese momento, repartidas en estas
13 categorías. (Al 2026-11-02, Supermercados y Farmacias tienen 117 y 54 promos de
pago vigentes, contadas una por promo; las cifras cambian con el tiempo y no
necesariamente se contaron con el mismo criterio.) **El flujo de compra optimizado cubre las 13 categorías, no
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

### Cadenas de supermercado: lo que MODO publica hoy (relevado el 2026-11-02)

La lista previa de cadenas con "presencia confirmada en CABA/AMBA" (Coto,
Carrefour, Jumbo, Disco, Vea, Día, ChangoMás) salió de research general de
presencia en la zona, no de las promos reales de MODO. Se la reconcilió con el
método que este documento pedía: **paginar por completo la categoría
Supermercados (id 1) con el id numérico y bajar el detalle de cada promo**
(`GET /promos/api/rewards/v2/benefit/<slug>`), en vez de confiar en
`search_text`, que no es confiable para términos cortos o comunes. El
relevamiento (`npm run corpus:relevar -w ingesta`, issue #35) dejó
**117 promos de pago vigentes de 78 comercios** en Supermercados y 54 en
Farmacias; los crudos fechados están en `supabase/seed/crudo/`.

| Cadena de la lista previa | Promos vigentes en MODO (2026-11-02) |
|---|---|
| Coto | **0** |
| Carrefour | **0** |
| Jumbo | **0** |
| Disco | **0** |
| Vea | **0** |
| Día | **0** |
| La Anónima | **0** |
| ChangoMás | 1 (Credicoop, tarjeta Cabal) |

Cada una de las cadenas con 0 tiene decenas de promos **vencidas** en el
listado: participaron de MODO, pero hoy no tienen ninguna promo de pago
vigente. **La lista previa no vale**: importa qué cadena participa
efectivamente en MODO hoy, no su presencia genérica en la zona.

Lo que sí hay en Supermercados:

- **Cadenas que podrían servir en CABA/AMBA** (la zona de cada una se verifica
  en su sitio antes de cargarla, spec `specs/011-corpus-promociones-seed/`,
  tarea T026): Paladini (con sus variantes «Paladar»), The Food Market,
  Tiendas de Cercanía, Tienda Nova, Ferias de la Ciudad, Mini Mercados
  (Semana Nación), ChangoMás y las promos «Beneficio Supermercados» de Macro.
- **Cadenas que se asocian a otras zonas y hay que verificar antes de contarlas
  en el alcance**: Cooperativa Obrera (Bahía Blanca y la Patagonia), Unicoop
  (Córdoba), Alvear, Monarca, Petrelli, Kilbel, Aiello y similares.
- **Regionales fuera de alcance**: la mayor parte de lo vigente son
  supermercados de Córdoba y Santa Fe (Villa María, Río Cuarto, La Carlota,
  Justiniano Posse, Lario, Rafaela). Quedan afuera por la restricción de zona
  (CABA/AMBA) aunque tengan promos vigentes.
- **Carnicerías, granjas y almacenes** sueltos, de zona no determinada; se
  incluyen solo si se confirma que rigen en CABA/AMBA.

**Consecuencia para la demo.** El flujo de supermercado no se puede mostrar
con Coto, Carrefour ni Jumbo usando datos reales de MODO: hoy no tienen ninguna
promo vigente. La compra de ejemplo del diseño (`DESIGN.md` §9, «Coto,
miércoles») es un ejemplo de diseño, no de datos reales. El equipo tiene que
decidir si el pitch muestra un supermercado que sí tenga promo real (por
ejemplo, Paladini o The Food Market) o si el recorrido principal pasa por
Farmacias, que tiene más cadenas nacionales vigentes (Farmacity, Simplicity,
Farmaonline, Juleriaque, Parfumerie).

**Pendiente que queda:** verificar la zona de cada cadena con una fuente (su
sitio o sus locales) y fijar el tamaño final del corpus. El detalle de los
casos que cubre el corpus y sus limitaciones está en `corpus-semilla.md`.

## Gasto en grupo (nivel 1, última prioridad del MVP)

Responde "¿quién de nosotros debería pagar hoy?", no "con cuál de mis
tarjetas". El motor evalúa los medios de pago de todo el grupo, cada uno
con el tope de su dueño, y la división se genera sola a partir del
resultado — nunca se carga a mano.

Los integrantes son **contactos vinculados**: se agregan con un link o QR
de invitación desde el perfil, que el otro acepta (no hay buscador de
usuarios). Aceptar es consentir que el motor use tus medios y topes en las
recomendaciones del grupo; el otro nunca ve tus topes en pesos ni tus
compras. Se pueden sumar integrantes sin cuenta declarados a mano (lo que
era el nivel 0), sin tope conocido. Detalle: ADR-008.

Hasta el 15/10/2026 el alcance era el **nivel 0** (integrantes declarados a
mano, sin cuentas ni topes ajenos). Se amplió porque sin topes ajenos el
motor podía recomendar que pague alguien con el tope ya agotado.

El registro de gastos y saldos es andamiaje mínimo: el producto es la
decisión de quién paga, no la gestión del gasto compartido.
