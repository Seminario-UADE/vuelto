# Quickstart: validar la Edge Function `recomendar`

## Lo que se puede validar hoy (sin Supabase)

Requisitos: Node ≥ 22.13 (`.nvmrc`).

```bash
npm ci
npm run test -w @vuelto/supabase       # handler, servicio y validación, sin red ni base
npm run typecheck -w @vuelto/supabase
npm run lint                            # todo el monorepo, igual que el CI
npm run test -w @vuelto/motor           # el motor no cambia de comportamiento
```

Resultado esperado: todo en verde. Los tests cubren:

| Qué | Dónde | Requisito |
|---|---|---|
| Mismo resultado que `recomendar()` directo | `servicio.test.ts` | FR-024, SC-003 |
| Pide los datos del usuario autenticado, rubro, hoy y mes en Argentina (incluido el pedido a las 22:00 del último día del mes) | `servicio.test.ts` | FR-020, FR-025 |
| 400 por cada campo inválido, 401 sin sesión y con anon key, 405, 422, 500 sin detalles | `handler.test.ts` | FR-018, FR-019, FR-022, FR-023 |
| Validación del body | `validacion.test.ts` | FR-019 |

Chequeo de RNF-02 (la app no importa el motor):

```bash
grep -rn "@vuelto/motor" apps/mobile    # debe dar 0 resultados
```

## Cuando cierre la #34 (Supabase local)

```bash
supabase start
supabase functions serve recomendar
curl -i -X POST http://127.0.0.1:54321/functions/v1/recomendar \
  -H "Authorization: Bearer <JWT de un usuario de prueba>" \
  -H "Content-Type: application/json" \
  -d '{"comercio":"Kansas","categoriaId":2,"monto":15000,"canal":"presencial"}'
```

Repetir con el JWT de la anon key (espera 401) y con un usuario sin medios (espera 422).

Deploy (verificar antes que el flag siga disponible, research R1):

```bash
supabase functions deploy recomendar --use-api
```

## Cuando cierren #39, #40 y #41 (pantalla)

En Expo Go, con un usuario de prueba con perfil y el corpus sembrado (#35): recorrer US1 a US4
de la spec, incluido el modo avión (US3-1).
