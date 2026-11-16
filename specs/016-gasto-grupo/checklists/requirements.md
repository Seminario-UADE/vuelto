# Specification Quality Checklist: Gasto en grupo — quién de nosotros paga

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-15
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

- Primera pasada (15/11/2026): el checklist se tildó entero y `spec-critic` mostró que «Requirements are testable and unambiguous» no se cumplía (B3, B4, SC-008). Esta es la segunda pasada, después de corregir.
- Resolución de los hallazgos de `spec-critic`:
  - B1 → D8 (clave de servidor, decisión del PO), FR-018, SC-005.
  - B2 → FR-021 (lista blanca, ningún texto con tope o descartes), SC-008 (búsqueda en toda la respuesta).
  - B3 → FR-004 y FR-006 (decidir sobre lo mostrado, modo de redondeo, mínimo de $1, piso en 0), US1-8, US1-9, US1-13 y US1-16.
  - B4 → D10 (decisión del PO), FR-008 (cuatro bases sobre la promo aplicada), US1-2 a US1-4.
  - I1 → FR-024 y FR-025 (sin fecha en el pedido, día evaluado en la respuesta), US3-8 y US3-10, enmienda de 006 en FR-033.
  - I2 → FR-002 (período), US1-18. I3 → FR-009, US1-14 y US1-15. I4 → FR-002 y FR-003 (consumo de topes, misma función).
  - I5 → D6, FR-017. I6 → FR-027 (tabla) y FR-023 (misma respuesta para inexistente y no vinculado). I7 → D9 (decisión del PO), FR-004.
  - I8 → FR-019, US2-16. I9 → FR-021 (identificador del contacto), US3-7. I10 → D11 (decisión del PO), FR-012, US2-4 y US2-5.
  - M1 → SC-009 y FR-027 (15 s). M2 → FR-022 (MUST). M3 → FR-013. M4 → FR-011, US2-2. M5 → FR-014, US2-11. M6 → FR-033.
  - M7 → FR-006, FR-010 y FR-026. M8 → FR-011 y FR-034. M9 → FR-023 y edge case de promos vencidas. M10 → Assumptions (demo). M11 → FR-002 y FR-006 (posición de carga como dato).
- Excepción deliberada a «sin detalles de implementación»: la spec nombra el link `vuelto://i/<token>`, el servidor, la clave de servidor y las enmiendas de ADR porque son decisiones del PO y restricciones de la constitución (§II, §IV). El cómo (tablas, funciones, Edge Function, capas) queda para el plan.
- Las preguntas abiertas de `pendientes.md` (débito y redondeo) quedan cerradas en §Contexto (D2, D3).
