# Rediseño v7: comprar paso a paso y una app con menos información

## Context

El usuario vio las capturas de la v6 y la app le pareció cargada: cada pantalla apila
información, y el usuario se pierde navegando. Pidió:

- **El modo claro es el principal.** Se diseña y verifica primero en claro. El oscuro se
  mantiene porque sale de los mismos tokens de `theme.ts`.
- **La barra tiene Inicio · Topes · ( + ) · Comercios · Perfil.** El «+» va al centro, más
  grande y en verde: es comprar.
- **Comprar es un flujo de un paso por pantalla**, con sensación de avance: comercio →
  monto → recomendación → confirmar (escaneo o a mano).
- **El resto de la app sigue el mismo criterio**: un propósito por pantalla.

La paleta esmeralda y crema de la v6 no cambia.

## Arquitectura nueva

```
Tabs (cápsula flotante propia)
  Inicio      saludo + «Este mes te devolvieron ≈$X · según N compras» + fila(s) por confirmar
  Topes       una fila por medio (≈ queda, barra, base) → tope/[clave] (ya existe)
  ( + )       no es una pantalla: abre el flujo /comprar
  Comercios   habituales (agregar / sacar). Tocar uno → /comprar/monto con ese comercio
  Perfil      nombre, medios de pago, Mis compras, Contactos, Cerrar sesión

/comprar (stack en fullScreenModal, barra de avance 1–4, volver y cerrar)
  1 index          ¿Dónde estás comprando?  buscador + habituales en cuadrados; tocar avanza
  2 monto          ¿Cuánto vas a pagar?     cifra grande + teclado numérico; «Seguir» / «No sé el monto»
  3 recomendacion  Pagá con Galicia         tarjeta de decisión: ≈ te devuelven + 1 razón con base
                                            «Voy a pagar con Galicia» · links «Otras opciones», «¿Pagan entre varios?»
  4 confirmar      ¿Ya pagaste?             «Escanear ticket» · «Cargar a mano» · «Lo confirmo después»
  5 listo          Compra guardada          «Te quedan ≈$13.800 de tope en Galicia» · «Volver al inicio»
```

- El estado entre pasos ya existe: el slice `simulacion` (`comercioId`, `monto`) en
  `store/simulacion.ts`. La recomendación es `selectRecomendacion` (ADR-010: se deriva y no
  se guarda).
- En el paso 3, «Voy a pagar con…» llama a `useUsarRecomendacion()`
  (`hooks/use-usar-recomendacion.ts`). Crea la compra por confirmar (no descuenta tope,
  FR-003) y navega a `confirmar?porConfirmar=<id>`. Para eso, el hook pasa a devolver el id
  creado en vez de un booleano.
- En el paso 4 se reusa lo que existe:
  - «Cargar a mano» abre `/revisa?porConfirmar=<id>&flujo=1`.
  - «Escanear ticket» abre `/escanear?porConfirmar=<id>&flujo=1`.
  - «Lo confirmo después» vuelve a Inicio con `router.dismissAll()`, y la fila queda en
    Inicio.
- `revisa.tsx`, al guardar con `flujo=1`, hace `router.replace("/comprar/listo")` en vez de
  `router.back()` con toast.
- Las filas por confirmar de Inicio abren `/comprar/confirmar?porConfirmar=<id>`: la misma
  pantalla del paso 4. Así se acaba el «Ya pagué» junto a «Escanear ticket».
- Escaneo atado a una compra por confirmar: `escanear.tsx` reenvía `porConfirmar` a
  `revisa`. `revisa` toma del ticket el monto, la fecha y el medio si los trae, y el resto de
  la compra por confirmar. Guarda con el id de la compra por confirmar, con origen `ticket`.
  Es el mínimo de la #110. La pregunta «¿Este ticket es de tu compra en…?» (FR-013) queda en
  la #110.

## Cambios de la auditoría (impeccable critique, sumados)

1. **El paso 4 es «Pagá con Galicia», no «¿Ya pagaste?».** Muestra el medio bien grande
   para mirarlo en la caja. Debajo dice «Cuando pagues:», con «Escanear ticket»
   (principal), «Cargar a mano» y «Lo confirmo después».
2. **El paso 4 reemplaza al 3** (`router.replace`): desde el 4 solo se cierra, así que no
   se puede duplicar la compra por confirmar.
3. **La barra propia es accesible**: `accessibilityRole="tab"` con estado seleccionado, el
   «+» con la etiqueta «Comprar», 44 pt o más de área táctil, se oculta con el teclado y
   respeta la zona segura.
4. **La barra de avance es coherente**: si entrás a mitad de camino, los pasos anteriores se
   ven completos; «Listo» va sin barra.
5. **El vacío de Inicio lleva al «+»**: «Todavía no registraste compras. Tocá + cuando
   estés por pagar.»
6. **Revisá desde el flujo** usa el mismo encabezado y pide solo lo que falta. Listo
   muestra en grande «Te van a devolver ≈$X», con su base. El paso 3 sin promo usa el
   mismo botón.

## Forma homogénea, con menos píldoras (como en las referencias)

En las referencias (14, 17, 19, 26), casi todo es **rectángulo redondeado** de la misma
familia. La píldora queda solo para la cápsula de la barra.

- Tokens en `theme.ts`: `radius.control = 14` para botones, campos y buscador;
  `radius.card = 20` para tarjetas y la tarjeta de decisión; `radius.tile = 16` para los
  cuadrados de comercio. `radius.pill` queda solo para la barra y las barritas de progreso.
- `Button` deja de ser píldora: pasa a `radius.control`, con 56 pt de alto.
- Buscador, `MontoInput` y campos con `radius.control`.
- Los **chips de comercios se reemplazan por cuadrados** (grilla de 4 columnas, ícono del
  rubro o inicial y el nombre debajo), como los accesos rápidos de la 17 y la 26. Los
  chips de Topes desaparecen con el paso 7.
- Superficies: una sola tarjeta `surface` por bloque, sin bordes, con la misma separación.

## Qué se va y adónde

| Hoy | Después |
|---|---|
| Tab Comprar (buscador, escanear, a mano, grupo, últimas compras) | Flujo «+». El grupo es un link del paso 3. Las últimas compras van a Perfil › Mis compras |
| Recomendación inline en Inicio con monto | Paso 3 del flujo |
| `comercio/[id].tsx` (detalle con alternativas) | Paso 3. «Otras opciones» abre un formSheet con `AlternativaRow` |
| Tarjeta por confirmar con 3 botones | Una fila en Inicio que lleva al paso 4 |
| Inicio: topes, últimas compras, fecha, frescura | Topes / Mis compras. La frescura va al pie del paso 1 |
| Topes: tarjeta resumen, consejo del día, chips, párrafo de estimados | Una línea «Te devolvieron», la lista y una línea al pie |
| Perfil: comercios habituales, contador | Tab Comercios. El contador se va |

## Pasos (cada uno es un commit verificable en el simulador)

1. **Docs.**
   - Reescribir en `specs/012-flujo-directo/spec.md` la US3 y FR-001, 005, 018–022 y 035
     (barra de 5 lugares con «+», flujo por pasos, una sola acción después de pagar) y la
     fase 5 de `tasks.md`.
   - Actualizar `docs/design/DESIGN.md` a v7: §5 navegación, flujo de compra, por
     confirmar; §6 layout; claro como modo de referencia.
   - Reemplazar `docs/design/plan-rediseno-v7.md`, el borrador anterior sin commitear, por
     este plan.
2. **Barra.**
   - `app/(tabs)/_layout.tsx`: `tabBar` propio, una cápsula flotante (nuevo
     `components/tab-bar.tsx`) con 4 tabs y el «+» central de 60 pt en `accent`.
   - El «+» es una ruta ficticia `(tabs)/nueva` con `tabPress` → `preventDefault` +
     `router.push("/comprar")`.
   - Se borra `(tabs)/comprar.tsx`, se suma `(tabs)/comercios.tsx` y se reserva el alto de
     la cápsula en `components/screen.tsx` (`aboveTabBar`).
3. **Flujo de compra, pasos 1–3.**
   - `app/comprar/_layout.tsx` (Stack con header propio y `ProgressSegments` de
     `components/progress-segments.tsx`), `index.tsx` (reusa `ComercioSearch` y
     `FilaComercios` en grilla), `monto.tsx` (cifra grande + teclado numérico propio,
     `components/teclado-numerico.tsx`) y `recomendacion.tsx` (reusa `RecomendacionCard` y
     `AlternativaRow` de `components/recomendacion.tsx`).
   - Registrar `comprar` como `fullScreenModal` en `app/_layout.tsx`.
4. **Pasos 4 y 5.**
   - `comprar/confirmar.tsx` y `comprar/listo.tsx`, que lee el tope del medio con
     `selectTopes`, siempre con ≈ y su base.
   - Cambios en `revisa.tsx` (`flujo`) y en `escanear.tsx` (reenviar `porConfirmar`).
   - `components/por-confirmar-card.tsx` pasa a ser una fila.
5. **Inicio mínimo.** `app/(tabs)/index.tsx`: el saludo, el bloque con «Te devolvieron»
   (de `selectTopes().devolvieron`, con la base) y las filas por confirmar. Sin compras: «Todavía
   no registraste compras este mes».
6. **Comercios y Perfil.**
   - `(tabs)/comercios.tsx` con `ComerciosDelPerfil`. Tocar un comercio despacha
     `comercioElegido` y abre `/comprar/monto`.
   - `(tabs)/perfil.tsx` sin los comercios ni el contador, con filas a Mis compras y
     Contactos.
7. **Topes simple.** `app/(tabs)/topes.tsx`: una lista agrupada de `TopeDetalle` compacta,
   sin la tarjeta resumen ni los chips. Se mantienen el chip de reinicio, la línea de
   estimados y «Ver mis compras».
8. **Limpieza.**
   - Borrar `comercio/[id].tsx` y redirigir sus enlaces (Inicio, primera respuesta) a
     `/comprar/recomendacion`.
   - Ajustar los `router.navigate("/comprar")` (estado vacío de Topes) y sacar componentes
     que queden sin uso (`action-row`, `decision-card` si no se usan).

El onboarding no se toca en esta tanda.

## Reglas que se mantienen

- La recomendación sale del motor vía selectores, sin LLM (ADR-010).
- El reloj sale del store (`selectHoy`).
- Toda cifra de tope o reintegro lleva ≈ y su base. Nunca un total sumado de topes.
- La compra por confirmar no descuenta hasta que se guarda.
- `theme.ts` sigue siendo el único archivo con colores.

## Verificación

- `npm run lint && npm run typecheck && npm run test` desde la raíz, en cada paso.
  - Tests nuevos en `store/`: el hook o thunk de «usar» devuelve el id.
  - `revisa` con un ticket más una compra por confirmar arma el borrador con los datos del
    ticket y el id de la compra.
  - Los tests de `pantallas.test.ts` siguen en verde.
- Simulador iPhone 17 (`459AEF42-…`), Expo Go en `exp://127.0.0.1:8096`, con `.env` copiado
  de `integracion-012`. Recorrido completo: «+» → Coto → $24.500 → «Voy a pagar con
  Galicia» → «Cargar a mano» → Guardar → Listo → Inicio y Topes actualizados. Otra vez con
  «Lo confirmo después» y confirmando desde la fila de Inicio.
- Capturas antes y después de cada pantalla, **primero en claro** y después en oscuro, en
  `.claude/referencias-ux-v7/capturas-v7/`.
- Nada de push, PR ni cambios en issues de GitHub sin pedírselo al usuario. Al final se le
  propone abrir la issue «Rediseño v7» y actualizar la #103.
