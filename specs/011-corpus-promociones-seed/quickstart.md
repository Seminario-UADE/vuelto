# Quickstart: ingesta automática de promociones

> Reescrito el 2026-11-03 por ADR-011. Las promos nunca se cargan a mano.

## Una vez: los secrets del repo

En GitHub, Settings → Secrets and variables → Actions → New repository secret:

- `SUPABASE_URL`: `https://<proyecto>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: la service role del proyecto (Settings → API Keys en Supabase)

Después, en la pestaña Actions, «Ingesta de promociones» → «Run workflow» para la primera carga.
A partir de ahí corre sola todos los días a las 06:00.

## A mano, contra una base local

```bash
npm ci
npm run build -w @vuelto/motor
supabase start && supabase db reset          # categorías y bancos; sin promos
cp supabase/.env.example supabase/.env       # SUPABASE_URL=http://127.0.0.1:54321 y la service role de `supabase status`
node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts            # baja y mapea; no escribe
node --env-file=supabase/.env ingesta/src/corpus/ingestar.ts --aplicar  # publica (más de 25 minutos)
supabase test db                             # corpus.test.sql controla lo publicado
```

## Qué mirar si una corrida falla

El registro de la corrida (pestaña Actions) termina con el resumen y la lista de descartes:

- `detalleConError`: MODO no respondió para esas promos. Se reintentan solas al día siguiente; no se dieron de baja.
- `formatoDesconocido`: MODO cambió un campo. Hay que actualizar `mapear.ts` (el mensaje trae la ruta del campo).
- «publicaría N promos y hay M activas»: el resguardo frenó la escritura. La base quedó como estaba.
