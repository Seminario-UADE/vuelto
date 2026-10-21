# Specification Quality Checklist: Motor — recomendar el medio de pago óptimo para una compra

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-18 · **Revisado**: 2026-10-20
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

- La spec nombra `packages/motor/src/tipos.ts`, ADR-009 y las issues #37, #38, #46 y #51 como referencias de frontera y de contrato, no como decisiones de implementación (mismo criterio que `specs/001-perfil-billeteras`). El motor es una pieza interna: su "usuario" es la pantalla «¿Con qué pago?» (issue #43), por eso las historias se escriben desde la decisión del usuario final.
- Cambios sobre el contrato de la issue #33 que introduce esta spec: base del estimado en cada opción, causa de descarte como conjunto cerrado y `PerfilSinMediosError`. Se agrega `"otra_provincia"` a `Jurisdiccion` (FR-012).
- Primera versión (18/10) marcada toda en verde por error: `spec-critic` encontró que FR-012 no podía fallar nunca. Corregida el 20/10 junto con los demás hallazgos (error de perfil sin medios, centavos enteros, consumo estimado con techo, forma de la base, comparación de ids por código, casos borde de tope y fechas).
- Limitación conocida: períodos semanal y por compra se evalúan como mensuales hasta la issue #37.
- FR-012 resuelto el 20/10: alcance CABA y AMBA; nacional, CABA y PBA aplican, otras provincias no. Actualizados US2-7, SC-002, Key Entities y Assumptions; FR-014, FR-015 y FR-025 no cambian (la regla se mantiene).
- Segunda pasada de `spec-critic` (20/10): sin bloqueantes. Se agregó la base a los descartes por tope agotado (constitución §V), la conversión de montos y porcentajes a enteros, la unicidad de ids como supuesto y la constancia de cómo se cumple el criterio "tope agotado" de la issue #36.
