# Quickstart: validar la sincronización

## 1. Tests (sin red, sin Docker)

```bash
npm run lint && npm run typecheck && npm run test
npm run test -w @vuelto/mobile       # solo la app
```

Esperado: pasan los tests de `apps/mobile/src/sync/*.test.ts`, `lib/frescura.test.ts` y `store/*.test.ts`
(paginación con empates y fila modificada entre páginas, margen de relectura, atomicidad, bajas que no suben el restante
del tope, reemplazo en la primera sincronización, compras pendientes, cambio de cuenta, claves de persistencia, ventana
para meses de 28/29/30/31 días y los bordes de las 00:00 y 23:59).

## 2. Consultas contra un Supabase local (Docker)

```bash
supabase start        # o una copia con otro project_id/puertos si hay otro stack en 5432x
supabase db reset
npm run test:integracion -w @vuelto/mobile    # arranca contra API_URL/ANON_KEY de `supabase status`
```

Esperado: las consultas de `contracts/postgrest.md` devuelven lo mismo que en `research.md` R1 (cursor con empates,
`jurisdiccion` nula incluida, escritura denegada). Los datos los siembra el propio test.

## 3. Medición del corpus

```bash
EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… MEDICION_EMAIL=… MEDICION_PASSWORD=… \
  node --experimental-strip-types apps/mobile/scripts/medir-corpus.ts
```

Esperado: cantidad, bytes totales, promedio y máximo por promo, y qué fracción es de 6 MB y de 2 MB. Sin corpus real
(#35) devuelve 0 y la documentación conserva la proyección rotulada.

## 4. Modo avión (prueba manual, bloqueada por #40, #35 y #41)

1. Con sesión y corpus real, abrir la app con señal y esperar a que aparezca "Promos actualizadas hace unos minutos".
2. Cerrar la app, activar el modo avión, volver a abrirla.
3. Elegir un comercio: la recomendación es la misma que con señal, la leyenda sigue y no aparece ningún error.
