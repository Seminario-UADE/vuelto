# Feature Specification: Perfil — declarar bancos, tarjetas y redes (MODO)

**Feature Branch**: `001-perfil-billeteras`

**Created**: 2026-10-13 (revisada tras ronda de `spec-critic`)

**Status**: Draft

**Input**: Issue [#41](https://github.com/Seminario-UADE/vuelto/issues/41) — "Perfil: declarar mis bancos y tarjetas". Reemplaza la spec de prueba del 19/09, que listaba 6 billeteras genéricas: el alcance vigente (`docs/product/alcance-mvp.md`) acotó la ingesta a una sola fuente, MODO, donde las promociones se definen por banco + tipo de tarjeta + red, no por "billetera".

**Nota de estado**: esta spec pasó una ronda de `spec-critic` que encontró 3 huecos de modelado bloqueantes (clave de join del banco, cardinalidad banco×tipo×red, bancos/emisores sin catálogo) — los tres se resolvieron abajo, verificados contra la API real de `GET /promos/api/rewards/banks?source=app_modo` (no solo contra lo que decía la issue). Lista para `/speckit-plan`. La implementación queda bloqueada hasta que cierren los habilitadores de los que depende: #34 (esquema de Supabase con RLS) y #40 (login y registro).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarar bancos y tarjetas al crear el perfil (Priority: P1)

Un usuario nuevo, antes de recibir cualquier recomendación, busca y selecciona uno o más bancos del catálogo y, por cada banco, declara una o más tarjetas (débito y/o crédito), indicando la red de cada una.

**Why this priority**: Es el campo obligatorio del perfil — capa 1 de `docs/architecture/01-data-models.md` ("Medios de pago"). Sin esto el motor de reglas no tiene con qué evaluar ninguna promoción de MODO, que exige banco + tipo de tarjeta + red.

**Independent Test**: Se prueba completando el flujo de alta (buscar banco → agregar tarjeta con tipo y red → confirmar) y verificando que el perfil guardado contiene exactamente los medios de pago declarados, con sus tres atributos completos — no depende de que exista todavía el motor de reglas ni el registro de compras.

**Acceptance Scenarios**:

1. **Given** un usuario sin perfil declarado, **When** abre el onboarding de medios de pago por primera vez, **Then** ve un buscador vacío sobre el catálogo de bancos y no puede confirmar sin haber agregado al menos un medio de pago completo (banco + tipo de tarjeta + red).
2. **Given** un usuario que busca "Galicia", **When** lo selecciona y agrega una tarjeta de crédito con red Visa, **Then** el medio de pago queda agregado a su selección con esos tres datos.
3. **Given** un usuario que ya agregó Galicia crédito Visa, **When** agrega una segunda tarjeta de Galicia, crédito, red American Express, **Then** ambas quedan declaradas como medios de pago distintos del mismo banco (mismo banco, mismo tipo, red diferente).
4. **Given** un usuario que ya agregó Galicia crédito Visa, **When** intenta agregar otra vez Galicia crédito Visa, **Then** el sistema no lo permite — esa combinación exacta de banco, tipo y red ya existe en su perfil.
5. **Given** un usuario que agregó 2 bancos con sus tarjetas y confirma, **When** vuelve a abrir la pantalla de perfil, **Then** ve los mismos 2 bancos con sus tarjetas y redes tal como los dejó.
6. **Given** un usuario que seleccionó un banco en el buscador pero cerró la pantalla sin agregarle ninguna tarjeta, **When** vuelve a abrir el onboarding, **Then** ese banco no aparece guardado — seleccionar un banco sin tarjeta es un estado transitorio de la pantalla, nunca se persiste.
7. **Given** un usuario cuya tarjeta es de un emisor que no está en el catálogo de bancos (ver Assumptions), **When** busca ese emisor, **Then** no lo encuentra y ve un mensaje explícito de que ese emisor no está disponible en esta versión — puede seguir completando el onboarding con cualquier otro medio de pago que sí tenga.

---

### User Story 2 - Editar bancos y tarjetas después de creado el perfil (Priority: P2)

El usuario agrega o saca bancos y tarjetas declarados, en cualquier momento, desde la pestaña Perfil.

**Why this priority**: Los bancos y tarjetas que un usuario tiene cambian — sin edición, el perfil queda desactualizado y el motor recomienda medios que ya no existen o ignora uno nuevo.

**Independent Test**: Se prueba editando un perfil ya creado (agregando un banco nuevo, sacando una tarjeta existente) y confirmando que el cambio persiste, independiente de si hay compras registradas.

**Acceptance Scenarios**:

1. **Given** un perfil con 2 medios de pago declarados, **When** el usuario saca uno (por ejemplo, la tarjeta de débito de un banco, dejando la de crédito del mismo banco), **Then** el perfil guardado refleja solo lo que quedó.
2. **Given** un perfil con medios de pago declarados, **When** el usuario intenta sacar el único medio de pago que le queda, **Then** el sistema no lo permite — el perfil no puede quedar vacío (ver User Story 1, Acceptance Scenario 1).
3. **Given** el dispositivo sin conexión, **When** el usuario intenta agregar o sacar un medio de pago, **Then** el sistema se lo impide con un aviso claro de que editar el perfil requiere conexión (ver Assumptions) — puede seguir viendo su perfil ya guardado.

---

### User Story 3 - Priorizar bancos frecuentes en el buscador (Priority: P3)

Al buscar un banco por nombre, el usuario ve primero los bancos más relevantes (los 32 marcados `on_hub_list` del catálogo de 82) cuando el texto tipeado coincide con varios.

**Why this priority**: El buscador en sí (texto parcial sobre el catálogo completo) es parte de User Story 1 y no es recortable — sin buscador no hay forma razonable de elegir entre 82 bancos. Lo que sí es una mejora independiente y diferible es el **orden** de los resultados: sin priorización, un banco poco común podría tapar a uno de uso masivo en una coincidencia parcial.

**Independent Test**: Se prueba tipeando un texto que coincide con bancos dentro y fuera de `on_hub_list` y verificando que los `on_hub_list` aparecen primero, sin afectar si el banco fuera de esa lista aparece o no (eso ya lo cubre el buscador base de User Story 1).

**Acceptance Scenarios**:

1. **Given** un texto de búsqueda que coincide con bancos dentro y fuera de `on_hub_list`, **When** se muestran los resultados, **Then** los bancos `on_hub_list` aparecen primero, y dentro de cada grupo se ordenan alfabéticamente.

---

### Edge Cases

- ¿Qué pasa si el usuario selecciona un banco pero no le agrega ninguna tarjeta? No se persiste — ver Acceptance Scenario 6 de User Story 1.
- ¿Qué pasa si el usuario agrega una tarjeta sin elegir una red? El sistema no lo permite: la red es obligatoria para cada tarjeta declarada, porque las promociones de MODO filtran por red.
- ¿Qué pasa si el usuario intenta declarar dos veces la misma combinación exacta de banco + tipo de tarjeta + red? El sistema no lo permite — ver Acceptance Scenario 4 de User Story 1. Sí puede declarar el mismo banco y tipo con una red distinta (Acceptance Scenario 3).
- ¿Qué pasa si el usuario intenta sacar su único medio de pago declarado? El sistema no lo permite — un perfil vacío no es un estado válido (RF-01).
- ¿Qué pasa si un banco deja de estar en `on_hub_list`, o sale del catálogo, después de que el usuario ya lo declaró? El medio de pago ya guardado se mantiene hasta que el usuario lo edite manualmente — no se borra automáticamente. Mismo tratamiento si el identificador del banco cambiara del lado de MODO: el medio de pago queda con la referencia que tenía hasta que el usuario lo edite.
- ¿Qué pasa si el emisor de la tarjeta del usuario no está en el catálogo de 82 bancos? No se puede declarar esa tarjeta puntual en este MVP — ver Acceptance Scenario 7 de User Story 1 y Assumptions. No bloquea el resto del onboarding si el usuario tiene al menos otro medio de pago declarable.
- ¿Qué pasa si el usuario abre el perfil sin conexión? Ve los medios de pago ya declarados desde el cache local (lectura); agregar, sacar o editar un medio de pago requiere conexión (ver User Story 2, Acceptance Scenario 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer un buscador por nombre sobre el catálogo completo de bancos (82). La coincidencia se evalúa sobre el nombre, sin distinguir mayúsculas de minúsculas ni acentos, como substring (no solo prefijo).
- **FR-002**: El sistema MUST mostrar, cuando el texto buscado coincide con bancos dentro y fuera del subconjunto `on_hub_list` (32), los `on_hub_list` primero; dentro de cada grupo, los resultados se ordenan alfabéticamente.
- **FR-003**: El sistema MUST permitir, por cada banco seleccionado, declarar una o más tarjetas (débito y/o crédito), cada una con su propia red. Un mismo banco puede tener más de una tarjeta del mismo tipo si la red es distinta (ej. crédito Visa y crédito American Express del mismo banco).
- **FR-004**: El sistema MUST NOT permitir declarar dos veces la combinación exacta banco + tipo de tarjeta + red.
- **FR-005**: El sistema MUST exigir una red para cada tarjeta declarada, elegida de un enum fijo de 9 valores (ver Key Entities § Red de tarjeta).
- **FR-006**: El sistema MUST NOT persistir un banco seleccionado que no tenga al menos una tarjeta (tipo + red) agregada — un banco sin tarjeta es solo estado transitorio de la pantalla.
- **FR-007**: El sistema MUST exigir al menos un medio de pago completo (banco + tipo de tarjeta + red) para poder confirmar el onboarding. El mismo mínimo lo exige, del lado de la recomendación, el criterio de aceptación de RF-01 en `docs/product/requisitos.md` — esta spec garantiza que el perfil nunca llega a estar vacío, no reimplementa ese gate en la pantalla de recomendación (issue #43).
- **FR-008**: Users MUST be able to editar su selección en cualquier momento posterior a la carga inicial, desde la pestaña Perfil (agregar o sacar bancos y tarjetas).
- **FR-009**: El sistema MUST NOT permitir dejar el perfil sin ningún medio de pago al editar.
- **FR-010**: El sistema MUST exigir conexión para agregar, sacar o editar un medio de pago; la lectura del perfil ya guardado no la requiere (usa el cache local).
- **FR-011**: El sistema MUST persistir cada medio de pago (banco, tipo de tarjeta, red) de forma atómica: o se guardan los tres atributos completos, o no se guarda nada — nunca un registro a medias.
- **FR-012**: El sistema MUST mostrar la selección previamente guardada cada vez que el usuario vuelve a la pantalla de perfil, incluso sin conexión (cache local).
- **FR-013**: El sistema MUST garantizar que un usuario únicamente puede leer y escribir sus propios medios de pago (aislamiento por usuario, ver `CLAUDE.md` § RLS).
- **FR-014**: El sistema MUST NOT validar contra el banco real que el usuario tenga esas cuentas — la declaración no se verifica.

### Key Entities *(include if feature involves data)*

- **Banco (catálogo)**: entidad de solo lectura para el usuario, sembrada desde MODO. Atributos: `id` (identificador estable del catálogo — es la clave que un medio de pago referencia; ver Assumptions), nombre, imagen, si está en el subconjunto priorizado (`on_hub_list`). El catálogo tiene 82 bancos; 32 están priorizados. Verificado el 2026-10-13 contra `GET /promos/api/rewards/banks?source=app_modo`.
- **Red de tarjeta**: marca de la tarjeta (no red interbancaria — no hay Banelco ni Link en este dominio), un valor fijo de 9. Cada valor interno tiene una etiqueta visible para el usuario:

  | Valor interno | Etiqueta visible |
  |---|---|
  | `visa` | Visa |
  | `master` | Mastercard |
  | `american_express` | American Express |
  | `dinners_club` | Diners Club |
  | `maestro` | Maestro |
  | `cabal` | Cabal |
  | `naranja` | Naranja |
  | `confiable` | Confiable |
  | `tarjeta_sol` | Tarjeta Sol |

- **Medio de pago (perfil)**: la tripleta banco + tipo de tarjeta (débito o crédito) + red, única por usuario (no se repite la misma tripleta exacta, ver FR-004). Un usuario puede declarar varios medios de pago, incluso varios sobre el mismo banco, siempre que no repitan la tripleta.
- **Perfil de usuario (medios de pago)**: la colección de medios de pago que el usuario declaró — la capa obligatoria del perfil descrita en `docs/architecture/01-data-models.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo con un solo medio de pago completa el onboarding en 4 pasos o menos: buscar y elegir banco, elegir tipo de tarjeta, elegir red, confirmar.
- **SC-002**: Con 4 caracteres o menos tipeados en el buscador (sin importar mayúsculas ni acentos), el banco buscado aparece entre los primeros 5 resultados.
- **SC-003**: Tras cerrar y reabrir la app con el dispositivo en modo avión, la pantalla de perfil muestra los medios de pago ya declarados, sin error ni carga infinita.

## Assumptions

- El catálogo de bancos y el flag `on_hub_list` llegan ya sembrados del lado del servidor (el sembrado en sí, desde la fuente de MODO, es responsabilidad de otra issue de ingesta/esquema — esta spec solo consume el catálogo, no lo genera). Se refresca cada vez que el usuario abre el buscador de bancos (fetch al abrir, con fallback al cache si no hay red); no hay sincronización en segundo plano en este MVP.
- Un medio de pago referencia su banco por el `id` del catálogo (no por nombre ni por `bcra_code`), porque es el único campo que la fuente documenta como identificador propio de cada entidad. Si MODO reasigna o retira un `id` más adelante, el medio de pago que lo usaba queda con una referencia obsoleta hasta que el usuario lo edite manualmente — mismo tratamiento que un banco que sale de `on_hub_list` (edge case ya cubierto arriba).
- **Verificado el 2026-10-13 contra la API real** (no todos los 9 valores de red tienen un banco homónimo obvio en el catálogo): `naranja` matchea a "NaranjaX" (sí está en el catálogo, `on_hub_list=true`); no se encontró en el catálogo ninguna entidad de nombre reconocible para `confiable` ni para `tarjeta_sol` ("Banco del Sol" existe pero no es necesariamente el mismo emisor). Por eso esta spec trata el emisor de una tarjeta como limitado al catálogo de 82 bancos: si el emisor real del usuario no está ahí, no puede declarar esa tarjeta puntual en este MVP (ver Edge Cases) — es una limitación conocida, no un bug, y no bloquea declarar otros medios de pago que sí tengan banco en el catálogo.
- Un banco por sí solo, sin ninguna tarjeta (tipo + red) agregada, no es un medio de pago válido ni cuenta para el mínimo de RF-01 (FR-006).
- Gustos y preferencias quedan fuera de esta spec (alcance confirmado en `docs/product/alcance-mvp.md`).
- Esta pantalla declara, no verifica: no valida contra el banco que el usuario realmente tenga esas cuentas, ni que la tarjeta declarada esté efectivamente adherida a MODO — coherente con "Fuera: integración bancaria" de `docs/product/alcance-mvp.md`. Consecuencia aceptada para el MVP: el motor puede recomendar un medio de pago que el usuario tiene en la vida real pero no cargó en MODO: ese riesgo lo absorbe la pantalla de recomendación (issue #43), no esta spec.
- El cache local de medios de pago se borra al cerrar sesión o al eliminar la cuenta, igual que el resto de los datos de perfil cacheados (ver `docs/product/privacidad.md`).
- No hay límite superior de cuántos medios de pago puede declarar un usuario.
