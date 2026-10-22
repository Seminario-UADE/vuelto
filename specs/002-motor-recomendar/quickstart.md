# Quickstart: validar el motor de recomendación

## Requisitos

- Node ≥ 22.13 (`.nvmrc`) y `npm ci` desde la raíz.

## Correr

```bash
npm run test -w @vuelto/motor        # suite del motor, sin red
npm run typecheck && npm run lint    # lo mismo que el CI
```

Para probar sin red, cortar la conexión y volver a correr la suite (SC-006).

## Qué tiene que pasar

| Escenario | Test que lo cubre | Resultado esperado |
|---|---|---|
| US1-1: Galicia 20% vs. Santander 10%, compra de $10.000 | `recomendar.test.ts` | `mejor` = Galicia con $2.000; alternativa Santander con $1.000 |
| US1-3 / SC-001: misma entrada dos veces, y con las listas mezcladas | `recomendar.test.ts` | resultados iguales en profundidad |
| US1-4: perfil sin medios | `recomendar.test.ts` | lanza `PerfilSinMediosError` |
| US2 / SC-002: una promo por regla que falla sola | `elegibilidad.test.ts` | una causa por test, las 9 |
| US3-1 a US3-7: tope parcial, agotado, mes anterior, estimado, techo, sin tope, sin compras | `tope.test.ts` | ahorro, restante y base de cada escenario |
| Bordes de fecha (23:30 del 31/10 en Argentina) | `fecha.test.ts` | `2026-10-31`, sábado |
| Enteros (33,3%, $0,29, tope justo en $0) | `dinero.test.ts` | sin errores de redondeo |
| SC-003: 2.000 promos y 100 compras | `recomendar.test.ts` | menos de 1 s |

Las firmas y la semántica están en [`contracts/recomendar.md`](contracts/recomendar.md); los tipos,
en [`data-model.md`](data-model.md).
