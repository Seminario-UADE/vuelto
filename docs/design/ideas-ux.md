# Ideas de UX

> Cuaderno vivo para anotar cambios de UX que se nos ocurren probando la app.
> No es una spec ni un compromiso: cada idea madura acá y, cuando se decide
> hacerla, pasa a una issue (o se suma a #79, la pasada general de UX).
> La fuente de verdad del diseño sigue siendo `DESIGN.md`.

Cómo anotar: una entrada por idea, con estado (`idea` → `issue` → `hecha` o
`descartada`). Lo que sea de pantalla va con el nombre de la ruta
(`apps/mobile/src/app/…`) para encontrarlo rápido.

## Pantalla de inicio

- **Estado:** idea, por definir
- Cambio a la pantalla de Inicio (`apps/mobile/src/app/(tabs)/index.tsx`).
- Falta bajar qué se quiere cambiar: anotar acá qué molesta hoy y cómo
  debería verse.

## Barra de navegación inferior

- **Estado:** idea
- **Hoy** (`apps/mobile/src/app/(tabs)/_layout.tsx`): cuatro tabs en este
  orden, Inicio · Comprar · Topes · Perfil. La pestaña activa se distingue
  solo por el ícono relleno y por pasar de gris (`inkSecondary`) a tinta
  (`ink`).
- **Cambio:**
  - Inicio va **al centro** de la barra.
  - La sección en la que estamos se marca con **otro color** (un foco más
    claro que hoy), no solo con el relleno del ícono.
- A resolver:
  - Con cuatro tabs no hay centro: ¿se suma una quinta (por ejemplo, un
    botón central destacado para Inicio) o se reordena a tres + Inicio?
  - Qué color de foco, sin romper la paleta de `DESIGN.md` §2 (un solo
    acento salvia) y manteniendo contraste AA.

## Márgenes y barras del sistema

- **Estado:** idea
- **Abajo:** corregir unos píxeles de margen para que el contenido y la barra
  de tabs no choquen con la parte de abajo del teléfono (barra de gestos o
  botones de navegación). Hoy `Screen` usa `insets.bottom`
  (`apps/mobile/src/components/screen.tsx`) y la tab bar usa la del
  navegador; revisar en iOS y en Android con botones.
- **Arriba:** que la barra de estado tenga el mismo color de fondo que la app
  (`canvas`, #F7F4EB). Si en algún dispositivo no se puede (Android sin
  edge-to-edge, por ejemplo), dejar el color por defecto del sistema antes
  que uno que desentone. Hoy `_layout.tsx` solo fija `StatusBar style="dark"`.
- Probar en: iPhone con notch, Android con gestos, Android con tres botones.

## Flujo de compra: simular, pagar, subir el ticket

- **Estado:** issue (#105)
- **Flujo buscado:** simulo la compra cuando estoy por pagar → la app me da el
  mejor medio → pago → subo el ticket → la app confirma la compra y actualiza
  los topes.
- **Hoy** (`apps/mobile/src/app/comercio/[id].tsx`): «Usar [medio]» abre
  «Revisá tu compra» en modo `excepcion` y confirma la compra **antes de
  pagar**, sin ticket. El escaneo de ticket es un camino aparte (Comprar →
  «¿Ya pagaste?») que no conoce la simulación y pide todo de nuevo.
- **Cambio:** «Usar» deja una compra *pendiente* que no descuenta tope; el
  ticket se cruza con ella y recién ahí se confirma.
- **Sin cámara:** la pendiente también se puede confirmar **a mano** si ya
  pagaste (los datos vienen de la simulación y solo se revisan). No hay que
  estar obligado a usar la cámara.
- A resolver: vencimiento de las pendientes, criterio de cruce
  (comercio + monto), dónde se guarda y cómo se ve en Inicio y Mis compras.
  Es un cambio de producto (modelo de compras), no solo de pantallas.

## Ideas sueltas

<!-- Anotá acá lo que se te ocurra, sin ordenar. -->
