# Design System: Vuelto

> Fuente de verdad para generar y editar pantallas de Vuelto en Stitch.
> Deriva de `docs/product/marca.md` (paleta), `docs/product/requisitos.md`
> (RF-07, RF-10, RF-19) y de la auditoría `docs/design/auditoria-stitch-v2.md`.
> App mobile (iOS/Android, Expo), viewport de referencia 390×844 pt.

## 1. Tema visual y atmósfera

Vuelto se usa **parado en la caja, con apuro y una mano**. La interfaz es una
herramienta de decisión, no una vidriera de promociones: tranquila, cálida y
seria, como una libreta de cuentas bien llevada. Fondo hueso, tinta verde
bosque, un solo acento salvia.

- **Densidad: 5/10 — app diaria, equilibrada.** Una respuesta por pantalla,
  con su razón; el detalle se despliega a pedido.
- **Variación: 3/10 — predecible.** Layouts de una columna, alineados a la
  izquierda, iguales entre pantallas. La sorpresa no ayuda en la caja.
- **Movimiento: 3/10 — contenido.** Feedback inmediato al tocar y
  transiciones cortas. Nada se mueve solo.

Principio rector: **la cifra primero, la razón al lado, la base siempre.**
Ninguna pantalla muestra "promociones" como fin; muestran qué medio de pago
usar y cuánto tope queda.

**Calma no es vacío.** Cada pantalla tiene una pieza con carácter (la
tarjeta oscura) y detalles que la hacen reconocible: íconos por rubro en
círculos tintados, iniciales de comercio y banco con su color, el ahorro
del mes a la vista, la cuenta regresiva hasta que se reinician los topes,
el ticket dibujado. Lo que se evita es el ruido que no ayuda a decidir
(badges de estado del sistema, rótulos en mayúsculas en cada bloque), no la
personalidad.

## 2. Paleta y roles

Todos los pares de texto cumplen WCAG 2.1 AA (≥4.5:1) sobre su fondo
indicado. Ratios medidos.

| Token | Hex | Rol |
|---|---|---|
| **Blanco Hueso** (canvas) | `#F7F4EB` | Fondo de todas las pantallas. Texto sobre fondos oscuros. |
| **Lino** (surface) | `#EFEBE0` | Relleno de tarjetas y listas agrupadas. |
| **Gris Cálido** (surface-strong) | `#E8E4D8` | Chips, campos, tarjeta seleccionada, filas alternas. |
| **Divisor** | `#DDD8CB` | Líneas divisorias y bordes decorativos. **Nunca** como único borde de un control. |
| **Verde Bosque** (ink) | `#14281D` | Texto principal, íconos, tarjeta de decisión oscura. 14:1 sobre canvas. |
| **Musgo** (ink-secondary) | `#52635A` | Texto secundario, descripciones, metadatos. 5.8:1 canvas / 5.0:1 sobre `#E8E4D8`. |
| **Borde de control** | `#6A7A70` | Bordes de radios, checkboxes, inputs no seleccionados. ≥3.5:1 en fondos claros. |
| **Salvia** (accent) | `#4A6B53` | Único acento: botón primario, selección, progreso, links. Texto salvia solo ≥15px. |
| **Champán** (accent-on-dark) | `#C5A059` | Detalles **solo sobre Verde Bosque** (6.3:1). Nunca sobre fondo claro (2.2:1). |
| **Ocre** (warning text) | `#83591A` | Texto de advertencia: tope casi agotado, promo de otro día. 4.9:1 sobre `#E8E4D8`. |
| **Ocre claro** (warning bg) | `#F3E6C8` | Fondo de badge de advertencia, siempre con texto Ocre. |
| **Óxido** (error) | `#8C4843` | Tope agotado, error de lectura. 5.3:1 sobre `#E8E4D8`. |
| **Salvia clara** (success bg) | `#DCE6DD` | Fondo de confirmación, siempre con texto Verde Bosque. |

Reglas:
- **Un acento.** Salvia es el único color de acción. Champán es decoración
  sobre oscuro, no un segundo acento.
- **Una sola familia de grises, cálida.** No mezclar con grises fríos de
  Tailwind (`slate`, `zinc`, `gray`) ni con `amber-*` / `orange-*`.
- **El color nunca es la única señal.** Todo estado (agotado, hoy no aplica,
  pendiente) lleva texto o ícono además del color.
- **Sin negro puro**, sin degradés, sin brillos, sin sombras oscuras.
- **Una superficie oscura por pantalla, y casi todas la tienen**: la
  tarjeta de decisión en Recomendación y Grupo, la acción rápida en Inicio,
  el resumen del mes en Topes. Es el ancla visual de la pantalla.

## 3. Tipografía

- **Familia única: Hanken Grotesk** (títulos, cuerpo, etiquetas). Pesos 400,
  500, 600 y 700; la jerarquía sale del peso y el color, no del tamaño.
- **Montos siempre con cifras tabulares** (`tabular-nums`), para que no
  "bailen" al tipear ni desalineen columnas.

| Nivel | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| display | 40/44 px, tracking −0.02em | 700 | Monto en Nueva Compra, monto de la decisión |
| title-lg | 28/32 px, −0.01em | 700 | Título de pantalla |
| title-md | 20/26 px | 600 | Nombre del medio recomendado, títulos de tarjeta |
| body-lg | 17/24 px | 400–500 | Texto principal, filas de lista |
| body-md | 15/22 px | 400 | Descripciones, razones |
| label | 13/18 px | 500–600 | Etiquetas, metadatos, base del estimado |
| caption | 12/16 px | 500 | Mínimo absoluto. Badges. |

- **Mínimo 12 px.** Nada informativo por debajo.
- **Sentence case** en títulos, secciones y botones. Mayúsculas solo en
  badges de una o dos palabras, con tracking +0.04em. No usar rótulos en
  mayúsculas ("TOPES Y DISPONIBILIDAD") como encabezado de cada bloque.
- Prohibidas: Inter, Roboto, serifas.

## 4. Forma, espacio y elevación

- **Grilla de 4 pt.** Márgenes laterales 20 pt. Separación entre secciones
  24–32 pt; dentro de una tarjeta 12–16 pt.
- **Radios:** tarjetas 20 pt, filas y campos 14 pt, chips y botones 999 (píldora),
  badges 8 pt. Radio interior = radio exterior − padding.
- **Elevación casi nula.** Las tarjetas se separan por color de superficie
  (Lino sobre Hueso), no por sombra. Única sombra permitida: elementos
  flotantes (tab bar, sheet) con `0 8px 24px rgba(20,40,29,0.08)`.
- **Áreas táctiles ≥ 44×44 pt**, aunque el visual sea más chico.

## 5. Componentes

**Tarjeta de decisión** (la pieza central del producto)
Fondo Verde Bosque, texto Blanco Hueso, detalles Champán. Contiene, en este
orden: etiqueta "Te conviene", nombre del medio (title-md), la cifra
"Te devuelven ≈$4.900" (display) y **una línea de razón** ("20% en
supermercados los miércoles · te quedan ≈$6.500 de tope"). Debajo, la base
del estimado en label. Una por pantalla, nunca más.

**Indicador de tope** (RF-07 — obligatorio en cualquier pantalla con topes)
- Cifra siempre con **≈** y su base en la línea de abajo:
  "≈$6.500 de tope disponible" / "según 3 compras de octubre".
- Sin compras registradas: no mostrar cifra. Texto: "Sin compras
  registradas este mes: todavía no podemos estimar cuánto te queda."
- La barra de progreso termina en un **tramo rayado** (no sólido) para marcar
  que el valor es estimado. Nunca porcentajes sueltos ("74% libre").
- Estados: disponible (Salvia), casi agotado ≤20% (Ocre + texto "Queda
  poco"), agotado (Óxido + texto "Tope agotado").

**Botón primario**
Píldora Salvia `#4A6B53`, texto Blanco Hueso 17 px/600, alto 56 pt, ancho
completo. **Uno solo por pantalla**, fijo encima de la tab bar o al pie del
sheet. Al tocar: escala 0.98 y vuelve. Texto con verbo y resultado
("Confirmar compra", "Ver con qué pagar"). Nunca "Pagar": Vuelto no procesa
pagos.

**Botón secundario**: texto Salvia sin relleno, o píldora con borde
`#6A7A70`. Nunca dos botones rellenos juntos.

**Fila de medio de pago / opción**
Fondo Lino, radio 14 pt, alto ≥ 64 pt. Ícono en círculo de `#E8E4D8`,
nombre en body-lg/600, detalle en label Musgo, control a la derecha.
Seleccionada: fondo `#E8E4D8` + borde 2 pt Salvia + radio relleno.
No seleccionada: radio con borde `#6A7A70` (nunca `#DDD8CB`).

**Chips** (comercio, rubro, montos rápidos)
Píldora `#E8E4D8`, texto Verde Bosque 15 px/500, alto ≥ 40 pt visual / 44 táctil.
Activo: fondo Verde Bosque, texto Blanco Hueso, check.

**Badges**: solo cuando cambian una decisión ("Mejor opción", "Hoy no
aplica", "Tope agotado"). Máximo uno por fila. Nada de badges decorativos
("Activo", "Cálculo dinámico", "1-Tap rápido", "Sincronizado").

**Elementos de personalidad** (sí van, y son los que distinguen a Vuelto):
- *Íconos por rubro* en círculo Gris Cálido `#E8E4D8` con ícono Verde
  Bosque, siempre el mismo ícono para el mismo rubro. Sin tintes de color
  por rubro.
- *Iniciales de comercio y banco* en círculo **neutro**: fondo `#E8E4D8`,
  letra Verde Bosque. El medio recomendado o seleccionado va en Salvia con
  letra Blanco Hueso; sobre la tarjeta oscura, círculo Champán con letra
  Verde Bosque. **Nunca colores de marca de bancos o comercios** (rojo,
  naranja, azul…): la identidad la da la letra, no el color. Nunca logos
  reales.
- *El color comunica, no decora*: Salvia = recomendado/activo, Ocre =
  queda poco, Óxido = agotado/error, Champán = detalle sobre oscuro. Nada
  más lleva color.
- *Píldora de ahorro*: "≈$4.900" dentro del botón primario o junto al
  título, en Salvia clara con texto Verde Bosque.
- *Cuenta regresiva*: "Se reinician en 17 días" como chip junto a los topes.
- *Ticket dibujado*: miniatura ilustrada (líneas) del ticket escaneado.
- *Consejo del día* (opcional, uno por pantalla): una frase que ayuda a
  decidir con datos del usuario ("Si vas al súper, esperá al miércoles:
  con Galicia te quedan ≈$6.500 de tope"). Nunca una promo genérica.

**Campos editables** (ticket): etiqueta arriba en label Musgo, valor en
body-lg, ícono de lápiz a la derecha. Error debajo en Óxido con qué pasó y
cómo seguir.

**Bottom sheet**: fondo Blanco Hueso, radio superior 28 pt, manija
36×5 pt `#DDD8CB`, cerrar con "X" de 44 pt. Cuando hay sheet abierto, la
tab bar no se ve.

**Tab bar** (idéntica en todas las pantallas)
Cuatro ítems, en este orden y con estos nombres: **Inicio · Comprar ·
Topes · Perfil**. Fondo Blanco Hueso con la sombra flotante, ítem activo en
Verde Bosque con ícono relleno, inactivos en Musgo. Sin botón central
elevado. "Grupo" no es una pestaña: se entra desde Comprar ("¿Pagan entre
varios?"). El contenido scrollea por **encima** de la tab bar: padding
inferior = alto de la tab bar + safe area. Nada queda tapado.

**Íconos**: Material Symbols Rounded, peso 400, 24 pt. Todo botón de solo
ícono lleva etiqueta accesible.

**Estados vacíos**: qué es + por qué está vacío + cómo empezar, con un
botón. Ej. Inicio sin compras: "Todavía no registraste compras. Cuando
registres la primera, vas a ver cuánto tope te queda." → "Registrar compra".

**Carga**: esqueletos con la forma del contenido. Sin spinners circulares.

**Error**: inline, en Óxido, con salida. Ej. ticket ilegible: "No pudimos
leer el ticket. Probá con más luz o cargá el monto a mano."

## 6. Layout

- Una columna, alineada a la izquierda. Sin grillas de 3 columnas iguales.
  Grilla de 2 columnas permitida solo para resúmenes de topes cortos.
- Orden de lectura fijo en pantallas de decisión: **pregunta → respuesta →
  razón → alternativas → acción**.
- Las alternativas descartadas son visibles sin scroll largo, como lista
  compacta con su motivo ("Provincia Visa débito · hoy no aplica, la promo es
  los sábados").
- Título de pantalla a la izquierda, acción secundaria (cerrar, info) a la
  derecha. Flecha de volver a la izquierda en pantallas hijas.
- Ningún elemento flotante tapa a otro. Máximo una capa flotante además de la
  tab bar.

## 7. Movimiento e interacción

- Respuesta al toque inmediata (escala 0.98, 100 ms). Háptico leve al
  confirmar una compra y al elegir un medio.
- Transiciones de pantalla nativas; sheets con resorte (rigidez 300,
  amortiguación 30). Sin rebote exagerado.
- La cifra recomendada se actualiza en vivo al tipear el monto, con un
  cruce de opacidad corto (150 ms), sin contadores animados.
- **Nada se mueve solo**: sin pulsos, brillos, shimmer decorativo ni loops.
  Respetar "reducir movimiento" del sistema.
- Animar solo `transform` y `opacity`.

## 8. Voz y textos

Rioplatense, de vos, directo. Frases cortas; la cifra antes que la
explicación. Sin jerga técnica ni financiera.

Glosario fijo:
| Usar | No usar |
|---|---|
| **tope** | cupo, cupo remanente, capacidad de ahorro, disponibilidad |
| **te devuelven ≈$X** | reintegro directo, reintegro computado, beneficio |
| **te sale ≈$X** | pago neto final |
| **medio de pago** | tarjeta (cuando incluye billeteras) |
| **Te conviene** | Decisión del algoritmo, Mejor opción al momento |
| **Revisá tu compra** | Confirmar ticket, Escaneo inteligente verificado |
| **¿Con qué pagaste?** | Elegí el medio utilizado |

- Toda cifra estimada lleva **≈** y su base.
- Nunca porcentajes de confianza ("OCR 98%") ni promesas ("verificado",
  "óptimo garantizado", "+42% de retorno").
- Sin emojis. Sin clichés ("inteligente", "potenciá", "maximizá").

## 9. Datos de ejemplo (únicos para todas las pantallas)

Mes en curso: **octubre**. Usuario: **Martín**. Zona: CABA. Todas las promos
vienen de MODO.

Medios declarados:
| Medio | Promo de ejemplo | Tope | Estado del tope |
|---|---|---|---|
| Galicia Visa crédito | 20% en supermercados, miércoles | $10.000 / mes | ≈$6.500 disponible, según 3 compras de octubre |
| Santander Mastercard crédito | 15% en combustibles, jueves | $8.000 / mes | ≈$2.300 disponible, según 4 compras (queda poco) |
| Provincia Visa débito | 25% en gastronomía, sábados | $5.000 / semana | Sin compras registradas esta semana |
| Macro Visa débito | 15% en farmacias, todos los días | $6.000 / mes | Tope agotado, según 2 compras |

Compra de ejemplo: **Coto, miércoles, $24.500**.
- Te conviene: Galicia Visa crédito → te devuelven ≈$4.900 → te sale ≈$19.600.
- Después de la compra: ≈$1.600 de tope disponible en Galicia.
- Alternativas: Provincia Visa débito (hoy no aplica, la promo es los
  sábados); Santander Mastercard (sin promo en supermercados).

Contactos de Martín (ADR-008, nivel 1): **Lucía** y **Mateo**, vinculados
por invitación. **Sofía** no tiene cuenta: se declara a mano en cada grupo.

Gasto en grupo: **Cena del sábado, $41.000, 4 personas** (Martín, Lucía,
Mateo, Sofía).
- Que pague Mateo con su Provincia Visa débito → les devuelven ≈$5.000,
  "según las compras que registró Mateo" → cada uno pone ≈$9.000.
- Lucía: "≈$0 · no tiene promo de gastronomía hoy" (sin nombrar sus medios)
  y "Lucía no tiene compras registradas: sin base".
- Sofía: "Sin cuenta: no conocemos su tope".
- Martín (vos): Santander Mastercard crédito, sin promo en gastronomía (los
  medios propios sí se muestran).

Invitación de ejemplo: la genera Martín; link `vuelto.app/i/…` + QR,
"Vence en 24 h · sirve una sola vez".

## 9b. Reglas de contactos y grupo (ADR-008)

- De un contacto se muestra: nombre para mostrar, **solo el medio que se
  recomienda usar**, el reintegro estimado de esta compra y la base **en
  palabras** ("según las compras que registró Ana" / "Ana no tiene compras
  registradas: sin base"). Nunca su tope, la cantidad de compras, sus
  compras ni sus otros medios.
- Integrante sin cuenta: se dice "no conocemos su tope".
- La pantalla de aceptación dice quién invita, qué se comparte (tabla del
  ADR) y lo que se puede inferir ("puede deducir cuánto reintegro te queda
  en una promo a partir de la recomendación"). Dos botones: aceptar y no
  ahora; ninguno preseleccionado por defecto ni con trampa visual.
- Quitar un contacto pide confirmación y dice que se rompe para los dos.
- No hay buscador de usuarios en ninguna pantalla.

Medio sin cobertura (solo en onboarding): Mercado Pago, con la nota
"Todavía no tenemos promos de este medio".

## 10. Prohibido

- Mostrar un tope sin ≈ y sin su base, o porcentajes de tope sueltos.
- Preseleccionar el medio de pago al registrar un ticket. Si el ticket no lo
  trae, ningún medio marcado y se pregunta "¿Con qué pagaste?".
- Mostrar el tope, la cantidad de compras, las compras o los medios no
  recomendados de un contacto (ADR-008 §3).
- Buscador de usuarios por nombre o email.
- Estados de cobro ("Pendiente", "Recibe de…") en gasto en grupo: la
  división se muestra, no se gestiona.
- Planificación entre varios días ("estrategia semanal") en el MVP.
- Botones que digan "Pagar".
- Más de un botón primario por pantalla; dos CTAs flotantes apilados.
- Contenido o botones tapados por la tab bar.
- Texto menor a 12 px; texto secundario en `#65786C` u ocre `#B37D28`.
- Champán sobre fondo claro.
- Grises fríos, `amber-*`/`orange-*` de Tailwind, negro puro, degradés,
  brillos, sombras oscuras, glassmorphism.
- Cualquier color fuera de la tabla de la sección 2: colores de marca de
  bancos o comercios, azules, rojos, rosas, celestes, fondos pastel.
- Emojis, Inter, serifas, fechas viejas ("Mayo 2024").
- Medios sin promos en el corpus (Mercado Pago) mostrando topes o reintegros.
- Badges decorativos y rótulos en mayúsculas encabezando cada bloque.
- Teclado numérico con letras (ABC, DEF).
