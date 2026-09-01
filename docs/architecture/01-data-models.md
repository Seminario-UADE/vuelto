# Data models

Modelo relacional (Postgres vía Supabase). Sin migraciones definidas todavía —
esto es el resumen de entidades que ya está fijado por el research, no un
schema final.

## Promoción

Atributos que necesita sí o sí (contexto §5):

| Campo | Nota |
|---|---|
| Jurisdicción | Nacional / provincial / CABA. Determina si la promo aplica donde está el usuario |
| Tope de reintegro | Con su período, su banco y su alcance (compartido entre promociones del mismo banco, o exclusivo de esta) |
| Vigencia | Fecha de inicio y fin, días de la semana aplicables |
| Comercios y sucursales adheridas | No todas las sucursales de una cadena participan |
| Tarjetas incluidas / excluidas | — |
| Acumulable | Si se puede sumar a otro beneficio sobre la misma compra. Default: no |

Campos ausentes en la fuente se guardan `null` explícito — nunca inferidos
(ver regla en `CLAUDE.md`).

## Compra (registro por ticket, contexto §4.4)

| Campo | Nota |
|---|---|
| Monto | — |
| Comercio | — |
| Medio de pago | Si el ticket no lo identifica, se pregunta — nunca se infiere |
| Promoción aplicada | — |
| Descuento obtenido | — |
| Reintegro esperado | No se usa en el MVP, habilita seguimiento futuro sin migración |
| Fecha estimada de acreditación | Ídem |
| Origen del registro | `ticket` \| `excepción` (usuario acepta una recomendación) \| `manual` |

La imagen del ticket **no se persiste** (se manda a Gemini y se descarta).
Sí se persiste el texto extraído, junto al registro.

## `capturas_crudas` (tabla de ingesta)

Contenido crudo de cada captura de Playwright, con la service role key.
Es la materia prima que Gemini procesa en la etapa de extracción. Se
persiste junto con la extracción y quién aprobó, para trazabilidad.

## Perfil de usuario (contexto §4.1)

Declarado manualmente, en tres capas de prioridad:

1. **Medios de pago** (obligatoria) — billeteras, bancos y tarjetas que tiene
2. **Comercios recurridos** (alta) — dónde compra habitualmente
3. **Gustos y preferencias** (diferible, no entra al MVP)

## Grupo (contexto §4.5 — nivel 0 del alcance)

Integrantes con sus medios de pago declarados. No usa topes ajenos en el
nivel 0. El motor evalúa la unión de medios del grupo en vez de los de una
sola persona.
