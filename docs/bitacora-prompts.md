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

## 2026-09-19 — Runbook de configuración agéntica, alcance del MVP y CI

**Herramienta:** Claude Code (Sonnet 5).

**Objetivo:** ejecutar la parte de Vuelto del runbook de configuración
agéntica (link compartido por el equipo), definir el detalle concreto del
alcance del MVP, armar el CI base y subir todo a una branch nueva.

**Prompts principales:**
1. Análisis del proyecto + del link del runbook, filtrando qué aplica a
   Vuelto.
2. "Revisemos juntos el alcance del MVP" — definición conjunta de rubro (solo
   supermercado), 6 billeteras/bancos y cadenas de supermercado (CABA/AMBA).
3. "Configurar CI/CD" — workflow base de GitHub Actions (lint, typecheck,
   test, build), condicionado a que exista `package.json` para no fallar por
   código que todavía no existe.
4. Ejecución en orden de los pasos del runbook que aplican a Vuelto:
   auditoría de `.claude/`, instalación de la skill `implement` faltante,
   instalación de spec-kit y comparación de su formato de spec contra el de
   la cátedra (bloqueado: el PDF de la cátedra no está en el repo).
5. "subí la carpeta a una branch nueva" — push a `config/ci-y-speckit`
   (partiendo de `main`, no de `config/skills-y-agentes` para no pisar
   trabajo en paralelo).

**Resultado:** `docs/product/alcance-mvp.md` y `docs/product/pendientes.md`
actualizados; `.github/workflows/ci.yml` nuevo; skill `implement` instalada;
spec-kit inicializado (`.specify/`) con una feature de prueba
(`specs/001-perfil-billeteras/`); `docs/decisions/007-speckit-sobre-to-spec.md`
nuevo; branch `config/ci-y-speckit` pusheada a
`Seminario-UADE/vuelto` con 6 commits, PR sin abrir todavía; branch
`config/skills-y-agentes` eliminada del remoto.

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
`docs/product/roles-scrum.md` (roles, ceremonias, DoR/DoD). #6 se resolvió
en GitHub, no en `docs/`: tras ampliar el scope `project` del token de `gh`,
se crearon 8 épicas (#15-#22) como issues con etiqueta `epic`, se enlazaron
los issues existentes como sub-issues, se crearon 3 milestones sin fecha y
todo quedó en el Project "Seminario UADE - Vuelto".

---

## 2026-09-19 — Política de privacidad y retención de datos (issue #11)

**Herramienta:** Claude Code (Sonnet 5), con `gh` CLI.

**Objetivo:** resolver el issue #11 ("Añadir política de privacidad /
retención de datos"), que desbloqueaba RNF-06 en `requisitos.md`.

**Prompts principales:**
1. "Arranquemos con el issue 11 de privacidad, imagino que será una
   documentación."
2. Revisión conjunta del flujo existente (ADR-006, RNF-06, la Edge Function
   de tickets en `04-infrastructure.md`) antes de escribir la política, para
   no inventar reglas nuevas por fuera de lo ya decidido.

**Resultado:** `docs/product/privacidad.md` nuevo (qué datos se recopilan,
retención de imágenes de ticket durante el procesamiento, qué se persiste y
por cuánto tiempo, terceros involucrados, derechos del usuario);
`docs/product/pendientes.md` y `docs/product/requisitos.md` actualizados
para reflejar el pendiente resuelto.

---

## YYYY-MM-DD — Título de la sesión

**Herramienta:**

**Objetivo:**

**Prompts principales:**
1.

**Resultado:**
