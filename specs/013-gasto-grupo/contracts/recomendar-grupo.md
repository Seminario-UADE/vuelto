# Contrato: `POST /functions/v1/recomendar-grupo`

Edge Function `supabase/functions/recomendar-grupo` (ADR-009: handler → `ServicioGrupo` → repositorios). Corre con la sesión de quien pide; nunca con la service role key.

## Pedido

Headers: `Authorization: Bearer <JWT del usuario>`, `Content-Type: application/json`.

```json
{
  "compra": {
    "comercio": "La Parolaccia",
    "categoriaId": 2,
    "canal": "presencial",
    "monto": 41000
  },
  "contactos": ["0b5d…", "7e21…"],
  "sinCuenta": 1
}
```

| Campo | Regla | Error |
|---|---|---|
| `compra.comercio` | `string` no vacío o `null` | `invalido` / `compra.comercio` |
| `compra.categoriaId` | entero que existe en `categorias` | `invalido` / `compra.categoriaId` |
| `compra.canal` | `"presencial"` o `"online"` | `invalido` / `compra.canal` |
| `compra.monto` | entero > 0 | `invalido` / `compra.monto` |
| `contactos` | array de uuid, sin repetidos, sin el id de quien pide | `invalido` / `contactos` |
| `sinCuenta` | entero ≥ 0 | `invalido` / `sinCuenta` |
| tamaño | `1 + contactos.length + sinCuenta` entre 2 y 12 | `invalido` / `grupo` |

No lleva fecha (FR-024). Los nombres de los sin cuenta no viajan.

## Respuesta 200

```json
{
  "fecha": "2026-11-15",
  "quienPaga": { "tipo": "contacto", "id": "0b5d…" },
  "reintegro": 5000,
  "total": 36000,
  "vos": {
    "opcion": {
      "medio": { "id": "a1…", "bancoNombre": "Banco Provincia", "tipo": "debito", "red": "visa" },
      "queDa": "25% en gastronomía los sábados",
      "reintegro": 4000,
      "base": { "tipo": "con_compras", "comprasRegistradas": 3, "periodo": "mensual" }
    },
    "sinOpcion": null,
    "parte": 9000
  },
  "contactos": [
    {
      "id": "0b5d…",
      "nombre": "Lucía",
      "opcion": {
        "medio": { "bancoNombre": "Banco Galicia", "tipo": "credito", "red": "visa" },
        "queDa": "20% en gastronomía",
        "reintegro": 5000,
        "base": { "tipo": "con_compras" }
      },
      "parte": 9000
    },
    {
      "id": "7e21…",
      "nombre": "Mateo",
      "opcion": { "medio": null, "queDa": null, "reintegro": 3000, "base": { "tipo": "sin_compras" } },
      "parte": 9000
    }
  ],
  "sinCuenta": [{ "posicion": 0, "parte": 9000 }]
}
```

### Reglas de la respuesta (FR-021, FR-022)

- **`vos`**: su opción completa (es su propio dato), incluidos la cantidad de compras y el período de la base. `sinOpcion` es el motivo del descarte principal (texto del motor) cuando `opcion` es `null`; si tampoco hay descarte, `null`.
- **`contactos[i].opcion`**: `null` si no tiene reintegro. Si lo tiene:
  - `reintegro`: en escalones de $100 (D9).
  - `base.tipo`: `con_compras`, `sin_compras`, `sin_tope_informado` o `tope_por_compra`. **Nunca** `comprasRegistradas` ni `periodo`.
  - `medio` y `queDa`: solo si ese contacto es `quienPaga`; si no, `null`. `medio` no lleva `id`.
- **Nunca** aparecen de un contacto: tope, restante, cantidad de compras, compras, otros medios, motivos de descarte ni el texto `motivo` del motor. Lo verifica un test que busca esos valores en todo el JSON (SC-008).
- `contactos` sale en el orden del desempate; `sinCuenta`, por `posicion`.
- `quienPaga`: `{ "tipo": "vos" }`, `{ "tipo": "contacto", "id" }` o `null`.
- `parte`: pesos enteros; la suma de todas las `parte` es `total` (FR-006).

## Errores

Cuerpo `{ "error": "<código>" }` (con `campo` solo en `invalido`). Ver research R9.

| Status | `error` | Cuándo |
|---|---|---|
| 400 | `invalido` | Validación del pedido (tabla de arriba) o body que no es JSON (`campo: "body"`) |
| 401 | `no_autenticado` | Sin `Authorization`, token inválido o anon key |
| 405 | `metodo_no_permitido` | No es `POST` |
| 409 | `contacto_no_vinculado` | Algún id de `contactos` no es contacto vinculado o no existe (misma respuesta en los dos casos) |
| 500 | `interno` | Auth caído, base caída, clave de servidor mal configurada, cualquier otra falla. Se registra solo el `name` del error |

La app corta a los 15 s (`timeout` de `functions.invoke`) y lo trata como `interno`.
