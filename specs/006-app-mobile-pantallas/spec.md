# Feature Specification: App mobile base y las 18 pantallas de diseño

**Feature Branch**: `claude/vuelto-mobile-screens-9fdae7`

**Created**: 2026-10-16

**Status**: Aprobada para implementar (revisada tras `spec-critic`)

**Input**: Issue #39 ("App Expo base: navegación, tema de marca y cliente de Supabase") ampliada con las 18 pantallas de diseño de Vuelto (Stitch v5), conectadas entre sí y con las correcciones de `docs/design/auditoria-pantallas-v5.md` (P1 #1–#6, P2 #7–#18 y P3).

## Contexto y decisión que resuelve

Vuelto le dice al usuario **con qué medio de pago pagar una compra concreta** y **cuánto tope de reintegro le queda** (Principio I). Esta feature arma la app que el usuario tiene en la mano en la caja: el recorrido desde que la abre por primera vez hasta que sabe con qué pagar, registra la compra y ve cómo quedaron sus topes. Las pantallas se alimentan con datos de ejemplo (DESIGN.md §9) que tienen la misma forma que tendrán las respuestas del servidor, así las historias de backend (#40, #42, #56) se enchufan sin rehacer la UI.

Fuentes de verdad, en este orden cuando chocan:

1. Constitución (`.specify/memory/constitution.md`) y reglas de `CLAUDE.md`.
2. Auditoría v5 (`docs/design/auditoria-pantallas-v5.md`): sus correcciones reemplazan al diseño original donde choquen.
3. `docs/design/DESIGN.md` (tokens, componentes, prohibidos, datos de ejemplo). Esta feature lo actualiza donde la auditoría lo corrige (FR-043), para que la próxima generación de Stitch no reintroduzca lo corregido.
4. Pantallas de Stitch v5 (estructura, copy y espaciado; `docs/design/screens/` como respaldo).

### Enmienda de constitución (PATCH 2.0.1, aprobada por el PO el 16/10/2026)

El Principio I dice "Ninguna pantalla muestra promociones si no hay una compra concreta (dónde y cuánto)". La auditoría P1 #1 hace el monto **opcional**. Se propone una aclaración PATCH (2.0.0 → 2.0.1): *una compra concreta es un comercio elegido en un momento dado; el monto es opcional y solo refina el estimado*. Sin monto, la respuesta sigue siendo una decisión sobre una compra concreta (este comercio, hoy), no un listado. La pestaña Topes muestra la promo de cada medio solo como contexto de su tope (la segunda mitad del Principio I), no como listado.

### Conciliación con la issue #39

La issue pide las rutas `(auth)/login`, `perfil`, `index` ("¿Con qué pago?"), `topes` y `registrar`. DESIGN.md fija la tab bar **Inicio · Comprar · Topes · Perfil**, y la auditoría (P1 #1) pone la respuesta "¿con qué pago?" dentro de Inicio. La conciliación es:

| Ruta de la issue | Dónde queda |
|---|---|
| `index` ("¿Con qué pago?") | Pestaña **Inicio**: la pregunta "¿Dónde vas a comprar?" y la respuesta inline viven acá. |
| `registrar` | Pestaña **Comprar** (Nueva compra) y el flujo Escanear ticket → Revisá tu compra que cuelga de ella. |
| `topes` | Pestaña **Topes**. |
| `perfil` | Pestaña **Perfil**, con contactos como pantallas hijas. |
| `(auth)/login` | Sheet **Guardar perfil** (paso 5 del onboarding, "Ya tengo cuenta" en Bienvenida y "Guardá tu perfil" en Perfil). |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber con qué pagar desde el inicio (Priority: P1)

Martín está en la fila de Coto un miércoles. Abre la app, toca "Coto" entre sus comercios frecuentes y, sin cambiar de pantalla, ve "Te conviene Galicia Visa crédito", la razón ("20% en supermercados los miércoles") y "te quedan ≈$6.500 de tope · según 3 compras de octubre". Si carga el monto ($24.500), la cifra se refina a "Te devuelven ≈$4.900". Si quiere más detalle, abre "Con qué pagar", donde están las alternativas descartadas con su motivo y la acción para registrar que pagó así.

**Why this priority**: es la decisión que justifica el producto (auditoría P1 #1, persona "40 segundos en la fila"). Sin esto la app es una lista de promos.

**Independent Test**: con los datos de ejemplo, desde Inicio, tocar "Coto" muestra la respuesta en la misma pantalla en un solo toque; el monto no es obligatorio.

**Acceptance Scenarios**:

1. **Given** Martín en Inicio, **When** toca "Coto", **Then** aparece en Inicio la tarjeta de decisión con "Te conviene", el medio, la razón en una línea y "te quedan ≈$6.500 de tope · según 3 compras de octubre", sin navegar a otra pantalla.
2. **Given** la respuesta inline sin monto, **Then** no se muestra ninguna cifra de "Te devuelven"; se muestran el porcentaje y el tope disponible con ≈ y su base.
3. **Given** la respuesta inline, **When** carga $24.500 en el campo de monto opcional, **Then** aparece "Te devuelven ≈$4.900 · te sale ≈$19.600" con un cruce de opacidad corto, sin contadores animados.
4. **Given** la respuesta inline, **When** toca "Ver detalle", **Then** llega a "Con qué pagar" de Coto con la misma recomendación, el mismo monto (si lo cargó), y las alternativas descartadas con su motivo ("Provincia Visa débito · hoy no aplica, la promo es los sábados"; "Santander Mastercard · sin promo en supermercados"; "Macro Visa débito · tope agotado").
5. **Given** "Con qué pagar" con $24.500, **Then** el tope después de la compra se muestra como "Te quedan ≈$1.600 de tope después de esta compra" con su base. *(Revisado el 27/10: la respuesta real de `recomendar` no trae el estado del tope después de la compra, así que no se muestra "Queda poco" ahí; el estado sí se ve en Topes.)*
6. **Given** "Con qué pagar", **Then** hay un único botón primario de una línea ("Usar Galicia") en un pie fijo (la pantalla se apila sobre las tabs, sin tab bar: research R2); el contenido termina con espacio igual al footer, y "¿Pagan entre varios?" queda completo y tocable.
7. **Given** "Con qué pagar", **When** toca "Usar Galicia", **Then** se abre el sheet "Revisá tu compra" en modo recomendación (ver US2 esc. 6).

---

### User Story 2 - Registrar una compra (Priority: P1)

Después de pagar, Martín abre Comprar, elige "Escanear ticket" y revisa lo que leyó la app en un sheet. Como el ticket no dice con qué pagó, la app le pregunta "¿Con qué pagaste?" sin nada marcado. Recién cuando elige, se habilita "Guardar compra". Alternativamente, registra la compra aceptando la recomendación ("Usar Galicia") o a mano.

**Why this priority**: sin registro, los topes no son estimables (RF-08 a RF-12). Es la otra mitad del producto.

**Independent Test**: desde Comprar, recorrer Escanear → Revisá tu compra → Guardar compra y ver la compra en Mis compras.

**Acceptance Scenarios**:

1. **Given** la pestaña Comprar, **When** toca "Escanear ticket", **Then** se abre una pantalla completa con un visor de ticket (sin cámara real en esta feature) que se cierra con una X de 44 pt.
2. **Given** el visor, **When** toca el disparador, **Then** se simula la lectura del ticket de ejemplo (Coto, 14/10/2026, $24.500, medio no informado) y se abre el sheet "Revisá tu compra" con comercio, fecha y monto editables y **ningún** medio preseleccionado (RF-10), con el aviso "El ticket no dice el medio de pago" y la pregunta "¿Con qué pagaste?".
3. **Given** el sheet sin medio elegido, **Then** "Guardar compra" está visible en un footer fijo y deshabilitado; el texto del contenido no queda cortado (auditoría P1 #3).
4. **Given** el medio elegido, **When** toca "Guardar compra", **Then** recibe un háptico leve, el sheet se cierra, vuelve a la pantalla desde la que empezó el flujo y ve el aviso "Compra guardada · la ves en Mis compras".
5. **Given** una compra guardada en la sesión, **Then** aparece primera en Mis compras y en "Últimas compras" de Comprar con su origen ("Ticket").
6. **Given** "Usar Galicia" en Con qué pagar, **Then** el sheet "Revisá tu compra" se abre en modo recomendación: comercio y monto (vacío si no lo cargó) editables, Galicia Visa crédito marcado porque el usuario lo eligió explícitamente al tocar el botón, y "Guardar compra" habilitado solo si hay monto. Guardar produce una compra con origen "Recomendación" (valor `excepción` del modelo de datos).
7. **Given** Nueva compra, **When** toca "Cargar a mano", **Then** el mismo sheet se abre vacío, sin medio preseleccionado; guardar produce origen "Carga manual".
8. **Given** el flujo de ticket, **Then** no se captura ninguna imagen real; ningún archivo de imagen se crea en el dispositivo.

---

### User Story 3 - Primer uso: configurar y recibir la primera respuesta (Priority: P1)

Un usuario nuevo ve la bienvenida, declara sus medios de pago, opcionalmente sus comercios habituales, recibe una primera respuesta de ejemplo y recién entonces se le ofrece guardar su perfil con una cuenta.

**Why this priority**: es la puerta de entrada; da valor antes de pedir la cuenta (auditoría "qué funciona" #4).

**Independent Test**: con la app recién instalada, recorrer los 5 pasos hasta las pestañas.

**Acceptance Scenarios**:

1. **Given** la app sin onboarding completo, **When** se abre, **Then** muestra Bienvenida; al avanzar, Medios de pago → Comercios → Primera respuesta → sheet Guardar perfil → Inicio.
2. **Given** Medios de pago, **When** no hay ningún medio con cobertura marcado, **Then** "Continuar" está deshabilitado con el motivo visible ("Elegí al menos un medio con promos"); Mercado Pago aparece con la nota "Todavía no tenemos promos de este medio" y sin topes ni reintegros, y marcarlo solo no habilita continuar.
3. **Given** Comercios, **Then** "Continuar" es el único primario y "Saltar" es una acción de texto en el encabezado; ambos llevan a Primera respuesta (auditoría P2 #18).
4. **Given** Medios de pago y Comercios, **Then** el indicador de progreso es solo una barra de 2 segmentos (los pasos de configuración), sin texto "Paso N de M" visible; su etiqueta accesible dice "Configuración, paso 1 de 2" (auditoría P2 #18).
5. **Given** Primera respuesta, **Then** muestra la recomendación de ejemplo para Coto (tarjeta de decisión) y el aviso "Tus topes arrancan sin base": un usuario nuevo no tiene compras, así que no hay cifra de tope (Principio V). Los datos son fijos y no dependen de lo marcado en los pasos anteriores (la app no calcula, FR-012).
6. **Given** el sheet Guardar perfil, **Then** se ve sobre Primera respuesta; ofrece email sin contraseña y, en iOS, "Continuar con Apple"; en Android solo email. En Expo Go ambos son sustitutos que completan el onboarding.
7. **Given** el sheet Guardar perfil, **When** toca "Ahora no", **Then** entra a Inicio sin cuenta; Perfil muestra la fila "Guardá tu perfil" que abre el mismo sheet.
8. **Given** Bienvenida, **When** toca "Ya tengo cuenta", **Then** se abre el sheet Guardar perfil en modo "Entrar" y, al completarlo, va directo a Inicio.

---

### User Story 4 - Ver cuánto tope queda (Priority: P2)

Martín abre Topes y ve, por medio de pago, cuánto tope le queda estimado y en qué se basa, cuándo se reinicia y cuánto le devolvieron este mes. Desde Topes o Inicio llega a Mis compras.

**Why this priority**: RF-06/RF-07; es la segunda promesa del producto, pero se consulta menos que la recomendación.

**Independent Test**: abrir Topes con los datos de ejemplo y verificar los cuatro estados (disponible, queda poco, sin compras, agotado).

**Acceptance Scenarios**:

1. **Given** Topes, **Then** cada medio muestra su cifra con ≈ y su base ("según 3 compras de octubre"), una barra que termina en tramo rayado y su estado en texto ("Queda poco", "Tope agotado").
2. **Given** Provincia sin compras esta semana, **Then** no se muestra cifra: "Sin compras registradas esta semana: todavía no podemos estimar cuánto te queda."
3. **Given** Topes, **Then** no existe ningún total agregado de topes ("Te quedan ≈$X", "Tope total del mes"); el resumen, sobre superficie Lino, muestra "Te devolvieron ≈$15.200 · según 10 compras de octubre" y "2 medios con tope disponible" (auditoría P1 #2, #4).
4. **Given** Topes, **Then** el reinicio se muestra por periodo: "Los mensuales se reinician en 18 días" en el resumen, y en Provincia (semanal) "se reinicia el lunes".
5. **Given** Mis compras, **Then** cada compra lleva su origen (Ticket, Recomendación, Carga manual) en texto ≥12 pt, los filtros son chips con scroll horizontal que no cortan texto (una de las dos opciones de la auditoría P2 #16), y todas las fechas son de octubre de 2026.

---

### User Story 5 - Contactos y gasto en grupo (Priority: P3)

Martín vincula a Lucía y Mateo por invitación desde Perfil, y en una cena de sábado arma un grupo para saber quién conviene que pague. Puede quitar un contacto con confirmación.

**Why this priority**: RF-19, RF-21, RF-22 son prioridad C (última del MVP), pero las pantallas ya están diseñadas y la navegación tiene que existir.

**Independent Test**: Perfil → Invitar contacto; abrir el link de ejemplo → Aceptar invitación; Perfil → Quitar contacto; Con qué pagar → "¿Pagan entre varios?" → Armar grupo → Gasto en grupo.

**Acceptance Scenarios**:

1. **Given** Perfil con cuenta, **When** toca "Invitar contacto", **Then** ve el link de ejemplo, un QR y "Vence en 24 h · sirve una sola vez", con "Compartir link" como primario; no hay buscador de usuarios.
2. **Given** el link de invitación de ejemplo abierto, **Then** Aceptar invitación dice quién invita, qué se comparte, lo que se puede deducir, y tiene "Aceptar" y "Ahora no" del mismo peso visual, sin preselección; el texto de cómo quitar el vínculo queda completo encima del footer.
3. **Given** Aceptar invitación, **When** toca "Ahora no", **Then** vuelve a Inicio sin crear vínculo; **When** toca "Aceptar", **Then** vuelve a Perfil con el contacto en la lista y el aviso "Ahora Lucía es tu contacto".
4. **Given** una invitación vencida, ya usada, propia o de alguien que ya es contacto, **Then** Aceptar invitación explica el motivo y solo ofrece "Volver".
5. **Given** el link abierto sin onboarding completo, **Then** primero pasa por el onboarding y al terminar vuelve a Aceptar invitación.
6. **Given** un contacto en la lista de Contactos (Perfil → Ver todos), **When** toca quitar, **Then** un sheet pide confirmación y dice que el vínculo se rompe para los dos; al confirmar, el contacto desaparece de Perfil y de Armar grupo durante la sesión.
7. **Given** Perfil sin cuenta, **Then** la sección Contactos dice "Para vincular contactos, guardá tu perfil" con un botón al sheet Guardar perfil, en lugar de "Invitar contacto".
8. **Given** Armar grupo, **Then** pide nombre del gasto (opcional), monto, y los integrantes: "Vos" fijo, contactos vinculados para marcar, y "Agregar alguien sin cuenta" (solo nombre). El primario "Ver quién conviene que pague" va en un footer fijo encima de la tab bar sin tapar la lista (auditoría P2 #7).
9. **Given** Gasto en grupo, **Then** la tarjeta de decisión dice "Te conviene que pague Mateo con su Provincia Visa débito · les devuelven ≈$5.000 · según las compras que registró Mateo"; de Lucía "sin reintegro en esta compra · Lucía no tiene compras registradas: sin base"; de Sofía "Sin cuenta: no conocemos su tope"; de Vos, tu medio con su estado ("Tu Provincia Visa débito: 25% los sábados, sin base esta semana"). Cada uno "pone ≈$9.000". Nunca topes, cantidad de compras ni otros medios de un contacto, ni estados de cobro.
10. **Given** Armar grupo y Gasto en grupo, **Then** la fila propia dice "Vos" con un avatar sin inicial, los contactos usan dos letras cuando la inicial se repite ("Ma", "Mt" no aplica a Vos), y los encabezados están en sentence case (auditoría P2 #10, #11).
11. **Given** las pantallas de contactos y grupo, **Then** tienen encabezado nativo con volver y gesto de swipe del sistema.

---

### User Story 6 - Base técnica para las historias siguientes (Priority: P1, habilitador)

El equipo tiene la app dentro del monorepo, con tema de marca, navegación, cliente de Supabase y chequeos integrados, para que las historias de UI se enchufen sin pelear con la configuración.

**Why this priority**: es el criterio de aceptación literal de #39 y bloquea #40, #42 y #56.

**Independent Test**: `npm run lint`, `typecheck` y `test` desde la raíz pasan; la app abre en Expo Go en iOS y Android escaneando el QR.

**Acceptance Scenarios**:

1. **Given** el repo, **Then** la app está en los workspaces, su manifiesto no depende del paquete del motor, y la app no calcula recomendaciones localmente.
2. **Given** el cliente de Supabase, **Then** lee solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`, existe `.env.example` commiteado y `.env` está ignorado; no hace consultas todavía.
3. **Given** el código de pantallas y componentes, **Then** no hay colores escritos a mano fuera del archivo de tema.
4. **Given** `docs/architecture/03-frontend.md` y `02-api-routes.md`, **Then** describen navegación, estado, capa de datos, dónde vive cada cosa y la forma de las respuestas que la capa de datos espera del servidor.

### Edge Cases

- **Texto extra grande**: con escala de texto > 1,2, las tarjetas de topes de Inicio pasan a una columna; ningún texto se trunca de forma que pierda la cifra o el estado; los botones crecen en alto en vez de cortar el texto. A esas escalas se acepta scroll para ver las alternativas.
- **Comercio sin promo hoy** (fixture "YPF" un miércoles): la respuesta dice "Hoy ningún medio tuyo tiene promo en YPF" y no muestra cifra; muestra cuándo sí hay ("Santander Mastercard: 15% los jueves").
- **Mejor promo con tope agotado** (fixture "Farmacity"): Macro no se recomienda; aparece entre las alternativas con "Tope agotado · vuelve el 1/11", y la respuesta dice que hoy no hay otra opción con reintegro.
- **Monto vacío o cero**: nunca "Te devuelven ≈$0"; se muestran porcentaje y tope.
- **Lectura de ticket fallida** (fixture de error): error inline en Óxido con salida ("No pudimos leer el ticket. Probá con más luz o cargá el monto a mano.") y botón "Cargar a mano".
- **Sin compras en el mes** (fixture de estado vacío): Inicio y Topes muestran el estado vacío de DESIGN.md con "Registrar compra".
- **Solo Mercado Pago marcado** en el onboarding: no puede continuar (US3 esc. 2).
- **Usuario sin cuenta**: puede usar Inicio, Comprar y Topes; Contactos y Grupo piden guardar el perfil.
- **Nombre de contacto duplicado o que imita a otro**: la app muestra el nombre que eligió el otro; Aceptar invitación aclara "Solo aceptá si conocés a quien te mandó el link". Dos contactos con el mismo nombre en un grupo se distinguen por sus dos letras y el orden de vínculo.
- **Modo oscuro del sistema activo**: la app se ve en su apariencia clara declarada, en iOS y Android, sin controles del sistema oscuros sobre fondos claros.
- **Sheet abierto**: la tab bar no se ve.
- **Guardar dos veces el mismo ticket**: fuera de alcance de esta feature (no hay detección de duplicados en la capa de ejemplo).

## Requirements *(mandatory)*

### Functional Requirements

**Navegación y estructura**

- **FR-001**: La app MUST tener cuatro pestañas en este orden y con estos nombres: Inicio · Comprar · Topes · Perfil, sin botón central elevado ni pestaña de Grupo.
- **FR-002**: El primer uso MUST pasar por un flujo de 5 pasos (Bienvenida, Medios de pago, Comercios, Primera respuesta, Guardar perfil) que termina en Inicio; un usuario con el onboarding completo abre directo en Inicio. El indicador "onboarding completo" y los medios y comercios declarados persisten en el dispositivo.
- **FR-003**: Escanear ticket MUST abrirse como pantalla completa modal; Revisá tu compra, Guardar perfil y Quitar contacto MUST ser sheets con manija y cierre "X" de 44 pt.
- **FR-004**: Mis compras, Invitar contacto, Aceptar invitación, Armar grupo y Gasto en grupo MUST ser pantallas apiladas con encabezado nativo, volver del sistema y gesto de swipe.
- **FR-005**: Aceptar invitación MUST abrirse desde un link de invitación con la ruta `/i/<token>`: en Expo Go con el esquema de desarrollo (`exp://…/--/i/<token>`), y con el esquema propio de la app en un build.
- **FR-006**: Ningún contenido ni control MUST quedar tapado por la tab bar, un footer fijo o el área segura; los footers fijos reservan su alto más el área segura como espacio al final del contenido.

**Decisión de compra**

- **FR-007**: Inicio MUST mostrar "¿Dónde vas a comprar?" con buscador y chips de comercios frecuentes; al tocar un comercio, la respuesta (tarjeta de decisión) MUST aparecer en la misma pantalla, con un campo de monto opcional y "Ver detalle".
- **FR-008**: El monto MUST ser opcional en Inicio y Con qué pagar; sin monto se muestran porcentaje y tope disponible; con monto, el reintegro estimado y "te sale".
- **FR-009**: Con qué pagar MUST mostrar, en orden: comercio → recomendación → razón → monto opcional → alternativas descartadas con su motivo → "¿Pagan entre varios?" → acción. En 390×844 pt con escala de texto 1,0, la primera alternativa MUST verse sin scroll.
- **FR-010**: El botón primario de Con qué pagar MUST decir "Usar <banco>" en una sola línea; el reintegro va en la tarjeta, no dentro del botón. Tocarlo abre Revisá tu compra en modo recomendación (US2 esc. 6).
- **FR-011**: Nueva compra (pestaña Comprar) MUST ofrecer, en este orden: elegir comercio (buscador + frecuentes, que lleva a Con qué pagar), "Escanear ticket", "Cargar a mano" y "Últimas compras" con acceso a Mis compras. El monto, cuando se pide, usa el teclado numérico del sistema sin letras.
- **FR-012**: La app MUST NOT calcular recomendaciones, reintegros ni topes: toda cifra sale de la capa de datos, que consume la forma real de la Edge Function `recomendar` (hoy respondida por un mock). Única excepción: "te sale" es la resta `monto − ahorroEstimado`, porque la respuesta del servidor no trae ese campo.

**Registro de compra**

- **FR-013**: Revisá tu compra MUST NOT preseleccionar el medio de pago en los modos ticket y manual, y MUST preguntar "¿Con qué pagaste?". En modo recomendación el medio va marcado porque el usuario lo eligió al tocar "Usar <banco>".
- **FR-014**: Revisá tu compra MUST tener un footer fijo con un único primario "Guardar compra", deshabilitado hasta que haya medio y monto.
- **FR-015**: Esta feature MUST NOT capturar imágenes reales de tickets: el visor es una simulación y la lectura usa el ticket de ejemplo. Ningún archivo de imagen se crea, se sube ni se registra en logs. (La captura real llega con la Edge Function del ticket y pasa por `rules-guardian`.)
- **FR-016**: Guardar una compra MUST dar feedback (háptico leve y aviso "Compra guardada · la ves en Mis compras"), volver a la pantalla de origen del flujo y agregar la compra a Mis compras y a Últimas compras durante la sesión. Los topes de ejemplo no cambian tras guardar (se declara en Assumptions).

**Topes y cifras estimadas**

- **FR-017**: Todo tope visible MUST llevar ≈ y su base; sin compras registradas MUST decir que no hay base y no mostrar cifra.
- **FR-018**: Las barras de tope MUST terminar en tramo rayado y nunca mostrar porcentajes de consumo ("≈80% consumido").
- **FR-019**: Topes MUST NOT mostrar un total agregado de topes ("Te quedan", "Tope total del mes").
- **FR-020**: "Te devolvieron ≈$X" MUST aparecer solo en Topes y Mis compras.
- **FR-021**: Llevan ≈ todas las cifras que dependen de una estimación: reintegro estimado, "te sale", tope disponible, "te devolvieron" y la parte de cada uno en un grupo. No llevan ≈ los montos de compra, los topes nominales de la promo ni los montos que el usuario cargó. Donde no hay reintegro se dice en texto ("sin promo", "sin reintegro"), no "$0".
- **FR-022**: El estado "Queda poco" MUST aplicarse cuando el tope disponible estimado es ≤ 30% del nominal; "Tope agotado" cuando es 0. El umbral lo decide la capa de datos (viene en la respuesta), la app solo lo muestra.

**Contactos y grupo (ADR-008)**

- **FR-023**: Los tipos de datos de contacto y de grupo en la app MUST tener solo los campos de la columna "¿Lo ve el usuario?" de ADR-008 §3: nombre para mostrar, medio recomendado (solo si es quien paga), reintegro estimado de esta compra y base en palabras. No MUST existir campos de tope, cantidad de compras, compras ni otros medios de un contacto.
- **FR-024**: Integrantes sin cuenta MUST decir "Sin cuenta: no conocemos su tope"; se declaran solo con un nombre y existen solo mientras dura el grupo en la sesión.
- **FR-025**: No MUST existir buscador de usuarios en ninguna pantalla.
- **FR-026**: Quitar un contacto MUST pedir confirmación y explicar que el vínculo se rompe para los dos.
- **FR-027**: Gasto en grupo MUST NOT mostrar estados de cobro.
- **FR-028**: Contactos y grupo MUST requerir perfil guardado; sin cuenta se ofrece el sheet Guardar perfil.

**Sistema visual y accesibilidad**

- **FR-029**: Todos los colores MUST salir de tokens semánticos definidos en un único archivo de tema, con los valores de DESIGN.md §2.
- **FR-030**: La app MUST declarar apariencia solo clara en iOS y Android (decisión de esta spec, ver Assumptions).
- **FR-031**: La superficie oscura (Verde Bosque) MUST aparecer solo en: la respuesta inline de Inicio (cuando hay un comercio elegido), Con qué pagar, Primera respuesta y Gasto en grupo. Inicio sin comercio elegido, Nueva compra, Topes, Mis compras, Perfil, Invitar, Aceptar, Armar grupo, onboarding y sheets usan superficies claras. El visor de Escanear ticket es oscuro por ser un visor de cámara, no una tarjeta.
- **FR-032**: La tipografía MUST ser Hanken Grotesk; todos los montos con cifras tabulares; ningún texto informativo menor a 12 pt.
- **FR-033**: El texto MUST escalar con el tamaño de texto del sistema; los layouts de dos columnas MUST pasar a una columna cuando la escala supera 1,2.
- **FR-034**: Los íconos MUST ser SF Symbols en iOS y Material en Android, detrás de un único componente; todo botón de solo ícono lleva etiqueta accesible. El botón de Apple usa el estilo con borde (no relleno negro).
- **FR-035**: Toda área táctil MUST medir al menos 44×44 pt.
- **FR-036**: Los encabezados de bloque MUST estar en sentence case.
- **FR-037**: Inicio MUST NOT tener campana de notificaciones.
- **FR-038**: Todas las fechas de ejemplo MUST ser de octubre de 2026; la capa de datos usa un reloj fijo (miércoles 14/10/2026), no el del dispositivo.
- **FR-039**: Las animaciones MUST limitarse a transform/opacidad, respetar "reducir movimiento", y usarse solo en sheets, aparición de la respuesta, cambio de cifra y feedback al toque.

**Base técnica (#39) y documentación**

- **FR-040**: La app MUST estar en los workspaces del monorepo y sus chequeos de lint, tipos y tests MUST correr con los scripts de la raíz.
- **FR-041**: El manifiesto de la app MUST NOT depender del paquete del motor.
- **FR-042**: El cliente de Supabase MUST leer solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`; `.env.example` commiteado y `.env` ignorado. La app MUST abrir aunque esas variables falten.
- **FR-043**: DESIGN.md MUST actualizarse con lo que esta feature corrige: regla de la superficie oscura (FR-031), íconos por plataforma, apariencia solo clara, píldora de ahorro fuera del botón, umbral "Queda poco" (FR-022), reglas de ≈ (FR-021), sin agregado de topes y sin campana.
- **FR-044**: El logo de Vuelto MUST estar en el ícono y el splash.
- **FR-045**: La capa de datos MUST exponer funciones asincrónicas con tipos iguales a los contratos documentados en `docs/architecture/02-api-routes.md`, con el origen de compra alineado a `01-data-models.md` (`ticket` | `excepción` | `manual`), y fixtures para los casos de borde listados arriba.
- **FR-046**: La app MUST abrir en Expo Go en iOS y Android.

### Key Entities

- **Medio de pago**: banco + red + tipo (Galicia Visa crédito); puede no tener cobertura (Mercado Pago).
- **Comercio**: nombre, rubro, inicial; algunos marcados como frecuentes.
- **Recomendación**: comercio, medio recomendado, porcentaje, razón en una línea, tope disponible con base, y —si hay monto— reintegro estimado, "te sale" y tope después de la compra con su estado; alternativas con motivo.
- **Estado de tope**: medio, promo, tope nominal y periodo, disponible estimado o "sin base", base (cantidad de compras y periodo), estado (disponible, queda poco, agotado), reinicio.
- **Compra registrada**: comercio, fecha, monto, medio, reintegro estimado, origen (`ticket`, `excepción`, `manual`).
- **Lectura de ticket**: comercio, fecha, monto, medio (nullable), texto extraído; nunca la imagen.
- **Contacto**: nombre para mostrar; vínculo mutuo.
- **Invitación**: link, vencimiento, un solo uso, estado (válida, vencida, usada, propia, ya contacto).
- **Recomendación de grupo**: integrantes (vos, contactos, sin cuenta), quién paga, con qué medio, reintegro estimado, base en palabras, parte de cada uno; de los contactos, solo lo de FR-023.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde Inicio, un usuario con perfil llega a "Te conviene…" en **1 toque** (antes: 3 pantallas).
- **SC-002**: Las 18 pantallas son alcanzables desde el flujo de la app; Aceptar invitación, abriendo el link de ejemplo en el simulador.
- **SC-003**: 0 colores escritos a mano en pantallas y componentes fuera del archivo de tema (verificable con una búsqueda).
- **SC-004**: 0 cifras de tope sin ≈ ni base en las 18 pantallas.
- **SC-005**: Con el tamaño de texto más grande de accesibilidad, en las 18 pantallas ningún botón, cifra o estado queda cortado ni tapado (se acepta scroll).
- **SC-006**: Lint, tipos y tests desde la raíz pasan sin errores, y la app no tiene el motor en su manifiesto.
- **SC-007**: Las 6 correcciones P1, las 12 P2 y las 4 P3 de la auditoría v5 quedan verificadas con capturas del simulador.

## Assumptions

- **Apariencia**: solo clara. DESIGN.md define una sola paleta cálida (Blanco Hueso) y es parte de la identidad; definir y auditar 13 tokens oscuros con contraste AA es trabajo propio que no aporta a la decisión. Se declara solo clara y los tokens son semánticos (rol, no color), así una apariencia oscura futura cambia un archivo.
- **Datos**: no hay backend todavía (#40, #42, #56 lo traen). La capa de datos devuelve fixtures fijos con una demora mínima simulada. Los fixtures no dependen de lo declarado en el onboarding. Las compras guardadas y los contactos quitados viven en memoria durante la sesión y no modifican los topes de ejemplo; se acepta porque la capa de datos simula al servidor, y ese recálculo es trabajo del motor (#43/#45).
- **Cámara**: no se usa la cámara en esta feature. La API de cámara estándar escribe la foto en el cache del dispositivo, lo que chocaría con el Principio IV; la captura real se diseña junto con la Edge Function del ticket.
- **Apple sign-in y email**: sustitutos en Expo Go; no se crea ninguna cuenta real.
- **Fecha de hoy** en los datos: miércoles 14 de octubre de 2026; reinicio de topes mensuales el 1/11 ("en 18 días"); Provincia (semanal) se reinicia el lunes.
- **Datos de ejemplo**: los de DESIGN.md §9, con dos ajustes de coherencia: el 15/10/2026 es jueves, así que "hoy miércoles" es el 14/10 y los topes mensuales se reinician en 18 días; y "Te devolvieron ≈$15.200" se basa en 10 compras de octubre (9 con reintegro y una sin promo). Santander (≈$2.300 de $8.000, 29%) queda en "Queda poco" con el umbral de FR-022.
- **Íconos de rubro**: el mismo símbolo para el mismo rubro en toda la app, con su par SF Symbol / Material.
- **Plataforma de verificación**: iOS Simulator para capturas (claro y texto extra grande); Android se verifica que abra en Expo Go y que se vea claro con el sistema en oscuro.

## Agregados durante la implementación

Estos elementos no estaban en los FR pero vienen del diseño de Stitch o de la verificación, y se
dejan documentados:

- Perfil: "Cerrar sesión" (estaba en el diseño) y, solo en desarrollo, escenarios de prueba (mes
  vacío, ticket ilegible) y un link a una invitación de ejemplo para verificar esos estados.
- Pantalla Contactos (`contactos/index`), detrás del sheet Quitar contacto, como en el diseño.
- "¿Pagan entre varios?" también en la pestaña Comprar, para llegar al grupo sin pasar por un
  comercio.
- Filtros por rubro en Topes ("Por rubro" del diseño).
- `Contacto.vinculadoDesde`: es un dato del vínculo, no del contacto (ADR-008 §3 no lo prohíbe).

## Fuera de alcance

- Consultas reales a Supabase, Edge Functions, extractor de tickets y motor.
- Captura real de la cámara.
- Notificaciones y su campana.
- Apariencia oscura.
- Detección de tickets duplicados.
- Planificación entre varios días, estados de cobro, dividir el pago entre dos medios.
- Build de EAS.
