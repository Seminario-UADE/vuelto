# ADR-004: El LLM vive solo en la ingesta, nunca en el motor de recomendación

## Context

Existe la tentación evidente de resolver la recomendación preguntándole
directamente a un modelo de lenguaje "con cuál medio de pago conviene
pagar", en vez de correr el motor de reglas.

## Decision

El modelo de lenguaje (Gemini) se usa **solamente en la ingesta**: offline,
en lote, fuera del camino crítico, para extraer datos estructurados de texto
no estructurado (letra chica de promociones y tickets). La recomendación al
usuario sale siempre de código determinístico corriendo contra la base ya
validada.

## Rationale

- Preguntarle al modelo directamente **es la forma más rápida de matar el
  proyecto**: se pierde el determinismo, se pierden los tests, y el
  argumento de innovación tecnológica pasa de ser un problema de
  optimización con restricciones a ser un prompt — que es exactamente lo
  que un evaluador técnico abre y no encuentra nada adentro.
- Ata la demo del pitch a que un servicio externo esté disponible ese día.
- Integrar una API de IA no distingue a nadie; medir qué tan bien funciona
  el extractor (precisión por campo) sí es un dato defendible — ver ADR-005.

## Consequences

- Vigilancia permanente: es el riesgo que más daño le haría al ítem de
  innovación tecnológica si se relaja (ver `../product/riesgos.md`).
- El motor de reglas se puede testear con Vitest sin ninguna dependencia
  externa ni llamada de red.
- La dependencia de un proveedor externo de IA queda acotada a la ingesta:
  una caída de Gemini retrasa la actualización del corpus pero no afecta al
  producto en uso ni a la demo del pitch.
