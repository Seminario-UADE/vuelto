# Contrato: funciones de contactos (RPC de Supabase)

Todas se llaman con `supabase.rpc(nombre, args)` (POST: el token va en el cuerpo, nunca en la dirección, FR-011). Las de permisos elevados viven en `contactos_privado`, y en `public` hay un envoltorio `security invoker` con la misma firma (research R2). Ninguna es ejecutable por `anon`.

## `crear_invitacion() → jsonb`

```json
{ "token": "q3Zk…24 caracteres", "vence_en": "2026-11-16T15:04:05Z" }
```

- Borra las invitaciones sin usar de quien llama e inserta una nueva (como mucho una vigente).
- Sin nombre para mostrar: error `P0001`, `hint = 'sin_nombre'`.
- El token es base64url de 18 bytes al azar (`^[A-Za-z0-9_-]{24}$`); se guarda `sha256(token)`.

## `ver_invitacion(p_token text) → jsonb`

```json
{ "estado": "valida", "quien_invita": "Martín", "vence_en": "2026-11-16T15:04:05Z" }
```

| `estado` | `quien_invita` | `vence_en` |
|---|---|---|
| `valida` | nombre del emisor | sí |
| `vencida`, `usada`, `propia`, `ya_contacto` | nombre del emisor | `null` |
| `inexistente` | `null` | `null` |

Un token con formato inválido es `inexistente`. No escribe nada.

## `aceptar_invitacion(p_token text) → jsonb`

```json
{ "estado": "aceptada", "contacto": { "id": "aaaa…", "nombre": "Martín" } }
```

- `estado`: `aceptada`, o el motivo por el que no se creó el vínculo (`inexistente`, `vencida`, `usada`, `propia`, `sin_nombre`, `ya_contacto`), con `contacto: null`.
- Lo único que escribe: el vínculo y `usada_en`, en la misma transacción y solo si el estado es `aceptada` (research R4).

## `mis_contactos() → table (id uuid, nombre text, vinculado_desde timestamptz)`

Los vínculos de `auth.uid()`, con el nombre para mostrar del otro. Ordenados por `nombre`, después por `id`.

## `quitar_contacto(p_contacto uuid) → void`

Borra el vínculo entre `auth.uid()` y `p_contacto` con el RLS de `contactos`. Idempotente: si no existía, no falla.

## `datos_de_contactos(p_contactos uuid[], p_clave text, p_desde date, p_hasta date) → table (id uuid, nombre text, medios jsonb, consumos jsonb)`

**Solo para la Edge Function `recomendar-grupo`.** Exige la clave de servidor (D8).

| Condición | Resultado |
|---|---|
| `p_clave` distinta del secreto `recomendar_grupo_clave` de Vault, o el secreto no existe | error `42501` (antes de leer nada) |
| `p_hasta < p_desde` o más de 40 días | error `22023` |
| algún id no vinculado con `auth.uid()`, o inexistente | error `P0001`, `hint = 'no_vinculado'` (mismo error en los dos casos) |
| todo bien | una fila por contacto |

- `medios`: `[{ "id", "banco_id", "banco_nombre", "tipo", "red" }]`.
- `consumos`: `[{ "promocion_id", "fecha", "monto", "descuento_obtenido" }]`, solo de compras con `promocion_id` no nulo y `p_desde ≤ fecha ≤ p_hasta`. Sin comercio, medio de la compra, origen, texto ni id.
