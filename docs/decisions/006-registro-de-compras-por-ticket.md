# ADR-006: Registro de compras por lectura del ticket

## Context

El control de tope de reintegro exige saber cuánto consumió el usuario en el
mes. No hay integración bancaria ni lectura de resúmenes (fuera de alcance
por decisión de producto — ver `../product/alcance-mvp.md`). La única
alternativa sin esto era la carga manual, que no se sostiene: el usuario
deja de cargar, el sistema sigue afirmando saldos con confianza, y el motor
recomienda promociones que no van a reintegrar nada — peor que no tener la
funcionalidad.

## Decision

El usuario fotografía el comprobante de la compra. El mismo extractor de
ADR-005 (Gemini, salida estructurada) obtiene monto, comercio, medio de pago
y descuento aplicado. Es el mismo patrón de extracción de ADR-005, pero el
paso que en la ingesta de promos es validación automática de esquema, acá lo
hace el propio usuario: ve tres campos ya completos y confirma, no tipea.

## Rationale

- Es troncal, no accesorio: sin esto no hay control de topes, que es el
  diferencial del producto.
- Es el mismo patrón técnico aplicado a otra entrada de texto sucio (letra
  chica de promoción y ticket) — sostiene el argumento de innovación
  tecnológica junto con el motor de reglas y la ingesta.
- La foto es lo que mantiene correcta la recomendación de la próxima
  compra: es un incentivo directo para el usuario, no un paso extra sin
  retorno.
- Un medio de pago que el ticket no identifica se pregunta, nunca se
  infiere — misma regla de `null` explícito que en la ingesta de promos.

## Consequences

- El tope resultante se muestra siempre como estimado, con su base ("≈
  $18.000, según 4 compras registradas"), nunca como cifra falsamente
  precisa.
- Las imágenes de ticket no se persisten (se mandan a Gemini y se
  descartan); sí se persiste el texto extraído junto al registro, para
  poder auditar una extracción que salió mal.
- Queda pendiente definir la política de retención de las imágenes durante
  el procesamiento, y probar el extractor contra 15-20 tickets reales para
  medir el acierto por campo, igual que con las promociones.
- Vías complementarias de menor confiabilidad quedan disponibles: registro
  por excepción (el usuario acepta una recomendación) y carga manual como
  último recurso.
