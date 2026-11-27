# Guion del pitch — versión keynote (UADE Startup 2026)

Texto para decir, slide por slide, con [`vuelto-keynote.html`](vuelto-keynote.html). Sigue la
guía de la cátedra: comercial (fuera de los 8 min) → 8:00 de pitch en 7 partes → 3:00 de
preguntas. El mismo texto está en las notas de cada slide: se ve con `N` (abajo, para ensayar) o
en la vista de presentador (`P`, en la notebook).

> **Regla del guion:** no hay que decirlo de memoria palabra por palabra; sí hay que respetar
> los números y los tiempos. Ningún número se agrega de memoria: todos salen de los docs del
> repo. Lo que falta se dice en voz alta.

**Cómo leerlo:** `→` es apretar la flecha (o el clicker). *(Pausa)* es un silencio de un
segundo. Lo que está entre corchetes es una indicación, no se dice.

## Tiempos

| Parte | Quién | Slides | Dura | Al terminar, el cronómetro marca |
|---|---|---|---|---|
| Comercial | — (da play Joaquín) | 1 | 0:40 | (no cuenta) |
| 1 · Storytelling | Joaquín | 2–5 | 0:50 | 0:50 |
| 2 · Producto y valor | Joaquín | 6–8 | 1:00 | 1:50 |
| 3 · Experiencia UX/UI | Jesús | 9–11 | 1:00 | 2:50 |
| 4 · Demo del MVP | Jesús | 12 | 1:40 | 4:30 |
| 5 · Arquitectura | Agustín | 13–14 | 1:20 | 5:50 |
| 6 · Inteligencia artificial | Santiago | 15–16 | 1:10 | 7:00 |
| 7 · Cierre bilingüe | Santiago | 17–18 | 1:00 | 8:00 |

Con `T` el cronómetro arranca: la cuenta de cada parte se pone ámbar en los últimos 10 s y roja
si nos pasamos. Medido a un ritmo normal (unas 145 palabras por minuto), todas las partes
entran con margen para las pausas, salvo la 6, que queda justa en 1:10. Si vamos atrasados, se
recorta de las partes 2, 5 y 6 (las frases marcadas *[recortable]*). **La demo y el cierre en inglés no se recortan**: los pide la guía.

---

## Antes del pitch · Comercial (slide 1)

[Joaquín aprieta `Espacio` y espera a que termine. No se habla encima del video.]

> Hoy pasa el video de 1:26 (`videos/Vuelto_profesional_final_v2.mp4`). Va el comercial nuevo
> de 40 s como máximo cuando esté.

---

## 1 · Storytelling — Joaquín (0:50)

**Slide 2 · Portada** (0:05) → [al terminar el video]

Buenas noches. Somos Vuelto.

**Slide 3 · La compra** (0:15) →

Un martes cualquiera, en una dietética. Pagás $40.000 con la tarjeta de siempre.
Reintegro: cero. *(Pausa)*

**Slide 4 · Lo que perdiste** (0:15) →

Ese mismo martes, con otra tarjeta, te devolvían $8.000. Había un 20% de reintegro. Y nadie te
avisó.

**Slide 5 · 98%** (0:15) →

Y no es mala suerte. Encuestamos a 51 personas: a 50 les pasó. El 98% se enteró de una promo
mejor **después** de pagar.

## 2 · Producto y valor — Joaquín (1:00)

**Slide 6 · El problema real** (0:20) →

El problema no es que falten promos: hay de sobra, y cambian todos los días según el banco, la
billetera y la tarjeta. Lo que falta es la decisión, en el momento de pagar. Y hay algo que
nadie te muestra: el tope de reintegro, que se comparte entre promos y se agota.

**Slide 7 · Qué hace Vuelto** (0:20) →

Vuelto hace dos cosas. Te dice con qué medio pagar esa compra, cruzando las tarjetas y
billeteras que tenés. Y te dice cuánto tope te queda, como un estimado y con su base.
*[recortable:]* Todo sin conectar el banco.

**Slide 8 · Lista vs respuesta** (0:20) →

¿Por qué nos elegirían? Las apps de promos te dan una lista y te dejan el trabajo a vos.
Vuelto te da una respuesta: pagá con esta tarjeta, te vuelven $8.000.
Jesús les muestra cómo se usa.

## 3 · Experiencia UX/UI — Jesús (1:00)

**Slide 9 · Sin cuenta** (0:20) →

Gracias, Joaquín. Tomamos tres decisiones de interfaz. La primera: se prueba sin crear una
cuenta. Elegís tus tarjetas y ya ves con qué pagar; la cuenta se pide al final, cuando querés
guardar. Así bajamos la barrera de entrada.

**Slide 10 · Una respuesta** (0:20) →

La segunda: una pregunta, una respuesta. Ponés el comercio y el monto, y la pantalla te dice qué
medio usar y cuánto vuelve. Arriba y grande, la respuesta; las otras opciones quedan abajo, para
quien las quiera ver.

**Slide 11 · El tope** (0:20) →

La tercera: el tope, siempre con su base. No mostramos una cifra falsamente precisa: decimos
«aproximadamente» y en cuántas compras se basa. Preferimos un estimado honesto a una sorpresa a
fin de mes. Ahora, la app funcionando.

## 4 · Demo del MVP — Jesús (1:40)

**Slide 12 · Demo** → [`Espacio` para dar play. El video no tiene sonido: se narra en vivo.
Abajo a la izquierda corre la cuenta de 100 s.]

> **[PENDIENTE: ajustar los segundos a la grabación real.]** El recorrido de abajo es el que
> conviene grabar. Grabarla contra la base alojada, para que el ticket lo lea Groq de verdad; si
> en la grabación el ticket se carga a mano, no decir «lo leyó».

| Video | Se dice |
|---|---|
| 0:00–0:12 | Esta es la app real, con las promociones que nuestra ingesta baja todos los días. Arranco sin cuenta: elijo mis tarjetas. |
| 0:12–0:28 | Es martes y estoy en Natural Life. Elijo el comercio y pongo $40.000. |
| 0:28–0:50 | Acá está lo interesante. Hay una promo del 25%, pero a su tope le queda poco: ya la usé este mes. Entonces Vuelto me recomienda la del 20%, que me devuelve más. Esto no lo hace ninguna lista de promos, y se calcula en el celular, sin red. |
| 0:50–1:04 | Toco «voy a pagar». La compra queda pendiente: no cuenta en el tope hasta que la confirme. |
| 1:04–1:26 | Saco la foto del ticket. La foto no se guarda: se lee y se descarta. La app me muestra lo que leyó —comercio, monto y medio— y yo lo confirmo. |
| 1:26–1:40 | Y el tope se actualiza: cuánto me queda, estimado, y en qué compras se basa. Le paso a Agustín, que les cuenta cómo funciona por dentro. |

## 5 · Arquitectura — Agustín (1:20)

**Slide 13 · Arquitectura**, paso 1 (0:20) →

Gracias, Jesús. Por dentro, Vuelto tiene un camino crítico sin ningún modelo de lenguaje. Todos
los días, una ingesta en GitHub Actions lee la API pública de MODO y publica las promociones en
Supabase, una base Postgres con seguridad por fila. Nadie las carga a mano.

→ paso 2 (0:15)

La app, hecha en Expo, sincroniza esas promos y corre el motor de reglas en el celular. Por eso
responde sin red, y siempre igual para los mismos datos.

→ paso 3 (0:10)

La foto del ticket va a una Edge Function que la lee con Groq. Lee, no decide.

→ paso 4 (0:10)

Y el gasto en grupo es otra Edge Function, con el mismo motor.

**Slide 14 · Tres decisiones** (0:25) →

Detrás hay tres decisiones. El motor está escrito en TypeScript puro, sin dependencias, y
probado con tests. La recomendación y los topes se calculan en el momento, a partir del estado de
la app: no se guardan, así que nunca quedan desactualizados. *[recortable:]* Y la seguridad está
desde la tabla: cada tabla nace con sus reglas de acceso, y las claves de los servicios nunca
viajan al celular.

## 6 · Inteligencia artificial — Santiago (1:10)

**Slide 15 · IA en el producto** (0:40) →

Gracias, Agustín. La inteligencia artificial tiene un lugar acotado en el producto: leer el
ticket. Usamos Groq, con el modelo qwen3.8-27b, y la respuesta está atada a un esquema: monto,
fecha, comercio y medio de pago. Lo que el ticket no dice vuelve vacío, nunca inventado.
Lo medimos con cinco tickets reales: acertó monto, fecha y comercio en los cinco. Es una muestra
chica, y lo decimos así. También encontramos límites: *[recortable:]* al principio leía la
razón social en vez del nombre del local, y una vez dejó ver el nombre de un mozo; ajustamos la
instrucción. El
usuario siempre confirma, y la IA nunca decide con qué pagar.

**Slide 16 · IA para desarrollar** (0:30) →

Para desarrollar usamos Claude Code con spec-kit. Pero la calidad no se la creemos a la IA: hay
1804 tests y 7 chequeos automáticos antes de cada cambio, y cada pull request lo revisa una
persona. Registramos 78 sesiones de trabajo con IA, con sus errores. El alcance y la
arquitectura los decide el equipo, por escrito.

## 7 · Cierre bilingüe — Santiago (1:00)

**Slide 17 · Cierre en español** (0:30) →

Hoy Vuelto es un MVP que funciona. Validamos el problema: el 98% lo vivió. La app baja más de
3000 promociones reales todos los días, sin que nadie las cargue. Aprendimos que el tope es lo
que nadie ve, y que un estimado con su base vale más que una cifra exacta falsa. Lo que sigue:
probarlo con más usuarios, leer la letra chica con IA y sumar bancos y billeteras.
Pero esto recién empieza…

**Slide 18 · Closing in English** (0:30) → [más despacio que en español]

Every purchase has a right way to pay. Vuelto finds it first — before you pay.
Today, we have a working MVP for shoppers in Argentina. Tomorrow, we want every bank, every
wallet and every refund cap in one simple decision.
Pay smart. Get it back. Thank you!

[Silencio, mirar al jurado y esperar la primera pregunta.]

---

## Preguntas del jurado (3:00)

La guía dice que todos tienen que poder responder sobre todo el MVP, no solo su parte. Igual,
para no pisarnos, cada área tiene quien arranca:

| Área | Arranca | Si no sabe, sigue |
|---|---|---|
| Negocio (problema, mercado, propuesta de valor) | Joaquín | Santiago |
| Producto (experiencia, validación, funcionalidades) | Jesús | Joaquín |
| Desarrollo (frontend, backend, base, integración) | Agustín | Jesús |
| Evolución (seguridad, escalabilidad, IA, próximos pasos) | Santiago | Agustín |

Respuestas cortas: una frase, el dato y listo. Si no sabemos algo, se dice.

**Negocio**
- *¿Quién paga por esto?* `[PENDIENTE: definir el modelo de negocio que vamos a decir]`.
- *¿En qué se diferencia de las apps de los bancos?* Cada banco muestra sus promos. Vuelto cruza
  todos tus medios y además lleva el tope que compartís entre promos.

**Producto**
- *¿Hay que crear una cuenta?* No para probar: se pide al guardar.
- *¿Qué tan preciso es el tope?* Es un estimado, y se muestra así: depende de las compras que
  registrás.
- *¿Cómo lo validaron?* Encuesta de 51 respuestas y 5 tickets reales medidos. Falta probarlo con
  más usuarios.

**Desarrollo**
- *¿Por qué el motor en el celular?* Responde sin red y siempre igual para los mismos datos.
- *¿De dónde salen las promos?* De la API pública de MODO, todos los días, sin carga manual ni
  revisión humana: si falta un dato obligatorio, la promo no se publica.
- *¿Por qué no le preguntan a un modelo con qué pagar?* Rompe el determinismo y los tests: la
  misma compra tiene que dar siempre la misma respuesta.

**Evolución**
- *¿Y los datos personales?* La foto del ticket no se guarda: se manda a Groq, que no la retiene,
  y se descarta. Cada tabla tiene sus reglas de acceso; las claves no están en el celular.
- *¿Escala?* La ingesta y el motor no dependen de cuántos usuarios haya; sumar fuentes sin API es
  el trabajo grande.
- *¿Qué falta?* Leer la letra chica con IA, medir la lectura con más tickets y el chequeo de
  salud de la ingesta.

## Antes de entrar

- [ ] Comercial nuevo (≤ 40 s) cargado en la slide 1.
- [ ] `entrega/Startup_DemoMVP.mp4` en su lugar: la slide 12 tiene que mostrar el video, no el
      aviso de «Falta la grabación».
- [ ] Probar el audio del comercial en el proyector.
- [ ] Notebook con dos pantallas: el deck en el proyector (`F`) y la vista de presentador (`P`)
      en la notebook. Probarlo una vez antes: las dos ventanas tienen que moverse juntas.
- [ ] La app abierta en un celular: la guía pide tener el MVP disponible para que el jurado lo
      verifique.
- [ ] Última ingesta en verde (pestaña Actions del repo).
- [ ] Ensayo completo con `T`, pases incluidos, hasta que dé 8:00.
