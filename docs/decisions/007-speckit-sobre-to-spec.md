# ADR-007: spec-kit como generador de specs, no `to-spec`

## Context

El runbook de configuración agéntica instaló dos herramientas que cumplen el
mismo rol — generar la spec de una feature a partir de una descripción en
lenguaje natural — y las dejó ambiguamente combinadas: la skill `to-spec`
(global, liviana, conversacional) y spec-kit completo (`constitution →
specify → plan → tasks → implement → converge`, con estado persistente en
`.specify/` y `specs/`). El ciclo que proponía el runbook (`/to-spec →
spec-critic → /implement → /code-review → test-runner`) usaba `to-spec`,
pero la misma sección pedía instalar y usar spec-kit completo — ambigüedad,
no una decisión.

## Decision

Vuelto usa spec-kit (`/speckit-specify`) como único punto de entrada para
especificar una feature. `to-spec` queda instalada pero fuera del ciclo
estándar.

## Rationale

- Usar dos herramientas para lo mismo es la fuente de ambigüedad más obvia
  que puede tener un equipo de 4 personas: nadie sabe cuál correr al
  arrancar una feature.
- spec-kit deja un artefacto persistente y versionado
  (`specs/<NNN>-<nombre>/spec.md` + checklist de calidad) que se revisa en
  PR igual que código. `to-spec` no deja archivo por sí sola.
- spec-kit cubre todo el ciclo (specify → plan → tasks → implement →
  converge), no solo la spec inicial — encaja con el resto del ciclo que ya
  se armó para Vuelto (`spec-critic` revisa archivos, no una conversación).
- Ya se corrió `/speckit-specify` una vez (`specs/001-perfil-billeteras/`)
  para comparar el formato de salida contra el de la cátedra (ver
  `../product/pendientes.md`) — spec-kit ya tiene continuidad de uso.

## Consequences

- El ciclo real queda: `/speckit-specify → spec-critic → /speckit-plan →
  /speckit-tasks → /implement → /code-review → test-runner`.
- `to-spec` sigue instalada — no molesta dejarla — pero no se referencia en
  el ciclo estándar del equipo.
- Queda una ambigüedad nueva del mismo tipo, sin resolver todavía: spec-kit
  trae su propio `/speckit-implement`, que se solapa con la skill
  `implement` de mattpocock que ya estaba en el ciclo. No se resuelve acá —
  ver `../product/pendientes.md`.
