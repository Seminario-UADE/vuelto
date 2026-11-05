# Prompts de Stitch: flujo directo (spec 012)

> Para generar en Stitch las pantallas nuevas y actualizadas del flujo
> directo (`specs/012-flujo-directo/`). El diseño visual no cambia: manda
> `DESIGN.md`. Lo que cambia es el flujo, las pantallas que existen y la
> barra de tabs.

## Cómo usarlo

1. En el proyecto de Stitch, cargá `docs/design/DESIGN.md` como design
   system (o pegalo en la primera conversación). **Antes, actualizá §5
   «Tab bar»** con lo de este archivo («Cambios a DESIGN.md»), porque si no,
   Stitch va a dibujar las cuatro tabs viejas.
2. Pegá el **prompt base** una vez.
3. Generá cada pantalla con su prompt, **de a una**. Stitch respeta mejor
   el pedido cuando cada mensaje es una sola pantalla.
4. Revisá cada resultado contra la «Lista de control» del final antes de
   pasar a la siguiente.

## Cambios a DESIGN.md (hacer antes de generar)

- **§5 Tab bar**: «Tres ítems, en este orden: **Compras · Inicio · Topes**.
  Inicio va al centro y es la tab inicial. Activo: ícono Salvia relleno
  sobre una píldora Salvia clara `#DCE6DD` de 56×32 pt, etiqueta Verde
  Bosque 12 px/600. Inactivos: ícono y etiqueta Musgo. Perfil no es una
  pestaña: se abre desde el avatar arriba a la derecha de Inicio. Grupo
  tampoco: se entra desde el detalle del comercio.»
- **§5 Estados vacíos**: el ejemplo de Inicio pasa a «Todavía no
  confirmaste compras. Cuando confirmes la primera, vas a ver cuánto tope te
  queda.», sin botón que mande a otra pestaña.
- **§2 superficie oscura**: sumar «la tarjeta de decisión de Inicio lleva
  el botón primario "Usar [medio]" adentro, en Blanco Hueso con texto Verde
  Bosque».
- **Glosario §8**: sumar «**por confirmar**: compra simulada que todavía no
  pagaste. No usar "pendiente"», porque «pendiente» ya es una compra sin
  subir.

## Prompt base (pegar una vez)

```text
Vamos a rediseñar el flujo de la app mobile Vuelto (iPhone, 390×844 pt) siguiendo
el design system cargado (DESIGN.md) al pie de la letra: fondo Blanco Hueso #F7F4EB,
tinta Verde Bosque #14281D, un solo acento Salvia #4A6B53, tarjetas Lino #EFEBE0,
Hanken Grotesk, montos con cifras tabulares, todo en español rioplatense de vos.

Vuelto le dice al usuario con qué medio de pago pagar en una compra concreta y
cuánto tope de reintegro le queda. No lista promociones.

El flujo nuevo es más directo:
- Tres pestañas: Compras · Inicio (al centro, inicial) · Topes. Perfil se abre desde
  un avatar arriba a la derecha de Inicio.
- En Inicio tocás un comercio y la respuesta aparece en una tarjeta oscura Verde
  Bosque con el botón "Usar Galicia" adentro.
- "Usar" NO registra la compra: la deja "por confirmar" (todavía no pagaste) y no
  descuenta tope. Después de pagar la confirmás con "Ya pagué" o escaneando el ticket.
- El onboarding son 2 pasos: tus medios y "¿Dónde comprás seguido?", donde tocás un
  comercio y ves la respuesta real. La cuenta se crea al final ("Guardá tu perfil").

Reglas que no se rompen:
- Todo tope lleva ≈ y su base ("≈$6.500 de tope · según 3 compras de noviembre").
  Sin compras, no hay cifra.
- Nunca un total sumado de topes.
- Un solo botón primario por pantalla, en una línea, en un pie fijo que no tapa nada.
- Iniciales de bancos y comercios en círculos neutros, sin colores de marca ni logos.
- Fechas de noviembre de 2026. El usuario de ejemplo se llama Sofía; sus medios son
  Galicia Visa crédito, Santander Mastercard crédito y Cuenta DNI.
- Nada de campanas de notificación, badges decorativos ni rótulos en MAYÚSCULAS.

Te voy a pedir las pantallas de a una. No generes nada todavía.
```

## Pantallas

### 1. Bienvenida

```text
Pantalla "Bienvenida" (primera pantalla, sin tab bar).
Arriba a la izquierda, el logo de Vuelto en un cuadrado redondeado de 72 pt.
Título title-lg: "Pagá con el medio que más te devuelve".
Debajo, body-lg Musgo: "Tocás dónde estás comprando y te decimos con qué pagar.
También llevamos la cuenta de cuánto tope te queda."
Tres filas con ícono en círculo Gris Cálido: "Con qué pagar en cada comercio, hoy",
"Cuánto tope te queda, estimado según tus compras", "Sin conectar tu banco ni
pedir tus claves".
Pie fijo: botón primario Salvia "Empezar", debajo un botón de texto "Ya tengo
cuenta", y un label Musgo centrado: "Son dos pasos. La cuenta la creás al final."
```

### 2. Onboarding: ¿Con qué pagás?

```text
Pantalla "¿Con qué pagás?", paso 1 de 2 (sin tab bar). Header nativo con flecha de
volver y, al centro, un indicador de progreso de 2 segmentos con el primero en Salvia.
Título "¿Con qué pagás?" y subtítulo "Buscá tu banco y elegí el tipo de tarjeta y
la red."
Tarjeta Lino con las tarjetas ya agregadas, una por fila con inicial del banco en
círculo neutro, nombre ("Galicia Visa crédito") y una X para quitar: Galicia Visa
crédito, Santander Mastercard crédito.
Debajo, un buscador de bancos (píldora Gris Cálido con lupa) y una lista corta de
resultados para agregar.
Pie fijo: label Musgo "2 tarjetas · podés cambiarlas desde Perfil" y botón primario
"Seguir".
```

### 3. Onboarding: primera respuesta interactiva

```text
Pantalla "¿Dónde comprás seguido?", paso 2 de 2 (sin tab bar). Header con el
indicador de 2 segmentos, los dos en Salvia.
Título "¿Dónde comprás seguido?" y subtítulo "Tocá un comercio y te mostramos con
qué te conviene pagar ahí hoy."
Arriba, un buscador de comercios. Debajo, chips agrupados por rubro con su ícono
(Supermercados: Coto, Día, Carrefour, Jumbo; Farmacias: Farmacity, Dr. Ahorro;
Combustible: YPF, Shell). Día y Farmacity están marcados (fondo Verde Bosque, texto
Blanco Hueso, check y una pequeña × para desmarcar).
Debajo de los chips, la tarjeta de decisión oscura para Farmacity (el último
tocado): "Te conviene" en Champán, "Santander Mastercard" en title-md,
"Te devuelven 15% en farmacias" y la razón "Hoy, miércoles, sin monto mínimo".
Abajo de la razón, label: "Tus topes arrancan sin base: se afinan con cada compra
que confirmes."
Pie fijo: label Musgo "2 comercios elegidos" y botón primario "Seguir".
```

### 4. Guardá tu perfil (crear cuenta)

```text
Hoja tipo page sheet "Guardá tu perfil" (manija arriba, X para cerrar).
Subtítulo: "Así no perdés tus medios ni tus comercios, y solo vos los ves."
Campos con etiqueta arriba: "Tu nombre" (valor "Sofía", ayuda: "Es el que ven tus
contactos"), "Email", "Contraseña" (con ojo para mostrar).
Una línea Musgo con candado: "Nunca te pedimos claves del banco ni números de tarjeta."
Pie fijo: botón primario "Crear cuenta" y un botón de texto "Ya tengo cuenta".
```

### 5. Revisá tu email

```text
Hoja "Revisá tu email" (manija y X).
Ícono de sobre en círculo Gris Cálido. Título "Te mandamos un email".
Texto: "Abrí el link que mandamos a sofia@ejemplo.com para confirmar tu cuenta.
Tus medios y comercios quedan guardados en este teléfono hasta que entres."
Pie fijo: botón primario "Ya confirmé, entrar" y botón de texto "Reenviar email".
```

### 6. Inicio: sin comercio elegido

```text
Pantalla "Inicio" con la tab bar de 3 ítems (Compras · Inicio · Topes), Inicio
activa al centro con píldora Salvia clara detrás del ícono.
Encabezado: "Hola, Sofía" (title-lg) y debajo "Hoy es miércoles 5 de noviembre";
arriba a la derecha, un avatar circular de 44 pt con la "S" (Salvia, letra Blanco
Hueso) que abre Perfil.
Tarjeta Lino "¿Dónde vas a comprar?" con subtítulo "Tocá el comercio y te decimos
con qué pagar", un buscador y chips de sus comercios: Día, Farmacity, Coto, YPF.
Sección "Tus topes" con chip "Se reinician en 25 días" y dos tarjetas cortas en dos
columnas (Galicia: "≈$6.500 de tope · según 3 compras"; Santander: "≈$2.100 · Queda
poco" en Ocre). Sección "Últimas compras" con 3 filas (comercio, medio, monto, día).
No hay acceso suelto para escanear tickets en esta pantalla.
```

### 7. Inicio: con respuesta y "Usar"

```text
La misma pantalla Inicio, con Coto tocado (chip activo Verde Bosque).
Debajo de la tarjeta de búsqueda aparece la tarjeta de decisión oscura Verde Bosque:
"Te conviene" (Champán), "Galicia Visa crédito" (title-md, con inicial "G" en círculo
Champán), "Te devuelven ≈$4.900" (display), razón "20% en supermercados los miércoles
· te quedan ≈$6.500 de tope", base "según 3 compras de noviembre".
Dentro de la tarjeta: un campo de monto opcional ("¿Cuánto vas a gastar?", con
"$24.500"), el botón primario de ancho completo "Usar Galicia" en Blanco Hueso con
texto Verde Bosque, y debajo un link "Ver detalle y otras opciones ›".
El resto de la pantalla (topes, últimas compras) sigue debajo.
```

### 8. Inicio: con una compra por confirmar

```text
La pantalla Inicio justo después de tocar "Usar Galicia": arriba, un aviso tipo
toast "Pagá con Galicia. Cuando pagues, confirmala." que se va solo.
Primera tarjeta de la pantalla, en Lino con borde 1.5 pt Salvia, "Por confirmar":
inicial "C" de Coto en círculo neutro, "Coto · $24.500", debajo "Pagá con Galicia
Visa crédito · hace 2 min".
Tres acciones: botón primario "Ya pagué" (ancho completo dentro de la tarjeta), y en
una fila debajo, un botón secundario con borde "Escanear ticket" y un botón de texto
"Descartar".
Una línea Musgo: "No cuenta para tus topes hasta que la confirmes."
Debajo sigue la tarjeta "¿Dónde vas a comprar?" ya sin comercio elegido, y los topes
iguales que antes.
```

### 9. Compras (pestaña)

```text
Pantalla "Compras" con la tab bar de 3 ítems, Compras activa a la izquierda.
Título title-lg "Compras".
Sección "Por confirmar" con la tarjeta de Coto de la pantalla anterior (versión
compacta: comercio, monto, medio, y las acciones "Ya pagué" · "Escanear" · "Descartar").
Dos filas de acción (fondo Lino, ícono en círculo, chevron): "Escanear ticket —
Leemos el ticket y descartamos la foto" y "Cargar a mano — Comercio, monto y con
qué pagaste".
Resumen del mes en Lino: "Gastaste $182.300" y "Te devolvieron ≈$15.200" con la base
"según 9 compras de noviembre".
Filtros como control segmentado: Todas · Ticket · Recomendación · A mano.
Historial agrupado por día ("Hoy", "Ayer", "Lunes 3"), cada fila con inicial del
comercio, nombre, medio, monto y un badge de origen de 12 px. Una de las filas tiene
la marca "Sin subir" en Ocre (compra guardada que todavía no llegó a la cuenta).
```

### 10. Revisá tu compra: desde "Ya pagué"

```text
Hoja page sheet "Revisá tu compra" (manija y X), abierta desde la compra por
confirmar de Coto.
Subtítulo: "Confirmá la compra que pagaste con el medio que te recomendamos."
Campos editables con lápiz: Comercio "Coto", Monto "$24.500", Fecha con dos chips
"Hoy" (seleccionado) y "Ayer, cuando simulaste" (este caso es de otro día).
Sección "¿Con qué pagaste?" con filas de medio: Galicia Visa crédito seleccionada
(fondo Gris Cálido, borde Salvia, radio relleno, detalle "Te devuelven ≈$4.900"),
Santander y Cuenta DNI sin seleccionar.
Bloque Salvia clara: "Promo aplicada: 20% en supermercados los miércoles" con un link
"Quitar".
Pie fijo: botón primario "Guardar compra" y label Musgo "Tus topes se actualizan al
guardar."
```

### 11. Revisá tu compra: desde el ticket, sin medio

```text
Hoja "Revisá tu compra" abierta después de escanear el ticket de la compra por
confirmar de Coto.
Arriba, una miniatura ilustrada del ticket (líneas) y "Sacamos estos datos del
ticket. Corregí lo que no esté bien."
Campos: Comercio "COTO C.I.C.S.A.", Monto "$23.870", Fecha "Hoy".
Aviso en Ocre claro con texto Ocre: "Simulaste $24.500; el ticket dice $23.870."
Sección "¿Con qué pagaste?" con el aviso Musgo "El ticket no dice el medio de pago."
NINGÚN medio seleccionado (todos los radios vacíos con borde #6A7A70). La fila de
Galicia lleva una etiqueta pequeña "El que elegiste al simular".
Pie fijo: botón primario "Guardar compra" DESHABILITADO, con label "Elegí con qué
pagaste para guardar."
```

### 12. Escanear: ¿es tu compra por confirmar?

```text
Pantalla de escaneo a pantalla completa (fondo oscuro de cámara, visor con esquinas)
y, encima, una hoja chica que se ajusta al contenido (manija y X):
título "¿Es tu compra por confirmar en Coto?", detalle "Coto · $24.500 · Galicia ·
hace 40 min".
Botón primario "Sí, es esa" y botón de texto "No, es otra compra".
```

### 13. Descartar compra por confirmar

```text
Hoja chica ajustada al contenido sobre Inicio (fondo con scrim):
título "¿Descartar la compra en Coto?", texto "No se registra nada y tus topes
quedan igual."
Botón primario en Óxido "Descartar" y botón de texto "Cancelar".
```

### 14. Perfil (desde el avatar)

```text
Pantalla "Perfil" como pantalla hija con header nativo (flecha de volver a la
izquierda, título "Perfil"), SIN tab bar visible porque se abrió desde Inicio.
Tarjeta Lino con avatar "S", nombre "Sofía" con un lápiz para editar y "Nombre que
ven tus contactos"; debajo "3 medios · 2 comercios · 1 contacto".
Secciones: "Tus medios" (filas con inicial y nombre, botón "Agregar"), "Dónde comprás
seguido" (chips con × para quitar y "Agregar"), "Contactos" (fila de Lucía,
"Vinculado", botón "Invitar a alguien"), "Cuenta" (texto de privacidad, "Entraste
como sofia@ejemplo.com", botón de texto "Cerrar sesión").
```

### 15. Topes (pestaña, solo la tab bar nueva)

```text
La pantalla "Topes" existente, con la tab bar nueva de 3 ítems y Topes activa a la
derecha (ícono Salvia sobre píldora Salvia clara). Título "Topes", chip "Los
mensuales se reinician en 25 días", "Te devolvieron ≈$15.200 · según 9 compras", y
una tarjeta por medio con su barra (tramo final rayado por ser estimado). Sin total
sumado de topes. El estado vacío dice "Todavía no confirmaste compras" y su botón
lleva a la pestaña Compras.
```

## Lista de control (por cada pantalla generada)

- [ ] Tab bar de **3** ítems en el orden Compras · Inicio · Topes, con Inicio al
      centro. En hojas y en Perfil no se ve.
- [ ] Un solo botón primario, de una línea y en el pie. Nada tapado.
- [ ] Todo tope con ≈ y su base, y ningún total sumado.
- [ ] «Por confirmar», nunca «pendiente», para la compra simulada.
- [ ] En Revisá desde el ticket sin medio, **ningún** medio seleccionado.
- [ ] Sin colores de marca, logos, campanas ni rótulos en mayúsculas.
- [ ] Fechas de noviembre de 2026 y nombres de ejemplo (Sofía, Lucía).
- [ ] Texto mínimo de 12 px y áreas táctiles de 44 pt.

Cuando estén aprobadas, exportar las capturas a `docs/design/screens/` con el
prefijo `012-` y anotar los IDs de Stitch en la issue.
