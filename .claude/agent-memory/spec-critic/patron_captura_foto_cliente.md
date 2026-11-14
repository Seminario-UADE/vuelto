---
name: patron-captura-foto-cliente
description: Specs de la app que capturan la foto del ticket y consumen el extractor (014, issue #49) — temporales vs. "no van a disco" de §IV, regla de banco que falla su propio ejemplo, sugerencia de medio sin mensaje para "leído pero sin match", fecha "editable" que la pantalla no edita
metadata:
  type: project
---

Visto 2026-11-14 en `specs/014-ticket-con-foto/spec.md`:

- **§IV literal**: la constitución dice que la imagen "no va a disco"; expo-image-picker y el achicado escriben a caché. La spec borra temporales pero no reconcilia el texto del principio ni privacidad.md.
- **Regla de banco**: "nombre del banco de la tarjeta como palabra dentro del banco del ticket" con ejemplo GALICIA/BCO GALICIA, pero el perfil guarda `nombreBanco` = "Banco Galicia" (y puede ser null). La regla no pasa su propio ejemplo.
- **"Como en la carga a mano"**: la spec promete fecha editable; revisa.tsx no edita la fecha en manual. Verificar cada "como hoy" contra la pantalla real.
- **Tres estados del medio** (no leído / leído sin match único / sugerido): la UI actual solo distingue null vs. id; el aviso de 012 "Usamos lo del ticket" queda falso.
- **Escenario demo** con `medio: null` no ejercita la feature nueva.
- "El original de la galería" en la lista de cosas a borrar: lectura destructiva posible.
- Retry de `imagen_demasiado_grande` re-elige la misma foto: bucle.

2da pasada (mismo día): §IV, banco, 413, demo y carrete resueltos. Huecos nuevos de las correcciones:
- "Fecha editable con cualquier origen, hasta hoy" choca con 012 FR-017 (elegir entre día de simulación y hoy) y con FR-013 (ticket no anterior a la simulación): editar después del cruce rompe el cruce.
- "Fecha/monto vacíos" en la lectura nueva ignoran 012 FR-007 (completar con la compra por confirmar).
- Edge case "solo tipo no alcanza" contradice el FR que acepta red **o** tipo.
- Mensaje con ‹red o tipo› interpolado de un enum crudo (`debito`, `master`).
- Aviso compartido "Usamos lo del ticket" queda falso al pasar el medio a sugerencia.

**Why:** las specs de cliente heredan textos de principio y de specs previas sin contrastar con la pantalla y los datos reales del perfil.
**How to apply:** en specs de cliente que consumen un servicio, revisar cada "como en X" contra el código, cada regla de matching contra los datos reales del store, y cada principio literal (disco, logs) contra lo que hace la librería. Ver [[patron-extractor-llm-ticket]], [[patron-flujo-ui-estado-local-nuevo]].
