# ADR-005: Ingesta automática, sin revisión humana

## Context

No existe ninguna API pública que devuelva promociones bancarias en
Argentina. La única fuente es la publicación web de cada banco, billetera y
cadena, en prosa legal no estructurada. Cargar el corpus a mano no escala; el
LLM no falla al azar, falla en los casos ambiguos (tope compartido vs.
exclusivo, acumulabilidad, alcance de jurisdicción) — y cuando falla, lo hace
con confianza y en silencio, devolviendo un valor plausible en vez de un
error. Una cola de revisión humana permanente no es sostenible con un equipo
de 4 personas ni escala con el corpus (13 categorías, ~1864 promos activas
solo en MODO hoy).

## Decision

Circuito de dos etapas, sin persona en el medio: **obtención** (Playwright /
API de la fuente) → **extracción** (Gemini, salida estructurada contra
esquema). El borrador se publica automáticamente si completa el esquema
(todos los campos obligatorios del modelo de datos son distintos de `null`);
si falta alguno, se descarta solo — no queda en una cola para que alguien lo
complete a mano.

## Rationale

- Una cola de revisión humana no escala con el equipo (4 personas) ni con el
  volumen del corpus; atarla al crecimiento del producto la convierte en el
  cuello de botella permanente que el research (`riesgos.md`) ya identificaba
  como el 80% del esfuerzo.
- El esquema forzado (`{"type": ["string", "null"]}`, sin campos opcionales)
  es el control de calidad: un campo obligatorio que el extractor no pudo
  completar bloquea la publicación de esa promo, sin que nadie tenga que
  mirarla.
- Cada campo extraído conserva el fragmento textual de la fuente igual que
  antes — no para que un revisor lo mire, sino para poder auditar después una
  extracción que salió mal (trazabilidad, no aprobación previa).
- Medir la precisión del extractor por campo (RNF-09) deja de ser un
  complemento de la revisión humana y pasa a ser el único control de calidad
  real del corpus.

## Consequences

- El riesgo de publicar un dato erróneo no se elimina, se acepta y se mitiga
  distinto: con la validación de esquema en vez de con una persona. Una
  extracción que complete el esquema pero con un valor incorrecto (no
  ausente) puede llegar a publicarse sin que nadie la haya visto antes.
- Ya no hay costo de mantenimiento permanente de una cola de revisión — el
  corpus escala con el volumen de fuentes, no con la disponibilidad del
  equipo.
- Medir y reportar la precisión del extractor por campo (research, no tarea
  interna) pasa a ser imprescindible, no solo deseable: es la única señal de
  cuánto confiar en el corpus. Se espera desigual — alta en vigencia y
  porcentaje, baja en tope compartido y acumulabilidad.
- Secuencia recomendada: sembrar el corpus a mano en los primeros sprints
  para tener contra qué correr el motor, y construir la ingesta automática
  después. La demo no puede depender de que el scraper funcione.
