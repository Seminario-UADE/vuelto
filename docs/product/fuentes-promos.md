# Fuentes de promociones: relevamiento técnico y legal

Research de escritorio (sin scraping real) sobre las 6 billeteras/bancos del
alcance del MVP (`alcance-mvp.md`), para saber con qué nos vamos a encontrar
al implementar el ingestor con Playwright (`04-infrastructure.md`). Resuelve
el pendiente de "Relevar fuentes: HTML vs. SPA/JSON, términos de uso,
robots.txt" y alimenta RF-13 y RNF-13 (`requisitos.md`).

No resuelve el pendiente de dónde corre el cron de ingesta — eso sigue
abierto en `pendientes.md`.

## Resumen

| Fuente | robots.txt | Términos de uso | Estructura | Automatizable |
|---|---|---|---|---|
| **Mercado Pago** | Permite `/promociones` | **Prohíbe explícitamente** robots/scraping (verificado, cita textual abajo) | No determinada (403 al fetch; no se probó Playwright por la prohibición) | **No** |
| **MODO** | Permite, incluso nombra bots de IA como permitidos | Sin cláusula de scraping (verificado, fetch directo) | **SPA con API REST pública detectada** (`/promos/api/rewards/*`, sin autenticación) — no hace falta Playwright para ingestar | **Sí** |
| **Cuenta DNI (Banco Provincia)** | Totalmente abierto | Sin cláusula de scraping en el PDF de términos | **HTML tradicional confirmado** | **Sí** |
| **Santander** | No verificable (timeout) | Sin cláusula explícita; aviso legal genérico restrictivo | No determinable — **bloqueado incluso con Playwright** (navegador real, timeout total) | **No** |
| **Galicia** | Permite; tiene `sitemap-beneficios.xml` dedicado | Sin prohibición de scraping (verificado, PDF leído completo); sí prohíbe copiar/redistribuir/comercializar contenido sin consentimiento escrito — zona gris | **SPA confirmada** (`#spa-root` en el HTML) | **Sí** |
| **BBVA** | No verificable — 403 hasta en robots.txt | Sin prohibición de scraping confirmada en el aviso legal general (bloqueado para lectura); la cláusula de "robots/arañas" que existe es de otro documento y aplica solo a proveedores de geolocalización de la app móvil, no al sitio | No determinable — bloqueado en todos los intentos, con y sin Playwright headless | **No** |

## Detalle por fuente

### Mercado Pago

- URL de promos: `mercadopago.com.ar/promociones`.
- `robots.txt` permite la ruta.
- Términos y condiciones para desarrolladores (`mercadopago.com.ar/developers/es/docs/resources/legal/terms-and-conditions`), Sección 7.2 inciso F, leídos con fetch directo:
  > "Utilizar robots, harvesters, spiders, scraping u otra tecnología para acceder al Contenido de Mercado Pago o al Sitio o a los servicios prestados por Mercado Pago, o utilizarlos para obtener cualquier información que no le sea proporcionada por Mercado Pago en virtud de estos Términos y Condiciones."
- La cláusula prohíbe el método (usar robots/scraping para acceder) independientemente de si la información es pública — no aplica solo a datos privados. No se pudo confirmar si el documento de términos generales del sitio (no el de desarrolladores) repite la misma cláusula (dio 403 al fetch), pero alcanza con esta para tratarlo como prohibido.
- **Captura manual**, no automatizada.

### MODO

- URL de promos: `modo.com.ar/promos`.
- `robots.txt` (`modo.com.ar/robots.txt`) permite todo (`Allow: /`), y nombra explícitamente bots de IA como permitidos (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Gemini-User`). Bloquea solo `/api/`, `/data/` y rutas de flujo interno (`/pagar/`, `/scan-qr/`, `/validar-identidad/`).
- Términos de uso (`modo.com.ar/terminos-y-condiciones`), leídos con fetch directo: sin cláusula de scraping. Solo una genérica de no usar mecanismos para impedir el funcionamiento del sitio.
- Estructura confirmada con Playwright real: el HTML crudo (sin JS) trae solo 47 caracteres de texto visible (el `<title>`); el contenido renderizado tiene 3251 caracteres de texto visible con las promos. **SPA confirmada.**
- **Hallazgo posterior, más importante que lo anterior**: inspeccionando las requests de red que dispara la página se encontró que MODO expone una **API REST pública y sin autenticación** (`www.modo.com.ar/promos/api/rewards/...`) que responde con `curl` común, sin necesidad de navegador:
  - `GET /promos/api/rewards/categories?subcategories=true` — las 13 categorías de comercio (Gastronomía, Farmacias, Mercados, Estaciones de Servicio, etc.), cada una con `id` numérico y `slug`.
  - `GET /promos/api/rewards/banks?source=app_modo` — el listado completo de bancos asociados (~28), cada uno con su propio `promotion_url` (la página de beneficios de ese banco).
  - `GET /promos/api/rewards/slots?slots=web-modo-hub-mas-promos&categories=<id>&banks=<id>&search_text=<texto>&page=<n>&limit=<n>` — el listado paginado de promos, filtrable por categoría, banco o texto libre.
  - **Ojo con un detalle real**: filtrar por `categories=<slug>` (texto) devuelve 0 resultados; hay que usar el **id numérico** de la categoría. Este error llevó a una conclusión incorrecta en la primera pasada de este research (ver `alcance-mvp.md`). También se encontró que `search_text` no es confiable para términos cortos/comunes (ej. "Día" trae 369 resultados que no tienen nada que ver).
- **Automatizable de forma más simple de lo esperado**: no hace falta Playwright para ingestar MODO — se puede pegar directo a esta API con requests HTTP simples, igual que Cuenta DNI. La necesidad de "esperar el render" queda relegada a cuando haga falta reproducir exactamente lo que ve el usuario en el sitio, no para extraer los datos.

### Cuenta DNI (Banco Provincia)

- URL de promos: `bancoprovincia.com.ar/cuentadni/contenidos/cdniBeneficios/`.
- `robots.txt` totalmente abierto.
- Términos y condiciones (PDF): sin cláusula de scraping.
- El HTML crudo ya trae el contenido de las promos como texto plano — no hace falta ejecutar JS. **HTML tradicional confirmado.**
- **Automatizable**, y la más simple de las 6 (ni siquiera necesita esperar render).

### Santander

- URL de promos: `santander.com.ar/personas/beneficios`.
- `robots.txt` no verificable — timeout en todos los intentos (fetch simple y Playwright).
- Términos de uso: no se encontró cláusula explícita de scraping, solo un aviso legal genérico que restringe reproducir/transmitir/modificar contenido sin autorización escrita.
- Se probó con Playwright real (Chromium headless, HTTP/2 deshabilitado) contra `/personas/beneficios` y contra la home: **timeout de 45s en ambas, sin cargar ni el DOM inicial**. No es una limitación del método de fetch — es un bloqueo de red real (WAF u otro filtro) que tampoco cede ante un navegador real básico.
- **Captura manual** — no es viable automatizar sin técnicas de evasión activa, que quedan descartadas por decisión de alcance.

### Galicia

- URL de promos: `galicia.ar/personas/promociones` (o el buscador de beneficios de `bancogalicia.com`, que redirige a `galicia.ar`).
- `robots.txt` permite (solo bloquea rutas con `!ut/` y parámetros `utm`), y publica un `sitemap-beneficios.xml` dedicado — útil para descubrir URLs de promos sin crawlear todo el sitio.
- Términos y condiciones del sitio (PDF, versión vigente 04/01/2023, **leído completo**, no por resumen): 10 cláusulas — responsabilidad, propiedad intelectual, jurisdicción (tribunales de CABA). **Ninguna menciona robots, spiders, scraping ni tecnología automatizada.** Sí existe la cláusula 8: "Banco Galicia prohíbe la duplicación, copia, redistribución, comercialización o cualquier otra actividad que se pueda realizar con los contenidos de https://www.galicia.ar, aun citando las fuentes, salvo consentimiento expreso y por escrito de Banco Galicia." Es una restricción de propiedad intelectual sobre el *destino* del contenido (copiar/redistribuir/comercializar), no una prohibición del *método* de acceso — zona gris, no una prohibición de scraping equivalente a la de Mercado Pago.
- Estructura: **SPA confirmada** — se detectó `#spa-root` en el HTML, sin contenido de promos como texto estático.
- **Automatizable** con Playwright (esperando render), con la salvedad legal de zona gris anotada.

### BBVA

- URL de promos: `bbva.com.ar/beneficios/`.
- `robots.txt`: **403 Forbidden** incluso para ese archivo — señal fuerte de WAF/bot-management.
- Aviso legal general (`bbva.com.ar/personas/aviso-legal.html`, el documento que regiría el uso del sitio): bloqueado con 403 en todos los intentos de fetch directo; no hay snapshot en Wayback Machine; el espejo de BBVA Paraguay no respondió. No se pudo leer el texto completo.
- **Corrección importante sobre una afirmación previa de este relevamiento**: se había citado una cláusula de "robots, arañas..." como prohibición general de scraping del sitio. Verificado con más profundidad, esa cláusula **no es del aviso legal general** — pertenece a "Condiciones BBVA Móvil" (`bbva.com.ar/personas/avisos/condiciones-bbva-movil.html`) y está acotada explícitamente a los "Proveedores de Servicios de Geolocalización" de la app (el servicio de mapas de terceros), no al contenido del sitio ni a la página de beneficios. Lo único confirmado sobre el aviso legal general, vía resúmenes de búsqueda, es una cláusula genérica de copia/redistribución similar a la de Galicia — no una prohibición específica de scraping.
- **Automatizable, en teoría, según lo legal (zona gris, igual que Galicia)** — pero **no accesible en la práctica**: bloqueado con 403 en robots.txt, aviso legal y home, sin Playwright probado (no tenía sentido intentarlo dado el bloqueo ya confirmado a nivel de red).
- **Captura manual**, por bloqueo técnico — no por la prohibición contractual que se había asumido inicialmente.

## Consecuencias para el pipeline de ingesta

- **Automatizables (3 de 6):** MODO (API REST pública, `curl`/`fetch` alcanza — no hace falta Playwright), Cuenta DNI (HTML directo), Galicia (SPA, sí necesita Playwright esperando el render — no se le encontró una API equivalente a la de MODO).
- **Captura manual (3 de 6):** Mercado Pago (prohibición contractual confirmada), Santander y BBVA (bloqueo técnico — WAF — que no cede ni con navegador real).
- Como el MVP se acota a una sola fuente de ingesta (MODO, ver `alcance-mvp.md`), en la práctica el ingestor del MVP ni siquiera necesita Playwright: alcanza con requests HTTP simples contra la API de MODO. Playwright queda relevante recién si se reincorporan Galicia u otras fuentes SPA en el futuro.

## Metodología y limitaciones

- Fetch simple + búsqueda web para una primera pasada sobre las 6 fuentes; luego verificación directa (fetch al documento legal primario, o Playwright real) para las afirmaciones que iban a quedar escritas como hechos en este documento.
- Se instaló Playwright (Chromium headless) de forma ad-hoc para esta investigación, fuera del repo — no quedó nada instalado en el proyecto.
- No se usó ninguna técnica de evasión de bloqueos (proxies, stealth, rotación de IP) contra Santander ni BBVA — el bloqueo se documenta tal cual se encontró, no se intentó sortear.
- Cláusulas de términos de uso verificadas con lectura completa del documento primario: Mercado Pago (desarrolladores), Galicia, MODO. Para Cuenta DNI y Santander, la ausencia de cláusula surge de research vía búsqueda, no de una lectura exhaustiva línea por línea — no se puede descartar por completo que exista algo no encontrado.
- BBVA quedó con una clasificación inicial incorrecta (se le atribuyó una prohibición de scraping que en realidad aplica a otro servicio) que se corrigió en esta versión del documento tras pedido de verificación más profunda.
- MODO tuvo un error similar en la primera pasada: se concluyó que no tenía gastronomía por buscar esa palabra en el HTML renderizado con Playwright, sin saber todavía que existía una API con categorías propias. Corregido en `alcance-mvp.md` al encontrar la API y consultarla con el id numérico correcto de categoría (646 promos de gastronomía, no cero).
