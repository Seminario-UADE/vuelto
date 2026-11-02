---
name: project-docs-sin-requisitos
description: (Actualizado 2026-10-16) Vuelto tiene requisitos.md (RF/RNF) y constitución v2.0.0; el choque RNF-02 vs. Principio II ya se resolvió
metadata:
  type: project
---

A 2026-09-19 el corpus de docs no tenía requisitos ni historias. A 2026-10-15
existe `docs/product/requisitos.md` (RF-01..RF-22, RNF-01..RNF-14, con
criterios de aceptación y tabla de "bloqueados por pendientes") y
`.specify/memory/constitution.md` (principios I-VI).

A 2026-10-16 la constitución está en v2.0.0: el Principio II ya dice que el
motor corre solo en la Edge Function y la app no lo importa. El choque con
RNF-02 quedó resuelto, aunque ADR-008 (Consequences) y requisitos.md (tabla de
bloqueados, fila RF-19) todavía lo listan como prerequisito pendiente: texto
viejo, no reportarlo como contradicción viva.

**Why:** el recorte original se llevó la capa de requisitos; después se
reconstruyó (issue #3) y se enmendó la constitución.

**How to apply:** contrastar specs contra criterios concretos de requisitos.md
y contra la letra de la constitución (ej. Principio I "compra concreta (dónde y
cuánto)" vs. monto opcional).
Relacionado: [[patron-motor-consume-datos-inexistentes]], [[patron-propuesta-cruza-datos-entre-usuarios]].
