# ADR-012: Groq lee los tickets; Gemini queda para la letra chica

Estado: **propuesto** (10/11/2026). Entra en vigencia cuando el Product Owner
apruebe el PR que lo introduce.

## Context

ADR-006 decidió que la foto del ticket viaja a una Edge Function que se la manda
a Gemini. Al preparar la key (issue #85) se leyeron las condiciones de la API de
Gemini (Google AI Studio). En el plan gratis, Google "uses the content you
submit to the Services and any generated responses to provide, improve, and
develop" sus productos, "human reviewers may read, annotate, and process your
API input and output", y pide "Do not submit sensitive, confidential, or
personal information to the Unpaid Services". Un ticket tiene datos personales:
los últimos 4 dígitos de la tarjeta y, según la cadena, nombre o DNI. El plan
pago no usa los datos, pero requiere activar facturación, contra el costo $0 del
cuatrimestre.

El contrato de Groq (Services Agreement, sección 4.2) dice que "Groq is not
permitted to use Inputs or Outputs for training or fine-tuning any AI Model
Services or other models" y que no guarda lo que recibe salvo lo necesario para
prestar el servicio. Su plan gratis tiene un modelo que lee imágenes
(`qwen/qwen3.8-27b`) y que figura entre los que devuelven JSON contra un esquema
estricto (`strict: true`).

Hoy no hay código que llame a Gemini: ni la Edge Function del ticket (#48) ni el
extractor de letra chica (#51) están empezados. Cambiar ahora cuesta solo
documentación.

## Decision

| Extracción | Proveedor | Por qué |
|---|---|---|
| Ticket (#48) | **Groq**, plan gratis, `qwen/qwen3.8-27b` con structured outputs `strict` | No entrena con lo que recibe y no lo guarda por defecto. Lee la imagen directamente |
| Letra chica de promociones (#51) | **Gemini**, plan gratis | Son datos públicos de MODO. Sus límites diarios alcanzan para la ingesta |

El resto de ADR-006 no cambia: la foto viaja a la Edge Function, que se la manda
al extractor y la descarta sin escribirla en ningún lado; el usuario confirma en
«Revisá tu compra»; lo que el ticket no trae queda `null` y el medio de pago se
pregunta, nunca se infiere.

La Edge Function llama a una interfaz `Extractor` (ADR-009) con `ExtractorGroq`
como implementación. Cambiar de proveedor es agregar otra implementación y otro
secret; la validación de la respuesta contra el esquema es nuestra y no cambia.
Lo que devuelve es lo que ya espera la app (`LecturaTicket` en
`apps/mobile/src/data/contracts.ts`, spec 012).

## Rationale

- **Privacidad a costo $0:** de los proveedores evaluados, es el único plan
  gratis que se compromete por contrato a no entrenar con lo que recibe.
- **Menos piezas:** el celular solo saca la foto. No hace falta un lector de
  texto en el teléfono ni una build propia para eso.
- **Cada proveedor donde encaja:** Groq para los datos del usuario; Gemini para
  datos públicos y en volumen. Los límites gratis de Groq (del orden de 200.000
  tokens por día) no alcanzan para la primera corrida de la ingesta (unas 336
  promos), y los de Gemini sí.
- **Sigue la regla de oro técnica:** ningún modelo de lenguaje entra al motor
  ni a la app.

## Consequences

- **Supera en parte a ADR-006** (el proveedor del ticket) y a la fila
  «Extractor: Gemini API» del stack de `CLAUDE.md`.
- **Se enmiendan en el PR que introduce este ADR:** la constitución (3.0.1,
  principios III y IV y el stack), `CLAUDE.md` (stack y reglas de la key y de
  las imágenes), RNF-04 de `requisitos.md` (la key de ningún extractor va en la
  app), `privacidad.md` (Groq como proveedor y su registro de hasta 30 días),
  `04-infrastructure.md` (servicios y tabla de secrets), `rules-guardian` (busca
  también la key de Groq) y los comentarios de la app que nombraban a Gemini.
  La issue #48 (proveedor y contrato) se ajusta al implementarla.
- **Secrets:** `GROQ_API_KEY` en las Edge Functions de Supabase (issue #85);
  `GEMINI_API_KEY` solo en GitHub Actions, para la ingesta (issue #51).
- **El contrato de #48 se alinea con la app:** `LecturaTicket` no trae el
  descuento que pedía la issue. Se decide en el plan de #48.

## Riesgos y decisiones abiertas

| Riesgo | Cómo se resuelve |
|---|---|
| La documentación no muestra imagen y esquema estricto en el mismo pedido | Probarlo con un ticket al empezar #48; si no anda, modo `json_object` y la validación propia contra el esquema (ya prevista en #48) |
| Groq guarda hasta 30 días los registros para investigar abusos | Activar «Zero Data Retention» en la consola si el plan gratis lo permite; si no, queda documentado en `privacidad.md` |
| Límites del plan gratis del modelo de imágenes (no están en la página pública) | Verlos en la consola. Un ticket ronda los 3.000 tokens (la imagen cuenta 2.048). Las pruebas de #10 se mandan espaciadas |
| Fotos pesadas (el pedido admite hasta 20 MB) | Achicar la imagen en el celular antes de mandarla |
| La precisión no alcanza | Se mide en #10. Respaldo: leer el texto en el celular y mandar a Gemini solo el texto sin datos personales |

## Fuentes

- Gemini API Additional Terms: https://aistudio.google.com/docs/terms
- Groq Services Agreement, sección 4.2: https://console.groq.com/docs/legal/services-agreement
- Groq, Your Data: https://console.groq.com/docs/your-data
- Groq, Vision: https://console.groq.com/docs/vision
- Groq, Structured Outputs: https://console.groq.com/docs/structured-outputs
- Groq, Rate limits: https://console.groq.com/docs/rate-limits
