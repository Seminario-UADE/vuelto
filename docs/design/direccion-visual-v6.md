# Dirección visual v6: esmeralda, en claro y en oscuro

**Estado:** aprobada el 07/11/2026. Aplicada en `DESIGN.md` v6 (la v5 queda en `DESIGN-v5.md`), en `marca.md` y en `stitch-flujo-directo.md`. La implementación en la app es la issue #115.

> Propuesta del 07/11/2026. Une la auditoría del flujo (`ideas-ux.md`,
> spec 012) con las referencias visuales que juntó el equipo (apps de
> finanzas oscuras y dos paletas esmeralda), **revisada contra las skills de
> diseño del proyecto** (ver «Qué dicen las skills»). Si se aprueba,
> reemplaza `DESIGN.md` entero, no por partes (ver la regla de `impeccable`
> más abajo).

## La idea en una línea

**La misma marca, en dos luces.** Las dos paletas de referencia son la dupla
que ya tiene `marca.md` (Verde Bosque + Blanco Hueso), más profunda
(`#02110C`/`#051F20`) y más cálida (`#F3EBD6`). Con eso se arman dos temas
compuestos: uno claro y uno oscuro. La app sigue la apariencia del sistema.
En los dos temas rige la misma regla: **la decisión va en la superficie
invertida**. Es oscura en el tema claro y crema en el oscuro.

## Qué dicen las skills

Revisé las skills instaladas que aplican a una app nativa de Expo:
`impeccable` (`craft-floor`, `colorize`, `ios`), `apple-design`,
`expo-native-ui`, `stitch-design-taste` y `ui-ux-pro-max`. Esto es lo que
cambió de la primera versión de esta propuesta:

| Idea original | Qué dice la skill | Decisión |
|---|---|---|
| **Solo modo oscuro** | `impeccable/craft-floor`: *«Light or dark picked by category»* es un default a rechazar: se elige por la escena de uso (quién, dónde, con qué luz). `impeccable/ios`: *«Dark Mode is a first-class appearance. Design and test both.»* `apple-design` §7: *«colors that adapt to light/dark»*. | La escena de Vuelto es la fila del súper con luz fluorescente, y a veces la estación de servicio a pleno sol. Ahí no conviene un oscuro forzado. **Dos temas compuestos que siguen al sistema**, con el oscuro como tema de las referencias. |
| **Tab bar flotante propia** (píldora con el activo en un cuadrado) | `impeccable/ios`: *«No custom global nav»*; *«reinvented navigation bars»* es la señal de una app *«ported from a website»*. `expo-native-ui` remite a las tabs del router. | **Tabs nativas** (`NativeTabs` de Expo Router). En iOS 26 la tab bar del sistema ya es una píldora flotante de vidrio, y en Android es la barra Material 3. El foco lo da el `tint` (Salvia). La spec 006 (R2) las había postergado «hasta que su API sea estable»: hay que verificarlo en el SDK 58 antes de decidir. |
| **Anillo de tope** y **tarjetas de dato** («Se reinician en 25 días» como *runway*) | `impeccable/craft-floor`: rechazar *«the hero-metric template: big number, small label, supporting stats, accent»* y *«sparklines, progress rings… standing in for content»*. | Fuera el anillo: queda la barra con su tramo rayado, que ya dice «estimado». Fuera las tarjetas de dato en Topes: la cuenta regresiva va como chip, como hoy. **La cifra grande se queda solo en la decisión** («Te devuelven ≈$4.900»), porque es el contenido y no un adorno (constitución §I: la cifra primero). |
| **Movimientos como tarjetas sueltas** (referencia azul) | `impeccable/ios`: *«Grouped/inset lists for settings-shaped content; no bespoke card stacks»*. `craft-floor`: *«nested cards are always wrong»*. | Últimas compras, historial y Perfil van en **listas agrupadas** (una tarjeta con filas y divisores), como hoy. La tarjeta de decisión no va dentro de otra tarjeta: el hero de Inicio es fondo, no una tarjeta. |
| **Radios de 20 a 32 pt** | `impeccable/craft-floor`: *«Card radii stay at 12–16px; pills are for small controls.»* | Tarjetas de 16 pt (hoy son 20), hojas de 28 pt (las dibuja el sistema), píldoras solo en botones y chips. |
| **Degradé sutil en el hero** | `craft-floor`: *«Backgrounds are surfaces»*. `stitch-design-taste`: prohíbe neón y degradés de color. | Fuera. El hero de Inicio es un fondo liso de un tono más (`surface`). |
| **Glass y blur** | `impeccable/ios`: *«System materials… no hand-rolled glassmorphism»*. `craft-floor`: *«Glass and blur as decoration»*, rechazar. `apple-design` §12: nunca apilar translúcido sobre translúcido. | Solo el vidrio que pone el sistema (tab bar nativa, hojas). Nada propio. |
| **Las referencias violetas y azules** | `stitch-design-taste`: *«The "AI Purple/Blue Neon" aesthetic is strictly BANNED»*. `ui-ux-pro-max` lo lista como antipatrón de fintech. | De esas referencias se toma el layout, no el color. |
| **Tema oscuro como inversión del claro** | `impeccable/colorize`: *«do not invert the light theme mechanically»*, con la elevación diseñada a mano. `ui-ux-pro-max`: *«desaturated / lighter tonal variants, not inverted»*. | En el oscuro, las superficies elevadas son más claras (`#051F20` → `#0B2B26` → `#163832`) y el acento se aclara a `#8EB69B`. No es el claro invertido. |
| **Aplicar la v6 «encima» del DESIGN.md actual** | `impeccable`: *«Redesign replaces… replace DESIGN.md. Never split the difference into polish on the discarded look.»* | Si se aprueba, se escribe un `DESIGN.md` v6 completo y se archiva el actual. |

**Lo que las skills confirman de la propuesta**: un solo acento, que gana
fuerza por escasez (`impeccable/colorize`, modo *Operate*), contrastes
medidos y no a ojo, el color nunca como única señal, nada de negro puro
(`stitch-design-taste`), y tokens semánticos con un tema por apariencia
(`ui-ux-pro-max`, `expo-native-ui`).

**Lo que no se toma**: el *design system* que genera `ui-ux-pro-max` para
«fintech» (azul `#2563EB`, CTA naranja, IBM Plex) es una plantilla genérica
de landing web y contradice la marca. Tampoco aplican las skills de web
(`design-taste-frontend`, `gpt-taste`, `mobile-native`).

**Un choque que queda anotado y no se resuelve acá**: `impeccable/ios` dice
*«San Francisco carries the UI… a brand face may appear in display
moments»*, y la app usa Hanken Grotesk en todo. Pasar el cuerpo a la fuente
del sistema y dejar Hanken para títulos y cifras sería coherente con la
skill, pero es otro cambio. Se decide aparte.

## Qué tomamos de las referencias (después del filtro)

| Patrón | En Vuelto |
|---|---|
| **Una cifra protagonista arriba** | «Te devuelven ≈$4.900» en display, dentro de la tarjeta de decisión. Es la única cifra grande de Inicio. |
| **Fila de acciones rápidas en círculos** | Tus comercios habituales, en círculos de 56 pt con la inicial (Coto, Día, Farmacity, YPF y «Buscar»). Tocar uno es la pregunta. Reemplaza al buscador como primer paso. |
| **Saludo con avatar** | «Hola, Sofía» a la izquierda y el avatar a la derecha, que abre Perfil (spec 012). Sin campana. |
| **Contenido que sube sobre el hero** | El hero (saludo, comercios y decisión) va sobre `surface`, y debajo, en `canvas`, siguen por confirmar, topes y compras. Es un cambio de tono, no una tarjeta dentro de otra. |
| **Control segmentado** | El segmented control nativo, para los filtros de Compras y Mensual/Semanal en Topes. |
| **Tab bar flotante** | La que ya da el sistema (iOS 26), con `tint` Salvia: Compras · Inicio · Topes. |

## Paleta v6

Los nombres son los roles de `apps/mobile/src/theme.ts`, que ya es el único
archivo con colores. Cada rol tiene un valor por tema. Contrastes WCAG 2.1
medidos.

| Rol (`colors.*`) | Claro | Oscuro | Contraste medido (claro / oscuro) |
|---|---|---|---|
| `canvas` | `#F3EBD6` Crema | `#051F20` Bosque profundo | — |
| `surface` | `#EAE1C8` | `#0B2B26` Pino | — |
| `surfaceStrong` | `#DFD5B9` | `#163832` Musgo oscuro | — |
| `divider` | `#D3C8A8` | `#235347` Helecho | decorativo |
| `ink` | `#02110C` | `#F3EBD6` | 16.2 · 13.2 strong / 14.4 · 10.7 strong |
| `inkSecondary` | `#4E6656` | `#A3B5A8` Liquen | 5.3 canvas · 4.8 surface / 8.0 · 5.9 strong |
| `controlBorder` | `#6A7A70` | `#5E8A70` | 3.8 / 4.4 (≥3:1) |
| `accent` | `#1A422F` Oliva | `#8EB69B` Salvia clara | 9.5 / 7.6 |
| `onAccent` | `#F3EBD6` | `#02110C` | 9.5 / 8.6 |
| `warning` | `#83591A` | `#E2B65E` | 5.2 canvas / 9.1 |
| `error` | `#8C4843` | `#EE8F84` | 5.7 canvas / 7.3 |
| `decisionBg` | `#051F20` | `#F3EBD6` | — |
| `onDecision` | `#F3EBD6` | `#02110C` | 14.4 / 16.2 |
| `onDecisionAccent` (el botón dentro de la decisión) | `#8EB69B` con texto `#02110C` | `#1A422F` con texto `#F3EBD6` | 8.6 / 9.5 |

Reglas:

- **En el tema claro, el texto secundario va sobre `canvas` o `surface`.** Sobre `surfaceStrong` baja a 4.3:1, y ahí se usa `ink`.
- **Champán sale.** En los dos temas competiría con el acento.
- **Apariencia**: `userInterfaceStyle: "automatic"` (hoy `light`). El tema se elige con `useColorScheme()` en un único `ThemeProvider` y la `StatusBar` acompaña.
- **`theme.test.ts`**, que ya verifica contrastes, pasa a verificar los dos temas.

## El flujo de la spec 012 con v6

| Pantalla | Layout |
|---|---|
| **Bienvenida** | Logo, título y los tres puntos con íconos en círculos `surfaceStrong`. Pie con «Empezar» (acento) y «Ya tengo cuenta» (texto). Sin ilustración: *«Real illustration or none»* (`craft-floor`). |
| **¿Con qué pagás?** | Lista agrupada con las tarjetas agregadas (inicial del banco, tipo y red, sin colores de marca) y el buscador debajo. |
| **¿Dónde comprás seguido?** | Comercios en círculos, igual que en Inicio, para que se aprenda el gesto una vez. Abajo, la tarjeta de decisión. Es la primera vez que aparece la superficie invertida. |
| **Guardá tu perfil** | Hoja del sistema con campos `surfaceStrong`. |
| **Inicio** | Hero sobre `surface`: saludo, avatar, «¿Dónde vas a comprar?», la fila de comercios y, al tocar uno, la tarjeta de decisión con «Usar Galicia». Debajo, en `canvas`: la tarjeta por confirmar, «Tus topes» (barras con tramo rayado y el chip «Se reinician en 25 días») y las últimas compras en lista agrupada. |
| **Compras** | Large title nativo, por confirmar, dos filas de acción, el resumen del mes como texto («Gastaste $182.300 · te devolvieron ≈$15.200, según 9 compras»), el segmented control y el historial agrupado por día. |
| **Topes** | Una fila por medio con su barra, su base y su reinicio. Sin total sumado ni anillos. |
| **Revisá tu compra** | Hoja del sistema. Filas de medio con el seleccionado en borde de 2 pt del acento. Pie con el primario. |
| **Perfil** | Header nativo con large title y listas agrupadas. |

## Riesgos

- **Costo de dos temas**: cada pantalla hay que mirarla dos veces. Se acota porque todo color ya sale de `theme.ts`, y la verificación de `impeccable/ios` (`xcrun simctl ui booted appearance dark`) entra en el quickstart.
- **`NativeTabs`**: si en el SDK 58 la API sigue siendo `unstable`, se queda la tab bar JS (que ya existe) con el `tint` nuevo, sin dibujar una píldora propia.
- **Marca**: `marca.md` y las slides usan la paleta v5. El tema claro v6 es casi igual (crema `#F3EBD6` en lugar de `#F7F4EB`, tinta `#02110C` en lugar de `#14281D`), así que el salto lo da el tema oscuro. Lo aprueba el Product Owner.

## Pasos (hechos el 07/11, salvo la implementación)

1. Escribir `DESIGN.md` v6 completo (paleta por tema, superficie invertida, tabs nativas, radios de 16, listas agrupadas, sin anillos ni tarjetas de dato) y archivar el actual como `DESIGN-v5.md`. Actualizar el uso por fondo en `marca.md`.
2. Rehacer `docs/design/stitch-flujo-directo.md` con la paleta v6, generando cada pantalla en los dos temas (#113).
3. En `apps/mobile`: `theme.ts` con los dos temas, un `ThemeProvider`, `userInterfaceStyle: "automatic"` y `theme.test.ts` para los dos temas. Es una issue nueva, previa a la UI de #109, #103 y #111.
4. Una tarea de research en #103 sobre `NativeTabs` en el SDK 58.
5. En la spec 012, cambiar el supuesto «el estilo visual no cambia» por una referencia a esta dirección.
