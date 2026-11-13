# Data Model: Leer los datos de un ticket a partir de su foto

Nada de esto se guarda en el servidor: son las formas que pasan entre la app, el servicio y Groq. Todos los campos son requeridos; lo ausente es `null` (constitución §III). En TypeScript, `campo: T | null`, nunca `campo?: T`.

## PedidoLectura (app → servicio)

| Campo | Tipo | Reglas |
|---|---|---|
| `imagen` | `string` | Base64 sin el prefijo `data:`. Decodificada, hasta 2.500.000 bytes (R3) |
| `tipo` | `"image/jpeg" \| "image/png" \| "image/webp"` | Tiene que coincidir con los primeros bytes de la imagen |

## LecturaCruda (Groq → servicio)

Lo que devuelve Groq contra el esquema estricto (R2). Todo es texto tal como está impreso.

| Campo | Tipo | Ejemplo |
|---|---|---|
| `montoImpreso` | `string \| null` | `"$ 24.500,00"` |
| `comercio` | `string \| null` | `"COTO"` (el nombre del local; si no hay, la razón social) |
| `fechaImpresa` | `string \| null` | `"14/10/26"` |
| `medio.bancoImpreso` | `string \| null` | `"BCO GALICIA"` |
| `medio.tipoImpreso` | `string \| null` | `"DEBITO"` |
| `medio.redImpresa` | `string \| null` | `"VISA"` |
| `medio.ultimos4Impresos` | `string \| null` | `"1234"` |
| `texto` | `string \| null` | La transcripción, con `[DATO PERSONAL]` donde Groq reconoció uno |

## LecturaTicket (servicio → app, respuesta 200)

| Campo | Tipo | Cómo sale de la `LecturaCruda` |
|---|---|---|
| `monto` | `number \| null` | `montoImpreso` en formato argentino; vacío si es ambiguo, ≤ 0 o tiene más de 2 decimales (R4) |
| `comercio` | `string \| null` | `comercio` sin espacios de más |
| `fecha` | `string \| null` (`YYYY-MM-DD`) | `fechaImpresa`; vacía si no existe, no tiene año o es posterior a hoy en Argentina |
| `medio.banco` | `string \| null` | `bancoImpreso` tal cual, sin espacios de más |
| `medio.tipo` | `"debito" \| "credito" \| null` | Palabras de `tipoImpreso` (R4) |
| `medio.red` | `Red \| null` | Tabla de `redImpresa` (R4). `Red` es el tipo del motor |
| `medio.ultimos4` | `string \| null` | `ultimos4Impresos` si son exactamente 4 dígitos |
| `textoExtraido` | `string` | `texto` con la segunda capa de tapado y recortado a 10.000 caracteres (R5); `""` si Groq no devolvió texto |

**Regla de ilegible (FR-009)**: si `monto`, `comercio` y `fecha` quedan los tres `null`, no se devuelve la lectura: el servicio responde `ticket_ilegible`.

## ErrorLectura (servicio → app, respuesta de error)

| Campo | Tipo |
|---|---|
| `error` | Uno de los códigos de `contracts/extraer-ticket.md`. Con `invalido`, además `campo: string \| null` (como en `recomendar`) |

## Errores internos del extractor

| Error | Cuándo | Código para la app |
|---|---|---|
| `ExtractorTiempoAgotadoError` | El `AbortController` cortó a los 20 s | `tardo_demasiado` |
| `ExtractorNoDisponibleError` | Groq respondió 429 o cualquier 5xx, o no hubo conexión | `no_disponible` |
| `RespuestaFueraDeEsquemaError` (con `camino` y `regla`) | La respuesta no es JSON o no cumple el esquema | `ticket_ilegible` |
| `ExtractorRechazoError` (con `estado`) | Cualquier otro 4xx de Groq | `interno` |
