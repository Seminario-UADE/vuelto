---
name: project-docs-sin-requisitos
description: (Actualizado 2026-10-15) Vuelto ya tiene docs/product/requisitos.md con RF/RNF y criterios; el hallazgo histórico de "sin requisitos" quedó obsoleto
metadata:
  type: project
---

A 2026-09-19 el corpus de docs no tenía requisitos ni historias. A 2026-10-15
existe `docs/product/requisitos.md` (RF-01..RF-20, RNF-01..RNF-14, con
criterios de aceptación y tabla de "bloqueados por pendientes") y
`.specify/memory/constitution.md` (principios I-VI).

**Why:** el recorte original se llevó la capa de requisitos; después se
reconstruyó (issue #3).

**How to apply:** ya no reportar "no hay requisitos". Ahora la fuente de
hallazgos es contrastar specs/propuestas contra criterios concretos (ej. RF-19
"el nivel 0 no usa topes de otros integrantes") y detectar contradicciones
entre requisitos.md y la constitución (ej. RNF-02 "motor solo del lado del
servidor" vs. constitución II "corre en el dispositivo sin red", tras el
cambio del 13/10/2026 que movió el motor a una Edge Function).
Relacionado: [[patron-motor-consume-datos-inexistentes]], [[patron-propuesta-cruza-datos-entre-usuarios]].
