# ADR-001: Motor de reglas como paquete TypeScript separado

## Context

La recomendación de medio de pago necesita ser instantánea y funcionar sin
señal (se usa en el momento de pagar, en un supermercado). Además es la
pieza que sostiene el ítem de innovación tecnológica de la evaluación: tiene
que ser algo que un evaluador técnico pueda abrir y entender por dentro.

## Decision

El motor de reglas es un **paquete propio**, con su `package.json` y su
propia suite de tests — no una carpeta dentro de la app ni un módulo
mezclado con el backend. Función pura, sin dependencias. Lo importan tanto
la app (Expo) como el backend.

## Rationale

- **Corre en el dispositivo.** Es una función pura sobre datos ya
  sincronizados: no necesita servidor, no hay viaje de red.
- **Es testeable de verdad.** Sin base, sin red, sin interfaz — los casos
  límite corren en milisegundos con Vitest.
- **Es lo que se muestra.** Separarlo como artefacto con tests propios lo
  vuelve una decisión de arquitectura defendible, no un detalle de carpetas.

## Consequences

- El celular necesita el corpus de promociones sincronizado localmente:
  falta diseñar cuándo baja, qué pasa si queda desactualizado, cómo se
  detecta que una promo venció mientras el usuario estaba sin señal.
- El motor queda desacoplado del backend y de la UI — cualquier cambio en la
  lógica de reglas se valida con la suite del paquete, no con la app.
