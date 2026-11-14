# Research: Registrar una compra con la foto del ticket

Decisiones técnicas del plan de la spec 014. Cada una: decisión, por qué y alternativas.

## R1. Librerías de Expo para la foto

- **Decisión**: sumar con `npx expo install` las versiones del SDK 58 de `expo-image-picker` (cámara y galería del sistema), `expo-image-manipulator` (achicar y pasar a JPEG) y `expo-file-system` (borrar las copias temporales). Configurar el plugin de `expo-image-picker` en `app.json` con los textos de permiso en castellano y `microphonePermission: false`.
- **Por qué**: las tres son oficiales de Expo, funcionan en Expo Go, en iOS, Android y web, y no hay que armar un visor propio (decisión 1 del usuario). La cámara del sistema muestra «Repetir» y «Usar foto» y, sin `saveToPhotos`, no agrega nada a la galería.
- **Alternativas**: `expo-camera` con visor propio (más código y otra pantalla); `react-native-vision-camera` (necesita build propia).

## R2. Preparar la foto: achicar, JPEG y base64 sin pasar por un archivo más

- **Decisión**: `ImageManipulator.manipulate(uri).resize({ width|height: 2000 })` sobre el lado mayor (solo si lo supera), `renderAsync()` y `saveAsync({ format: JPEG, compress: 0.8, base64: true })`. Si el base64 resultante decodifica a más de 2.500.000 bytes, se repite con `compress: 0.6`; si sigue pasando, `imagen_demasiado_grande` sin mandar (FR-004). El manipulador lee el HEIC del iPhone y lo convierte.
- **Por qué**: el base64 sale del mismo paso, sin leer el archivo de vuelta. El achicado igual deja un archivo temporal (lo crea el manipulador), que se borra en R4.
- **Alternativas**: leer el archivo con `expo-file-system` y codificarlo (un paso más y otro buffer en memoria); mandar el original (puede pesar 5 a 10 MB y el servicio lo rechazaría).

## R3. Llamar al servicio desde la app

- **Decisión**: `supabase.functions.invoke("extraer-ticket", { body: { imagen, tipo: "image/jpeg" } })`, que manda la sesión del usuario sola. La respuesta se traduce así:
  - éxito (200) → la lectura;
  - `FunctionsHttpError` → el estado y el cuerpo `{ error }` del contrato; un código que no está en el contrato → `interno`;
  - `FunctionsFetchError` (el pedido no llegó o la conexión se cortó) → sin conexión;
  - `FunctionsRelayError` → `interno`;
  - 30 s sin respuesta → `tardo_demasiado` (un `Promise.race` con un temporizador).

  La llamada vive en un módulo que recibe el cliente por parámetro, como `perfil/datos.ts`, y se testea con un cliente falso.
- **Por qué**: es el patrón del repo para hablar con Supabase (ADR-009); detectar "sin conexión" por el error del pedido cubre también el corte a mitad de camino, sin sumar una librería de estado de red.
- **Alternativas**: `fetch` a mano con la URL y el token (repite lo que hace `supabase-js`); `expo-network` para saber si hay red antes (no cubre el corte durante el pedido).

## R4. Borrar las copias temporales

- **Decisión**: la lectura junta las rutas de las copias (la del selector y la del manipulador) y las borra en un `finally`, con éxito, error o cancelación, antes de devolver el resultado. Al abrir «Escanear ticket» se vacían dos carpetas dentro del caché de la app: la del selector (`ImagePicker/`) y la del manipulador (`ImageManipulator/`), que la app no usa para nada más. Las rutas de web (`blob:` o `data:`) no se borran: no hay archivo. Un fallo al borrar se ignora (no puede dejar al usuario sin salida) y se reintenta en la próxima apertura.
- **Por qué**: cumple FR-007 y la constitución 3.0.2 en todos los caminos, y lo interrumpido se limpia solo. Borrar por la ruta que devolvió cada paso no depende de cómo nombra los archivos cada librería.
- **Alternativas**: mover las copias a una carpeta propia (un paso más con el archivo); confiar en que el sistema vacíe el caché (no tiene fecha).

## R5. Dónde va la lógica, para poder testearla

- **Decisión**: una carpeta nueva `src/ticket/` con módulos que no importan React Native ni Expo, y reciben lo nativo por parámetro:
  - `leer.ts`: la lectura completa (preparar → mandar → traducir → borrar), con la preparación, el borrado y la llamada inyectados;
  - `sugerencia.ts`: el cruce del medio leído con las tarjetas del perfil y los textos de FR-008;
  - `resultados.ts`: la tabla de FR-011 (mensaje y salidas de cada resultado);
  - `fechas.ts`: el rango de días de FR-010.

  Lo nativo (`camara.ts`: selector, manipulador y borrado con Expo) es un adaptador fino, sin lógica, como el `index.ts` de las Edge Functions.
- **Por qué**: los tests de la app corren en Node con Vitest y solo cubren `*.test.ts`; las pantallas no tienen tests. Así lo que importa (borrar siempre, cada mensaje, la sugerencia, el rango de fechas) se prueba sin celular.
- **Alternativas**: lógica dentro de las pantallas (no se podría probar).

## R6. El medio leído hasta «Revisá tu compra»

- **Decisión**: «Escanear ticket» le pasa a «Revisá» el medio leído en tres parámetros de texto (`medioRed`, `medioTipo`, `medioBanco`), en vez del `medio` (id de tarjeta) que pasa hoy el simulador. «Revisá» calcula la sugerencia con `sugerencia.ts` y el perfil del store. `TicketParaConfirmar` (de `data/por-confirmar.ts`) pasa de `medioId` a `medioSugeridoTicket` (el id sugerido o `null`), así el aviso de medio distinto se arma con la sugerencia y no con un medio marcado.
- **Por qué**: el medio nunca se marca (FR-008) y la sugerencia sale del perfil al momento de mostrarla. Los parámetros de una ruta de Expo Router son texto.
- **Alternativas**: guardar la lectura en el store (la spec pide no guardarla; el texto del ticket ya viaja por parámetro como hoy).

## R7. La fecha editable

- **Decisión**: un componente propio `selector-fecha.tsx` (una hoja con un calendario del mes, con los colores del tema), sin librería nueva. Los días fuera del rango de `fechas.ts` se ven deshabilitados. Reemplaza la lista de dos opciones de la spec 012 FR-017.
- **Por qué**: `@react-native-community/datetimepicker` no anda en web (la app se publica en vuelto.expo.app) y se ve distinto en cada sistema; un calendario propio respeta el diseño (DESIGN.md), se ve igual en las tres plataformas y su lógica (`fechas.ts`) se prueba en Node.
- **Alternativas**: un campo de texto con la fecha (fácil de escribir mal); la librería de la comunidad.

## R8. Escenarios de desarrollo

- **Decisión**: `api.leerTicket` (el simulador) pasa a devolver la forma nueva (`LecturaApp`, data-model) y se usa solo en los escenarios «Ticket ilegible», «Sin red» y el nuevo «Ticket de ejemplo» (con `VISA DEBITO`). En «Normal», «Escanear ticket» usa la cámara y `ticket/leer.ts`. El escenario se elige en Perfil, como hoy.
- **Por qué**: FR-012; la demo y los tests no gastan cupo de Groq, y la web sin cámara tiene un camino.
- **Alternativas**: un modo de demo aparte (duplica el selector de escenarios que ya existe).
