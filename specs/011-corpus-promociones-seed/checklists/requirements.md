# Specification Quality Checklist: Corpus de promociones sembrado a mano desde MODO (Supermercados y Farmacias)

> **Reemplazada en parte por [ADR-011](../../../docs/decisions/011-corpus-siempre-automatico.md) (2026-11-03).**
> Las promos nunca se cargan a mano: las publica la ingesta automática todos los días
> (`ingesta/src/corpus/ingestar.ts`, `.github/workflows/ingesta.yml`). Lo que este documento dice
> sobre `promociones.json`, revisión humana, exclusiones y grupos de tope a mano, crudos en el repo,
> seed de promociones y fixtures del motor ya no rige. Siguen vigentes el mapeo del detalle de MODO,
> la validación, los ids estables, el contrato de escritura y las reglas de tope y jurisdicción.
> El contrato actual está en [contracts/corpus.md](../contracts/corpus.md).

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-02
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — las referencias a `esPromocionPublicable`, `Promocion` y a la API de MODO son contratos del proyecto y de la fuente, no decisiones de implementación; igual que en las specs 001 a 007.
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — la audiencia es el equipo y la cátedra; usa el vocabulario del dominio.
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — las tres decisiones abiertas tienen un valor por defecto en Assumptions (segmentos de banco se excluyen, ubicación de fixtures según la convención real del paquete, catálogo de bancos desde la API con fecha).
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

- **Revisión de `spec-critic` (2026-11-02)**: los dos bloqueantes quedaron resueltos en la spec. B1 (de dónde sale la letra chica): endpoint de detalle `GET /promos/api/rewards/v2/benefit/<slug>`, verificado con dos promos. B2 (jurisdicción): decisión del equipo, `null` = global. También se cerraron A1 (demo contra el Supabase alojado, carga remota y bajas), A4 (tope ausente = sin tope) y A6 (`fuente_id` = `slug`).
- **Pendientes para el plan** (de `critica.md`, cada uno necesita una decisión escrita antes de cargar la primera promo): A2 mecanismo JSON→base y fuente de verdad, A3 convivencia con la ingesta, A5 cómo se escribe `comercio` y promos multi-comercio, A7 promos de PBA fuera del AMBA y verificar Cooperativa Obrera y Unicoop, A8 convención de `grupoTopeId` con Joaquín, A9 dónde se guardan fecha y revisor (no en una columna que se sincronice al celular), y los hallazgos M1 a M14.
- Quedan para el plan, con valor por defecto: si se versiona una copia fechada del catálogo de bancos, y la ubicación exacta de las fixtures del motor.
- Dos valores por defecto que conviene confirmar con Joaquín: excluir los beneficios por segmento de banco (Macro Selecta) y compartir la tabla de alias de bancos con la issue #51.
- SC-006 depende de la parte de Joaquín; si no se llega a 40–60, el informe de cobertura lo explica.
