# Capturas del deck

Capturas de la app web (Inicio v10, modo oscuro, 390×844) del martes 17/11/2026, sobre `main`
con la rama del #112 (onboarding sin cuenta) y el #147 ya mergeados. Supabase local, 3180
promos bajadas por la ingesta real de MODO y una cuenta de prueba con Galicia Visa crédito.

| Archivo | Pantalla | Slide (paso) |
|---|---|---|
| `bienvenida.jpg`, `primera-respuesta.jpg` | Empezar sin cuenta | 6 (1 y 2) |
| `inicio.jpg`, `comprar.jpg`, `monto.jpg`, `recomendacion.jpg`, `pagar.jpg` | Decidir | 7 (1 a 5) |
| `escanear.jpg`, `revisa.jpg` (carga a mano), `compras.jpg`, `topes.jpg` | Registrar y controlar | 8 (1 a 4) |
| `grupo-contactos.jpg`, `grupo-invitar.jpg`, `grupo-armar.jpg`, `grupo-resultado.jpg` | Gasto en grupo | 9 (1 a 4) |
| `medios.jpg` | Elegir tarjetas en el onboarding (sin usar en el deck) | — |

Todas son de 618×1336 px. Cada slide de pantallas muestra **un teléfono** y cambia de imagen
a cada `→`; el «toque» que se ve antes del cambio sale del atributo `data-tap` (x,y en % de
la pantalla) de la imagen de destino, en `vuelto-mvp.html`. Si se reemplaza una captura por
otra con otro layout, hay que ajustar ese `data-tap`.

Las capturas de grupo se sacaron el 17/11 con dos cuentas locales: «Martín» (Galicia Visa
crédito, con la compra de Natural Life de $40.000) y «Lucía» (Comafi Visa crédito), vinculadas
como contactos. El resultado es una cuenta real del servidor: 20% en Natural Life para los
dos, ≈$8.000, «te conviene pagar vos» por empate.

## Qué compras hay detrás de las capturas

Tres compras del 16 y 17/11, todas con Galicia Visa crédito:

- ChangoMás, $90.000 (lunes 16): ≈$18.000.
- Coto, $90.000 (martes 17, 25% sin tope): ≈$22.500. Es la de `revisa.jpg`.
- Natural Life, $40.000 (martes 17, 25% con tope de $15.000 por mes): ≈$10.000.

Con la de Natural Life ya guardada, `recomendacion.jpg` recomienda el **20%** y no el 25%:
al 25% le quedan ≈$5.000 de tope (se ve en `topes.jpg` e `inicio.jpg`), y 20% de $40.000
rinde más. Es la demostración del tope compartido; conviene repetirla en vivo.

## Limitaciones

- `revisa.jpg` se sacó cargando a mano: la función del ticket (Groq) no corre en local. Para
  mostrar una lectura real hay que sacar la foto desde el celular.
- `revisa.jpg` es de la compra de Coto porque esa promo no tiene tope. Con un tope sin compras
  de base, esa pantalla muestra «…cuánto te queda.. Hasta que guardes…» (coma, mayúscula y
  doble punto): un defecto de redacción de la app, sin corregir.
- «Por qué no los otros» con más de un medio no está capturada: la cuenta de prueba tiene un
  solo medio. `recomendacion.jpg` muestra «Otras opciones» con otra promo del mismo medio.
