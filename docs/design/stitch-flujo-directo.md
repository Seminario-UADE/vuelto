# Prompts de Stitch: flujo directo (spec 012) con el diseño v6

> Para generar en Stitch las pantallas del flujo directo
> (`specs/012-flujo-directo/`) con la dirección visual v6: esmeralda, en
> claro y en oscuro (`docs/design/DESIGN.md`, `direccion-visual-v6.md`).

## Cómo usarlo

1. En el proyecto de Stitch, cargá `docs/design/DESIGN.md` (v6) como design
   system, o pegalo en la primera conversación.
2. Pegá el **prompt base** una vez.
3. Generá cada pantalla **de a una**, primero en **oscuro**, y después pedí
   la variante clara con el prompt de variante («Tema claro»). Así cada tema
   se compone por separado y no es una inversión.
4. Revisá cada resultado contra la «Lista de control» antes de seguir.

## Prompt base (pegar una vez)

```text
Vamos a diseñar la app mobile Vuelto (iPhone, 390×844 pt) siguiendo al pie de la letra
el design system cargado (DESIGN.md v6). Todo en español rioplatense, de vos.

Vuelto le dice al usuario con qué medio de pago pagar en una compra concreta y cuánto
tope de reintegro le queda. No lista promociones.

Visual:
- Dos temas compuestos de la misma paleta esmeralda. Vamos a hacer cada pantalla primero
  en OSCURO: fondo #051F20, superficies elevadas #0B2B26 y #163832 (lo elevado es más
  claro), texto crema #F3EBD6, texto secundario #A3B5A8, único acento Salvia clara
  #8EB69B con texto #02110C encima.
- La decisión ("Te conviene…") es la ÚNICA superficie invertida: una tarjeta crema
  #F3EBD6 con texto #02110C y el botón "Usar [medio]" en Oliva #1A422F con texto crema.
- Hanken Grotesk, montos con cifras tabulares, large titles nativos de iOS.
- Tarjetas y listas agrupadas con radio de 16 pt; píldoras solo en botones, chips y
  círculos. Nunca una tarjeta dentro de otra; el contenido de lista va en listas
  agrupadas (una tarjeta con filas y divisores), no en tarjetas sueltas.
- Tab bar NATIVA de iOS 26 (la píldora flotante de vidrio del sistema) con tres ítems,
  Compras · Inicio · Topes, Inicio al centro, tint Salvia clara. Perfil se abre desde
  un avatar arriba a la derecha de Inicio.
- Sin degradés, sin glow, sin neón, sin glassmorphism propio, sin violetas ni azules,
  sin negro puro, sin anillos de progreso, sin gráficos, sin tarjetas de "número grande
  + etiqueta + estadísticas".

Flujo:
- En Inicio, tus comercios habituales son una fila de círculos (como acciones rápidas).
  Tocás uno y aparece la tarjeta de decisión crema con "Usar Galicia".
- "Usar" NO registra la compra: la deja "por confirmar" (todavía no pagaste) y no
  descuenta tope. Después la confirmás con "Ya pagué" o escaneando el ticket.
- El onboarding son 2 pasos: tus medios y "¿Dónde comprás seguido?" (tocás un comercio
  y ves la respuesta real). La cuenta se crea al final ("Guardá tu perfil").

Reglas que no se rompen:
- Todo tope lleva ≈ y su base ("≈$6.500 de tope · según 3 compras de noviembre"). Sin
  compras no hay cifra. Nunca un total sumado de topes. Los topes se muestran con una
  barra que termina en un tramo rayado (estimado).
- Un solo botón primario por pantalla, de una línea, en un pie fijo que no tapa nada.
- Iniciales de bancos y comercios en círculos neutros, sin colores de marca ni logos.
- Datos: hoy es miércoles 11 de noviembre de 2026; el usuario es Martín; medios Galicia
  Visa crédito, Santander Mastercard crédito, Provincia Visa débito y Macro Visa débito;
  habituales Coto, Día, Farmacity, YPF. Los topes mensuales se reinician en 20 días.
- Nada de campanas, badges decorativos ni rótulos en MAYÚSCULAS.

Te voy a pedir las pantallas de a una. No generes nada todavía.
```

## Prompt de variante (después de cada pantalla aprobada)

```text
Ahora la misma pantalla en TEMA CLARO, compuesta (no invertida): fondo crema #F3EBD6,
superficies #EAE1C8 y #DFD5B9, texto #02110C, secundario #4E6656 (solo sobre fondo y
superficie; sobre #DFD5B9 usá #02110C), acento Oliva #1A422F con texto crema. La
tarjeta de decisión pasa a ser la superficie invertida oscura: fondo #051F20, texto
crema, razón en #A3B5A8 y botón "Usar" en Salvia clara #8EB69B con texto #02110C.
Mismo layout, mismo contenido.
```

## Pantallas

### 1. Bienvenida

```text
Pantalla "Bienvenida" (sin tab bar). Fondo liso, sin ilustraciones.
Arriba a la izquierda, el logo de Vuelto en un cuadrado redondeado de 72 pt.
Título title-lg: "Pagá con el medio que más te devuelve".
Debajo, en texto secundario: "Tocás dónde estás comprando y te decimos con qué pagar.
También llevamos la cuenta de cuánto tope te queda."
Lista agrupada con tres filas, cada una con ícono en círculo #163832: "Con qué pagar
en cada comercio, hoy", "Cuánto tope te queda, estimado según tus compras", "Sin
conectar tu banco ni pedir tus claves".
Pie fijo: botón primario "Empezar", debajo un botón de texto "Ya tengo cuenta" y un
label centrado "Son dos pasos. La cuenta la creás al final."
```

### 2. Onboarding: ¿Con qué pagás?

```text
Pantalla "¿Con qué pagás?", paso 1 de 2 (sin tab bar). Header nativo con back y un
indicador de progreso de 2 segmentos (el primero en acento).
Large title "¿Con qué pagás?" y subtítulo "Buscá tu banco y elegí el tipo de tarjeta y
la red."
Lista agrupada con las tarjetas agregadas, una por fila con la inicial del banco en
círculo neutro, "Galicia Visa crédito" y una X para quitar: Galicia Visa crédito,
Santander Mastercard crédito.
Debajo, un buscador de bancos (campo #163832 con lupa) y una lista corta de resultados.
Pie fijo: label "2 tarjetas · podés cambiarlas desde Perfil" y botón primario "Seguir".
```

### 3. Onboarding: ¿Dónde comprás seguido?

```text
Pantalla "¿Dónde comprás seguido?", paso 2 de 2 (sin tab bar), indicador con los dos
segmentos en acento.
Large title y subtítulo "Tocá un comercio y te mostramos con qué te conviene pagar ahí hoy."
Una fila de círculos de 56 pt con inicial y nombre debajo, igual que en Inicio: Coto,
Día, Carrefour, Farmacity, YPF y "Buscar" con lupa. Coto y Farmacity están marcados
(círculo en acento con la letra oscura y una × chica para desmarcar); Coto es el último
tocado (anillo de 2 pt alrededor).
Debajo, la tarjeta de decisión crema para Coto: "Te conviene" en label, "Galicia Visa
crédito" con inicial en círculo Oliva, "20% en supermercados los miércoles" en
title-md (sin cifra porque no hay monto), la razón "Hoy es miércoles · tope de $10.000
por mes" y la línea "Tus topes arrancan sin base: se afinan con cada compra que
confirmes."
Pie fijo: label "2 comercios elegidos" y botón primario "Seguir".
```

### 4. Guardá tu perfil

```text
Hoja del sistema (page sheet) "Guardá tu perfil", con manija y X.
Subtítulo: "Así no perdés tus medios ni tus comercios, y solo vos los ves."
Campos sobre #163832 con etiqueta arriba: "Tu nombre" (valor "Martín", ayuda "Es el que
ven tus contactos"), "Email", "Contraseña" (con ojo).
Línea secundaria con candado: "Nunca te pedimos claves del banco ni números de tarjeta."
Pie fijo: botón primario "Crear cuenta" y botón de texto "Ya tengo cuenta".
```

### 5. Revisá tu email

```text
Hoja "Revisá tu email" (manija y X). Ícono de sobre en círculo #163832.
Título "Te mandamos un email". Texto: "Abrí el link que mandamos a martin@ejemplo.com
para confirmar tu cuenta. Tus medios y comercios quedan guardados en este teléfono
hasta que entres."
Pie fijo: botón primario "Ya confirmé, entrar" y botón de texto "Reenviar email".
```

### 6. Inicio: sin comercio elegido

```text
Pantalla "Inicio" con la tab bar nativa (Compras · Inicio · Topes), Inicio activa.
HERO de borde a borde sobre #0B2B26 (no es una tarjeta): "Hola, Martín" en title-lg,
"Hoy es miércoles 11 de noviembre" en secundario, y a la derecha un avatar de 44 pt con
la "M". Debajo, "¿Dónde vas a comprar?" en title-md y la fila de círculos de comercios
(Coto, Día, Farmacity, YPF, Buscar), ninguno elegido.
Debajo del hero, sobre el fondo #051F20:
- "Tus topes" con el chip "Los mensuales se reinician en 20 días" y una lista agrupada
  con una fila por medio: "Galicia Visa crédito · ≈$6.500 de tope · según 3 compras"
  con su barra (tramo final rayado); "Santander · ≈$2.300 · Queda poco" con la barra en
  ocre #E2B65E; "Macro · Tope agotado" en óxido #EE8F84.
- "Últimas compras" en lista agrupada: 3 filas (inicial del comercio, nombre, medio y
  día en secundario, monto tabular a la derecha) y "Ver todas".
```

### 7. Inicio: con la decisión y «Usar»

```text
La misma pantalla Inicio con Coto elegido (círculo en acento). Dentro del hero, debajo
de la fila de comercios, aparece la tarjeta de decisión CREMA #F3EBD6:
"Te conviene" (label #4E6656), "Galicia Visa crédito" (title-md, inicial "G" en
círculo Oliva), "Te devuelven ≈$4.900" en display #02110C, razón "20% en supermercados
los miércoles · te quedan ≈$6.500 de tope", base "según 3 compras de noviembre".
Dentro de la tarjeta: campo de monto opcional con "$24.500", botón de ancho completo
"Usar Galicia" en Oliva #1A422F con texto crema, y debajo el link "Ver detalle y otras
opciones ›".
Los topes y las últimas compras siguen debajo del hero.
```

### 8. Inicio: con una compra por confirmar

```text
La pantalla Inicio justo después de "Usar Galicia". Arriba, un toast del sistema
"Pagá con Galicia. Cuando pagues, confirmala.".
El hero vuelve a su estado sin comercio elegido. Debajo del hero, lo primero es la
tarjeta "Por confirmar" sobre #0B2B26 con borde de 1.5 pt Salvia clara: inicial "C",
"Coto · $24.500", "Pagá con Galicia Visa crédito · hace 2 min", y la línea "No cuenta
para tus topes hasta que la confirmes."
Acciones: "Ya pagué" (primario de ancho completo) y, en una fila debajo, "Escanear
ticket" (secundario con borde) y "Descartar" (texto).
Debajo siguen los topes, iguales que antes.
```

### 9. Compras (pestaña)

```text
Pantalla "Compras" con la tab bar nativa, Compras activa. Large title "Compras".
Sección "Por confirmar" con la tarjeta de Coto (versión compacta).
Lista agrupada de acciones: "Escanear ticket — Leemos el ticket y descartamos la foto"
y "Cargar a mano — Comercio, monto y con qué pagaste", con ícono en círculo y chevron.
Una línea de resumen: "Gastaste $182.300 · te devolvieron ≈$15.200, según 9 compras
de noviembre".
Segmented control nativo: Todas · Ticket · Recomendación · A mano.
Historial en listas agrupadas por día ("Hoy", "Ayer", "Lunes 9"): inicial del comercio,
nombre, medio, monto tabular y un badge de origen de 12 pt. Una fila lleva el badge
"Sin subir" en ocre.
```

### 10. Revisá tu compra: desde «Ya pagué»

```text
Hoja del sistema "Revisá tu compra", abierta desde la compra por confirmar de Coto.
Subtítulo: "Confirmá la compra que pagaste con el medio que te recomendamos."
Campos editables con lápiz: Comercio "Coto", Monto "$24.500", Fecha con dos chips
"Hoy" (seleccionado) y "Ayer, cuando simulaste".
"¿Con qué pagaste?": filas de medio; Galicia Visa crédito seleccionada (fondo #163832,
borde 2 pt Salvia clara, radio relleno, detalle "Te devuelven ≈$4.900"); las demás sin
seleccionar con borde #5E8A70.
Bloque #1A422F con texto crema: "Promo aplicada: 20% en supermercados los miércoles" y
el link "Quitar".
Pie fijo: botón primario "Guardar compra" y label "Tus topes se actualizan al guardar."
```

### 11. Revisá tu compra: desde el ticket, sin medio

```text
Hoja "Revisá tu compra" después de escanear el ticket de la compra por confirmar.
Miniatura del ticket en líneas simples y "Sacamos estos datos del ticket. Corregí lo
que no esté bien."
Campos: Comercio "COTO C.I.C.S.A.", Monto "$23.870", Fecha "Hoy".
Aviso sobre #2B2410 con texto ocre #E2B65E: "Simulaste $24.500; el ticket dice $23.870."
"¿Con qué pagaste?" con la nota "El ticket no dice el medio de pago." NINGÚN medio
seleccionado (todos los radios vacíos). La fila de Galicia lleva una etiqueta chica
"El que elegiste al simular".
Pie fijo: "Guardar compra" DESHABILITADO, con el label "Elegí con qué pagaste para guardar."
```

### 12. Escanear: ¿es tu compra por confirmar?

```text
Escaneo a pantalla completa (visor de cámara con esquinas sobre negro verdoso #02110C)
y encima una hoja chica del sistema ajustada al contenido: "¿Es tu compra por
confirmar en Coto?", detalle "Coto · $24.500 · Galicia · hace 40 min".
Botón primario "Sí, es esa" y botón de texto "No, es otra compra".
```

### 13. Descartar compra por confirmar

```text
Hoja chica del sistema sobre Inicio: "¿Descartar la compra en Coto?", "No se registra
nada y tus topes quedan igual." Botón primario en óxido #EE8F84 con texto #02110C
"Descartar" y botón de texto "Cancelar".
```

### 14. Perfil (desde el avatar)

```text
Pantalla "Perfil" como pantalla hija: header nativo con back y large title "Perfil",
SIN tab bar.
Lista agrupada de encabezado: avatar "M", "Martín" con lápiz, "Nombre que ven tus
contactos" y "4 medios · 4 comercios · 2 contactos".
Secciones en listas agrupadas: "Tus medios" (filas con inicial y nombre, "Agregar"),
"Dónde comprás seguido" (chips con × y "Agregar"), "Contactos" (Lucía y Mateo,
"Vinculado", "Invitar a alguien"), "Cuenta" (texto de privacidad, "Entraste como
martin@ejemplo.com", "Cerrar sesión" en texto).
```

### 15. Topes (pestaña)

```text
Pantalla "Topes" con la tab bar nativa, Topes activa. Large title "Topes", chip "Los
mensuales se reinician en 20 días" y la línea "Te devolvieron ≈$15.200 · según 9
compras".
Segmented control: Mensuales · Semanales.
Lista agrupada con una fila por medio: nombre, "≈$6.500 de tope disponible", base
"según 3 compras de noviembre" y la barra con el tramo final rayado; Santander en ocre
con "Queda poco"; Macro en óxido con "Tope agotado". Sin total sumado, sin anillos.
```

## Lista de control (por cada pantalla y tema)

- [ ] Tab bar nativa de **3** ítems (Compras · Inicio · Topes), con Inicio al
      centro. En hojas y en Perfil no se ve.
- [ ] La tarjeta de decisión es la única superficie invertida: crema en
      oscuro, bosque en claro.
- [ ] Ninguna tarjeta dentro de otra, y las listas son agrupadas, no tarjetas sueltas.
- [ ] Un solo primario, de una línea, en el pie. Nada tapado.
- [ ] Todo tope con ≈ y su base, con barra rayada. Sin total sumado, anillos ni gráficos.
- [ ] «Por confirmar», nunca «pendiente».
- [ ] En Revisá desde el ticket sin medio, **ningún** medio seleccionado.
- [ ] Sin degradés, glow, violetas, azules, logos ni rótulos en mayúsculas.
- [ ] El tema claro está compuesto, no invertido, y el secundario no va sobre `#DFD5B9`.
- [ ] Texto mínimo de 12 pt y áreas táctiles de 44 pt.

Cuando estén aprobadas, exportar las capturas a `docs/design/screens/` con
los nombres `012-<pantalla>-oscuro.png` y `012-<pantalla>-claro.png`, y anotar
los IDs de Stitch en la issue #113.
