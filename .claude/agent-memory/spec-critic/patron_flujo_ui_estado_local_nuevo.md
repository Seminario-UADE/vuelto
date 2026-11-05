---
name: patron-flujo-ui-estado-local-nuevo
description: En specs de rediseño de flujo de Vuelto (012 compra pendiente, onboarding sin cuenta), buscar estado local nuevo sin clave ni atomicidad, preselección que esquiva RF-10, vocabulario que choca con specs previas y flujos sin sesión contra RLS authenticated
metadata:
  type: project
---

Visto 2026-11-05 en `specs/012-flujo-directo/spec.md` (#105, #103, #79). Huecos que cambian comportamiento:

- **Flujo sin cuenta vs. RLS**: "probar antes de crear la cuenta" necesita el corpus, pero `promociones`, `bancos` y `categorias` son `select to authenticated`. La spec solo pidió leer bancos sin sesión (copiado de la nota de ideas-ux). privacidad.md llama "público" al corpus aunque el RLS no lo es.
- **Preselección = inferencia encubierta**: "MAY mostrar marcado el medio de la simulación" cuando el ticket no lo trae. Con el medio ya marcado, se guarda con un toque y nadie contestó la pregunta. Además, el escenario lo vuelve obligatorio (MAY vs. "aparece marcado") y "tiene que verlo" no se puede probar. revisa.tsx dice lo contrario: el ticket no preselecciona.
- **Entidad local nueva sin clave**: la pendiente se reemplaza "por comercio" (¿id o nombre?), el cruce con el ticket usa "nombre normalizado" sin regla, y aparece un "más de una pendiente en el comercio" que el reemplazo hace imposible.
- **Atomicidad**: confirmar = agregar la compra (slice + cola, en otra clave) + borrar la pendiente (otra clave). La idempotencia de 010 depende de `useId` por apertura de la hoja, no de la pendiente, así que confirmar dos veces duplica la compra.
- **Choque de vocabulario**: la cola de 010 ya usa el estado `pendiente` ("Sin subir"), y las dos cosas se muestran en la misma tab.
- **Fecha**: "fecha de la pendiente" sale de un instante, sin zona horaria. En Revisá la fecha no se puede editar, así que una compra simulada a las 23:50 y pagada a las 00:05 queda en el día equivocado. El ticket de ejemplo tiene una fecha fija de otro mes.
- **Un gesto con dos efectos**: "tocar muestra la respuesta y marca; tocar de nuevo desmarca". Volver a ver la respuesta de un comercio lo desmarca.
- **Nombre**: el store de ejemplo arranca con "Martín" (fixtures) y la spec promete que nunca se ve un nombre que el usuario no cargó.

**Why:** las specs de UX salen de una auditoría de pantallas y piensan en toques, no en el estado que crean ni en la frontera con RLS y la cola.

**How to apply:** por cada entidad nueva que vive en el teléfono, pedir su clave, su dueño, su reloj, su atomicidad con la cola y que esté declarada en privacidad.md. Por cada flujo sin sesión, revisar el RLS de todas las tablas que lee. Por cada preselección, contrastarla con RF-10 y con la constitución §III.
Relacionado: [[patron-cola-offline-outbox]], [[patron-clave-de-join-sin-definir]], [[patron-mocks-vs-no-calcular-local]], [[patron-regla-infalsable-y-aritmetica]].
