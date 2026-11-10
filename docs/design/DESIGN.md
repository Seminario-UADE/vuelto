# Design System: Vuelto (v7)

> Fuente de verdad para diseñar y generar pantallas de Vuelto (Stitch y la
> app). La v6 (07/11/2026) reemplaza a `DESIGN-v5.md`, y su razonamiento está
> en `direccion-visual-v6.md`. Deriva de `docs/product/marca.md`, de
> `docs/product/requisitos.md` (RF-07, RF-10, RF-19), del flujo de la spec
> 012 y de las skills de diseño del proyecto (`impeccable`, `apple-design`,
> `expo-native-ui`).
> App mobile (iOS/Android, Expo), viewport de referencia 390×844 pt.
>
> **v7 (09/11/2026)**: cambia la estructura, no la paleta. El **claro es el
> modo de referencia** (se diseña y verifica primero en claro). Barra con el
> «+» al centro, comprar en un paso por pantalla y una sola familia de
> rectángulos redondeados en vez de píldoras. Plan y auditoría:
> `plan-rediseno-v7.md`.
>
> **Estado de implementación**: la app implementa la paleta, los dos temas y
> los radios de la v6 (issue #115). La fila de comercios y la lista agrupada
> existen como componentes base (`fila-comercios.tsx`, `lista-agrupada.tsx`)
> y se conectan a Inicio con la spec 012.

## 1. Tema visual y atmósfera

Vuelto se usa **parado en la caja, con apuro y una mano**: en la fila del
súper, bajo tubos fluorescentes, o en la estación de servicio a pleno sol.
Es una herramienta de decisión, no una vidriera de promociones: tranquila,
cálida y seria, como una libreta de cuentas bien llevada.

**Dos luces, una marca.** La app sigue la apariencia del sistema y tiene
dos temas compuestos:
- un **claro** en crema y tinta esmeralda;
- un **oscuro** en bosque profundo y crema.

Ninguno es la inversión mecánica del otro: el oscuro tiene su propia escala
de elevación.

- **Densidad: 5/10 — app diaria, equilibrada.** Una respuesta por pantalla,
  con su razón. El detalle se despliega a pedido.
- **Variación: 3/10 — predecible.** Una columna, alineada a la izquierda,
  igual entre pantallas. La sorpresa no ayuda en la caja.
- **Movimiento: 3/10 — contenido.** Feedback inmediato y transiciones del
  sistema. Nada se mueve solo.

Principio rector: **la cifra primero, la razón al lado, la base siempre.**

**Una sola superficie invertida marca la decisión**:
- en el tema claro, la tarjeta de decisión es bosque oscuro;
- en el oscuro, es crema.

Es la pieza con carácter de la app, y va solo donde hay una decisión.

## 2. Paleta y roles

Los roles son los de `apps/mobile/src/theme.ts`. Cada rol tiene un valor por
tema. Ratios WCAG 2.1 medidos.

| Rol | Claro | Oscuro | Uso | Contraste (claro / oscuro) |
|---|---|---|---|---|
| `canvas` | `#F3EBD6` Crema | `#051F20` Bosque profundo | Fondo de las pantallas | — |
| `surface` | `#EAE1C8` Lino | `#0B2B26` Pino | Hero de Inicio, listas agrupadas, tarjetas | — |
| `surfaceStrong` | `#DFD5B9` Arena | `#163832` Musgo oscuro | Chips, campos, círculos de comercio, fila seleccionada | — |
| `divider` | `#D3C8A8` | `#235347` Helecho | Divisores. Nunca el único borde de un control | decorativo |
| `ink` | `#02110C` Esmeralda negro | `#F3EBD6` Crema | Texto principal e íconos | 16.2 / 14.4 sobre canvas |
| `inkSecondary` | `#4E6656` | `#A3B5A8` Liquen | Texto secundario, bases, metadatos | 5.3 / 8.0 sobre canvas |
| `controlBorder` | `#6A7A70` | `#5E8A70` | Radios, checkboxes, inputs sin seleccionar | 3.8 / 4.4 |
| `accent` | `#1A422F` Oliva | `#8EB69B` Salvia clara | **Único acento**: primario, selección, tab activa, progreso, links | 9.5 / 7.6 |
| `onAccent` | `#F3EBD6` | `#02110C` | Texto e íconos sobre el acento | 9.5 / 8.6 |
| `warning` | `#83591A` | `#E2B65E` | Queda poco, promo de otro día | 5.2 / 9.1 |
| `warningBg` | `#F1DFB4` | `#2B2410` | Fondo de aviso, siempre con `warning` | — |
| `error` | `#8C4843` | `#EE8F84` | Tope agotado, error de lectura | 5.7 / 7.3 |
| `successBg` | `#D9E6D8` | `#1A422F` | Confirmación, píldora de ahorro (con `ink` / Crema) | — |
| `decisionBg` | `#051F20` | `#F3EBD6` | Tarjeta de decisión (superficie invertida) | — |
| `onDecision` | `#F3EBD6` | `#02110C` | Texto sobre la decisión | 14.4 / 16.2 |
| `onDecisionMuted` | `#A3B5A8` | `#4E6656` | Razón y base sobre la decisión | 7.7 / 5.3 |
| `onDecisionAccent` | `#8EB69B` (texto `#02110C`) | `#1A422F` (texto `#F3EBD6`) | El botón «Usar [medio]» dentro de la decisión | 8.6 / 9.5 |

Roles técnicos fuera de la tabla (no son paleta nueva, derivan de los
valores de arriba): `decisionSurface` (campo de monto y pista de barra dentro
de la decisión), `scrim`, `scrimOverlay`, `scrimSurface`, `onScrim` y
`onScrimMuted` (visor de cámara de Escanear, oscuro en los dos temas),
`backdrop` (velo de hojas en web) y `qrColors` (el QR de invitación va oscuro
sobre claro en los dos temas, porque muchos lectores no leen un QR invertido).

Reglas:

- **Un acento.** Oliva en el tema claro y Salvia clara en el oscuro, solo
  para la acción, la selección y el estado activo. Gana fuerza porque se usa
  poco. Champán salió en la v6.
- **En el tema claro, el texto secundario va sobre `canvas` o `surface`.**
  Sobre `surfaceStrong` baja a 4.3:1, y ahí el texto va en `ink`.
- **El color nunca es la única señal.** Todo estado lleva texto o ícono.
- **La superficie invertida, y solo ella, marca la decisión**: la respuesta
  en Inicio con un comercio elegido, Con qué pagar, la primera respuesta del
  onboarding y Gasto en grupo. En ningún otro lado.
- **Sin negro ni blanco puros**, sin degradés, sin brillos, sin
  glassmorphism propio. El único vidrio es el del sistema (tab bar, hojas).
- **Apariencia**: `userInterfaceStyle: "automatic"`. El tema se resuelve una
  vez (`useColorScheme`) y la `StatusBar` acompaña. En código los colores
  van siempre por rol, nunca como hex.
- Verificar los contrastes en los dos temas (`theme.test.ts`).

## 3. Tipografía

- **Hanken Grotesk** en pesos 400, 500, 600 y 700. La jerarquía sale del
  peso y del color.
- **Pendiente de decidir** (`direccion-visual-v6.md`): `impeccable/ios`
  recomienda la fuente del sistema para el cuerpo, y la de marca solo para
  títulos y cifras. Hasta que se decida, sigue Hanken en todo.
- **Montos con cifras tabulares** (`tabular-nums`).

| Nivel | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| display | 40/44, tracking −0.02em | 700 | La cifra de la decisión («Te devuelven ≈$4.900»). Única por pantalla |
| title-lg | 28/32, −0.01em | 700 | Título de pantalla (large title) |
| title-md | 20/26 | 600 | Medio recomendado, títulos de sección |
| body-lg | 17/24 | 400–500 | Texto principal, filas |
| body-md | 15/22 | 400 | Razones, descripciones |
| label | 13/18 | 500–600 | Bases del estimado, metadatos |
| caption | 12/16 | 500 | Mínimo absoluto. Badges |

- **Mínimo 12 pt**, con Dynamic Type: los tamaños escalan con la letra del sistema.
- **Sentence case** siempre. Sin rótulos en mayúsculas encima de los títulos.

## 4. Forma, espacio y elevación

- **Grilla de 4 pt.** Márgenes laterales de 20 pt. Entre secciones, 24 a
  32 pt. Dentro de un grupo, 12 a 16 pt.
- **Radios (v7)**: una sola familia de rectángulos redondeados, como en las
  referencias:
  - tarjetas, listas agrupadas y tarjeta de decisión: **20 pt**;
  - cuadrados de comercio: 16 pt;
  - botones, campos, buscador, chips y teclas: **14 pt** (`radius.control`);
  - filas e íconos en cuadrado: 12 pt;
  - hojas: el radio del sistema;
  - la píldora (999) queda solo para la cápsula de la barra y lo que es un
    círculo (avatares, radios, barras de progreso).
- **Elevación por tono, no por sombra.** En el claro, las superficies se
  separan por color. En el oscuro, **lo elevado es más claro**
  (`canvas` → `surface` → `surfaceStrong`). Se declara una sola cosa: borde
  o sombra, nunca las dos.
- **Nunca una tarjeta dentro de otra.** El hero de Inicio es un fondo
  (`surface` de borde a borde), no una tarjeta.
- **Áreas táctiles de 44×44 pt o más.**

## 5. Componentes

**Navegación (v7)**: una **cápsula flotante propia** (`tab-bar.tsx`), porque
la nativa no admite un botón central destacado.
- En este orden: **Inicio · Compras · ( + ) · Comercios · Perfil**. Inicio es
  la inicial. Topes no es pestaña: se abre desde Inicio («Ver todos») y desde
  Compras.
- El **«+»** es la acción principal (comprar): un círculo de 60 pt en el
  acento, más alto que la cápsula, con la etiqueta accesible «Comprar». Abre
  el flujo de compra; no es una pestaña.
- La activa va en el acento, con el ícono relleno. Rol de pestaña y estado
  seleccionado para el lector de pantalla; 44 pt táctiles; se oculta con el
  teclado.

**Flujo de compra** (pantalla completa, un paso por pantalla):
1. «¿Dónde estás comprando?»: buscador y tus comercios en cuadrados. Tocar
   uno avanza solo.
2. «¿Cuánto vas a pagar?»: la cifra grande y un teclado numérico propio. El
   botón dice «Seguir sin el monto» mientras no haya monto.
3. «Pagá con Galicia»: la tarjeta de decisión sola. «Voy a pagar con
   Galicia» en el pie; «Otras opciones» y «¿Pagan entre varios?» plegadas
   en una lista agrupada.
4. «Pagá con Galicia»: el medio grande en la superficie invertida, para
   mirarlo en la caja. Pie: «Escanear ticket» (principal), «Cargar a mano» y
   «Lo confirmo después». Reemplaza al paso 3: no se vuelve, solo se cierra.
5. «Compra guardada»: «Te van a devolver ≈$6.125» en display y «Te quedan
   ≈$13.800 de tope en Galicia» con su base. Sin barra de avance.

Arriba de cada paso: volver (‹), la barra de avance de 4 segmentos y cerrar
(×), en cuadrados de 44 pt. Entrando a mitad de camino, los pasos anteriores
se ven completos.

**Inicio (v7)**: el saludo y un bloque en la superficie invertida con
«Este mes te devolvieron ≈$6.125» y su base. Sin compras: «Todavía no
registraste compras · Tocá + cuando estés por pagar». Si hay compras por
confirmar, una lista agrupada «Por confirmar». Nada más.

**Tarjeta de decisión** (la superficie invertida). Una por pantalla, nunca más:
- fondo `decisionBg`;
- «Te conviene» en label `onDecisionMuted`;
- el medio en title-md, con su inicial en un círculo `onDecisionAccent`;
- «Te devuelven ≈$4.900» en display;
- **una línea de razón** («20% en supermercados los miércoles · te quedan
  ≈$6.500 de tope») y la base en label;
- el campo de monto opcional;
- **«Usar Galicia»** de ancho completo, en `onDecisionAccent`;
- el link «Ver detalle y otras opciones ›».

**Fila por confirmar (v7)**: en la lista agrupada de Inicio, la inicial del
medio en el acento, «Coto · $24.500», «Con Galicia · hace 2 min» y
«Confirmar ›». Abre el paso 4 del flujo.

**Indicador de tope** (RF-07, obligatorio en cualquier pantalla con topes):
- cifra con **≈** y su base debajo: «≈$6.500 de tope disponible» / «según
  3 compras de noviembre»;
- sin compras, no hay cifra: «Sin compras registradas este mes: todavía no
  podemos estimar cuánto te queda.»;
- **barra** horizontal que termina en un **tramo rayado** (estimado). Sin
  anillos y sin porcentajes sueltos;
- estados: disponible (acento), queda poco, 30 % o menos (`warning` + «Queda
  poco»), agotado (`error` + «Tope agotado»);
- **nunca un total sumado de topes**;
- la cuenta regresiva va como chip: «Los mensuales se reinician en 20 días».

**Listas agrupadas** (últimas compras, historial, medios, Perfil):
- una tarjeta `surface` de 16 pt con filas de 56 a 64 pt y divisores
  `divider`, insetados desde el texto;
- cada fila: ícono de rubro o inicial en un círculo `surfaceStrong`, título
  en body-lg, detalle en label `inkSecondary` y el valor o control a la
  derecha;
- **no** se usan pilas de tarjetas sueltas.

**Botón primario**: rectángulo de 14 pt del `accent`, texto `onAccent` de 17 pt/600, alto
mínimo de 56 pt, ancho completo y **una sola línea** («Usar Galicia»).
**Uno solo por pantalla**, en un pie fijo que reserva su alto. Texto con
verbo y resultado. Nunca «Pagar».

**Botón secundario**: texto del acento sin relleno, o rectángulo de 14 pt con borde
`controlBorder`. Nunca dos botones rellenos juntos.

**Fila de opción** (medio de pago en Revisá): alto de 64 pt o más, radio a la
derecha.
- Seleccionada: fondo `surfaceStrong` y borde de 2 pt del acento.
- Sin seleccionar: radio con borde `controlBorder`.
- La sugerencia («El que elegiste al simular») es una etiqueta y **no**
  selecciona.

**Chips**: rectángulo de 14 pt `surfaceStrong`, texto `ink` de 15 pt/500, 40 pt visibles
y 44 táctiles. Activo: fondo del acento, texto `onAccent` y check. Si se
puede desmarcar, lleva una × de 44 pt táctiles.

**Control segmentado**: el nativo (`@react-native-segmented-control`), con el
`tint` del acento. Para los filtros de Compras y Mensual/Semanal en Topes.

**Badges**: solo si cambian una decisión («Hoy no aplica», «Tope agotado»,
«Sin subir»). Máximo uno por fila. Nada decorativo.

**Iniciales de comercio y banco**: en un círculo `surfaceStrong` con la
letra en `ink`. El medio recomendado o seleccionado va en el acento. **Nunca
colores de marca ni logos.**

**Píldora de ahorro**: «≈$4.900» en `successBg`. Nunca dentro del botón.

**Campos editables**: etiqueta arriba en label `inkSecondary`, valor en
body-lg sobre `surfaceStrong` y lápiz a la derecha. El error va debajo, en
`error`, con qué pasó y cómo seguir.

**Hojas**: las del sistema (page sheet / form sheet), con manija y cerrar de
44 pt. Con una hoja abierta no se ve la tab bar.

**Íconos**: SF Symbols en iOS y Material en Android, detrás de `<Icon>`, de
24 pt. Todo botón de solo ícono lleva etiqueta accesible.

**Estados vacíos**: qué es, por qué está vacío y cómo empezar. Ejemplo de
Inicio sin compras: «Todavía no confirmaste compras. Cuando confirmes la
primera, vas a ver cuánto tope te queda.», sin botón a otra pestaña.

**Carga**: esqueletos con la forma del contenido. **Error**: inline, en
`error` y con una salida.

## 6. Layout

- Una columna, alineada a la izquierda. Grilla de dos columnas solo para
  resúmenes cortos, y una sola columna con `fontScale > 1.2`.
- Las pantallas de nivel superior llevan large title nativo (colapsa al
  scrollear). Las hijas, título inline y back del sistema.
- **Inicio** (de arriba abajo, como las referencias): saludo y fecha; el
  bloque oscuro con «Este mes te devolvieron ≈X», su base y, abajo, Gastaste
  y Compras; «Por confirmar» si hay; «Tus topes» (los primeros tres, con
  barra y base; «Ver todos» abre Topes) y «Últimas compras» (tres; «Ver
  todas» va a Compras).
- **Compras** (pestaña): «Gastaste este mes» con un gráfico de barras por
  tramo de 7 días (el de hoy en el acento), una fila «Te devolvieron ≈X» que
  abre Topes y las compras agrupadas por día. Sin filtros ni badges.
- **Topes** (se abre desde Inicio o Compras): dos datos en cuadros (Te
  devolvieron ≈X con su base; Se reinician en N días) y una tarjeta por
  tope con un anillo decorativo, la cifra con ≈ y, al pie, la base y el
  reinicio. Sin porcentajes ni total sumado.
- **Comercios**: buscador (abre el «+»), tus comercios en cuadrados con un
  cuadrado «Agregar» punteado al final, y «Hoy te conviene»: con qué pagar
  hoy en tus comercios y los más usados, la recomendación sin monto del
  motor.
- **Perfil**: nombre, medios de pago y Contactos.
- Íconos de las filas en cuadrados redondeados (`radius.row`), no círculos;
  estados como «Queda poco» en texto de color, sin badge.
- Orden fijo en las pantallas de decisión: **pregunta → respuesta → razón →
  alternativas → acción**. Las alternativas se ven sin scroll largo.
- Ningún elemento flotante tapa a otro.

## 7. Movimiento e interacción

- Respuesta al toque inmediata (escala 0.98, 100 ms). Háptico leve al elegir
  un comercio, al crear una compra por confirmar y al confirmar una compra.
- Transiciones y hojas del sistema.
- La tarjeta de decisión entra con opacidad y un desplazamiento de 8 pt
  (220 ms, ease-out). La cifra se actualiza en vivo al tipear el monto, con
  un fundido de 150 ms.
- **Nada se mueve solo.** Respetar «reducir movimiento». Cambiar de tema
  sigue al sistema, sin animación propia.

## 8. Voz y textos

Rioplatense, de vos, directo. Frases cortas, y la cifra antes que la
explicación. Sin jerga técnica ni financiera.

| Usar | No usar |
|---|---|
| **tope** | cupo, cupo remanente, capacidad de ahorro, disponibilidad |
| **te devuelven ≈$X** | reintegro directo, reintegro computado, beneficio |
| **te sale ≈$X** | pago neto final |
| **medio de pago** | tarjeta (cuando incluye billeteras) |
| **Te conviene** | Decisión del algoritmo, Mejor opción al momento |
| **por confirmar** (compra simulada, todavía sin pagar) | pendiente (ya significa una compra sin subir) |
| **Ya pagué** | Confirmar pago, Registrar |
| **Revisá tu compra** | Confirmar ticket, Escaneo inteligente verificado |
| **¿Con qué pagaste?** | Elegí el medio utilizado |

- Toda cifra estimada lleva **≈** y su base. No llevan ≈ los montos de
  compra, los topes nominales ni lo que cargó el usuario. Donde no hay
  reintegro se dice en texto («sin promo»), nunca «$0».
- «Te devolvieron ≈$X» va en Topes y en Compras.
- Nunca porcentajes de confianza ni promesas. Sin emojis ni clichés.

## 9. Datos de ejemplo (únicos para todas las pantallas)

Mes en curso: **noviembre de 2026**. «Hoy» es el **miércoles 11/11**, y los
topes mensuales se reinician el 1/12, en 20 días. Usuario: **Martín**. Zona:
CABA. Todas las promos vienen de MODO. «Te devolvieron ≈$15.200» se basa en
9 compras de noviembre.

| Medio | Promo de ejemplo | Tope | Estado del tope |
|---|---|---|---|
| Galicia Visa crédito | 20% en supermercados, miércoles | $10.000 / mes | ≈$6.500 disponible, según 3 compras de noviembre |
| Santander Mastercard crédito | 15% en combustibles, jueves | $8.000 / mes | ≈$2.300 disponible, según 4 compras (queda poco) |
| Provincia Visa débito | 25% en gastronomía, sábados | $5.000 / semana | Sin compras registradas esta semana |
| Macro Visa débito | 15% en farmacias, todos los días | $6.000 / mes | Tope agotado, según 2 compras |

Comercios habituales: Coto, Día, Farmacity, YPF.

Compra de ejemplo: **Coto, miércoles, $24.500**.
- Te conviene Galicia Visa crédito: te devuelven ≈$4.900 y te sale ≈$19.600.
- Por confirmar: «Coto · $24.500 · Pagá con Galicia · hace 2 min».
- El ticket dice «COTO C.I.C.S.A.», $23.870 y no trae el medio de pago.
- Alternativas: Provincia Visa débito (hoy no aplica, la promo es los
  sábados) y Santander Mastercard (sin promo en supermercados).

> Coto es un ejemplo de diseño. En MODO, las promos reales de Coto son los
> lunes y los martes. Si el pitch usa datos reales, la compra tiene que
> caer un día con promo vigente.

Contactos de Martín (ADR-008, nivel 1): **Lucía** y **Mateo**. **Sofía** no
tiene cuenta y se declara a mano en cada grupo. Gasto en grupo: **Cena del
sábado, $41.000, 4 personas**. Que pague Mateo con su Provincia Visa débito:
les devuelven ≈$5.000 y cada uno pone ≈$9.000.

## 9b. Reglas de contactos y grupo (ADR-008)

- De un contacto se muestra el nombre para mostrar, **solo el medio que se
  recomienda usar**, el reintegro estimado de esta compra y la base **en
  palabras**. Nunca su tope, la cantidad de compras, sus compras ni sus
  otros medios.
- Integrante sin cuenta: «no conocemos su tope».
- La pantalla de aceptación dice quién invita, qué se comparte y lo que se
  puede inferir. Tiene dos botones, ninguno preseleccionado.
- Quitar un contacto pide confirmación y dice que se rompe para los dos.
- No hay buscador de usuarios.

Medio sin cobertura (solo en onboarding): Mercado Pago, con la nota
«Todavía no tenemos promos de este medio».

## 10. Prohibido

- Mostrar un tope sin ≈ y sin su base, o porcentajes de tope sueltos.
- Anillos de progreso, sparklines, tarjetas de «número grande + etiqueta +
  estadísticas» y gráficos sin una serie real que mostrar.
- Preseleccionar el medio de pago al registrar un ticket.
- Llamar «pendiente» a la compra por confirmar.
- Mostrar el tope, las compras o los medios no recomendados de un contacto.
- Buscador de usuarios.
- Botones que digan «Pagar». Más de un primario por pantalla.
- Una tab bar o una barra de navegación dibujadas a mano. Una tarjeta dentro
  de otra. Pilas de tarjetas sueltas para contenido de lista.
- Contenido o botones tapados por la tab bar o por el pie.
- Texto menor a 12 pt.
- Negro o blanco puros, degradés, brillos, glow, neón, glassmorphism propio.
- Violetas, azules, rosas, colores de marca de bancos o comercios, y
  cualquier color fuera de la tabla de la sección 2.
- Un tema que sea la inversión mecánica del otro.
- Emojis, Inter, serifas, fechas viejas.
- Campana de notificaciones. Total sumado de topes. Encabezados en
  mayúsculas.
- Medios sin promos en el corpus mostrando topes o reintegros.
- Teclado numérico con letras.
