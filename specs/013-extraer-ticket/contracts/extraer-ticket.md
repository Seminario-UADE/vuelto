# Contrato: `POST /functions/v1/extraer-ticket`

Lee la foto de un ticket y devuelve sus datos. Lo consume la app en la issue #49, que reemplaza con esto el lector simulado (`leerTicket` en `apps/mobile/src/data/api.ts`).

## Pedido

- **Autenticación**: `Authorization: Bearer <token de sesión del usuario>`. La anon key sola no alcanza (FR-001). Con `supabase.functions.invoke` el token viaja solo.
- **Cuerpo** (`application/json`):

```json
{ "imagen": "<base64 sin el prefijo data:>", "tipo": "image/jpeg" }
```

| Campo | Reglas |
|---|---|
| `imagen` | Base64. Decodificada, hasta 2.500.000 bytes. La app achica la foto antes de mandarla |
| `tipo` | `image/jpeg`, `image/png` o `image/webp`. Tiene que coincidir con el contenido |

## Respuesta 200

```json
{
  "monto": 24500,
  "comercio": "COTO",
  "fecha": "2026-10-14",
  "medio": { "banco": null, "tipo": "debito", "red": "visa", "ultimos4": "1234" },
  "textoExtraido": "COTO CICSA\nCUIT 30-54808315-6\n…\nVISA DEBITO ****1234   24.500,00\n…"
}
```

- Todos los campos están siempre. Lo que el ticket no dice viene `null`; nada se deduce.
- `medio` es lo que dice el ticket, no una tarjeta del perfil. La app lo cruza con las tarjetas del usuario por coincidencia exacta y, si no hay una sola que coincida, pregunta (RF-10).
- `red`: `visa`, `master`, `american_express`, `dinners_club`, `maestro`, `cabal`, `naranja`, `confiable` o `tarjeta_sol`.
- `textoExtraido` ya tiene tapados los números de tarjeta (salvo los últimos 4), los CUIT o CUIL de personas y los DNI anunciados. Es lo que la app guarda con la compra.
- No hay descuento: el reintegro lo calcula el motor al confirmar la compra (`reintegroEsperado`).

## Errores

Cuerpo: `{ "error": "<código>" }` (con `invalido`, también `"campo"`).

| Estado | Código | Cuándo | Qué muestra la app (sugerido para #49) |
|---|---|---|---|
| 400 | `invalido` | Cuerpo que no es JSON, sin `imagen` o sin `tipo` | "No pudimos leer el ticket. Probá de nuevo" |
| 401 | `no_autenticado` | Sin sesión o con la anon key | Pedir que inicie sesión; ofrecer «Confirmar a mano» |
| 405 | `metodo_no_permitido` | Un método que no es `POST` | — (error de programación) |
| 413 | `imagen_demasiado_grande` | Más de 2.500.000 bytes | "La foto es muy pesada. Probá de nuevo" (y achicarla más) |
| 415 | `formato_no_soportado` | `tipo` fuera de JPEG, PNG o WebP | "Ese formato no se puede leer. Sacá una foto" |
| 422 | `imagen_danada` | Base64 inválido o el contenido no coincide con `tipo` | "No pudimos abrir la foto. Sacala de nuevo" |
| 422 | `ticket_ilegible` | Sin monto, comercio ni fecha, o la respuesta del lector no cumple el esquema | "No pudimos leer el ticket. Probá con más luz o cargá la compra a mano" |
| 500 | `interno` | Cualquier otro error | "Algo falló. Probá de nuevo o cargá la compra a mano" |
| 503 | `no_disponible` | El lector no está disponible (cualquier 5xx) o se superó su límite de uso. Ante un límite de uso, el servicio ya reintentó una vez si la espera era corta | "El lector no está disponible ahora. Probá en un rato o cargá la compra a mano" |
| 504 | `tardo_demasiado` | El lector no contestó en 20 segundos, o el pedido completo llegó a 24 | "Tardó demasiado. Probá de nuevo" |

Ninguna respuesta de error trae datos del ticket. El servicio siempre responde en menos de 25 segundos, medido en el servidor.

## Garantías

- La imagen no se escribe en disco, almacenamiento, base de datos ni registros (constitución §IV).
- No hay caché: la misma foto dos veces son dos lecturas.
- Los registros guardan el resultado, la duración y, ante un error de esquema, qué campo falló y por qué, sin su valor.
