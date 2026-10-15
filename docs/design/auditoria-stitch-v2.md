# Auditoría UX — Mockup Stitch v2

Proyecto Stitch: "Remix of Vuelto App Mobile Design v2" (`13811575894831856134`).
Fecha: 2026-10-13. Etapa: refinamiento de mockup, antes de pasar a Expo.

Método: crítica de diseño + revisión de accesibilidad (WCAG 2.1 AA) + revisión
de copy, cruzado contra `docs/product/requisitos.md`, `alcance-mvp.md` y
`marca.md`. Contrastes medidos sobre los hex reales del HTML exportado.

| # | Pantalla | ID |
|---|---|---|
| 1 | Inicio | `475b6e6ea86d4c0e84adc9b74c97b0b9` |
| 2 | Recomendación (Árbol + Simulador) | `4ceebb420474421b917ab37d4b68cc73` |
| 3 | Registro de Ticket | `7ee983364b594759b5013e10052979d2` |
| 4 | Nueva Compra (Modo Express) | `89cdcf7be3904eff8ab8bcccd0a312d6` |
| 5 | Topes por Rubros | `6345bbd4d95f40539aae39c48d964eea` |
| 6 | Onboarding — medios de pago | `7295ba11421c47f3a32013be5465aee0` |
| 7 | Gasto en Grupo | `62844ccc15ca4d6b8dde0c6725b24aba` |

## Impresión general

La identidad visual está bien resuelta y es coherente con `marca.md` (Verde
Bosque, Blanco Hueso, Salvia, Champán, Hanken Grotesk). Nueva Compra (4) y
Onboarding (6) son las pantallas más sólidas. El problema principal no es
visual: **varias pantallas contradicen requisitos del producto** y muestran
precisión que el motor no puede respaldar. Después de eso, el segundo
problema es **densidad**: Recomendación (2) y Grupo (7) le piden demasiada
lectura a alguien que está en la caja.

## 1. Choques con requisitos (bloqueantes)

| # | Pantalla | Hallazgo | Requisito | Corrección |
|---|---|---|---|---|
| R1 | 1, 2, 3, 5 | Topes como cifra exacta sin base: "$6.000 libre p/reintegro", "$18.500 LIBRE", "Tope restante disponible: $18.500", "74% libre". | RF-07 | Formato único: "≈$18.500 libres · según 4 compras". Con 0 compras: "Sin compras registradas: no podemos estimar el tope". Porcentajes y barras también marcadas como estimado (barra con borde punteado o leyenda "estimado"). |
| R2 | 3 | El medio de pago viene preseleccionado ("Galicia Visa Crédito · ÓPTIMO", radio marcado). En el registro de un ticket el medio es un **hecho** (con qué pagó), no una recomendación. | RF-10 | Si el ticket trae el medio, mostrarlo como "Detectado en el ticket: Visa ****1234" con opción a corregir. Si no lo trae, **ningún radio marcado** y la pregunta "¿Con qué pagaste?". Sacar el badge ÓPTIMO de esta pantalla. |
| R3 | 3 | "Guardar compra" con el texto "Vas a registrar $3.675 que se descuentan de tu tope" — correcto en espíritu, pero la pantalla no deja claro que **hasta confirmar no se toca el tope**. | RF-09, RF-11 | Mantener el aviso, cambiar el CTA a "Confirmar compra" y mostrar el tope antes/después como estimado. |
| R4 | 7 | "Lucía · Galicia Visa — Tope ok". El nivel 0 de grupo no usa topes de otros integrantes. | RF-19 | Quitar "Tope ok" y cualquier referencia al tope ajeno. Si hace falta, aclarar "Sin considerar topes de los demás". |
| R5 | 7 | La pantalla gira en torno a la gestión del gasto (estados "Pendiente", "Recibe de Mateo y Sofía", toggle "Beneficio para Lucía"). El producto es **quién paga**, el registro es andamiaje mínimo. | `alcance-mvp.md` §Gasto en grupo, RF-20 | Reordenar: arriba la decisión ("Que pague Lucía con Galicia Visa · ahorran ≈$6.300"), abajo la división autogenerada. Sacar los estados de cobro pendiente. |
| R6 | 1, 6 | Mercado Pago aparece con tope y reintegro (Inicio) y como medio sugerido en el onboarding. El MVP solo ingesta MODO; Mercado Pago no tiene promos en el corpus. | `alcance-mvp.md` §Billetera | Onboarding puede listarlo, pero con aviso "Todavía no tenemos promos de este medio". En Inicio no puede mostrar tope. Reemplazar el ejemplo por un medio con promos MODO. |
| R7 | 2 | "Estrategia de flujo semanal" (guardar el tope de Cuenta DNI para el sábado) y "Maximizás el retorno un 42% más". Es planificación multi-compra; ningún RF la pide y el 42% es una precisión que el motor no calcula. | RF-03/04 (recomendación por compra) | Sacar del MVP o bajarlo a una línea informativa: "Ojo: el sábado Cuenta DNI da 35% en carnicerías; si usás Galicia hoy, conservás ese tope". Sin porcentaje inventado. |
| R8 | 3 | "OCR 98%" y "Escaneo inteligente verificado". El extractor es Gemini (no OCR) y no hay métrica de confianza por ticket; "verificado" promete algo que nadie verificó. | ADR-006, RNF-09 | Reemplazar por "Revisá los datos" + campos editables. Sin porcentaje. |

## 2. Usabilidad

| Hallazgo | Severidad | Recomendación |
|---|---|---|
| La barra de navegación inferior tapa contenido y CTAs en 1, 2, 3 y 7 (en 2 tapa "Alternativas evaluadas", en 3 pisa el borde de "Guardar compra"). | 🔴 | Padding inferior del scroll = alto de la tab bar + safe area. En 2 y 3 el CTA va fijo por encima de la tab bar, o la tab bar se oculta en flujos modales. |
| En 2 hay dos CTAs fijos apilados ("Pagar con Galicia Visa" + "Ver calendario…") más la tab bar: tres capas flotantes. | 🔴 | Un solo CTA primario. "Ver calendario" pasa a link dentro del contenido. |
| "Pagar con Galicia Visa" sugiere que la app paga. Vuelto no procesa pagos. | 🟡 | "Listo, voy a pagar con Galicia Visa" o "Usar Galicia Visa" → lleva a registrar la compra. |
| Recomendación (2): la respuesta ("Galicia Visa crédito") está bien arriba, pero el "por qué" no aparece hasta la mitad. Las alternativas descartadas quedan debajo del pliegue y tapadas. | 🟡 | Debajo del medio recomendado, 1–2 líneas de razón: "15% en supermercados los miércoles · te queda tope". Alternativas como lista compacta visible ("Cuenta DNI: $0 hoy, la promo es los sábados"). |
| Inicio: la tarjeta "¿Vas a pagar ahora?" ofrece 4 rubros fijos; el MVP cubre 13 categorías. | 🟡 | Rubros frecuentes del usuario + "Otro". O bien entrar directo por comercio/monto como en 4. |
| Hay dos entradas al flujo de compra con lógica distinta (rubros en Inicio vs. comercio + monto en Nueva Compra). | 🟡 | Unificar: Inicio lleva a Nueva Compra con el rubro precargado. |
| Nueva Compra: teclado numérico custom con letras ABC/DEF (calco del teclado del teléfono, ruido en un monto). | 🟢 | Teclado solo numérico, sin letras; "00" está bien. |
| Onboarding: no hay forma de agregar un medio que no está en la lista. | 🟢 | "+ Agregar otro medio" al final (ya existe el patrón en 3). |
| No hay estados vacíos/borde diseñados: sin compras, tope agotado, sin promo para este comercio, ticket ilegible. | 🟡 | Diseñar al menos: Inicio sin compras, Recomendación "ningún medio tiene promo hoy", Ticket "no pudimos leer el ticket". |

## 3. Jerarquía visual

- **Lo primero que se ve:** en 1 la tarjeta oscura "¿Vas a pagar ahora?" (correcto, es la acción principal); en 2 la tarjeta oscura con el medio recomendado (correcto); en 5 el resumen "Ahorro capturado / Cupo remanente" (correcto).
- **Problema común:** cada pantalla tiene 3–5 bloques con el mismo peso (eyebrow en mayúsculas + tarjeta + badge). La lectura salta en vez de fluir. En 2 compiten la tarjeta principal, la línea de tiempo, el simulador y dos CTAs.
- **Eyebrows en mayúsculas en todas partes** ("TOPES Y DISPONIBILIDAD", "DECISIÓN DEL ALGORITMO", "DIVISIÓN JUSTA Y TRANSFERENCIAS", "COMERCIO DETECTADO"…). Cuando todo es un rótulo, nada lo es. Dejarlas solo para separar secciones y pasar el resto a sentence case.
- **Badges en exceso:** Activo, Finde, Jueves, ACTIVO, 1-Tap rápido, ÓPTIMO, CÁLCULO DINÁMICO, 3 pasos optimizados, EN GRUPO, Pendiente. Quedarse con los que cambian una decisión (ÓPTIMO en recomendación, "Hoy no aplica").

## 4. Consistencia

| Elemento | Inconsistencia | Recomendación |
|---|---|---|
| Datos de ejemplo | Galicia Visa: en 1 tiene tope mensual $8.000 y $6.000 libres; en 2 y 5 el tope de supermercado es $25.000 con $18.500 libres. El mismo medio, dos topes. | Un set de datos ficticios único para todas las pantallas (va al `DESIGN.md`). |
| Concepto "tope" | Se usa tope, cupo, cupo remanente, capacidad de ahorro, disponibilidad, "libre p/reintegro". | Un solo término: **tope**. "Te quedan ≈$X de tope". |
| Naming del medio | "Galicia Visa", "Galicia Visa crédito", "Galicia Visa Crédito", "Galicia Visa Signature". | Un formato: "Galicia Visa crédito". |
| Tab bar | El 2º ítem es "Comprar" en 1–5 y "Grupo" en 7; el ícono central aparece vacío en 2, 3, 5, 7; en 4 no es un botón elevado y en 5 sí. | Una sola tab bar con ítems fijos. Grupo entra desde Comprar ("¿Pagan entre varios?"). |
| Acento secundario | Champán (#C5A059), ámbar (#B37D28), naranja (Combustible en 5) y amber-100/700 de Tailwind. | Marca define un solo acento secundario (Champán). Ámbar solo como color semántico de "atención" y con contraste corregido. |
| Fecha | "Mayo 2024" en 1 y 5. | Fecha relativa al presente o "Octubre". |
| Grises | #65786C, #66786D, #627568; #E8E4D8, #EAE6DB, #E7E2D6; #DDD8CB, #DCD7CA. | Consolidar a tokens únicos. |

## 5. Accesibilidad (WCAG 2.1 AA)

**Resumen:** 4 críticos · 4 mayores · 2 menores.

### Contraste (medido)

| Elemento | Texto | Fondo | Ratio | Req. | ¿Pasa? |
|---|---|---|---|---|---|
| Texto principal | #14281D | #F7F4EB | 14.13 | 4.5 | ✅ |
| Texto secundario sobre fondo | #65786C | #F7F4EB | 4.28 | 4.5 | ❌ (por poco) |
| Texto secundario sobre tarjeta | #65786C | #E8E4D8 | 3.71 | 4.5 | ❌ |
| Ámbar ("reservado sáb", "SÁBADO PRÓXIMO", "60% libre") sobre tarjeta | #B37D28 | #E8E4D8 | 2.81 | 4.5 | ❌ |
| Ámbar sobre fondo | #B37D28 | #F7F4EB | 3.25 | 4.5 | ❌ |
| Champán sobre Blanco Hueso | #C5A059 | #F7F4EB | 2.23 | 3.0 | ❌ (no usar para texto en claro) |
| Champán sobre Verde Bosque | #C5A059 | #14281D | 6.33 | 4.5 | ✅ |
| Salvia sobre tarjeta | #4A6B53 | #E8E4D8 | 4.69 | 4.5 | ✅ |
| Blanco Hueso sobre botón Salvia | #F7F4EB | #4A6B53 | 5.43 | 4.5 | ✅ |
| Borde de radios / tarjetas | #DDD8CB | #F7F4EB | 1.29 | 3.0 | ❌ (1.4.11) |

### Hallazgos

| # | Hallazgo | Criterio | Sev. | Corrección |
|---|---|---|---|---|
| A1 | Texto secundario #65786C no llega a 4.5 en ningún fondo; es el gris de casi todas las descripciones. | 1.4.3 | 🔴 | Oscurecer a ~#55665B (≥4.5 sobre #E8E4D8). |
| A2 | Ámbar como color de texto no pasa en ningún fondo claro. | 1.4.3 | 🔴 | Ámbar oscuro (~#8A5E17) para texto; el ámbar actual solo para fondos/íconos grandes. |
| A3 | Tamaños de texto de 7.5px, 9px, 10px y 10.5px (badges, letras del teclado, subtítulos de topes). | 1.4.4 / legibilidad | 🔴 | Mínimo 12px para texto informativo, 11px solo para badges en mayúsculas. Eliminar las letras del teclado. |
| A4 | Radios no seleccionados y bordes de tarjeta a 1.29:1 — el estado "no seleccionado" casi no se ve. | 1.4.11 | 🔴 | Borde de radio ≥3:1 (ej. #8A9A8F). |
| A5 | Estado "pendiente"/"agotado"/"activo" comunicado solo por color de badge en varias tarjetas. | 1.4.1 | 🟡 | Siempre con texto o ícono, no solo color (la mayoría ya tiene texto; revisar barras de progreso). |
| A6 | Chips de rubro, "+$1.000", "Editar", cerrar (X) en 3: algunos por debajo de 44×44pt. | 2.5.5 | 🟡 | Área táctil mínima 44pt aunque el visual sea menor. |
| A7 | Íconos Material Symbols sin etiqueta (campana, info, flecha atrás). | 1.1.1 / 4.1.2 | 🟡 | En Expo: `accessibilityLabel` en todos los botones de solo ícono. |
| A8 | Montos con tipografía proporcional: las cifras cambian de ancho al tipear en 4 y en las listas no alinean. | Legibilidad | 🟡 | `fontVariant: ['tabular-nums']` en todos los montos. |
| A9 | Emoji 👋 en el saludo. | — | 🟢 | Quitar o reemplazar; lectores de pantalla lo anuncian. |
| A10 | Contenido tapado por la tab bar (ver Usabilidad). | 1.4.10 / 2.4.11 | 🟢 | Mismo fix que arriba. |

## 6. Copy

Voz propuesta: rioplatense, directa, de vos, sin jerga técnica ni financiera.
El usuario está en la caja, con apuro: frases cortas, la cifra primero.

| Pantalla | Actual | Propuesto | Por qué |
|---|---|---|---|
| 2 | Simulador de Estrategia | Con qué pagar | Dice qué hace la pantalla. |
| 2 | DECISIÓN DEL ALGORITMO | Te conviene | Habla del usuario, no del sistema. |
| 2 | Reintegro directo -$3.675 | Te devuelven ≈$3.675 | Lenguaje cotidiano; el signo "−" confunde (es plata a favor). |
| 2 | Pago neto final $20.825 | Te sale ≈$20.825 | Ídem. |
| 2 | Pagar con Galicia Visa | Usar Galicia Visa | La app no paga. |
| 1 | ¿Vas a pagar ahora? / Elegí el rubro para ver tu mejor tarjeta | ¿Dónde estás comprando? | Una sola pregunta; "mejor tarjeta" excluye billeteras. |
| 1 | libre p/reintegro | de tope disponible (≈, según N compras) | Abreviatura y RF-07. |
| 1 | Sincronizado | (quitar, o solo mostrar si falla) | No aporta cuando todo anda bien. |
| 3 | Confirmar Ticket / Escaneo inteligente verificado | Revisá tu compra | Nadie verificó; pedí la revisión. |
| 3 | ELEGÍ EL MEDIO UTILIZADO | ¿Con qué pagaste? | Pregunta directa (RF-10). |
| 3 | + $3.675 reintegro computado | Te devuelven ≈$3.675 | "Computado" es jerga. |
| 3 | Guardar compra | Confirmar compra | Refuerza que recién ahí se toca el tope. |
| 4 | Modo Express en Caja | Nueva compra | "Modo Express" no le dice nada al usuario. |
| 4 | MEJOR OPCIÓN AL MOMENTO | Por ahora te conviene | Más natural; se actualiza con el monto. |
| 4 | Ver recomendación y pagar | Ver con qué pagar | Ídem "la app no paga". |
| 5 | Topes y Cupos / Ahorro capturado / Cupo remanente / Capacidad de ahorro mensual | Tus topes / Ahorraste ≈$14.250 / Te quedan ≈$20.900 de tope | Un solo término (tope), verbos en vez de sustantivos. |
| 5 | Tip Vuelto: … | (mantener, sin el "Tip Vuelto:") | El contenido es bueno; el rótulo sobra. |
| 7 | DIVISIÓN JUSTA Y TRANSFERENCIAS / Cálculo transparente | Cómo dividen | "Justa" y "transparente" son autoelogio. |
| 7 | Repartir reintegro / Beneficio para Lucía | Dividir el ahorro / Que el ahorro quede para Lucía | Más claro qué cambia. |

Términos a fijar en todo el producto: **tope** (no cupo), **reintegro** (no
beneficio/ahorro capturado), **medio de pago** (no tarjeta, porque incluye
billeteras), **≈** delante de toda cifra estimada.

## Lo que funciona

- Nueva Compra (4): comercio → monto → recomendación en vivo, todo en una pantalla. Es el flujo de caja correcto.
- La tarjeta oscura de recomendación (2) responde la pregunta del producto en el primer vistazo.
- El aviso "Vas a registrar $3.675 que se descuentan de tu tope" (3) es exactamente el tipo de transparencia que pide el producto.
- Onboarding (6): una pregunta, una lista, un CTA. Limpio.
- Paleta y tipografía alineadas con `marca.md`; contraste del texto principal excelente (14:1).

## Prioridades

1. **Topes como estimado con base (R1) y medio de pago no inferido en el ticket (R2).** Son requisitos M; sin esto las pantallas no se pueden implementar tal cual.
2. **Recortar Recomendación (2) y Grupo (7)** a la decisión + su razón (R5, R7, densidad). Un CTA, alternativas visibles, sin estrategia semanal.
3. **Tokens de color y tipografía accesibles** (A1–A4, A8): gris secundario, ámbar de texto, mínimo 12px, tabular-nums. Va directo al `DESIGN.md`.
4. **Copy unificado** (tabla de la sección 6) y set de datos ficticios único.
5. **Estados vacíos y de error** para Inicio, Recomendación y Ticket.

Siguiente paso: volcar las prioridades 1, 3 y 4 en un `DESIGN.md` (skill
`stitch-design-taste`) y aplicarlo al proyecto Stitch; 2 y 5 se corrigen con
`edit_screens` pantalla por pantalla.
