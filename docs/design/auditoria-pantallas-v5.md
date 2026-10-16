# Auditoría de las 18 pantallas (v5)

Fecha: 16/10/2026. Base: los PNG de `docs/design/screens/` (PR #63, ya en `main`).

Criterios usados, tomados de las skills del proyecto:

- `impeccable`: heurísticas de critique, piso de craft y `ios.md` (zonas seguras,
  tab bar para secciones, controles del sistema, áreas táctiles de 44 pt, Dynamic Type, Dark Mode).
- `apple-design`: wayfinding, feedback, agrupación y "simplicity, not minimalism".
- `mobile-native` y `expo-native-ui`: qué controles resuelve la plataforma.
- `DESIGN.md` §2–§8: tokens, componentes y lista de prohibidos.

> La revisión se hizo en una sola pasada y sin el detector de `impeccable`,
> porque el detector analiza código y por ahora solo hay imágenes. La pasada
> técnica (accesibilidad real, rendimiento, Dynamic Type) se repite cuando
> exista la app.

## Veredicto

La identidad de la app está bien resuelta y no parece una plantilla genérica.
Tiene una paleta propia y un lenguaje consistente de "≈ con su base". Los
colores comunican estado (salvia, ocre, óxido) y siempre van con texto. El copy
de privacidad es concreto en todas las pantallas.

Los problemas están en tres lugares:
- **el flujo de compra:** pide tres decisiones donde alcanza con una;
- **el abuso de la tarjeta oscura:** aparece en 8 de las 18 pantallas, así que
  ya no marca qué es lo importante;
- **los detalles de layout:** hay contenido tapado por CTAs fijos.

## Qué funciona (mantener al implementar)

1. **RF-07 respetado en todas las pantallas.** Cada cifra estimada lleva "≈" y su base
   ("según 3 compras de octubre"). Las cuentas cierran entre pantallas:
   ≈$6.500 − ≈$4.900 = ≈$1.600, y ≈$15.200 + ≈$4.900 = ≈$20.100.
2. **Los estados no dependen solo del color.** "Queda poco", "Tope agotado" y
   "sin reintegro" son texto, y además la barra tiene un tramo rayado para lo estimado.
3. **Revisá tu compra no preselecciona el medio de pago** (RF-10) y avisa
   "El ticket no dice el medio de pago".
4. **El onboarding da valor antes de pedir la cuenta.** El paso de comercios se puede
   saltar, la primera respuesta es real y el login pide email sin contraseña.
5. **Las pantallas de ADR-008 son claras.** Dicen qué se comparte, qué no y "lo que se
   puede deducir". Quitar un contacto explica la consecuencia para los dos.
6. **Se usan controles nativos donde corresponde:** segmented control para dividir,
   sheets con manija y X.

## Problemas por prioridad

### P1: resolver antes o durante la implementación

| # | Pantalla | Problema | Por qué importa | Arreglo | Skill |
|---|---|---|---|---|---|
| 1 | Inicio → Nueva compra → Con qué pagar | Hay tres pasos para una respuesta. Inicio pide el **rubro**, Nueva compra pide el **comercio** y el **monto** con teclado propio, y recién después aparece "Ver con qué pagar". Nueva compra ya muestra "Por ahora te conviene Galicia", así que la pantalla siguiente repite la respuesta. | El objetivo de la app es elegir el medio de pago desde el inicio, y cada paso extra es un lugar donde el usuario puede abandonar. | Al tocar un comercio frecuente en Inicio, la respuesta aparece en la misma tarjeta. El monto es opcional y solo refina el "≈". "Con qué pagar" queda como detalle al que se llega desde esa respuesta. Escanear el ticket pasa a una fila secundaria. | `impeccable distill`, `shape` |
| 2 | Inicio, Con qué pagar, Topes, Mis compras, Perfil, Invitar, Armar grupo, Gasto en grupo | La tarjeta Verde Bosque se usa como hero en 8 pantallas. | DESIGN.md la define como "tarjeta de decisión". Si todo es hero, nada lo es. | Usarla solo donde hay una decisión: Con qué pagar, Gasto en grupo y, en Inicio, la respuesta. En Topes, Mis compras, Perfil e Invitar, pasar a Lino con el número en display. | `impeccable quieter` |
| 3 | Revisá tu compra | El sheet termina cortado ("Cuando elijas, te mostramos cuánto te…") y no se ve el CTA de confirmar. | El usuario no puede terminar la tarea sin descubrir que tiene que hacer scroll. | Agregar un footer fijo con un solo primario ("Guardar compra"), deshabilitado hasta elegir el medio, y padding inferior en el contenido. | `impeccable layout` |
| 4 | Topes | El hero suma "Te quedan ≈$8.800" de un "Tope total del mes $24.000". | Los topes son por medio y por promo, y uno es semanal. No hay ningún lugar donde el usuario pueda usar $8.800, así que la suma da una precisión engañosa. | Sacar el agregado de topes y dejar "Te devolvieron ≈$15.200" junto a "Se reinician en 17 días". Si se quiere un resumen, contar "2 medios con tope disponible". | `impeccable clarify` |
| 5 | Todas | No hay apariencia oscura ni tokens semánticos. DESIGN.md solo define la paleta clara. | En iOS y Android con modo oscuro, una app clara forzada se ve ajena. Si no se decide ahora, se termina con colores fijos en todo el código. | Decidir en la implementación entre dos opciones: (a) solo modo claro y declararlo con `userInterfaceStyle: "light"`, o (b) definir los tokens oscuros. Con cualquiera de las dos, los colores se usan siempre como tokens semánticos y nunca como hex sueltos. | `impeccable colorize`, `adapt` |
| 6 | Todas | Los íconos son Material y la flecha de volver es de Android, mezclados con Apple sign-in y el indicador de inicio de iOS. | Según `ios.md`, un usuario de iPhone desconfía de una app con controles de otra plataforma. | Usar `expo-symbols` (SF Symbols) en iOS y Material en Android detrás de un componente `<Icon>`. Usar el header nativo del stack para que el back y el swipe sean del sistema. | `expo-native-ui` |

### P2: siguiente pasada

| # | Pantalla | Problema | Arreglo |
|---|---|---|---|
| 7 | Con qué pagar, Armar grupo | El CTA fijo tapa contenido: "¿Pagan entre varios?" queda pegado y cortado, y en Armar grupo el CTA queda encima de la tab bar. DESIGN.md prohíbe el contenido tapado. | Dejar el contenido con padding igual al footer más el safe area. El CTA va en el footer y no flota sobre la lista. |
| 8 | Con qué pagar | El CTA "Usar Galicia Visa crédito" ocupa dos líneas y tiene un chip a la derecha. | Usar una línea ("Usar Galicia") y mostrar el reintegro arriba, no dentro del botón. |
| 9 | Aceptar invitación | El texto "Podés quitar el vínculo…" queda cortado detrás del footer. | Mismo arreglo que el #7. |
| 10 | Gasto en grupo | "TE CONVIENE QUE PAGUE" y "SU PARTE" están en mayúsculas como encabezado de bloque. | Pasar a sentence case (DESIGN.md §3). |
| 11 | Armar grupo, Gasto en grupo | "Vos" (Martín) y Mateo son los dos un avatar "M" del mismo color. | En la fila propia mostrar "Vos" sin inicial, o usar dos letras ("Ma" y "Mt"). |
| 12 | Gasto en grupo | Dice "$0" para Vos y "≈$0" para Lucía. | Usar un solo criterio: "≈" solo cuando la cifra depende de un tope estimado. |
| 13 | Inicio, Topes, Mis compras, Perfil | "Te devolvieron ≈$15.200" aparece en 4 lugares. | Mostrarlo en Topes y en Mis compras. En Inicio y Perfil solo si cumple una función. |
| 14 | Inicio | Hay una campana con punto de notificación, pero las notificaciones no están definidas (16% de aceptación). | Sacarla hasta que exista la feature. |
| 15 | Nueva compra | El teclado numérico es propio. | Mientras el monto sea obligatorio, usar `keyboardType="number-pad"` del sistema con chips de redondeo. Si el monto pasa a ser opcional (#1), usar un campo simple. |
| 16 | Mis compras | Los badges "Ticket", "Recomendación" y "Carga manual" parecen menores a 12 px, y los filtros se cortan ("Carga man…"). | Usar caption de 12 px como mínimo, y un scroll horizontal con fade o un segmented control. |
| 17 | Inicio (tarjetas de topes en 2 columnas) | Con Dynamic Type grande, los nombres largos ("Santander Mastercard") rompen la grilla. | Usar una columna cuando `fontScale > 1.2`. |
| 18 | Onboarding | "Paso 1 de 2" y "Paso 2 de 2" en Medios y Comercios no coinciden con los 5 pasos reales. Comercios dice "Saltar" pero también muestra el botón "Terminar". | Que el indicador cuente solo los pasos de configuración y explicarlo, o sacar el texto y dejar solo la barra. |

### P3: pulido

- **Fechas de 2024** en Mis compras y en el ticket de Escanear. Están prohibidas en DESIGN.md.
- **Guardar perfil:** el fondo desenfocado sigue siendo "Tu compra" y debería ser
  Primera respuesta.
- **Comercios:** el campo de búsqueda tiene un borde interior de más.
- **Screenshots del repo:** 14, 15, 8, 9 y 10 están en un lienzo de escritorio de 2560 px.
  Para implementar, sirven más el HTML de Stitch o un recorte del teléfono.

## Personas

- **Primera vez en la caja de Coto (Martín, 40 segundos en la fila):**
  - Inicio le pide un rubro y después un comercio.
  - El teclado le pide el monto.
  - Recién en la tercera pantalla ve el botón de usar Galicia.
  - Riesgo: paga con lo de siempre (P1 #1).
- **Usuario con letra grande o VoiceOver:**
  - Las tarjetas de 2 columnas, los badges de 11 px y los chips de filtro se cortan.
  - Los avatares de una sola letra repiten "M" sin otro contexto (P2 #11, #16 y #17).
- **Lucía, contacto invitado:**
  - Entiende qué se comparte.
  - Pero el texto de cómo quitar el vínculo queda cortado justo antes de aceptar (P2 #9).

## Orden sugerido

1. `$impeccable distill` + `shape` sobre el flujo de compra (#1).
2. `$impeccable quieter` sobre la tarjeta oscura (#2).
3. `$impeccable layout` para los footers y CTAs fijos (#3, #7, #8 y #9).
4. `$impeccable clarify` para el copy y las cifras (#4, #10, #12 y #13).
5. `$impeccable adapt` en la app real: Dynamic Type, Dark Mode e íconos por plataforma (#5, #6 y #17).
6. `$impeccable polish` como pasada final.
