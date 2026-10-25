# Contrato: `POST /functions/v1/recomendar`

Edge Function de Supabase. La consume la pantalla «¿Con qué pago?» (`apps/mobile`).

## Pedido

```http
POST /functions/v1/recomendar
Authorization: Bearer <JWT de la sesión del usuario>
Content-Type: application/json

{ "comercio": "Kansas", "categoriaId": 2, "monto": 15000, "canal": "presencial" }
```

- `comercio`: `string | null`. `null` = solo el rubro.
- `categoriaId`: id de MODO, existente en `categorias`.
- `monto`: pesos, `> 0` y `≤ 100000000`, hasta 2 decimales.
- `canal`: `"presencial"` o `"online"`.
- Sin campos extra.

Desde la app: `supabase.functions.invoke("recomendar", { body })` (agrega el header con la
sesión).

## Respuestas

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Recomendación calculada (incluido "ninguna aplica": `mejor: null`) | `Recomendacion` (`packages/motor/src/tipos.ts`) |
| 400 | Body inválido o rubro inexistente | `{ "error": "invalido", "campo": "monto" }` |
| 401 | Sin header, token inválido o sin usuario (anon key) | `{ "error": "no_autenticado" }` |
| 405 | Método distinto de POST | `{ "error": "metodo_no_permitido" }` |
| 409 | El usuario no tiene medios de pago (`PerfilSinMediosError`) | `{ "error": "perfil_sin_medios" }` |
| 500 | Cualquier otro error, incluido Supabase Auth caído o sin responder (no es "sesión vencida") | `{ "error": "interno" }` |

Todas las respuestas son `Content-Type: application/json; charset=utf-8`. Ninguna incluye
mensajes de la base ni trazas.

### Ejemplo 200

```json
{
  "mejor": {
    "medioDePagoId": "mp-galicia-credito-visa",
    "promocionId": "promo-kansas-20",
    "ahorroEstimado": 3000,
    "topeRestanteTrasCompra": 7000,
    "base": { "comprasRegistradas": 2, "comprasSinDescuentoInformado": 0 },
    "motivo": "…"
  },
  "alternativas": [],
  "descartadas": [
    { "promocionId": "promo-viernes", "causa": "dia", "base": null, "motivo": "…" }
  ]
}
```

## Cómo lo interpreta la app

| Respuesta | Pantalla |
|---|---|
| 200 con `mejor` | Resultado (FR-006 a FR-008) |
| 200 con `mejor: null` | "Ninguno de tus medios tiene promo acá hoy" (FR-009) |
| 401 | Pedir volver a iniciar sesión, conservando lo cargado (FR-015) |
| 409 | "Cargá al menos un medio de pago" + acceso a Perfil (FR-014) |
| 400, 405, 500, timeout de 15 s, respuesta que no es JSON | "No pudimos calcular. Probá de nuevo" (FR-016) |
| Falla antes de llegar al servidor | "Necesitás conexión para calcular" (FR-013) |

## Garantías

- Para los mismos medios, promociones, compras y `ahora`, el cuerpo 200 es idéntico al de
  `recomendar()` llamado directamente (FR-024).
- Las promociones evaluadas son las del rubro con vigencia que incluye hoy en Argentina; las
  compras, las del mes calendario en Argentina hasta hoy (FR-020).
