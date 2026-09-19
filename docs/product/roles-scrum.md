# Roles de Scrum

Equipo de 4 integrantes. Lo que depende del cronograma real de la cátedra
queda como `<a confirmar>`.

## Roles

### Product Owner — Joaquín Nuñez

- Custodia la regla de oro: si una funcionalidad se puede describir como
  "mostrar promociones", no entra al backlog (`problema.md`).
- Prioriza el backlog y decide el orden de las épicas.
- Acepta o rechaza cada historia contra los criterios de `requisitos.md`.
- Es quien decide el alcance ante los pendientes de `pendientes.md` (rubros,
  billeteras, umbral de revisión).
- Aprueba, corrige o rechaza en la cola de revisión de la ingesta (ADR-005).
  Si no puede hacerlo, delega por escrito en otra persona del equipo.

### Scrum Master — sin rol

El equipo decidió no tener Scrum Master. Sus responsabilidades no
desaparecen: se reparten como indica la sección siguiente.

### Development Team — Front y Back

Autoorganizado, dos frentes. Que cada persona tenga un frente no impide
tomar tareas del otro.

| Frente | Alcance | Integrantes |
|---|---|---|
| Front | App Expo: perfil, recomendación, registro por ticket | Joaquín Nuñez, Jesús Quijada |
| Back | Supabase: modelo de datos, RLS, Edge Function del ticket, ingesta / extractor | Agustín Herrero, Santiago Pazos |

El **motor de reglas** (paquete TypeScript sin dependencias, con su suite
Vitest) corre en el dispositivo pero no es ni app ni Supabase: queda sin
asignar a un frente, `<a definir>`.

Joaquín es PO y además desarrolla en Front, así que no debería ser el único
que revise su propio código: las revisiones de Front las hace Jesús.

## Responsabilidades sin Scrum Master

Sin ese rol, estas tareas necesitan dueño explícito. Propuesta inicial, a
confirmar con el equipo:

| Responsabilidad | Quién |
|---|---|
| Facilitar planning, review y retro | Rota por sprint entre los 4 `<a confirmar>` |
| Mantener el tablero (GitHub Projects) al día | Cada persona con sus tarjetas; el PO ordena el backlog |
| Bitácora de prompts (`../bitacora-prompts.md`) | Quien haga el trabajo con IA |
| Consultas a la cátedra: tamaño del equipo (4 vs. 6-8) y cronograma real | Joaquín (PO) `<a confirmar>` |
| Asistencia mínima del 75% que exige la materia | Cada integrante; se revisa en la retro |

**A confirmar con la cátedra:** que la materia no exija un Scrum Master
formal (`restricciones-catedra.md` pide "metodología ágil" sin detallar
roles).

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
- Nada de promoción se publica sin revisión humana.
- Los topes se muestran como estimados, con su base.
- Ningún secreto (Gemini, service role key) está en el cliente ni en el repo.
- Se puede demostrar en Expo Go.
- Si hubo trabajo con IA relevante, tiene su entrada en `../bitacora-prompts.md`.

## Riesgo de proceso abierto

El equipo tiene 4 integrantes y la materia pide 6-8 (`estado.md`). Hasta
resolverlo con la cátedra, el alcance del MVP debe ser defendible con 4
personas — por eso el gasto en grupo es la última prioridad.
