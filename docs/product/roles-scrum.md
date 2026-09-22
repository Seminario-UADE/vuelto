# Roles de Scrum

Equipo de 4 integrantes. Lo que depende del cronograma real de la cátedra
queda como `<a confirmar>`.

## Integrantes

| Integrante | Legajo | Rol |
|---|---|---|
| Joaquín Nuñez | 1224134 | Product Owner, Front |
| Jesús Quijada | 1195298 | Development Team — Front |
| Agustín Herrero | 1174588 | Development Team — Back, motor de reglas |
| Santiago Pazos | 1172896 | Development Team — Back, Research y datos |

## Roles

### Product Owner — Joaquín Nuñez (legajo 1224134)

- Custodia la regla de oro: si una funcionalidad se puede describir como
  "mostrar promociones", no entra al backlog (`problema.md`).
- Prioriza el backlog y decide el orden de las épicas.
- Acepta o rechaza cada historia contra los criterios de `requisitos.md`.
- Es quien decide el alcance ante los pendientes de `pendientes.md` (rubros,
  billeteras, umbral de validación automática de la ingesta).

### Development Team — Front, Back y Research

Autoorganizado, tres frentes. Que cada persona tenga un frente no impide
tomar tareas de otro.

| Frente | Alcance | Integrantes |
|---|---|---|
| Front | App Expo: perfil, recomendación, registro por ticket | Joaquín Nuñez, Jesús Quijada |
| Back | Supabase: modelo de datos, RLS, Edge Function del ticket, ingesta / extractor | Agustín Herrero, Santiago Pazos |
| Research y datos | Relevamiento de fuentes de promos, corpus de tickets para medir el lector, research pendiente (auto-registro, observación en punto de venta, 2ª ronda de encuesta) | Santiago Pazos |

El **motor de reglas** (paquete TypeScript sin dependencias, con su suite
Vitest, ADR-001) es la pieza técnica más compleja del proyecto y está a cargo
de Agustín Herrero, dentro de Back.

Las revisiones de código las hacemos todos.

## Ceremonias

| Ceremonia | Acuerdo propuesto | Estado |
|---|---|---|
| Sprint | 2 semanas | `<a confirmar>` con el cronograma real |
| Sprint Planning | Primer día del sprint, 1 h. Se elige el objetivo del sprint y se toman historias que cumplan la Definition of Ready | Propuesto |
| Daily | 15 min, 3 veces por semana, o asincrónica por chat | `<a confirmar>` con el equipo |
| Sprint Review | Último día del sprint. Demo funcionando (Expo Go) al PO | Propuesto |
| Retrospectiva | Después de la review, 45 min. Una acción concreta por retro | Propuesto |
| Refinamiento | A mitad del sprint, 30 min | Propuesto |

Los sprints se alinean a las dos entregas parciales y al pitch final
(`restricciones-catedra.md`); las fechas se fijan al confirmar el cronograma.

Tablero: GitHub Projects del repositorio (la materia acepta Trello o Jira;
el tablero elegido es el de GitHub).

## Definition of Ready

Una historia entra a un sprint si:

- Está vinculada a uno o más requisitos de `requisitos.md`.
- Tiene criterios de aceptación verificables.
- No está bloqueada por un pendiente abierto (ver "Requisitos bloqueados").
- Es estimable y cabe en un sprint.

## Definition of Done

Una historia está terminada si cumple los criterios de aceptación y además:

- La lógica del motor de reglas tiene tests Vitest que pasan.
- Ningún camino de código llama a un LLM desde el motor (ADR-004).
- Toda tabla nueva incluye sus policies de row-level security.
- Ninguna promoción se publica si no pasó la validación automática de
  esquema (sin cola de revisión humana).
- Los topes se muestran como estimados, con su base.
- Ningún secreto (Gemini, service role key) está en el cliente ni en el repo.
- Si el cambio toca datos de usuario (perfil, tickets, compras), es
  consistente con `../product/privacidad.md`.
- Se puede demostrar en Expo Go.
- Si hubo trabajo con IA relevante, tiene su entrada en `../bitacora-prompts.md`.

## Riesgo de proceso abierto

El equipo tiene 4 integrantes y la materia pide 6-8 (`estado.md`). Hasta
resolverlo con la cátedra, el alcance del MVP debe ser defendible con 4
personas — por eso el gasto en grupo es la última prioridad.
