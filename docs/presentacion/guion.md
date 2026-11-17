# Guion de la entrega del MVP — Vuelto (10 min + preguntas)

- **Fecha:** `[PENDIENTE: día y hora exactos de la entrega]`.
- **Duración:** 10 minutos de exposición, sin contar preguntas.
- **Formato:** presencial, con proyector. **Sin demo en vivo**: el recorrido de la app se
  muestra con capturas animadas (un teléfono por slide, paso a paso) de la app del 17/11.
  Ver «Qué son las capturas» en las preguntas probables.
- **Deck:** [`vuelto-mvp.html`](vuelto-mvp.html), 14 slides. Abrirlo en el navegador y
  apretar `F` para pantalla completa. `D` cambia entre claro y oscuro, `T` prende un
  cronómetro, `←` `→` pasan de slide.
- **La slide 1 es el video de presentación** (`videos/Vuelto_profesional_final_v2.mp4`,
  1:26, con audio). En esa slide **`Espacio` o `K` reproducen y pausan**; al pasar de slide
  se pausa solo. Probar el audio del proyector antes de entrar.
- En `videos/` quedan además los videos de redes y las dos versiones de voz del profesional.
- `vuelto-avance.html` y `vuelto-avance-completa.html` son de las entregas parciales. El
  research (encuesta, fuentes) ya se presentó ahí: acá va en una frase.

> **Regla del guion:** lo que falta se dice en voz alta. Los números salen del deck y de
> este documento; no se agrega ninguno de memoria.

## Reparto

| Persona | Slides | Habla |
|---|---|---|
| Joaquín | 1 (da play), 2, 3, 4, 5, 6, 7 | 3:05 |
| Jesús | 8, 9 | 1:50 |
| Agustín | 10, 11 | 1:40 |
| Santiago | 12, 13, 14 | 1:40 |
| | **Total hablado** | **8:15** |
| | **Con el video (1:26)** | **9:41** |

Quedan unos 0:19 de margen para pases. Cada uno abre diciendo en una frase de qué parte se
hace cargo.

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Video de presentación | Joaquín (da play) | 1:26 |
| 2 | Portada | Joaquín | 0:10 |
| 3 | El problema y la solución | Joaquín | 0:40 |
| 4 | Qué vamos a ver (agenda) | Joaquín | 0:15 |
| 5 | Empezar sin cuenta (2 pasos) | Joaquín | 0:30 |
| 6 | Decidir (5 pasos) | Joaquín | 0:50 |
| 7 | Registrar y controlar (4 pasos) | Joaquín | 0:40 |
| 8 | Gasto en grupo (4 pasos) | Jesús | 0:50 |
| 9 | Estado real | Jesús | 1:00 |
| 10 | Cómo funciona por dentro | Agustín | 0:50 |
| 11 | Ingesta y privacidad | Agustín | 0:50 |
| 12 | Avances desde la entrega anterior | Santiago | 0:50 |
| 13 | Uso de IA | Santiago | 0:30 |
| 14 | Cierre | Santiago | 0:20 |

Si nos pasamos: se acorta la 13 (solo el primer bloque), la 11 y la 12 (dos de los cuatro
avances). **La 9 no se acorta**: es la que dice qué es real y qué falta.

### Cómo se maneja el deck

- `→` / `←` (o el clicker) pasan de slide. En las slides 5 a 8 **cada `→` avanza un paso
  dentro del teléfono**: primero aparece el «toque» sobre el botón y después cambia la
  pantalla, como en vivo. `←` retrocede un paso. Se puede tocar el teléfono para avanzar.
- Un paso a la vez: la lista de la izquierda marca en qué pantalla se está y explica solo
  esa. No hay que leer las slides; alcanzan los títulos.
- `Espacio` o `K` reproducen el video en la slide 1.
- Para saltar a una slide o paso: `vuelto-mvp.html#6.3` (slide 6, paso 3).

---

## Joaquín — Apertura y recorrido de la app (slides 1 a 7, 3:05 + video)

**Slide 1 · Video.** Dar play (1:26) y esperar a que termine antes de hablar.

**Slides 2 y 3 · Problema y solución** (0:50)
- Hoy no repetimos el research: mostramos la app funcionando.
- **El problema:** las promos cambian por día, billetera, banco y tarjeta, y el tope de
  reintegro es mensual, compartido e invisible. **No falta información, falta la decisión.**
- **La solución:** Vuelto **recomienda con qué medio pagar** una compra concreta y
  **controla cuánto tope queda**, como estimado y con su base.
- Un dato de la encuesta (51 respuestas, ya presentada): 98% se enteró de una promo mejor
  después de pagar.

**Slide 4 · Qué vamos a ver** (0:15). Tres bloques: cómo se usa (esto lo hago yo y sigue
Jesús con el grupo), por dentro (Agustín) y dónde estamos (Jesús, Agustín y Santiago).

**Slide 5 · Empezar sin cuenta** (0:30)
1. Bienvenida: sin cuenta y sin conectar el banco.
2. Primera respuesta: se elige un comercio y la app dice con qué pagar hoy. La cuenta se
   crea al final (#112).

**Slide 6 · Decidir** (0:50). El caso del 17/11: Natural Life, 25% los martes con tope de
$15.000.
1. Inicio: lo devuelto este mes y el tope que queda (≈$5.000 después de una compra de
   $40.000).
2. Comprar y 3. Monto: se elige el comercio y se pone cuánto se va a pagar.
4. Recomendación: **al 25% le queda poco tope y conviene el 20%**. Esto es lo que
   ninguna lista de promos hace. Se calcula en el celular, sin red.
5. «Voy a pagar»: queda por confirmar y no cuenta en los topes hasta entonces.

**Slide 7 · Registrar y controlar** (0:40)
1. Escanear el ticket: la foto no se guarda, se lee y se descarta.
2. Revisá tu compra: comercio, monto y medio; lo confirma el usuario. La captura es una
   carga a mano, porque el lector de tickets (Groq) no corre en local.
3. Tus compras y 4. Tus topes: estimado, con las compras en que se basa.

## Jesús — Gasto en grupo y estado real (slides 8 y 9, 1:50)

**Slide 8 · Gasto en grupo** (0:50)
1. Contactos: solo se ve el nombre y qué medio conviene en cada compra.
2. Invitar: QR o link, una sola vez; no se comparten compras ni tarjetas.
3. Armar el grupo: contactos vinculados y gente sin cuenta.
4. Resultado: quién conviene que pague y cuánto pone cada uno. Lo calcula una función del
   servidor con el mismo motor, sin modelo de lenguaje. En la captura dan lo mismo
   (≈$8.000), por eso «te conviene pagar vos».

**Slide 9 · Estado real** (1:00)
- **Funciona de punta a punta:** ingesta y sincronización, motor en la app, probar sin
  cuenta y crearla al final (#112), perfil y compras con RLS, registrar la compra con la
  foto y gasto en grupo con contactos vinculados.
- **En curso:** detalles del gasto en grupo (#138, #139), chequeo de salud de la ingesta
  (#52).
- **Falta:** extractor de letra chica (#51); medir la precisión del lector de tickets y
  del extractor (#10, #53): **no tenemos una cifra**, y probar la función con 3 tickets no
  mide nada; auditoría de secretos (#55); APK de respaldo (#56). El borrado a los 90 días
  es una política, no un proceso corriendo.

## Agustín — Por dentro (slides 10 y 11, 1:40)

**Slide 10 · Arquitectura**
- API de MODO → ingesta diaria → Supabase → app Expo. **El motor corre en el celular**,
  sin red.
- **Ningún modelo de lenguaje entra al motor.** Groq lee tickets y ya se usa desde la app;
  la lectura de letra chica con Gemini **no está hecha**.
- El gasto en grupo es otra Edge Function que usa el mismo motor, sin LLM.

**Slide 11 · Ingesta y privacidad**
- Corrida del 15/11: **3151 promos publicables**, 696 descartadas por nivel de cliente y
  18 por topes que el motor no modela. Unos 43 minutos.
- De las últimas 10 corridas **fallaron 2** (7 y 10/11); las últimas 5 pasaron.
- La foto del ticket va celular → Edge Function → Groq (Zero Data Retention) y se
  descarta. Se guarda el texto extraído, y solo cuando el usuario confirma.
- Acumulabilidad y jurisdicción quedan en `null` hasta el extractor de letra chica.

## Santiago — Avances, IA y cierre (slides 12 a 14, 1:40)

**Slide 12 · Avances** (0:50). Recorrer los cuatro *antes → ahora*:
- **Ticket:** antes devolvía uno de ejemplo; ahora se saca la foto, la lee Groq y se
  confirma en «Revisá tu compra». La foto no se guarda.
- **Gasto en grupo:** antes eran contactos de ejemplo; ahora se invita por QR o link,
  los contactos quedan vinculados y el cálculo lo hace una función del servidor.
- **Empezar:** antes había que crear la cuenta para probar; ahora se prueba sin cuenta (#112).
- **Comercio:** el mismo local escrito distinto ya es uno solo (#147), y se sugiere el del
  catálogo que más se parece al del ticket.
- Números del pie: 1804 tests en verde (corrida local del 17/11), CI con 6 chequeos,
  83 PRs mergeados.

**Slide 13 · Uso de IA** (0:30)
- En el producto el LLM extrae datos y no decide: Groq lee tickets; Gemini leerá la letra
  chica (pendiente); el motor no tiene LLM.
- Para construir: Claude Code con spec-kit y agentes de revisión, una persona decide
  alcance y arquitectura, 64 sesiones en la bitácora con los errores de la IA.
- Todo está en `docs/uso-de-ia.md`.

**Slide 14 · Cierre** (0:20). Hecho y sigue, y la frase: «Vuelto decide con código, mide
con datos y dice lo que todavía no hace.» Gracias, ¿preguntas?

---

## Preguntas probables

- **¿El ticket se lee de verdad?** Sí: la app manda la foto a una Edge Function que la lee
  con Groq. No medimos la precisión (#10); no decimos un número.
- **¿Hay que crear una cuenta para probarla?** No: se eligen las tarjetas y se ve con qué
  pagar hoy; la cuenta se pide al guardar el perfil (#112).
- **¿El gasto en grupo anda?** Sí, con contactos vinculados por invitación. Quedan dos
  detalles abiertos (#138, #139).
- **¿Y el extractor de promos?** No existe (#51, #53). Las promos entran por el mapeo por
  código de los datos de MODO.
- **¿Por qué el LLM no recomienda?** Rompe el determinismo y los tests.
- **¿Publicar promos sin revisión humana no es arriesgado?** Decisión aceptada (ADR-011):
  si falta un campo obligatorio, la promo no se publica. El riesgo se mide con el informe
  de precisión, que no está.
- **¿Qué pasa con las fotos?** No se guardan: se mandan a Groq y se descartan.
- **¿Son 4 y la materia pide 6 a 8?** Pendiente de confirmar con la cátedra.
- **¿Qué son las capturas? ¿No hay demo en vivo?** Son capturas de la app (versión web,
  Supabase local, 3180 promos reales bajadas de MODO, cuentas de prueba) del 17/11, no de un
  celular. «Revisá tu compra» es una carga a mano y el grupo usa dos cuentas locales.

## Antes de entrar

- [ ] Pestaña **Actions**: la última *Ingesta de promociones* en verde. Al 17/11 (00:30) la
      última corrida registrada era la del 15/11: no figura la del 16/11, revisar por qué.
- [ ] Migraciones de la base alojada al día (`supabase migration list --linked`).
      **El chequeo `migraciones.yml` falló el 15 y el 16/11: cargar el secret
      `SUPABASE_DB_URL` en el repo o revisar a mano.** Además, la migración de contactos
      (`20261115000001`) tiene que estar aplicada o el gasto en grupo no funciona.
- [ ] Probar el video con audio en el proyector (slide 1, `Espacio`).
- [ ] Ensayo completo con cronómetro (`T`).

## Pendientes de este material

1. Día y hora de la entrega.
2. Prueba en modo avión en un celular real (no se muestra en el deck; solo se dice si preguntan).
3. Informes de precisión (#10, #53), si llegan.
