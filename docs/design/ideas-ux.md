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

- **Estado:** issue (#103, spec 012 US3)
- **Hoy** (`apps/mobile/src/app/(tabs)/_layout.tsx`): cuatro tabs en este
  orden, Inicio · Comprar · Topes · Perfil. La pestaña activa se distingue
  solo por el ícono relleno y por pasar de gris (`inkSecondary`) a tinta
  (`ink`).
- **Cambio:**
  - Inicio va **al centro** de la barra.
  - La sección en la que estamos se marca con **otro color** (un foco más
    claro que hoy), no solo con el relleno del ícono.
- Propuesta para el centro: **Compras · Inicio · Topes**, tres tabs, con
  Perfil como avatar arriba a la derecha de Inicio. Detalle en «Flujo de
  usuario nuevo y de compra».
- A resolver:
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

## Flujo de usuario nuevo y de compra

- **Estado:** issue (spec `specs/012-flujo-directo/`: #109, #110, #111, #112 y #103; diseño v6 en #115, sin pasar por Stitch). Auditoría del 05/11/2026, sobre el código de `main`.
- **Hoy:** Bienvenida → Crear cuenta → Medios («paso 1 de 2») → Comercios
  («paso 2 de 2», se puede saltar) → Primera respuesta → Inicio, con cuatro
  tabs.

### Problemas encontrados

1. **La cuenta se pide antes de dar valor.** Es al revés de lo que la
   auditoría v5 marcaba como fortaleza. Si Supabase pide confirmar el email,
   el registro manda a Login y el onboarding queda cortado
   (`apps/mobile/src/components/formulario-cuenta.tsx`).
2. **Nunca se pide el nombre.** Inicio y Perfil usan `"Martín"` por defecto:
   todo usuario nuevo ve «Hola, Martín», y Perfil lo muestra como el «nombre
   que ven tus contactos» (`(tabs)/index.tsx`, `(tabs)/perfil.tsx`).
3. **La primera respuesta está fija en Coto**
   (`(onboarding)/primera-respuesta.tsx`). Si la persona no compra ahí, o sus
   medios no tienen promo, la primera impresión es «Hoy no hay promo».
4. **El paso Comercios aporta poco.** Sin habituales, el buscador de Inicio
   usa igual los frecuentes del catálogo (`selectComerciosFrecuentes`).
5. **El indicador de pasos no cuenta los pasos reales:** dice «de 2», y son 5.
6. **Inicio y Comprar se pisan.** Las dos tienen el buscador de comercio,
   escanear y las últimas compras. El estado vacío de Inicio manda a Comprar,
   que vuelve a preguntar el comercio.
7. **La compra pendiente (#105) no tiene dónde vivir.**
8. **La tarjeta de Inicio solo tiene «Ver detalle»,** sin «Usar». Hacen falta
   dos toques más para la acción principal.
9. **«¿Pagan entre varios?» aparece en Comprar** y en el detalle del
   comercio. Para un usuario nuevo, sin contactos, es un callejón.

### Propuesta

**Onboarding (de 5 pantallas a 4, la cuenta al final):**

```
Bienvenida («Empezar» · «Ya tengo cuenta»)
→ ¿Con qué pagás? (medios, igual que hoy)
→ Primera respuesta interactiva: «¿Dónde comprás seguido?» con chips;
   tocar uno muestra la respuesta real y lo guarda como habitual
→ Guardá tu perfil: nombre + email + contraseña
→ Inicio
```

- Costo: los medios viven en el store local hasta crear la cuenta y se suben
  después con `confirmarMedios`. Verificar que `leerBancos` funcione sin
  sesión (RLS de lectura con la clave anon).
- Plan mínimo si no entra en el cuatrimestre: dejar la cuenta primero, pero
  pedir el nombre y hacer interactiva la primera respuesta.

**Tabs (de 4 a 3, Inicio al centro):** Compras · Inicio · Topes, con Perfil
como avatar en el header de Inicio. Cada tab es un momento: Inicio = ahora
(con qué pago), Compras = después (confirmar y registrar), Topes = cuánto
queda.

**Compra, con la pendiente de #105:**

```
Inicio: tocás Coto → respuesta en la tarjeta → [Usar Galicia]
→ queda una compra PENDIENTE (no descuenta tope) + toast «Pagá con Galicia»
→ tarjeta «Compra en Coto pendiente» arriba de Inicio y en Compras:
     [Ya pagué]        → Revisá tu compra con los datos de la simulación
     [Escanear ticket] → Escanear → Revisá (se cruza con la pendiente)
     [Descartar]
```

- El estado vacío de Inicio no manda a otra tab: «Tus topes aparecen cuando
  confirmes tu primera compra».

### Resumen de cambios

| Acción | Pantalla |
|---|---|
| Sacar | Tab Comprar, onboarding Comercios |
| Unir | Comercios + Primera respuesta (deja de estar fija en Coto) |
| Mover | Mis compras → tab · Perfil → avatar en el header · Crear cuenta → después de la primera respuesta |
| Agregar | Nombre en el registro · tarjeta de compra pendiente · «Usar» en Inicio · `modo: "pendiente"` en Revisá |
| Arreglar | «Hola, Martín», el indicador «paso X de 2», la confirmación de email sin salida |

Lo que más rinde por menos trabajo: el nombre en el registro, la primera
respuesta interactiva y sacar la tab Comprar. La pendiente y la cuenta al
final cambian el modelo y conviene llevarlas con spec-kit.

## Ideas sueltas

<!-- Anotá acá lo que se te ocurra, sin ordenar. -->
