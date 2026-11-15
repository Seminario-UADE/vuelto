# Guion de la entrega del MVP — Vuelto (10 min + preguntas)

- **Fecha:** `[PENDIENTE: día y hora exactos de la entrega]` (a la semana del 14/11/2026).
- **Duración:** 10 minutos de exposición, sin contar preguntas.
- **Formato:** presencial, con proyector. La demo va en vivo desde el celular.
- **Deck:** [`vuelto-mvp.html`](vuelto-mvp.html), 13 slides. Abrirlo en el navegador y
  apretar `F` para pantalla completa. `D` cambia entre modo claro y oscuro (arranca
  con el del sistema), `T` prende un cronómetro, `←` `→` pasan de slide.
- `vuelto-avance.html`, `vuelto-avance-completa.html` y el guion anterior eran de las
  entregas parciales. No usarlos para esta entrega.

> **Regla del guion:** lo simulado se dice en voz alta, con la palabra «simulado».
> Los números salen de este documento y del deck; no se agrega ninguno de memoria.

## Reparto

| Persona | Slides | Tiempo |
|---|---|---|
| Joaquín | 1, 2, 11, 13 | 2:30 |
| Santiago | 3, 4, 12 | 2:00 |
| Agustín | 5, 6, 7, 8 | 2:20 |
| Jesús | 9, 10 | 2:35 |
| | **Total** | **9:25** |

Los 35 segundos que sobran son para los pases y para que Jesús cambie de la
presentación al celular.

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Joaquín | 0:10 |
| 2 | Problema y propuesta | Joaquín | 0:50 |
| 3 | Research: la encuesta | Santiago | 0:50 |
| 4 | Research: por qué MODO | Santiago | 0:35 |
| 5 | Arquitectura | Agustín | 0:55 |
| 6 | Ingesta automática | Agustín | 0:35 |
| 7 | Privacidad | Agustín | 0:30 |
| 8 | Plan B de la demo | Agustín | 0:20 |
| 9 | Demo en vivo | Jesús | 2:20 |
| 10 | Rediseño en claro y oscuro | Jesús | 0:15 |
| 11 | Estado real | Joaquín | 1:10 |
| 12 | Uso de IA | Santiago | 0:35 |
| 13 | Cierre | Joaquín | 0:20 |
| | **Total** | | **9:25** |

Si nos pasamos, se acorta en este orden: slide 4 (se resume en una frase), slide
12 (solo el primer bloque) y slide 10 (se muestra sin comentarla). **La slide 11 no
se acorta**: es la que dice qué es real y qué no.

---

## Joaquín — Apertura (slides 1 y 2, 1:00)

**Slide 1 · Portada** (0:10)
- Somos el equipo de Vuelto, del Seminario de Integración Profesional de UADE.
- Hoy mostramos el MVP: qué hace, cómo está armado y, sobre todo, qué funciona de
  verdad y qué todavía no.

**Slide 2 · Problema y propuesta** (0:50)
- Las promos bancarias cambian por día, billetera, banco y tarjeta. Y el tope de
  reintegro es mensual, compartido entre promos e invisible para el usuario.
- Resultado: se paga con el primer medio que aparece y se pierde plata sin darse
  cuenta. **No falta información, falta la decisión.**
- Vuelto hace dos cosas: **recomienda con qué medio pagar una compra concreta**, con
  el porqué, y **controla cuánto tope de reintegro queda**, siempre como estimado y
  con su base.
- No es un buscador de promociones. La recomendación sale de código determinístico
  sobre los medios que el usuario declaró.
- Pase: «Esto no es una intuición nuestra. Santiago cuenta los datos.»

## Santiago — Research (slides 3 y 4, 1:25)

**Slide 3 · La encuesta** (0:50)
- 51 respuestas, entre el 8 y el 20 de septiembre.
- **98%** pagó y se enteró después de que había una promo mejor (68,6% alguna vez,
  29,4% seguido).
- **47,1%** no lleva ningún control del tope. Solo **7,8%** lleva un registro exacto.
- Al elegir entre dos tarjetas, **68,6%** mira solo el mayor % de descuento. Solo
  **13,7%** mira si le queda tope.
- Lo que piden: **41,2%** quiere que la app diga «pagá con tal», y el buscador de
  promos quedó último con **15,7%**.
- **Decir el sesgo:** 62,7% tiene entre 18 y 25 años y la encuesta circuló por
  nuestros contactos. Valida que el problema existe, no dimensiona el mercado. Y el
  96,1% que dice que usaría la app es intención declarada, no comportamiento.

**Slide 4 · Por qué MODO** (0:35)
- Evaluamos 6 billeteras y bancos. **Tres quedaron bloqueadas:** Mercado Pago
  prohíbe el scraping en sus términos, y Santander y BBVA bloquean el acceso
  automatizado con un firewall.
- De las tres que sí se podían, elegimos **una sola: MODO**, para no mezclar
  ingesta automática con carga manual.
- MODO tiene una **API pública sin autenticación**, con **13 categorías** (el
  relevamiento del 21/9 contó ~1864 promos activas).
- Pase: «Con la fuente y el problema claros, Agustín cuenta cómo está armado.»

## Agustín — Arquitectura, ingesta, privacidad y plan B (slides 5 a 8, 2:20)

**Slide 5 · Arquitectura** (0:55)
- Cuatro piezas: la **API de MODO**, la **ingesta** (GitHub Actions, todos los días),
  **Supabase** (Postgres, Auth y RLS) y la **app Expo**.
- **El motor de reglas corre en el celular**: TypeScript puro, sin dependencias, sin
  red. La recomendación y los topes se calculan ahí, con datos que ya se
  sincronizaron.
- **Ningún modelo de lenguaje entra al motor.** El LLM solo extrae datos y siempre
  fuera del camino crítico: nunca decide qué medio de pago conviene.
- Decir el estado de las ramas con LLM: la que lee tickets (Groq) está hecha del lado
  del servidor pero la app todavía no la usa; la que lee la letra chica (Gemini)
  **no está hecha**.

**Slide 6 · Ingesta automática** (0:35)
- Todos los días, a las 06:00, un workflow baja las promos de MODO, las mapea **por
  código** y las publica en Supabase. Nadie las carga ni las revisa a mano.
- Corrida del 14/11: **3100 promos publicables**; 7 nuevas, 5 dadas de baja, 3093 sin
  cambios. Tardó unos 43 minutos.
- Lo que no se puede representar sin inflar un reintegro **se descarta solo**: 696
  por nivel de cliente (Selecta, Platinum…) y 18 por topes que el motor no modela.
- Decir los límites: de las últimas 10 corridas **fallaron 3** (6, 7 y 10/11); las
  últimas 4 pasaron. Y lo que está en la letra chica, como acumulabilidad y
  jurisdicción, queda en `null` en todo el corpus hasta que exista el extractor.
- No comparar las 3100 con las ~1864 de septiembre: se contaron con criterios
  distintos.

**Slide 7 · Privacidad** (0:30)
- **La imagen del ticket no se guarda.** Va del celular a una Edge Function y de ahí
  a Groq, en el mismo pedido, y se descarta. No toca disco ni Storage. En Groq está
  activado Zero Data Retention.
- Lo que sí se guarda es el texto extraído, con los datos personales tapados, y solo
  después de que el usuario lo confirma. Los registros de compra se retienen 90 días.
- Las keys de los extractores viven en el servidor: Groq en Supabase, Gemini en GitHub
  Actions. En el código de la app no hay ninguna.
- Decir lo que falta: **la auditoría formal de secretos y privacidad (#55) no se hizo**,
  y el borrado a los 90 días es una política, no un proceso corriendo.

**Slide 8 · Plan B de la demo** (0:20)
- Camino principal: Expo Go con el QR. Respaldo: un APK de EAS.
- `[PENDIENTE: el APK todavía no se construyó. Cuando exista, decir acá el modelo de
  celular donde se probó.]`
- Antes de entrar: ingesta del día en verde y migraciones aplicadas en la base
  alojada.
- Pase: «Jesús lo muestra funcionando.»

## Jesús — Demo y rediseño (slides 9 y 10, 2:35)

**Slide 9 · Demo en vivo** (2:20)
1. Entrar con la cuenta de demo. El perfil ya tiene medios de pago declarados.
2. Tocar el **«+»** (Comprar): elegir un comercio **con promo vigente ese día**,
   poner el monto y mostrar la recomendación con su porqué.
   `[PENDIENTE: comercio y monto de la demo, con una promo que aplique el día de la
   entrega. Coto, por ejemplo, tiene sus promos los lunes y los martes.]`
3. Tocar «Voy a pagar con…»: la compra queda **por confirmar** en Inicio.
4. Confirmarla en «Revisá tu compra». **Decir: acá la lectura del ticket es
   simulada**, el ticket que aparece es de ejemplo. Lo que se guarda después sí es
   real.
5. Ir a **Tus topes**: el tope aparece como estimado, con la cantidad de compras en
   que se basa.
6. Si hay tiempo: modo avión y repetir la recomendación. Corre en el celular.
   `[PENDIENTE: probarlo en un celular real; hoy no hay evidencia.]`

- **Decir en voz alta antes de cerrar la demo:** el gasto en grupo existe en la app
  pero con **datos de ejemplo**: los contactos y las invitaciones no están en el
  servidor. No lo mostramos como funcionando.

**Slide 10 · Rediseño** (0:15)
- Mostrar las capturas en claro y oscuro. La app sigue el modo del sistema o se fija
  en Perfil → Apariencia.
- `[PENDIENTE: capturas de la v9.1. Las que hay en docs/design son de la v8, con
  paleta crema, y no representan la app actual.]`
- Pase: «Esto es lo que se ve. Joaquín dice qué hay detrás.»

## Joaquín — Estado real y cierre (slides 11 y 13, 1:30)

**Slide 11 · Estado real** (1:10) — la slide que no se acorta.
- **Funciona de punta a punta:** la ingesta diaria, la sincronización al celular, el
  motor en la app con recomendación y topes, la cuenta con RLS, y registrar la
  compra. Detrás hay 1260 tests en verde y un CI con seis chequeos.
- **Simulado (decirlo con esa palabra):** la lectura del ticket en la app devuelve un
  ticket de ejemplo y no usa la cámara. El gasto en grupo usa contactos de ejemplo.
- **Falta:**
  - El extractor de la letra chica con Gemini (#51).
  - Medir la precisión del lector de tickets y del extractor (#10, #53): no hay
    informe, así que **no tenemos una cifra de precisión**. Probamos la función con
    3 tickets reales y leyó bien los 3, pero con 3 no se mide nada.
  - El build de respaldo (#56) y la auditoría de secretos (#55).
  - Conectar la app a la función que lee tickets (#49). La función (#48) está en un
    PR abierto (#133).
- `[PENDIENTE: confirmar el día de la entrega si el PR #133 está mergeado y si las
  migraciones de la base alojada están al día (issue #127).]`

**Slide 13 · Cierre** (0:20)
- Hecho: problema validado con datos, una fuente automática andando todos los días,
  un motor determinístico en la app y una demo real.
- Sigue: conectar el ticket, el extractor de letra chica y medir su precisión, y el
  gasto en grupo con datos reales.
- Frase final: «Vuelto decide con código, mide con datos y dice lo que todavía no
  hace. Gracias, ¿preguntas?»

## Santiago — Uso de IA (slide 12, 0:35)

- **En el producto**, el LLM extrae datos y no decide. Hoy: Groq lee tickets (función
  hecha, app sin conectar). Gemini leerá la letra chica (pendiente). El motor no
  tiene LLM.
- **Para construir**, usamos Claude Code con spec-kit: specify, spec-critic, plan,
  tasks, implement, code-review y test-runner. Hay agentes de revisión y un CI en cada
  PR.
- **Con una persona decidiendo:** alcance y arquitectura los confirma el equipo, y
  cada sesión queda en la bitácora (55 entradas), con los errores de la IA incluidos.
- Está todo declarado en `docs/uso-de-ia.md`.

---

## Preguntas probables

- **¿El ticket se lee de verdad?** Del lado del servidor sí: la función lee un ticket
  con Groq y se probó con 3 reales. En la app todavía no: la pantalla devuelve un
  ticket de ejemplo.
- **¿Qué precisión tiene el lector?** No la medimos. Falta el informe (#10). No
  decimos un número.
- **¿Y el extractor de promos?** No existe todavía (#51, #53). Hoy las promos entran
  por el mapeo por código de los datos estructurados de MODO.
- **¿El gasto en grupo anda?** La pantalla sí, con contactos de ejemplo. No hay tablas
  ni función de grupo en el servidor (#54, #130).
- **¿Por qué el LLM no recomienda el medio de pago?** Rompe el determinismo y los
  tests. La recomendación sale de código que se puede verificar.
- **¿Publicar promos sin revisión humana no es arriesgado?** Es una decisión
  aceptada (ADR-005): si falta un campo obligatorio, la promo no se publica. El
  riesgo se mide con el informe de precisión, que todavía no está.
- **¿Por qué solo MODO?** Mercado Pago prohíbe el scraping, Santander y BBVA lo
  bloquean. De las otras tres elegimos una para no mezclar automático con manual.
- **¿Qué pasa con las fotos de tickets?** No se guardan. Se mandan a Groq y se
  descartan. Se guarda el texto extraído, con datos personales tapados, y el
  usuario lo confirma.
- **¿La encuesta representa a todos?** No: 62,7% tiene entre 18 y 25 años y llegó por
  nuestros contactos. Valida que el problema existe.
- **¿Son 4 y la materia pide 6 a 8?** Está pendiente de confirmar con la cátedra.

## Antes de entrar (lista de control)

- [ ] Pestaña **Actions** de GitHub: la última *Ingesta de promociones* en verde.
- [ ] Migraciones de la base alojada al día: `supabase migration list --linked`
      (issue #127: ya pasó que quedaron atrasadas).
- [ ] Cuenta de demo con perfil cargado y promos sincronizadas, probada en el celular
      que se va a usar.
- [ ] Comercio y monto de la demo con promo vigente ese día.
- [ ] APK de respaldo instalado en un Android, o `[PENDIENTE]` dicho al equipo.
- [ ] Deck abierto en modo claro u oscuro según el proyector, y un ensayo completo con
      cronómetro (`T`). Es un criterio de aceptación de la issue #131.

## Pendientes de este material

Las secciones marcadas `[PENDIENTE: …]` están también al final del PR.

1. Día y hora exactos de la entrega.
2. Capturas de la v9.1 en claro y oscuro (Inicio, recomendación, topes y compras).
3. Build de respaldo (APK de EAS), su link y el celular donde se probó (#56).
4. Comercio y monto de la demo, con promo vigente el día de la entrega.
5. Prueba en modo avión en un celular real.
6. Confirmar si el PR #133 está mergeado y si las migraciones están al día (#127).
7. Ensayo completo antes de la fecha.
8. Si llegan los informes de precisión del lector de tickets (#10) y del extractor
   (#53), sumarlos al deck. Hoy no están y no se citan.
