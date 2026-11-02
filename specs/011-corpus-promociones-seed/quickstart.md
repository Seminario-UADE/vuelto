# Quickstart: validar el corpus de punta a punta

Guía de validación de la feature (no implementa nada). Los comandos existen cuando se terminan las fases 2 a 5 de [plan.md](plan.md). Detalle de comandos en [contracts/corpus.md](contracts/corpus.md).

## Prerrequisitos

- Node 22.18 o superior y `npm ci` hecho (el `prepare` del motor lo compila solo).
- Los scripts `corpus:*` importan el motor **compilado** (`packages/motor/dist`); los tests de Vitest usan su código fuente. Si cambia `packages/motor/src`, recompilarlo con `npm run build -w @vuelto/motor` antes de correr un script (sin eso Node ve el `dist/` viejo, por ejemplo sin `normalizar`).
- Docker y la Supabase CLI (la versión que fija el CI) para el reinicio local.
- Para la carga remota: `supabase/.env` con `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL` (copiar de `supabase/.env.example`; el archivo está ignorado por git).

## 1. Tests y chequeos sin red

```bash
npm run lint && npm run typecheck && npm run test
```

Esperado: pasan los tests de `ingesta/` (validador, banco con alias, ids, mapeo, generador, carga con cliente simulado) y los del motor con las fixtures del corpus. Cobertura de líneas ≥ 90 %.

## 2. Los derivados no se desfasaron

```bash
npm run corpus:generar -w ingesta -- --verificar
```

Esperado: termina sin error. Si alguien editó `promociones.json` sin regenerar, falla y dice qué correr.

## 3. Reinicio local desde cero, dos veces, sin red

```bash
supabase start
supabase db reset
supabase db reset
supabase test db
```

Esperado: ambos reinicios terminan sin errores (Postgres valida cada fila contra los `check` y las claves foráneas), `bancos` tiene 82 filas, `promociones` tiene las del corpus con `fuente = 'manual'` y `supabase test db` pasa, incluido `corpus.test.sql` (las aserciones de `rls.test.sql` ya no dependen del total de filas).

## 4. Una promo se puede verificar sola (SC-007)

Elegir una promo al azar de `supabase/seed/promociones.json`, abrir `supabase/seed/crudo/<slug>.json` y comparar con su `revision` y sus `fragmentosFuente`. Esperado: en menos de 2 minutos se reconstruye de dónde salió cada dato.

## 5. El motor decide con promos reales (SC-004)

```bash
npm run test -w @vuelto/motor
```

Esperado: pasan las compras de prueba contra `PROMOS_CORPUS` con `AHORA` fijo: una de supermercado con banco y tarjeta que tienen promo, una de farmacia, y una donde la promo está vencida o no rige ese día y se descarta.

## 6. Carga remota (solo quien tiene la service role)

```bash
node --env-file=supabase/.env ingesta/src/corpus/cargar.ts            # dry-run: no escribe
node --env-file=supabase/.env ingesta/src/corpus/cargar.ts --aplicar
node --env-file=supabase/.env ingesta/src/corpus/cargar.ts --aplicar  # segunda vez: 0 cambios
```

Esperado: el *dry-run* informa lo que haría; la segunda corrida con `--aplicar` informa 0 inserciones, 0 actualizaciones y 0 bajas, y `actualizada_en` de las promos no se mueve.

## 7. Actualizar el corpus antes del pitch

```bash
node --env-file=supabase/.env ingesta/src/corpus/relevar.ts --categorias 1,4
```

Esperado: lista las promos que dejaron de estar vigentes y las nuevas candidatas. Una promo que venció se mueve al caso «vencida» o sale del JSON; la carga remota la da de baja, no la borra.
