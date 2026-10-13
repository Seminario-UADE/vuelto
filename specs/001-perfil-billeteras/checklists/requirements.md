# Specification Quality Checklist: Perfil — declarar bancos, tarjetas y redes (MODO)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Primera pasada (generación inicial)**: todo marcado en verde sin que nadie lo revisara
  de verdad — el propio flujo de `/speckit-specify` se autoaprueba. No confiar en esta
  sección sin pasar `spec-critic` primero.
- **Segunda pasada (`spec-critic`, 2026-10-13)**: encontró 3 bloqueantes y 7 hallazgos
  altos reales. Todos corregidos en `spec.md`:
  - Clave de join del banco sin definir (ahora: `id` del catálogo, con tratamiento de
    referencia obsoleta documentado).
  - Cardinalidad banco×tipo×red contradictoria (ahora: tripleta única por usuario,
    con escenario explícito de duplicado permitido vs. rechazado).
  - Redes sin emisor catalogable (`confiable`, `tarjeta_sol`) — verificado contra la
    API real de MODO el 2026-10-13: no tienen banco homónimo en el catálogo de 82.
    Se documentó como limitación conocida del MVP, con su propio acceptance scenario.
  - Más: semántica de búsqueda (FR-001/FR-002), estado transitorio de "banco sin
    tarjeta" (FR-006), edición offline y atomicidad del guardado (FR-010/FR-011),
    aislamiento por usuario (FR-013), mapeo valor↔etiqueta de redes (Key Entities),
    Success Criteria reescritos para ser verificables sin depender de features que
    no existen todavía (recomendación, motor).
  - Hallazgos A4 y A5 del spec-critic (términos "billetera" en `requisitos.md` /
    `01-data-models.md`, y el conteo "~28 bancos" en `docs/product/fuentes-promos.md`)
    **no se tocaron en esta spec** — son correcciones de otros documentos, fuera del
    alcance de esta sesión (solo spec de #41). Pendiente como follow-up de una
    próxima sesión de docs.
