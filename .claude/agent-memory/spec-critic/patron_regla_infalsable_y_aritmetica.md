---
name: patron-regla-infalsable-y-aritmetica
description: Specs del motor con reglas que el tipo vigente no deja fallar, montos sin redondeo comparados por igualdad exacta, y errores sin lugar en el tipo de retorno
metadata:
  type: project
---

Patrones que aparecieron en specs/002-motor-recomendar (issue #36, 2026-10-18):

1. **Regla que no puede fallar**: la lista de valores "válidos" coincide con todo el dominio del enum en tipos.ts (Jurisdiccion = nacional|pba|caba y la lista válida es esas tres). El escenario de descarte y el "un test por regla" no se pueden pasar. Comparar siempre la lista de valores válidos contra la unión del tipo.
2. **Floats sin redondear + igualdad exacta**: la spec dice "sin redondear" y a la vez usa "exactamente $0" o "mismo ahorro" para descartar o desempatar. Pedir centavos enteros o un epsilon.
3. **Desempate "alfabético"**: si no se aclara, localeCompare depende del ICU del runtime (Node en los tests y Deno en la Edge Function). Pedir comparación por code unit.
4. **Error que el tipo no puede expresar**: "rechazar con error explícito", pero el tipo de retorno no tiene una variante de error y "Key Entities" dice que no hay cambios. Pedir que se decida si se lanza una excepción o se devuelve una unión discriminada.
5. **Estimación sin techo**: si un consumo se estima como monto × porcentaje sin limitarlo al tope, una sola compra estimada agota el tope.

6. **(2da pasada, 2026-10-20) La corrección deja huecos laterales**: "centavos enteros" sin regla de conversión pesos→centavos en la entrada (floor de 0.29*100 da 28); la base se exige en opciones pero no en el descarte `tope_agotado`, que también le muestra un tope estimado al usuario (constitución §V); unicidad de ids sin supuesto, aunque el desempate y FR-003 dependen de ella.

7. **(specs/003, issue #37, 2026-10-25) Spec que extiende otra**: (a) al reescribir un FR se pierde el default del original (FR-001 nuevo solo cubre periodo mensual|semanal; el `null`→mensual de 002 quedó solo en el FR del grupo); (b) la excepción nueva (base `null` en descarte por_compra) contradice un SC/postcondición de la spec vieja que "sigue vigente" sin enmienda explícita; (c) una agregación (opción combinada) puede dejar un miembro con ahorro 0: chocar contra el invariante "cada promo en exactamente un lugar"; (d) la ventana de datos que entrega la capa externa (compras "del mes") no cubre el período nuevo (semana que cruza de mes); (e) "miembro del grupo" sin definir cuando el mismo grupoTopeId llega con alcance mixto.

**Why:** son fallas que un checklist de spec-kit autoaprobado no detecta ([[patron-checklist-autoaprobada]]) y que rompen SC de determinismo y de "un test por regla".
**How to apply:** en toda spec del motor (#37, #38, #46), revisar enums contra listas válidas, aritmética de montos, criterio de orden y forma de los errores.
