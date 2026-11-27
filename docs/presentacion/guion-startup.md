# Guion del pitch — UADE Startup 2026 (8 min + 3 de preguntas)

Sigue la guía de la cátedra («Preparamos nuestro pitch», 2.ª edición 2026). El guion de la
entrega del MVP del 17/11 sigue en [`guion.md`](guion.md).

- **Fechas:** lunes 30/11 y martes 1/12 (Salón Xperience) o miércoles 9/12 (Aula Magna).
  `[PENDIENTE: cuál nos toca]`.
- **Dinámica:** comercial (40 s, antes del pitch y fuera de los 8 min) → pitch con demo
  (8:00) → preguntas del jurado (3:00).
- **Deck:** [`vuelto-startup.html`](vuelto-startup.html), 9 slides. `F` pantalla completa,
  `D` claro u oscuro, `←` `→` pasan de slide. **`T` prende el cronómetro:** abajo el total
  y arriba a la derecha de cada slide la cuenta regresiva de esa parte (ámbar en los últimos
  10 s, rojo si nos pasamos); sin `T` el tiempo no se ve, porque es para nosotros y no para el
  jurado. En las slides de video, **`Espacio` o `K` reproducen y pausan**.
- **Corregir el texto sin tocar código:** `E` (o el botón «Editar») vuelve editable el texto de
  las slides; `Ctrl/Cmd+S` descarga el HTML corregido, que reemplaza a `vuelto-startup.html`.
  `Esc` sale. Después hay que regenerar el PDF.
- **Revisión de desbordes:** al cargar, el deck deja en la consola si algo se sale del 16:9;
  con `vuelto-startup.html?revisar` además marca en rojo la slide con problemas.
- La fuente de la marca (Hanken Grotesk) va en `assets/fonts/`: el deck se ve igual sin red.
- **Entrega (4 archivos):** [`entrega/`](entrega/LEEME.md).
- **Versión keynote:** [`vuelto-keynote.html`](vuelto-keynote.html), 18 slides con una idea
  por slide, mismo reparto y mismos tiempos (el cronómetro cuenta por parte, aunque una parte
  ocupe varias slides). Su guion palabra por palabra es
  [`guion-keynote.md`](guion-keynote.md), y el mismo texto va en las notas de cada slide. Además de los
  atajos de arriba: **`N`** muestra las notas abajo (para ensayar) y **`P`** abre la vista de
  presentador en otra ventana (slide actual, la que sigue, notas y tiempo de la parte); desde
  esa ventana también se pasan las slides. Con dos pantallas: la presentación en el proyector y
  la vista de presentador en la notebook. Su PDF es `entrega/Startup_Pitch_keynote.pdf`.
  Hay que elegir una de las dos versiones para entregar como `Startup_Pitch.pdf`.

> **Regla del guion:** lo que falta se dice en voz alta. Los números salen del deck y de los
> docs del repo; no se agrega ninguno de memoria.

## Pendientes antes del evento

1. **Comercial nuevo de 40 s como máximo** (`entrega/Startup_Comercial.mp4`). Mientras tanto
   la slide 1 pasa `videos/Vuelto_profesional_final_v2.mp4`, que dura 1:26: no cumple la guía.
   Al tenerlo, cambiar el `src` del `<video id="comercial">`.
2. **Grabación real de la demo** (`entrega/Startup_DemoMVP.mp4`): captura de pantalla de la
   app funcionando, sin voz, de 100 s como máximo. La guía prohíbe animaciones, prototipos y
   video generado con IA. Las capturas animadas del deck anterior **no** sirven acá. Al
   guardarla con ese nombre, el deck la toma sola; si falta, la slide 5 avisa que está
   pendiente.
3. Regenerar `entrega/Startup_Pitch.pdf` si cambia el deck (ver `entrega/LEEME.md`).

## Reparto (somos 4: la guía piensa en 6 o 7)

| # | Parte de la guía | Slide | Quién | Tiempo |
|---|---|---|---|---|
| — | Comercial | 1 | (se proyecta; da play Joaquín) | 0:40 |
| 1 | Apertura y storytelling | 2 | Joaquín | 0:50 |
| 2 | Producto y valor | 3 | Joaquín | 1:00 |
| 3 | Experiencia UX/UI | 4 | Jesús | 1:00 |
| 4 | Demo del MVP (video + narración en vivo) | 5 | Jesús | 1:40 |
| 5 | Arquitectura | 6 | Agustín | 1:20 |
| 6 | Inteligencia artificial | 7 | Santiago | 1:10 |
| 7 | Cierre bilingüe | 8 y 9 | Santiago | 1:00 |
| | **Total del pitch** | | | **8:00** |

Joaquín 1:50 · Jesús 2:40 · Agustín 1:20 · Santiago 2:10. No hay margen: los pases tienen que
ser de una frase («Jesús les muestra cómo se usa»). Si nos pasamos se acorta producto y
arquitectura; **la demo y el cierre en inglés no se tocan** (los pide la guía).

---

## Joaquín — Storytelling y producto (slides 2 y 3, 1:50)

**Slide 2 · Storytelling** (0:50)
- Un martes cualquiera, en la dietética: $40.000 con la tarjeta de siempre. Reintegro: cero.
  Después te enterás de que con otra tarjeta había 20%.
- No es mala suerte: las promos cambian por día, banco, billetera y tarjeta, y el tope de
  reintegro se comparte entre promos y nadie te dice cuánto queda.
- En nuestra encuesta (51 respuestas), el **98%** se enteró de una promo mejor después de
  pagar. **No falta información: falta la decisión.**

**Slide 3 · Producto y valor** (1:00)
- Vuelto **te dice con qué medio pagar** una compra concreta **y cuánto tope te queda**.
- Para quien paga con varias tarjetas y billeteras en el súper, la farmacia o la dietética.
  Sin conectar el banco.
- Por qué nos elegirían: las apps de promos te dan una lista; Vuelto te da una respuesta,
  cruzada con tus medios y con el tope que ya usaste. Y entre varios, quién conviene que
  pague. Pase: «Jesús les muestra cómo se ve».

## Jesús — UX/UI y demo (slides 4 y 5, 2:40)

**Slide 4 · Tres decisiones de interfaz** (1:00). Cada `→` pasa a la siguiente.
1. **Se prueba sin cuenta:** elegís tus tarjetas y ya ves con qué pagar. La cuenta se pide
   al final, para guardar (#112). Bajamos la barrera de entrada.
2. **Una respuesta, no una lista:** comercio y monto, y la pantalla dice qué medio usar y
   cuánto vuelve. Las otras opciones quedan abajo.
3. **El tope, con su base:** nunca una cifra falsamente precisa. «≈$X, según N compras».

**Slide 5 · Demo del MVP** (1:40). Dar play con `Espacio`. El video no tiene voz: se narra en
vivo, sincronizado. Abajo a la izquierda corre la cuenta de los 100 s.
`[PENDIENTE: escribir la narración paso a paso cuando esté la grabación]`. Recorrido sugerido:
probar sin cuenta → comprar en un comercio con promo → recomendación (al 25% le queda poco
tope, conviene el 20%) → «voy a pagar» → foto del ticket → revisar y confirmar → el tope
actualizado. Decir qué es real: la app con las promos que baja la ingesta todos los días.
Tener el MVP abierto para preguntas (la guía lo pide).

## Agustín — Arquitectura (slide 6, 1:20)

El diagrama se arma en 4 pasos: cada `→` enciende una parte. Cada flecha dice qué hace.

1. **Las promos** (0:20): la ingesta **lee a diario** la API pública de MODO y **publica** en
   Supabase (Postgres con RLS). Sin carga manual.
2. **La app** (0:20): la app Expo **sincroniza** promos y compras. **El motor de reglas corre
   en el celular**, sin red. Los puntos que se mueven son las promos viajando hasta la app.
3. **El ticket** (0:15): la app **manda la foto** a una Edge Function que la lee con Groq.
   Lee, no decide.
4. **El grupo y las decisiones** (0:25): el gasto en grupo es otra Edge Function con el mismo
   motor. Y tres decisiones (la fila de abajo):
   - **Motor en TypeScript puro, sin dependencias:** misma respuesta para los mismos datos, y
     se prueba con tests.
   - **Se deriva, no se guarda:** la recomendación y los topes salen de selectores sobre el
     estado de la app (Redux), no de una tabla.
   - **Seguridad desde la tabla:** RLS al crear cada tabla; las API keys nunca viajan al
     celular.

Las Edge Functions están fuera del camino crítico: solo donde hay un secreto (la key de Groq)
o datos de otros usuarios (el grupo).

## Santiago — IA y cierre bilingüe (slides 7 a 9, 2:10)

**Slide 7 · IA** (1:10). La guía pide evidencia, no «usamos IA». Recorrer la tabla por filas:
- **En el producto (escenario A):** Groq (`qwen3.8-27b`) lee la foto del ticket —monto,
  fecha, comercio y medio— en una Edge Function, con salida contra un esquema estricto. Lo
  que no está en el ticket vuelve vacío, no inventado.
- **Cómo se midió:** 5 tickets reales, acertó monto, fecha y comercio en los 5 y el medio en
  los 3 que lo traían (`docs/product/precision-extractor.md`). Es una muestra chica: un indicio.
- **Límites:** al principio leía la razón social en vez del local, y una vez dejó ver el
  nombre de un mozo; se ajustó la instrucción para tapar nombres.
- **Decisiones:** el usuario confirma lo leído, la foto no se guarda y **el motor no tiene
  LLM**: la recomendación sale de código.
- **Para desarrollarlo (escenario B):** Claude Code con spec-kit y agentes que revisan specs y
  corren tests. Calidad: CI con 7 chequeos y 1804 tests; cada PR lo revisa una persona. Los
  errores de la IA quedan en la bitácora (78 sesiones). Alcance y arquitectura los decide
  el equipo, con cada decisión escrita (`docs/decisions/`).

**Slide 8 · Cierre en español** (0:30)
> «Hoy Vuelto es un MVP que funciona: validamos el problema —el 98% lo vivió—, la app baja
> más de 3000 promos reales todos los días sin que nadie las cargue, y lee el ticket para
> llevar el tope al día. Aprendimos que no falta información: falta la decisión, y que el
> tope es lo que nadie ve. Lo que sigue: probarlo con más usuarios, leer la letra chica con
> IA y sumar más bancos y billeteras. Pero esto recién empieza…»

**Slide 9 · Closing in English** (0:30). No es una traducción: es la visión.
> "Every purchase has a right way to pay. Vuelto finds it before you pay.
> Today, we have a working MVP for shoppers in Argentina. Tomorrow, every bank, every
> wallet and every refund cap, in one simple decision.
> Pay smart. Get it back. Thank you!"

---

## Preguntas del jurado (todos responden, no solo su parte)

**Negocio**
- *¿Quién paga por esto?* `[PENDIENTE: definir el modelo de negocio que vamos a decir]`.
- *¿En qué se diferencia de las apps de los bancos o de las listas de promos?* Ellas muestran
  promos; Vuelto decide con tus medios y controla el tope compartido.

**Producto**
- *¿Hay que crear una cuenta?* No para probar: se pide al guardar (#112).
- *¿Qué tan preciso es el tope?* Es un estimado y se muestra con su base: depende de las
  compras registradas.
- *¿Cómo validaron?* Encuesta de 51 respuestas y 5 tickets reales medidos. Falta probarlo
  con más usuarios: lo decimos.

**Desarrollo**
- *¿Por qué el motor en el celular?* Responde sin red y siempre igual para los mismos datos.
- *¿De dónde salen las promos?* De la API pública de MODO, todos los días, sin carga manual
  ni revisión humana: si falta un dato obligatorio, la promo no se publica (ADR-011).
- *¿Por qué no le preguntan a un modelo con qué pagar?* Rompe el determinismo y los tests.

**Evolución**
- *¿Y los datos personales?* La foto del ticket no se guarda: se manda a Groq (Zero Data
  Retention) y se descarta. RLS en cada tabla; las keys no están en el celular.
- *¿Escala?* La ingesta y el motor no dependen de la cantidad de usuarios; sumar fuentes
  sin API es el trabajo grande.
- *¿Qué falta?* Leer la letra chica con Gemini (ADR-014), medir la lectura con más tickets,
  el chequeo de salud de la ingesta (#52).

## Checklist de la guía

- [x] Logo PNG listo y legible (`entrega/Startup_Logo.png`)
- [ ] Comercial MP4 probado (≤ 40 s)
- [ ] DemoMVP.mp4: captura real y validada
- [x] Pitch PDF (`entrega/Startup_Pitch.pdf`) · [ ] MVP funcional abierto el día del evento
- [x] Diagrama de arquitectura entendible
- [x] IA explicada con evidencia
- [ ] Cierre bilingüe ensayado
- [ ] Cada integrante puede responder preguntas de las 4 áreas
- [ ] Ensayo con `T`: los 8 minutos completos, pases incluidos
