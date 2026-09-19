# Bitácora de prompts

Registro de las sesiones de trabajo con IA usadas en el desarrollo de
Vuelto. Se entrega a la cátedra como evidencia de uso de IA en el proyecto
— actualizar en cada sesión relevante (no solo en las de código).

Cada entrada: fecha, herramienta, objetivo de la sesión, prompts
principales y resultado.

---

## 2026-09-01 — Reorganización del repositorio

**Herramienta:** Claude Code (Sonnet 5).

**Objetivo:** retro-documentar el repo con la skill `ai-project-setup`:
generar `CLAUDE.md`, `docs/architecture/`, `docs/decisions/`, y consolidar
los dos documentos originales (`contexto-proyecto.md`, `decision-stack.md`)
en la nueva estructura.

**Prompts principales:**
1. "usa la skill para acomodar el repositorio con sus respectivas sub
   carpetas, y substrayendo la información de los dos documentos que ahí se
   encuentran para dividirlo correctamente /ai-project-setup"
2. "descarga la skill que está en el repositorio así podemos usarla" (se
   aportó el archivo `.skill` local con la definición)
3. Aprobación paso a paso del proceso guiado por la skill (`CLAUDE.md`,
   `docs/architecture/`, `docs/decisions/`), incluida la decisión de
   saltear `docs/runbooks/` y `tools/scripts/` por no haber código todavía
4. "todos los archivos de producto estaban al pedo, resumí todo lo que
   puedas y que sea esencial" — recorte del contenido migrado a
   `docs/product/`

**Resultado:** `CLAUDE.md`, `docs/architecture/` (5 archivos),
`docs/decisions/` (6 ADRs) y `docs/product/` (8 archivos resumidos)
creados; `contexto-proyecto.md` y `decision-stack.md` eliminados tras
migrar todo su contenido relevante a la nueva estructura.

---

## 2026-09-19 — Requisitos y roles de Scrum (issues #3 y #2)

**Herramienta:** Claude Code (Opus 5 / Sonnet 5), con `gh` CLI.

**Objetivo:** resolver las stories "Chequear requerimientos (funcionales y no
funcionales)" (#3), "Definir roles de Scrum" (#2) y "Crear épicas y asentar
roadmap inicial" (#6) del repositorio.

**Prompts principales:**
1. "si tenes github cli, realiza esta stories: Chequear requerimientos,
   Definir roles de Scrum #2, Crear épicas y asentar roadmap inicial #6"
2. Decisiones tomadas en la sesión: entregables en `docs/` + comentario en el
   issue; nombres del equipo como placeholders; el roadmap vive solo en el
   GitHub Project existente (nada de roadmap en `docs/`); cerrar los issues
   al terminar.

**Resultado:** `docs/product/requisitos.md` (RF/RNF con criterios de
aceptación y requisitos bloqueados por pendientes) y
`docs/product/roles-scrum.md` (roles, ceremonias, DoR/DoD). #6 quedó sin
resolver: el token de `gh` no tiene el scope `project`, necesario para leer
y escribir en el GitHub Project.

---

## YYYY-MM-DD — Título de la sesión

**Herramienta:**

**Objetivo:**

**Prompts principales:**
1.

**Resultado:**
