---
name: project-docs-sin-requisitos
description: La documentación de Vuelto (docs/product, architecture, decisions) no contiene requisitos ni historias de usuario con criterios de aceptación — solo narrativa de producto y ADRs
metadata:
  type: project
---

A 2026-09-19, el corpus de `docs/product/`, `docs/architecture/` y
`docs/decisions/` no contiene **ni una** historia de usuario, requisito
numerado ni criterio de aceptación. Un grep de `historia|criterio|requisito|
US-|RF-` sobre `docs/` no devuelve nada relevante. Los documentos son:
narrativa de problema, alcance en prosa, 6 ADRs de stack, listas de riesgos
y pendientes.

**Why:** el repo se retro-documentó en una sola sesión con IA a partir de dos
archivos originales (`contexto-proyecto.md`, `decision-stack.md`) que luego se
borraron, con instrucción explícita de recortar ("todos los archivos de
producto estaban al pedo, resumí todo lo que puedas" — `docs/bitacora-prompts.md`).
El recorte se llevó puesta la capa de requisitos, si es que existía.

**How to apply:** al revisar specs de este proyecto, no busques ambigüedad
dentro de historias — la ausencia total de historias es el hallazgo de primer
orden. Y antes de decir "el requisito X es vago", verificá que exista algún
requisito; probablemente estés leyendo una descripción de producto.
Relacionado: [[patron-motor-consume-datos-inexistentes]].
