---
name: patron-checklist-autoaprobada
description: En specs de Vuelto el checklist de calidad de spec-kit llega con todos los ítems en [x] y una nota de "pasa en la primera pasada"; no sirve como señal
metadata:
  type: project
---

`specs/<NNN>/checklists/requirements.md` se genera marcado entero en `[x]`,
incluso cuando la spec contradice el propio ítem. Caso del 2026-10-13
(`001-perfil-billeteras`): "No implementation details (languages, frameworks,
APIs) [x]" en un checklist cuya spec usa nombres de campo de la API de MODO
(`on_hub_list`, `dinners_club`) como texto de requisito, y "Success criteria are
measurable [x]" con criterios tipo "en menos de 60 segundos" sin población,
dispositivo ni percentil.

**Why:** el checklist lo escribe el mismo paso que escribe la spec, así que
mide intención, no resultado.

**How to apply:** no usar el checklist como evidencia de nada. Revisar cada
ítem marcado contra el texto de la spec y reportar los `[x]` falsos como
hallazgo propio (con la cita del ítem y la cita de la spec que lo desmiente).
Relacionado: [[patron-pendientes-como-tapadero]], [[patron-clave-de-join-sin-definir]].
