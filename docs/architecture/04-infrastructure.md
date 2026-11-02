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

### Tabla de secrets

Los nombres están en `apps/mobile/.env.example` y `supabase/.env.example`
(sin valores). Los `.env` reales están ignorados por git.

| Secret | Quién la usa | Dónde vive | Cómo se rota |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | App mobile | `apps/mobile/.env` (local); variable de entorno del perfil en EAS | No es secreta (URL pública del proyecto). Cambia solo si se crea otro proyecto |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App mobile | `apps/mobile/.env` (local); variable del perfil en EAS (`eas env:create`) | Es pública por diseño: la protege RLS, no el secreto. Rotar en Supabase (Settings → API Keys) y reconstruir la app con la nueva |
| `GEMINI_API_KEY` | Edge Functions (ticket); script de ingesta (letra chica) | Edge Functions: `supabase secrets set`; local: `supabase/.env`; ingesta: donde corra el cron (¹) | Generar key nueva en Google AI Studio → `supabase secrets set` + redeploy de la función → actualizar la ingesta → revocar la vieja |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo el proceso de ingesta (RNF-05) | Donde corra el cron (¹); local: `supabase/.env`. Nunca en EAS ni en la app. En las Edge Functions Supabase ya inyecta la suya: no se setea a mano | Crear una key nueva en Supabase (Settings → API Keys) y actualizar el lugar donde corre la ingesta en el mismo momento; revocar la vieja. Con las keys JWT legacy, rotar el JWT secret invalida también la anon key y obliga a reconstruir la app |

¹ Dónde corre el cron está pendiente (ver «Pendiente: dónde corre el cron»).
Si termina siendo GitHub Actions, ambos secrets viven como secret de repo. La
ingesta también necesita `SUPABASE_URL` (no secreta) junto con la service role
key.

Reglas (RNF-04, RNF-05):

- Nada con prefijo `EXPO_PUBLIC_` puede ser secreto: termina en el bundle.
  Solo van la URL y la anon key.
- La Gemini key y la service role key no aparecen en el cliente ni en el repo.
  Verificación: búsqueda de ambas en el bundle exportado y en
  `git grep` / historial, 0 resultados.
- Si una key se filtró (commit, log, captura), se rota primero y se limpia
  después: el historial de git no se considera borrado.

> **Excepción acotada**: la prueba de integración de la sincronización de la app
> (`npm run test:integracion -w @vuelto/mobile`) usa la clave de servicio de **demo** de un Supabase **local**
> (`supabase status`) para sembrar y limpiar promos de prueba, en lugar de la ingesta. Se salta si la URL no
> es `localhost` y no corre en el CI. Nunca se usa una clave real ni se empaqueta en la app.

## Contrato de escritura de `promociones` con la sincronización de la app

La app sincroniza el corpus por `actualizada_en` (spec 009). Ese campo lo pone el trigger con
`clock_timestamp()`: es la hora en que se escribe la fila, no la de la confirmación. Para que una
transacción larga no deje filas atrás, la app relee con un **margen de 10 minutos** sobre su marca.
Contrato para la ingesta y la siembra (#35, #50, #51):

- **Cada lote de escrituras se confirma en menos de 5 minutos.** Un commit por promo, o lotes chicos; nunca
  una sola transacción que escriba el corpus entero durante más tiempo.
- El borrado físico y la re-siembra con ids nuevos no mueven ninguna marca: la app los detecta pidiendo
  los ids del período en cada sincronización y sacando los que el servidor ya no tiene. Una promo que deja
  de estar vigente se da de baja (`dada_de_baja_en`), no se borra: sus compras siguen contando en el tope.

## CI

`.github/workflows/ci.yml` corre lint, typecheck, test y build (compilación
TS, no build de Expo/EAS) en cada push/PR a `main`, con los mismos comandos
que usa el subagente `test-runner` (`npm run lint|typecheck|test|build`). No
tiene relación con el cron de ingesta de abajo — comparten runner
(GitHub Actions) pero no credenciales ni objetivo. La versión de Node sale
de `.nvmrc` (22; ESLint 10 y Vitest 5 exigen ≥ 22.13). Hasta la issue #32 el
workflow tenía un job `no-code-yet` que lo mantenía en verde sin
`package.json`; se eliminó al crear el monorepo.

## Pipeline de ingesta

| Paso | Dónde corre | Qué hace |
|---|---|---|
| 1. Disparo | Cron — **pendiente dónde** | Arranca el proceso programado |
| 2. Captura | Playwright, o `fetch`/`curl` directo cuando la fuente lo permite | Abre cada página (SPA) en navegador headless y espera el render — salvo MODO, la única fuente del MVP (`../product/alcance-mvp.md`), que expone una API REST pública (`modo.com.ar/promos/api/rewards/...`) y no necesita navegador |
| 3. Guardado | Supabase `capturas_crudas` | Contenido crudo, con service role key |
| 4. Extracción | Gemini | El crudo se manda con el esquema estructurado |
| 5. Verificación | El propio script | Chequeo de salud: fuente en cero o contenido irreconocible se marca y avisa |
| 6. Publicación | El propio script | Si la promo completa los campos obligatorios del esquema se publica en la base validada; si no, se descarta sola (sin revisión humana, ADR-005) |

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
