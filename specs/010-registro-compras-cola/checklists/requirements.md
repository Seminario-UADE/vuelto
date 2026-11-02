# Specification Quality Checklist: Registrar una compra — borrar, promo aplicada y subida a la cuenta

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-02
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — los requisitos describen comportamiento; el slice `compras`, la tabla `compras` y las specs 007/008 se nombran solo en «Contexto y alcance» y en FR-013/FR-014 para fijar la frontera con #42 y con el esquema ya mergeado, como en las specs 004–008
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders (las historias de usuario; los FR citan el esquema porque es contrato con otras issues)
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (qué ya existe, qué agrega esta spec, qué queda bloqueado por #40/#41 y qué es de #42)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Sin marcadores de aclaración: las decisiones abiertas (cómo se detecta la falta de red, elegir entre varias promos, qué pasa con una cola sin cuenta) tienen un valor por defecto en «Assumptions».
- `spec-critic` (02/11/2026) encontró 5 bloqueantes (B1–B5), 8 importantes y 8 menores. Todos tienen respuesta en la spec revisada: B1/B2 → estado `bloqueada` y FR-017; B3 → dueño de la operación, FR-008 y FR-016; B4 → FR-010/FR-011; B5 → tabla de FR-012; I1 → FR-018; I2 → Edge Cases y FR-007; I3 → FR-013; I4 → FR-009; I5 → FR-019; I6 → FR-022–FR-024; I7 → FR-003; I8 → FR-021; M1 → FR-005; M3 → FR-012; M4 → FR-016; M5 → FR-018; M6 → FR-014. M2 (fixture de tope compartido) y M7 (base de «Te devolvieron») quedan para el plan y las Assumptions.
- Próximo paso: `/speckit-plan`.
