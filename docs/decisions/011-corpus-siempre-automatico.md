# ADR-011: El corpus de promociones es siempre automático (ingesta diaria en GitHub Actions)

## Context

ADR-005 decidió que la ingesta publica sin revisión humana, pero en sus
consecuencias recomendaba "sembrar el corpus a mano en los primeros sprints".
La issue #35 y la spec 011 armaron ese corpus a mano: un archivo
`promociones.json` que una persona completaba promo por promo, con su firma
de revisión, más crudos de MODO versionados en el repo.

Eso tiene dos problemas que el PO marcó como inaceptables:

1. **Queda viejo enseguida.** Las promos cambian por día y por mes. Un corpus
   que depende de que alguien lo actualice a mano muestra promos vencidas y
   le faltan las nuevas. El primer relevamiento leyó una sola sección de la
   web de MODO y dejó afuera las cadenas grandes (Coto, Jumbo, Día, La Anónima,
   ChangoMás), que son justo las que la gente usa.
2. **Contradice el producto.** La revisión a mano es la cola de aprobación que
   ADR-005 descartó, solo que con otro nombre.

Al mismo tiempo, lo que el corpus a mano necesitaba de una persona ya lo trae
MODO estructurado en su API pública: banco por id, porcentaje, días, redes,
tope y su período, vigencia, canal. Lo único que solo está en la prosa
(acumulabilidad, jurisdicción) el motor ya lo tolera en `null`.

## Decision

- Las promos **nunca se cargan a mano**. Las publica la ingesta automática
  (`ingesta/src/corpus/ingestar.ts`), con fuente `modo`.
- Corre **una vez por día** en GitHub Actions (`.github/workflows/ingesta.yml`,
  06:00 de Argentina), y se puede correr a mano desde la pestaña Actions.
- Consume la **API pública de MODO** que usa www.modo.com.ar/promos (todas las
  secciones de la web más el listado anterior por categoría, y el detalle de
  cada promo), no scraping de HTML: es la misma información, estructurada.
- El mapeo es **código determinístico, sin modelo de lenguaje** (ADR-004). Lo
  que no se puede representar sin sobrestimar el reintegro (topes diarios o
  por toda la promo, niveles de cliente, promos de más de tres categorías) se
  **descarta solo**, con el motivo en el registro de la corrida.
- Cada corrida guarda lo que dijo MODO en `capturas_crudas` (solo si cambió) y
  cada promo apunta a su captura (`captura_cruda_id`): trazabilidad sin
  archivos en el repo.
- Una promo que MODO publica para varios bancos se guarda una vez por banco,
  pero las partes **comparten un solo tope** (`alcance = compartido`,
  `grupoTopeId = modo:<slug>`): es una sola oferta con un tope por usuario, y
  sumarlo por banco prometería de más.
- La letra chica (acumulabilidad, jurisdicción, condiciones que contradicen la
  API) la sumará el extractor con Gemini de #51, en la misma corrida, sin
  revisión humana.

Esta decisión reemplaza la consecuencia de ADR-005 sobre sembrar a mano. El
resto de ADR-005 sigue vigente.

## Rationale

- **"La demo no puede depender de que el scraper funcione"** (ADR-005) se
  resuelve sin carga manual: la app lee de Supabase, no de MODO. Si una
  corrida falla, la base queda con lo del día anterior y GitHub avisa por mail.
- **Resguardos en vez de revisión.** Una promo cuyo detalle falló no se da de
  baja (no se sabe si sigue vigente). Si una corrida publicaría menos de la
  mitad de las promos activas (por ejemplo, porque MODO cambió el formato),
  no escribe nada y sale con error.
- **GitHub Actions** es gratis para el repo, ya tiene los secrets del
  proyecto y no agrega infraestructura. Supabase Edge Functions no sirve: la
  corrida dura más de 25 minutos por la pausa entre pedidos (RNF-13).
- **Una vez por día** alcanza: las promos de MODO cambian de un día para otro,
  no de una hora para otra, y respeta la carga sobre MODO.

## Consequences

- Se borran el archivo `promociones.json`, las exclusiones y los grupos de tope
  a mano, los comandos de revisión (`corpus:borrador`, `corpus:generar`,
  `corpus:cobertura`, `corpus:relevar`), el seed de promociones y las fixtures
  del motor armadas con ese corpus. Los crudos dejan de versionarse en el repo.
- La base local no trae promos después de `supabase db reset`: se cargan
  corriendo la ingesta contra ella.
- Antes de la primera corrida hay que cargar `SUPABASE_URL` y
  `SUPABASE_SERVICE_ROLE_KEY` como secrets del repo.
- La issue #53 (precisión del extractor) ya no puede medir contra un corpus
  revisado a mano: hay que redefinir contra qué se mide.
- Lo que la API declara pero la letra chica contradice (por ejemplo, una promo
  que la API da por vigente y los legales dan por terminada) se publica hasta
  que #51 lea la letra chica. Es un riesgo aceptado, igual que en ADR-005.
- `capturas_crudas` crece con cada cambio de una promo. Con ~400 promos de
  unos 6 KB y cambios poco frecuentes entra holgado en el plan gratis de
  Supabase durante el cuatrimestre; si no, se poda por antigüedad.
