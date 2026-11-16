# Research: Sugerir el comercio del catálogo

## R1. Parecido por escritura: comparación propia, sin Fuse.js

- **Decisión**: una función propia de distancia de edición (Damerau-Levenshtein: letras de más, de menos, cambiadas o invertidas) sobre los nombres limpios, con un parecido de `1 - distancia / largo del más largo`. Se compara el nombre del catálogo, sin espacios, contra el nombre leído entero y contra cada tramo de palabras seguidas del mismo largo, y vale el mejor. Umbral inicial: **0,8**, con un largo mínimo de 4 letras para comparar por parecido (los nombres más cortos solo entran por contenido, R3).
- **Por qué**: son unas 30 líneas, sin dependencias, determinísticas y fáciles de explicar en un test («Carrefur» está a 1 letra de «Carrefour»: 0,89). Los casos de la spec son errores de una o dos letras, que es justo lo que mide esta distancia. El umbral se lee directo como «cuántas letras de diferencia se aceptan».
- **Alternativas**: Fuse.js 7.5.0 (sin dependencias, pero su puntaje mezcla posición y largo del patrón, y el umbral es más difícil de razonar y de fijar en un test); trigramas (mejor para textos largos, peor para nombres de una palabra); búsqueda semántica con un modelo (descartada por el usuario y por la constitución: costo, red y no determinística).

## R2. Ajuste del umbral con una lista aparte

- **Decisión**: el umbral se ajusta con una **lista de ajuste** propia del test (nombres distintos de los anexos de la spec: «Jumb», «Farmasity», «Mostasa», «Grido Helados», «Dexter Suc 3», «Kiosco Lucho», «Almacén Rosa», etc.). Los anexos A y B se usan solo para medir SC-001 y SC-002, en un test aparte que no se toca al ajustar.
- **Por qué**: lo pide spec-critic (hallazgo 3): si el umbral se ajusta con la lista que lo mide, la medición se cumple sola.

## R3. Nombre limpio y contenido por palabras enteras

- **Decisión**: limpiar con la misma base que `claveDeComercio` (sin mayúsculas, tildes ni espacios de más) y además sacar formas societarias (`s.a.`, `sa`, `s.r.l.`, `srl`, `s.a.s.`, `sas`, `c.i.c.s.a.`, `cicsa`, `saciei`, `s.a.c.i.e.i.`), las palabras `suc`, `sucursal`, todos los dígitos y toda la puntuación. Se aplica igual al nombre leído y a los nombres del catálogo («Open 25» y «Open25» dan «open»). «Contenido» es que las palabras del nombre del catálogo aparezcan seguidas dentro de las del nombre leído.
- **Por qué**: las palabras enteras evitan que «Vea» aparezca dentro de «aveava»; limpiar los dos lados evita que los números del catálogo impidan coincidir.

## R4. Buscar en el texto del ticket

- **Decisión**: para cada línea del texto (ya con los datos personales tapados), su versión limpia; un comercio del catálogo de 4 letras o más entra si sus palabras aparecen seguidas dentro de alguna línea; uno de 3 letras o menos, solo si la línea limpia es exactamente su nombre. Orden: el de la primera línea donde aparece.
- **Por qué**: resuelve razón social vs. marca sin una lista cargada a mano, y la regla de la línea entera para los cortos evita «Día» en «día de la semana» (spec, *Edge Cases*).

## R5. Rendimiento

- **Decisión**: limpiar el catálogo una sola vez (memo por catálogo) y cortar la distancia de edición apenas supera la cota del umbral. Con 1.000 comercios y 60 líneas, la búsqueda en el texto es lineal y el parecido se calcula solo contra el nombre leído.
- **Por qué**: SC-005 (menos de 100 ms en la computadora de los tests).

## R6. El campo «Comercio» avisa cuando el usuario termina de escribir

- **Decisión**: sumar `onBlur` al componente `Field` (lo pasa al `TextInput`). «Revisá» guarda el texto en el que se buscó por última vez y recalcula las sugerencias en `onBlur` y al abrir con ticket. Mientras el usuario escribe, el recuadro no se muestra.
- **Por qué**: FR-009 y la definición de «terminar de escribir» de la spec. Cerrar el teclado también dispara `onBlur`.

## R7. El rubro elegido vale hasta que cambie el texto

- **Decisión**: un estado `elegido: { nombre, categoriaId } | null` en «Revisá». Al tocar una sugerencia se guarda; cualquier cambio del texto lo borra. El `categoriaId` con el que se calcula la promo es el elegido; si no hay, el que ya calcula la pantalla (el que vino de la recomendación o de la compra por confirmar, mientras el texto no cambie).
- **Por qué**: hoy `revisa.tsx` descarta el rubro apenas cambia el nombre (hallazgo 1 de spec-critic), así que elegir «Coto · Tecnología» volvería a Supermercados.
