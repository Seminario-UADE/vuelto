# Guion de la entrega del MVP — Vuelto (10 min + preguntas)

- **Fecha:** `[PENDIENTE: día y hora exactos de la entrega]`.
- **Duración:** 10 minutos de exposición, sin contar preguntas.
- **Formato:** presencial, con proyector. **Demo en vivo desde el celular, con el deck como
  respaldo**: las slides 5 a 7 son capturas del mismo recorrido, y si la demo falla se
  sigue con ellas.
- **Deck:** [`vuelto-mvp.html`](vuelto-mvp.html), 12 slides. Abrirlo en el navegador y
  apretar `F` para pantalla completa. `D` cambia entre claro y oscuro, `T` prende un
  cronómetro, `←` `→` pasan de slide.
- `vuelto-avance.html` y `vuelto-avance-completa.html` son de las entregas parciales. El
  research (encuesta, fuentes) ya se presentó ahí: acá va en una frase.

> **Regla del guion:** lo que falta se dice en voz alta. Los números salen del deck y de
> este documento; no se agrega ninguno de memoria.

## Reparto

| Persona | Slides | Tiempo |
|---|---|---|
| Joaquín | 1, 2, 10, 12 | 2:00 |
| Santiago | 3, 11 | 1:20 |
| Jesús | 4, 5, 6, 7 | 3:45 |
| Agustín | 8, 9 | 1:40 |
| | **Total** | **8:45** |

Quedan 1:15 de margen para pases y para que Jesús cambie de la presentación al celular.

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Joaquín | 0:10 |
| 2 | El problema en una slide | Joaquín | 0:30 |
| 3 | Avances desde la entrega anterior | Santiago | 0:50 |
| 4 | Demo en vivo | Jesús | 3:00 |
| 5 | Pantallas: decidir | Jesús | 0:15 |
| 6 | Pantallas: registrar y controlar | Jesús | 0:15 |
| 7 | Pantallas: gasto en grupo | Jesús | 0:15 |
| 8 | Cómo funciona por dentro | Agustín | 0:50 |
| 9 | Ingesta y privacidad | Agustín | 0:50 |
| 10 | Estado real | Joaquín | 1:00 |
| 11 | Uso de IA | Santiago | 0:30 |
| 12 | Cierre | Joaquín | 0:20 |

Si nos pasamos: se acorta la 11 (solo el primer bloque), la 9 y la 2. **La 10 no se
acorta**: es la que dice qué es real y qué falta. Si la demo anda, las slides 5 a 7 se
pasan sin comentarlas.

---

## Joaquín — Apertura (slides 1 y 2, 0:40)

- Hoy no repetimos el research: mostramos la app funcionando.
- Las promos cambian por día, billetera, banco y tarjeta, y el tope de reintegro es
  mensual, compartido e invisible. **No falta información, falta la decisión.**
- Vuelto **recomienda con qué medio pagar** una compra concreta y **controla cuánto tope
  queda**, como estimado y con su base. Los datos de la encuesta (51 respuestas) ya se
  presentaron; un dato alcanza: 98% se enteró después de una promo mejor.

## Santiago — Avances (slide 3, 0:50)

Recorrer la tabla *antes → ahora*:
- **Ticket:** antes devolvía uno de ejemplo; ahora se saca la foto, la lee Groq y se
  confirma en «Revisá tu compra». La foto no se guarda.
- **Gasto en grupo:** antes eran contactos de ejemplo; ahora se invita por QR o link,
  los contactos quedan vinculados y el cálculo lo hace una función del servidor.
- **Comercio:** sugiere el del catálogo que más se parece al del ticket.
- **Topes en Inicio:** la torta suma solo lo que ya usaste este mes.
- **El porqué:** «Por qué no los otros» explica cada uno de tus medios.
- Números del pie: 1766 tests en verde, CI con 6 chequeos, 13 ADRs, 16 specs, 78 PRs.

## Jesús — Demo y pantallas (slides 4 a 7, 3:45)

**Slide 4 · Demo** (3:00)
1. Tocar **«+»**: elegir un comercio **con promo vigente ese día** y poner el monto.
   `[PENDIENTE: comercio y monto de la demo. Coto tiene sus promos los lunes y martes.]`
2. Mostrar la recomendación: medio, reintegro y tope que queda. Con **dos o más medios** en la cuenta de demo, abrir también **«Por qué no los otros»**.
3. «Voy a pagar con…»: la compra queda por confirmar en Inicio.
4. **Foto del ticket:** sacar la foto de un ticket real, revisar y guardar. Decir que la
   foto se descarta.
5. **Tus topes:** estimado, con la cantidad de compras en que se basa.
6. **Entre varios:** con un contacto ya vinculado, armar el grupo y ver quién conviene que
   pague. Dejar el contacto vinculado **antes** de entrar.
7. Si hay tiempo: modo avión y repetir la recomendación. `[PENDIENTE: probarlo en un
   celular real; hoy no hay evidencia.]`

**Slides 5, 6 y 7** (0:15 c/u): solo si la demo falló, o para dejar a la vista el
recorrido. Capturas de la app web del 16/11 (detalle en `assets/capturas/LEEME.md`).

## Agustín — Por dentro (slides 8 y 9, 1:40)

**Slide 8 · Arquitectura**
- API de MODO → ingesta diaria → Supabase → app Expo. **El motor corre en el celular**,
  sin red.
- **Ningún modelo de lenguaje entra al motor.** Groq lee tickets y ya se usa desde la app;
  la lectura de letra chica con Gemini **no está hecha**.
- El gasto en grupo es otra Edge Function que usa el mismo motor, sin LLM.

**Slide 9 · Ingesta y privacidad**
- Corrida del 15/11: **3151 promos publicables**, 696 descartadas por nivel de cliente y
  18 por topes que el motor no modela. Unos 43 minutos.
- De las últimas 10 corridas **fallaron 2** (7 y 10/11); las últimas 5 pasaron.
- La foto del ticket va celular → Edge Function → Groq (Zero Data Retention) y se
  descarta. Se guarda el texto extraído, y solo cuando el usuario confirma.
- Acumulabilidad y jurisdicción quedan en `null` hasta el extractor de letra chica.

## Joaquín — Estado real y cierre (slides 10 y 12, 1:20)

- **Funciona de punta a punta:** ingesta y sincronización, motor en la app, cuenta con
  RLS, registrar la compra con la foto y gasto en grupo con contactos vinculados.
- **En curso:** mismo comercio escrito distinto (#147, PR abierto), detalles del gasto en
  grupo (#138, #139), chequeo de salud de la ingesta (#52).
- **Falta:** extractor de letra chica (#51); medir la precisión del lector de tickets y
  del extractor (#10, #53): **no tenemos una cifra**, y probar la función con 3 tickets no
  mide nada; auditoría de secretos (#55); APK de respaldo (#56). El borrado a los 90 días
  es una política, no un proceso corriendo.
- Cierre: «Vuelto decide con código, mide con datos y dice lo que todavía no hace.»

## Santiago — Uso de IA (slide 11, 0:30)

- En el producto el LLM extrae datos y no decide: Groq lee tickets; Gemini leerá la letra
  chica (pendiente); el motor no tiene LLM.
- Para construir: Claude Code con spec-kit y agentes de revisión, una persona decide
  alcance y arquitectura, 64 sesiones en la bitácora con los errores de la IA.
- Todo está en `docs/uso-de-ia.md`.

---

## Preguntas probables

- **¿El ticket se lee de verdad?** Sí: la app manda la foto a una Edge Function que la lee
  con Groq. No medimos la precisión (#10); no decimos un número.
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

## Antes de entrar

- [ ] Pestaña **Actions**: la última *Ingesta de promociones* en verde.
- [ ] Migraciones de la base alojada al día (`supabase migration list --linked`).
      **El chequeo `migraciones.yml` falló el 15 y el 16/11: cargar el secret
      `SUPABASE_DB_URL` en el repo o revisar a mano.** Además, la migración de contactos
      (`20261115000001`) tiene que estar aplicada o el gasto en grupo no funciona.
- [ ] Cuenta de demo con perfil, promos sincronizadas y un contacto vinculado, probada en
      el celular que se va a usar.
- [ ] Comercio y monto de la demo con promo vigente ese día.
- [ ] Un ticket real en papel (o en pantalla) para la foto.
- [ ] Ensayo completo con cronómetro (`T`).

## Pendientes de este material

1. Día y hora de la entrega.
2. Comercio y monto de la demo.
3. Prueba en modo avión en un celular real.
4. Informes de precisión (#10, #53), si llegan.
