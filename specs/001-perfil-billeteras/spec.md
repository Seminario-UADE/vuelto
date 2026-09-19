# Feature Specification: Perfil — declarar billeteras y bancos

**Feature Branch**: `001-perfil-billeteras`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Feature chica de prueba: pantalla de perfil donde el usuario declara sus billeteras y bancos (de la lista de 6 definida en docs/product/alcance-mvp.md). Esto es solo para comparar el formato de salida de spec-kit contra el de la cátedra — no implementar nada todavía."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarar billeteras y bancos al crear el perfil (Priority: P1)

Un usuario nuevo, antes de recibir cualquier recomendación, selecciona de una lista fija cuáles de las 6 billeteras/bancos soportados (Mercado Pago, MODO, Cuenta DNI, Santander, Galicia, BBVA) tiene.

**Why this priority**: Es el campo obligatorio del perfil — capa 1 de `docs/architecture/01-data-models.md` ("Medios de pago (obligatoria)"). Sin esto el motor de reglas no tiene con qué evaluar ninguna promoción.

**Independent Test**: Se prueba completando el flujo de selección y verificando que el perfil guardado contiene exactamente las opciones marcadas — no depende de que exista todavía el motor de reglas ni el registro de compras.

**Acceptance Scenarios**:

1. **Given** un usuario sin perfil declarado, **When** abre la pantalla de perfil por primera vez, **Then** ve las 6 opciones desmarcadas y no puede confirmar sin marcar al menos una.
2. **Given** un usuario que marca 3 de las 6 opciones y confirma, **When** vuelve a abrir la pantalla, **Then** ve las mismas 3 opciones marcadas.

---

### User Story 2 - Editar billeteras y bancos después de creado el perfil (Priority: P2)

El usuario cambia qué billeteras/bancos tiene declarados (agrega o saca uno) en cualquier momento después de la carga inicial.

**Why this priority**: Las billeteras que un usuario tiene cambian — sin edición, el perfil queda desactualizado y el motor recomienda medios que ya no existen.

**Independent Test**: Se prueba editando un perfil ya creado y confirmando que el cambio persiste, independiente de si hay compras registradas.

**Acceptance Scenarios**:

1. **Given** un perfil con 2 billeteras marcadas, **When** el usuario desmarca una y confirma, **Then** el perfil guardado refleja solo la que quedó marcada.

---

### Edge Cases

- ¿Qué pasa si el usuario intenta confirmar sin marcar ninguna billetera? El sistema no lo permite — ver Assumptions.
- ¿Qué pasa si más adelante cambia la lista de 6 billeteras del alcance (`docs/product/alcance-mvp.md`) y un perfil tenía marcada una que salió de la lista? Ver Assumptions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar exactamente las 6 billeteras/bancos definidos en `docs/product/alcance-mvp.md` (Mercado Pago, MODO, Cuenta DNI, Santander, Galicia, BBVA) como opciones de selección múltiple.
- **FR-002**: El sistema MUST permitir marcar y desmarcar cualquier combinación de las 6 opciones.
- **FR-003**: El sistema MUST exigir al menos una opción marcada para poder confirmar.
- **FR-004**: El sistema MUST persistir la selección asociada al usuario apenas confirma.
- **FR-005**: El sistema MUST mostrar la selección previamente guardada cada vez que el usuario vuelve a la pantalla de perfil.
- **FR-006**: Users MUST be able to editar su selección en cualquier momento posterior a la carga inicial.

### Key Entities *(include if feature involves data)*

- **Perfil de usuario (medios de pago)**: la capa obligatoria del perfil descrita en `docs/architecture/01-data-models.md` — el conjunto de billeteras/bancos que el usuario declaró tener.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo completa la declaración de billeteras/bancos en menos de 30 segundos.
- **SC-002**: El 100% de las combinaciones de selección válidas (al menos una marcada) persisten correctamente entre sesiones.

## Assumptions

- La lista de 6 billeteras/bancos es fija por ahora (viene de `docs/product/alcance-mvp.md`); agregar o sacar una billetera de esa lista es un cambio de alcance, no de esta feature.
- No hay límite superior de cuántas billeteras puede marcar un usuario (puede marcar las 6).
- El sistema exige un mínimo de una billetera marcada — un perfil vacío no es un estado válido, porque el motor de reglas no tendría nada que evaluar.
- Esta pantalla declara, no verifica: no valida contra el banco que el usuario realmente tenga esas cuentas — coherente con "Fuera: integración bancaria" de `docs/product/alcance-mvp.md`.
- Si más adelante se saca una billetera de la lista de alcance, un perfil que la tenía marcada la sigue mostrando hasta que el usuario la edite manualmente — no se borra automáticamente. La migración de perfiles existentes cuando cambia el alcance queda fuera de esta feature.
