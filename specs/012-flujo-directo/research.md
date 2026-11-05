# Research: Flujo directo (spec 012)

Decisiones técnicas para cumplir la spec sobre el código de `main` del 05/11/2026. Cada una va con la alternativa descartada.

## R1. Dónde viven las compras por confirmar

- **Decision**: un slice nuevo `porConfirmar` (`{ lista: CompraPorConfirmar[] }`), persistido en su propia clave `vuelto.por-confirmar.v1`, con su listener y su lectura al arrancar. Es el mismo patrón que la cola de la spec 010 (`store/cola.ts`, `escucharPersistenciaCola`).
- **Rationale**: no cambia la forma de `vuelto.store.v1` (`Persistido` versión 1, que valida por parte), y una entrada inválida en disco no se lleva el perfil ni las compras. La compra por confirmar no es una compra: no entra a `compras`, así que los selectores de topes (`selectEntradasMotor`, `selectTopes`) no la ven y FR-003 se cumple sin tocar el motor.
- **Alternatives considered**:
  - Sumar `porConfirmar` a `Persistido` y subir a versión 2: obliga a migrar y mezcla una intención con datos confirmados.
  - Una compra con un estado nuevo dentro de `compras`: cada selector del motor tendría que filtrarla, y un olvido descuenta tope (rompe RF-09).
  - Tabla en Supabase: descartada por la spec (Assumptions), porque necesitaría RLS, sincronización y no aporta nada a otro usuario.

## R2. Vencimiento sin `new Date()` en la lógica

- **Decision**: la compra por confirmar guarda `creadaEn` (ISO, tomado de `sesion.ahora` al crearla). Un selector `selectPorConfirmarVigentes` filtra las de más de 48 h contra `sesion.ahora`, que ya avanza con `useReloj`. Al rehidratar, `porConfirmarPurgadas({ ahora, usuarioId, idsConfirmados })` saca las vencidas, las de otro usuario y las que ya están en `compras` (FR-011, FR-014, FR-016). La constante `VENCIMIENTO_POR_CONFIRMAR_MS` vive en un único módulo.
- **Rationale**: ADR-010 pide que el reloj entre como valor del store. El filtro en el selector garantiza que una vencida nunca se vea, aunque la purga no haya corrido.
- **Alternatives considered**: un timer por compra (no sobrevive a cerrar la app) o purgar solo al abrir (una vencida se seguiría viendo con la app abierta).

## R3. Reemplazo por comercio y clave de comparación

- **Decision**: la compra por confirmar se identifica por `comercioId`. Crear otra para el mismo comercio reemplaza la anterior (FR-012). El cruce con un ticket suelto (FR-013) usa una función pura nueva, `ticketCoincide(compra, ticket)`: normaliza los dos nombres (minúsculas, sin tildes, sin puntuación, espacios colapsados) y exige que el del ticket contenga al de la compra como palabra entera ("coto cicsa" contiene "coto"), y que la fecha del ticket no sea anterior al día de la simulación (FR-013). Como hay una por comercio, nunca hay dos candidatas del mismo comercio; si coinciden varias de comercios distintos (un nombre contenido en otro), gana la más reciente.
- **Rationale**: el comercio del ticket llega como texto libre («COTO C.I.C.S.A.»), y la igualdad exacta no alcanza.

## R4. Confirmar: origen y combinación con el ticket

- **Decision**: «Revisá tu compra» recibe un parámetro `porConfirmar` (su id). Una función pura `borradorDesdePorConfirmar(compra, ticket | null, hoy)` arma el borrador y la lista de avisos («Simulaste $X; el ticket dice $Y», «El ticket dice otro medio»). Al guardar, `confirmarPorConfirmar(id, borrador)` llama a `guardarCompra` con el **id de la compra por confirmar** como id de la compra (`guardarCompra` suma un parámetro opcional `id`), y el slice `porConfirmar` escucha `compraAgregada` y saca la entrada con ese id: una sola acción del store, sin estado intermedio (FR-016). Si `compras` ya tiene ese id, no se agrega otra y solo se saca la entrada. El origen se decide con `origenAlConfirmar(compra, borrador, vinoDelTicket)`:
  - si vino del ticket → `ticket`;
  - si no vino del ticket y el medio y el comercio son los de la compra por confirmar → `excepcion`;
  - en cualquier otro caso → `manual`.
- **Rationale**: `guardarCompra` y la cola de la spec 010 no cambian, y las reglas nuevas quedan en funciones puras con tests (ADR-009). Cuando el ticket no trae medio, el borrador queda con `medioId: null` y `medioSugerido` con el de la simulación. La hoja muestra la sugerencia y habilita «Guardar» recién con un toque (RF-10, FR-008).
- **Alternatives considered**: un modo nuevo con su propio camino de guardado (duplica lógica de `guardarCompra` y de la promo propuesta).

## R5. Navegación de tres tabs

- **Decision**:
  - `(tabs)/` queda con `compras.tsx` (el contenido de `mis-compras.tsx` más las compras por confirmar y las dos acciones), `index.tsx` y `topes.tsx`, en ese orden, con `initialRouteName: "index"`.
  - `comprar.tsx` se borra.
  - `perfil.tsx` sale de `(tabs)` a una ruta de stack `perfil` con `headerNativo`, y se abre desde un avatar en Inicio.
  - `mis-compras.tsx` queda como redirección a `/compras` para que no se rompan los enlaces viejos.
- **Rationale**: Expo Router ordena las tabs según los `Tabs.Screen` declarados, y la ruta inicial se fija con `unstable_settings`. Perfil como stack conserva el back nativo y el gesto de volver (auditoría P1 #6).
- **Alternatives considered**:
  - Cinco tabs con un botón central: suma una tab sin contenido propio.
  - Perfil como cuarta tab: vuelve a dejar un número par, sin centro.

## R6. Foco de color de la tab activa

- **Decision**: la tab activa muestra el ícono en Salvia (`#4A6B53`) sobre una píldora Salvia clara (`#DCE6DD`) de 56×32 pt detrás del ícono, y la etiqueta en Verde Bosque/tinta con peso 600. La inactiva queda como hoy (gris `inkSecondary`). `accessibilityState.selected` ya lo da React Navigation.
- **Rationale**: `DESIGN.md` §2 pide un solo acento (Salvia), y el texto Salvia solo desde 15 px. La etiqueta mide 12 px, así que no puede ir en Salvia. El ícono y la píldora sí, y el par Salvia/Salvia clara supera 3:1 (contraste no textual AA, WCAG 1.4.11). Se verifica en una tarea.
- **Alternatives considered**: la etiqueta en Salvia (rompe la regla de 15 px) o Champán (prohibido sobre fondo claro).

## R7. Barra de estado y márgenes

- **Decision**: con Expo SDK 58, Android es *edge-to-edge* por defecto: la barra de estado es transparente y muestra lo que pinta la app debajo. Por eso alcanza con que la raíz pinte `canvas` debajo del inset superior (ya lo hace `_layout.tsx` con `backgroundColor: colors.canvas`) y que ninguna pantalla pinte otro color en esa franja. En iOS pasa lo mismo. Abajo, `Screen` suma `insets.bottom` solo cuando no hay tab bar (`aboveTabBar`), y la tab bar usa la altura con inset que da React Navigation. Hay que revisar los dos casos que hoy suman el inset dos veces o ninguna, y probar en los tres dispositivos de SC-007.
- **Rationale**: `StatusBar backgroundColor` no tiene efecto con *edge-to-edge*. Lo que manda es el fondo.

## R8. El nombre del usuario

- **Decision**:
  - `perfilInicial.nombre` pasa a `null`: hoy toma `usuario.nombre` («Martín») de `data/fixtures.ts`, y de ahí sale el bug.
  - `DatosPerfil` (`perfil/datos.ts`) suma `guardarNombre(nombre)` y `leerNombre()` sobre `perfiles.nombre_para_mostrar`. La columna ya existe, con RLS de dueño desde la spec 007, así que no hace falta migración.
  - El alta pide el nombre y lo guarda después de crear la cuenta.
  - `leerMedios` también lee el nombre.
  - Inicio y Perfil dejan de usar `?? "Martín"`.
  - Migración nueva: `check (char_length(btrim(nombre_para_mostrar)) <= 40)` sobre `perfiles`, con su test pgTAP (FR-027).
  - Perfil suma la edición del nombre (FR-028) con el mismo `guardarNombre`.
  - El nombre de la demo («Martín») queda solo detrás del escenario de desarrollo (FR-029).
- **Rationale**: no hace falta ninguna tabla nueva. `nombre_para_mostrar` admite `null`, y eso cubre a las cuentas viejas.

## R9. Primera respuesta interactiva

- **Decision**: `primera-respuesta.tsx` muestra los comercios del catálogo (`api.getCatalogoComercios`, los mismos chips agrupados por rubro de la pantalla Comercios actual) y, para el último tocado, `useRecomendacionPara(comercioId, null)`. Los tocados se acumulan en estado local de la pantalla y se guardan al tocar «Seguir», con `confirmarComercios` (que ya existe y manda todo en un solo pedido) o, en US5, en el borrador. `comercios.tsx` sale del onboarding: su lógica de chips pasa a un componente `SelectorComercios`, que reusan la primera respuesta y Perfil.
- **Rationale**: es la misma recomendación del motor que en Inicio (ADR-010), sin un caso especial para el onboarding.

## R10. Cuenta al final (US5)

- **Decision**:
  1. Migración nueva que da `select` a `anon` sobre `bancos`, `categorias` y `promociones` (solo las vigentes, con la misma condición de la policy de `authenticated`), con su policy y su test pgTAP. Son datos públicos de MODO, sin datos de usuarios. La sincronización del corpus (spec 009) ya usa la clave anon del cliente, así que funciona sin sesión sin cambios.
  2. `perfil.borrador: { medios: MedioNuevo[]; comercios: string[]; nombre: string | null; creadoEn: string } | null`, persistido con el perfil (parte opcional de `Persistido`, que se valida por parte). Se descarta al rehidratar si tiene más de 30 días (FR-031).
  3. Un thunk `guardarBorradorEnCuenta()` que, ya con sesión, corre `confirmarMedios(borrador.medios)`, después `confirmarComercios(borrador.comercios)` y después `guardarNombre`, y borra el borrador solo si los tres salieron. La regla de FR-034 se aplica por separado: si la cuenta ya tenía medios, descarta `borrador.medios`; si ya tenía habituales, descarta `borrador.comercios`; y avisa en cada caso.
  4. Los guards cambian: `(onboarding)/_layout.tsx` deja entrar sin sesión a `medios` y `primera-respuesta`, y `(tabs)/_layout.tsx` sigue exigiendo sesión.
  5. Pantalla nueva `(auth)/confirmar-email` cuando `registrar` devuelve `cuenta: null`.
- **Rationale**: reutiliza `confirmarMedios` y `confirmarComercios` tal como están, y el único cambio en Supabase es un permiso de lectura sobre datos públicos.
- **Alternatives considered**:
  - Supabase *anonymous sign-ins* (`signInAnonymously` y después vincular email y contraseña): guarda todo en el servidor desde el principio. Se descarta porque hay que habilitarlo en el proyecto (`enable_anonymous_sign_ins = false` hoy), deja usuarios anónimos huérfanos y convertirlos exige el flujo de verificación del email nuevo. Es más superficie para el mismo resultado.
- **Riesgo**: es la US con más piezas. Va última y puede quedar afuera sin afectar a las otras (spec, Assumptions).

## R11. Pruebas

- **Decision**: Vitest en `apps/mobile`, con `storeDePrueba` y el reloj controlado:
  - slice y selectores de `porConfirmar` (los casos de SC-003, reemplazo, dueño e idempotencia de SC-008);
  - funciones puras `borradorDesdePorConfirmar`, `origenAlConfirmar` y `ticketCoincide`;
  - persistencia de `vuelto.por-confirmar.v1`;
  - `guardarBorradorEnCuenta` con un `DatosPerfil` en memoria;
  - pgTAP para la lectura de `anon` (y que no pueda escribir) y para el largo del nombre.

  Las pantallas se prueban a mano en el simulador de iOS y en Android (quickstart). No hay suite de componentes en el repo y esta spec no la agrega.

## R12. El lector de tickets simulado

- **Decision**: `ticketDeEjemplo` devuelve la fecha de hoy (de `sesion.ahora`) en lugar de `2026-10-14`, y `Escenario` suma `"sin-red"`, que hace fallar el escaneo con el error de conexión. Las dos cosas son para probar FR-013 y el camino sin red.
- **Rationale**: con la fecha fija, en noviembre el ticket cae en octubre y no se puede probar que los topes cambian al confirmar.
