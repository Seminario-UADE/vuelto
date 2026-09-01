# Infrastructure

## Servicios externos

| Servicio | Para qué | Tier | Límite antes de costar |
|---|---|---|---|
| Supabase | Postgres + Auth | Free | 500 MB de base, 50.000 usuarios |
| Gemini API | Extracción (letra chica y ticket) | Free (Flash) | Rate limit del free tier — poco probable a este volumen |
| Expo / EAS Build | Cliente mobile, distribución para el pitch | Free | 15 builds/mes gratis en EAS |
| Playwright | Ingesta / scraping | — | Sin costo, corre en el servidor |

Costo total durante el cuatrimestre: **$0**.

## Secretos y dónde vive cada llamada

- **Gemini API key**: nunca en la app del celular (quedaría expuesta en el
  instalador). La llamada de letra chica sale del script de ingesta; la del
  ticket, de una Edge Function de Supabase.
- **Supabase service role key**: usada por el proceso de ingesta para
  escribir en `capturas_crudas`, saltea row-level security por completo —
  tratarla como llave maestra.

## Pipeline de ingesta

| Paso | Dónde corre | Qué hace |
|---|---|---|
| 1. Disparo | Cron — **pendiente dónde** | Arranca el proceso programado |
| 2. Captura | Playwright | Abre cada página (SPA) en navegador headless, espera el render |
| 3. Guardado | Supabase `capturas_crudas` | Contenido crudo, con service role key |
| 4. Extracción | Gemini | El crudo se manda con el esquema estructurado |
| 5. Verificación | El propio script | Chequeo de salud: fuente en cero o contenido irreconocible se marca y avisa |
| 6. Revisión | Panel de la app, una persona | El borrador espera en cola hasta aprobación |

El paso 5 no es opcional: sin chequeo de salud, un rediseño de página o un
bloqueo de WAF degrada el corpus en silencio.

### Pendiente: dónde corre el cron

GitHub Actions es candidato (gratis en repo público) pero tiene tres
problemas sin resolver:

- La service role key en secretos de repo es superficie real si hay un PR
  desde un fork o un workflow mal escrito.
- Actions está pensado para build/test/deploy del propio repo, no para un
  cron de scraping de terceros como servicio de producción.
- IPs de los runners son de datacenter — bancos con WAF probablemente
  bloquean o tiran captcha.

Se decide cuando se sepa si las fuentes efectivamente bloquean esas IPs.

## Distribución para el pitch

Expo Go (QR, sin compilar) como camino principal. Respaldo: build de EAS,
por si el servidor de desarrollo falla el día del pitch.
