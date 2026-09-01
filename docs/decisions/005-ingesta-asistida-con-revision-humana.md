# ADR-005: Ingesta asistida con revisión humana obligatoria

## Context

No existe ninguna API pública que devuelva promociones bancarias en
Argentina. La única fuente es la publicación web de cada banco, billetera y
cadena, en prosa legal no estructurada. Cargar el corpus a mano no escala;
publicar la extracción del LLM sin revisión es riesgoso: el modelo no falla
al azar, falla en los casos ambiguos (tope compartido vs. exclusivo,
acumulabilidad, alcance de jurisdicción) — y cuando falla, lo hace con
confianza y en silencio, devolviendo un valor plausible en vez de un error.

## Decision

Circuito de tres etapas, ninguna publica sola: **obtención** (Playwright) →
**extracción** (Gemini, salida estructurada contra esquema) → **revisión y
aprobación humana** antes de que el motor pueda usar el dato. El panel de
administración es una bandeja de revisión (aprobar, corregir, rechazar,
marcar vencida), no un CRUD de carga.

## Rationale

- El riesgo de dato erróneo es el que rompe la confianza de forma
  irreversible: una extracción que falle en jurisdicción o tope le arruina
  la compra al usuario.
- Es la respuesta defendible en el pitch: no se publica nada que no haya
  validado una persona.
- Cada campo extraído viene con el fragmento textual de la fuente — el
  revisor mira el campo contra su cita en vez de leer el párrafo legal
  entero. Sin esto, revisar costaría casi lo mismo que cargar a mano.
- Campos ausentes se devuelven `null` explícito, nunca completados: un "no
  especificado" se resuelve leyendo; un valor inventado se descubre cuando
  ya arruinó una compra.

## Consequences

- La revisión humana es permanente — la ingesta asistida reduce el costo de
  mantenimiento del corpus pero no lo elimina.
- Hay que medir y reportar la precisión del extractor por campo (research,
  no tarea interna): se espera desigual — alta en vigencia y porcentaje,
  baja en tope compartido y acumulabilidad.
- Secuencia recomendada: sembrar el corpus a mano en los primeros sprints
  para tener contra qué correr el motor, y construir la ingesta asistida
  después. La demo no puede depender de que el scraper funcione.
