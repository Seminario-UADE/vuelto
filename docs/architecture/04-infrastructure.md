# Infrastructure

## Servicios externos

| Servicio | Para qué | Tier | Límite antes de costar |
|---|---|---|---|
| Supabase | Postgres + Auth | Free | 500 MB de base, 50.000 usuarios |
| Gemini API | Extracción de la letra chica (ingesta) | Free (Flash) | Rate limit del free tier — poco probable a este volumen |
| Groq API | Extracción del ticket (Edge Function, ADR-012) | Free | Límites por organización (tokens por minuto y por día); se ven en la consola |
| Expo / EAS Build | Cliente mobile, distribución para el pitch | Free | 15 builds/mes gratis en EAS |
| Playwright | Ingesta / scraping | — | Sin costo, corre en el servidor |

Costo total durante el cuatrimestre: **$0**.

## Secretos y dónde vive cada llamada

- **Keys de los extractores**: nunca en la app del celular (quedarían expuestas
  en el instalador). La de Gemini la usa solo el script de ingesta (letra
  chica); la de Groq, solo la Edge Function del ticket (ADR-012).
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
| `GEMINI_API_KEY` | Script de ingesta (letra chica, #51) | Secret del repo en GitHub Actions (¹); local: `supabase/.env`. No va en las Edge Functions (ADR-012) | Generar key nueva en Google AI Studio → actualizar el secret del repo → revocar la vieja |
| `GROQ_API_KEY` | Edge Function del ticket (#48, ADR-012) | `supabase secrets set` (hace falta ser Owner o Administrator de la organización); local: `supabase/.env` | Generar key nueva en la consola de Groq → `supabase secrets set` (las funciones la leen al instante, sin redeploy) → revocar la vieja |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo el proceso de ingesta (RNF-05) | Secret del repo en GitHub Actions (¹); local: `supabase/.env`. Nunca en EAS ni en la app. En las Edge Functions Supabase ya inyecta la suya: no se setea a mano | Crear una key nueva en Supabase (Settings → API Keys) y actualizar el lugar donde corre la ingesta en el mismo momento; revocar la vieja. Con las keys JWT legacy, rotar el JWT secret invalida también la anon key y obliga a reconstruir la app |

¹ La ingesta corre en GitHub Actions (ADR-011, «Dónde corre el cron»): los
secrets viven como secret del repo y solo los recibe el workflow
`ingesta.yml`. La ingesta también necesita `SUPABASE_URL` (no secreta, pero
también como secret para no versionar el proyecto) junto con la service role
key. `GEMINI_API_KEY` se suma cuando entre el extractor de #51.

La ingesta lee esas variables del entorno, nunca de un archivo versionado. A
mano: `node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts` (por
defecto no escribe: muestra qué haría; `--aplicar` escribe).

Reglas (RNF-04, RNF-05):

- Nada con prefijo `EXPO_PUBLIC_` puede ser secreto: termina en el bundle.
  Solo van la URL y la anon key.
- Las keys de Gemini y de Groq y la service role key no aparecen en el cliente ni en el repo.
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
| 1. Disparo | GitHub Actions, `ingesta.yml`: todos los días a las 06:00 ART, y a mano («Run workflow») | Arranca `ingesta/src/corpus/ingestar.ts --aplicar` |
| 2. Captura | Playwright, o `fetch`/`curl` directo cuando la fuente lo permite | Abre cada página (SPA) en navegador headless y espera el render — salvo MODO, la única fuente del MVP (`../product/alcance-mvp.md`), que expone una API REST pública (`modo.com.ar/promos/api/rewards/...`) y no necesita navegador |
| 3. Guardado | Supabase `capturas_crudas` | Tarjeta del listado y detalle de MODO, tal cual, con service role key. Solo si cambió respecto de la última captura de esa promo |
| 4. Extracción | Código (hoy); Gemini para la letra chica (#51) | Lo que MODO trae estructurado se mapea por código, sin modelo de lenguaje. La letra chica (acumulabilidad, jurisdicción) queda en `null` hasta #51 |
| 5. Verificación | El propio script | Validación de cada promo (`esPromocionPublicable` y rangos). Chequeo de salud: un formato que el mapeo no reconoce o un detalle que no se pudo bajar hacen fallar la corrida (mail de GitHub); si la corrida publicaría menos de la mitad de las promos activas, no escribe nada |
| 6. Publicación | El propio script | Upsert por `(fuente, fuente_id)` en lotes de 50 de lo que cambió; las promos que dejan de publicarse se dan de baja (`dada_de_baja_en`), nunca se borran. Lo que no completa el esquema se descarta solo (sin revisión humana, ADR-005) |

El paso 5 no es opcional: sin chequeo de salud, un rediseño de página o un
bloqueo de WAF degrada el corpus en silencio.

### Dónde corre el cron: GitHub Actions (ADR-011)

Decidido: GitHub Actions, una vez por día. Los tres reparos que lo dejaban
pendiente, y cómo quedan:

- **Service role en secrets del repo.** Solo la recibe `ingesta.yml`, que se
  dispara por `schedule` y `workflow_dispatch`, nunca por `pull_request`: un
  PR desde un fork no la ve (GitHub no pasa secrets a esos workflows). El
  workflow corre con `permissions: contents: read`.
- **Actions como servicio de producción.** Para el MVP alcanza: si una corrida
  falla, la base conserva la anterior y GitHub avisa por mail. La app nunca
  depende de que la ingesta ande en ese momento.
- **IPs de datacenter.** La única fuente del MVP es la API pública de MODO, no
  la web de un banco con WAF. La primera corrida en Actions confirma que MODO
  no bloquea esas IPs; si bloqueara, la corrida falla sin tocar la base.

## Distribución para el pitch

Expo Go (QR, sin compilar) como camino principal. Respaldo: build de EAS,
por si el servidor de desarrollo falla el día del pitch. Perfil `preview` de
`apps/mobile/eas.json` (APK, distribución interna), con las variables
públicas tomadas del entorno `preview` de EAS. Pasos, link de descarga y
prueba en Android: `docs/presentacion/build-respaldo.md` (issue #56).
