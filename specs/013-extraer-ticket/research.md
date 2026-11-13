# Research: Leer los datos de un ticket a partir de su foto

Decisiones técnicas del plan de la spec 013. Cada una: decisión, por qué y alternativas.

## R1. Llamar a Groq con `fetch`, sin SDK

- **Decisión**: `POST https://api.groq.com/openai/v1/chat/completions` con `fetch` y un `AbortController` de 20 s que cubre también la lectura del cuerpo de la respuesta (FR-015). Modelo `qwen/qwen3.8-27b`, `temperature: 0`, `reasoning_effort: "none"`, sin `max_completion_tokens`, la imagen como `image_url` con un data URL (`data:<tipo>;base64,<imagen>`) y `response_format: { type: "json_schema", json_schema: { name: "lectura_ticket", strict: true, schema } }`.
- **Por qué**: el contrato de Groq es el de OpenAI y alcanza con un pedido HTTP. Sin dependencias nuevas: el workspace `supabase` no tiene `dependencies` y el `deno.json` solo mapea el motor y `supabase-js`. `temperature: 0` hace que la misma foto dé la misma lectura.
- **Aprendido en la prueba manual (13/11)**:
  - Sin `reasoning_effort: "none"`, el modelo "pensaba" antes de responder: unos 3.500 a 4.000 tokens por ticket. Apagado, unos 1.350 (971 de entrada y 300 a 400 de salida) y unos 2 segundos.
  - Con `max_completion_tokens: 1500`, Groq cortaba la transcripción a los 372 tokens, mucho antes del tope, y avisaba que había terminado normal. Sin tope salió completa (399 tokens). Por eso no se usa: la respuesta la acotan el corte de 20 s y el límite de salida por minuto.
  - Límites reales del plan gratis para este modelo: 7.000 tokens de entrada y 1.000 de salida por minuto (Groq estima unos 2.250 de entrada por foto antes de leerla), 200.000 por día, 30 pedidos por minuto y 1.000 por día. Son por organización: **unos 2 a 3 tickets por minuto y unos 145 por día para toda la app**.
- **Alternativas**: el SDK `groq-sdk` (una dependencia más para un solo pedido); el SDK de OpenAI apuntado a Groq (lo mismo).

## R2. Groq devuelve lo impreso; el servicio normaliza

- **Decisión**: el esquema que recibe Groq pide cada dato **como texto, tal como está impreso** (`montoImpreso`, `fechaImpresa`, `redImpresa`, `tipoImpreso`, `bancoImpreso`, `ultimos4Impresos`, `comercio`) más `texto` (la transcripción con los datos personales reemplazados, FR-011). Todos `required`, tipo `["string", "null"]`, `additionalProperties: false`. La conversión a número, fecha ISO y valores del producto es código del servicio (FR-004).
- **Por qué**: lo que hace el servicio se prueba con el proveedor simulado (FR-017) y garantiza que no se deduce nada: una red que no está en la tabla queda vacía, aunque el modelo la "sepa". Pedirle a Groq los valores ya convertidos (`red: "master"`) dejaría la regla de no deducir en manos del modelo, sin forma de probarla.
- **Alternativas**: pedir los valores convertidos y validar solo el rango (no se puede verificar que no dedujo); pedir ambos (duplica el esquema y no agrega garantías).

## R3. Validar la imagen antes de llamar a Groq

- **Decisión**: el cuerpo es JSON `{ imagen, tipo }`. En orden:
  1. `tipo` tiene que ser `image/jpeg`, `image/png` o `image/webp` → si no, `formato_no_soportado`.
  2. Si el largo del texto en base64 supera `ceil(2.500.000 / 3) × 4` caracteres → `imagen_demasiado_grande`, sin decodificar.
  3. Se decodifica; si no es base64 válido → `imagen_danada`.
  4. Los primeros bytes tienen que coincidir con `tipo` (JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF····WEBP`) → si no, `imagen_danada`.
- **Por qué**: rechaza sin gastar el cupo de Groq. Los primeros bytes ("magic numbers") detectan un archivo dañado o con el tipo cambiado sin una librería de imágenes, que en una Edge Function sería pesada.
- **Alternativas**: `multipart/form-data` (más complejo de armar en la app y de testear; con JSON alcanza `supabase.functions.invoke`); decodificar la imagen completa (necesita una librería).

## R4. Reglas de normalización

- **Decisión**: funciones puras en `normalizar.ts`:
  - **Red**: tabla de nombres impresos, comparados sin mayúsculas, tildes ni espacios de más: `VISA`, `VISA DEBITO`, `VISA ELECTRON` → `visa`; `MASTERCARD`, `MASTER`, `MC` → `master`; `MAESTRO` → `maestro`; `AMEX`, `AMERICAN EXPRESS` → `american_express`; `DINERS`, `DINERS CLUB` → `dinners_club`; `CABAL` → `cabal`; `NARANJA` → `naranja`; `CONFIABLE` → `confiable`; `TARJETA SOL`, `SOL` → `tarjeta_sol`. Lo que no está → vacío.
  - **Tipo**: si el texto contiene `DEBITO`/`DÉBITO`/`DEB` → `debito`; `CREDITO`/`CRÉDITO`/`CRED` → `credito`; ambos o ninguno → vacío.
  - **Fecha**: `dd/mm/aaaa` o `dd/mm/aa` (separador `/`, `-` o `.`); año de 2 dígitos → `20aa`. Fecha inexistente o posterior a hoy en Argentina → vacía (FR-008). Sin año → vacía.
  - **Importe**: se aceptan `$` y espacios. Con coma: la coma es decimal y los puntos, de miles (`24.500,00`). Sin coma: los puntos son de miles solo si separan grupos de exactamente 3 dígitos (`24.500`); cualquier otro caso (`24.50`) es ambiguo → vacío. Más de 2 decimales o ≤ 0 → vacío.
  - **Últimos 4**: exactamente 4 dígitos → se conservan; si no, vacío.
  - **Banco y comercio**: se recortan los espacios; vacío si queda vacío.
- **Por qué**: cubre FR-004 y FR-008 con casos de prueba concretos (US1-5 a US1-8), y "hoy en Argentina" sale de `fechaArgentina` del motor, sin reimplementar husos horarios.
- **Alternativas**: dejar la normalización al modelo (R2); aceptar `24.50` como 24,5 (formato de EE. UU., no argentino: puede ser una lectura equivocada).

## R5. Tapar datos personales (segunda capa)

- **Decisión**: funciones puras en `privacidad.ts`, aplicadas al `texto` de Groq en este orden y antes de recortar (FR-012):
  1. **Tarjetas**: agrupadas de a 4 (o 4-6-5, American Express) → `****` + últimos 4, siempre. Juntas, de 13 a 19 dígitos → solo si cumplen la cuenta de control de las tarjetas (Luhn): así no se tapan los códigos de barras. Enmascaradas (`*`, `X` o `x` seguidas de 4 dígitos al final) → `****` + últimos 4. *(Revisión de código: en la primera versión la cuenta de control se pedía también a las agrupadas, y una tarjeta con un dígito mal leído quedaba visible.)*
  2. **CUIT/CUIL de personas**: `\b(20|23|24|27)-?\d{8}-?\d\b` con dígito verificador válido (pesos `5 4 3 2 7 6 5 4 3 2`, módulo 11) → `[DATO PERSONAL]`. Los de prefijo 30, 33 y 34 no se tocan.
  3. **DNI**: `(DNI|D\.N\.I\.|DOC|Documento)` seguido de separadores y 7 u 8 dígitos con puntos de miles opcionales → la palabra se conserva y el número pasa a `[DATO PERSONAL]`.
  4. **Recorte**: si quedan más de 10.000 caracteres, se corta y se agrega `[…]`.
- **Por qué**: son patrones con forma fija; el dígito verificador evita tapar números de 11 dígitos que no son CUIT. Tapar antes de recortar evita dejar una tarjeta partida sin tapar.
- **Alternativas**: tapar cualquier secuencia de 7 u 8 dígitos (taparía códigos de producto y de transacción, que sirven para revisar una lectura); usar el modelo como única capa (no se puede probar).

## R6. Errores y su traducción

- **Decisión**: se suman a `CodigoError` de `_shared/http.ts`: `formato_no_soportado` (415), `imagen_demasiado_grande` (413), `imagen_danada` (422), `ticket_ilegible` (422), `tardo_demasiado` (504) y `no_disponible` (503). El extractor lanza errores propios y el handler los traduce:
  - `ExtractorTiempoAgotadoError` (el `AbortController` cortó) → `tardo_demasiado`.
  - `ExtractorNoDisponibleError` (Groq respondió 429 o cualquier 5xx, o no hubo conexión) → `no_disponible`. Ante un 429, Groq manda `retry-after` (segundos) y un mensaje con el límite superado; el extractor reintenta una vez si son 12 s o menos y entran en los 20 s (FR-015). El mensaje se guarda con el id de la organización tapado.
  - `RespuestaFueraDeEsquemaError` (la respuesta no es JSON o no cumple el esquema) → `ticket_ilegible`, con el camino del campo que falló en el registro.
  - Cualquier otro 4xx de Groq → `interno`, registrado con el estado HTTP.
- **Por qué**: FR-014. `recomendar` usa el mismo archivo y no cambia: solo se suman valores al tipo.
- **Alternativas**: un `http.ts` propio de esta función (duplicaría `respuestaJson` y `respuestaError`).

## R7. Registros sin datos del ticket

- **Decisión**: una sola línea por pedido con `console.log`/`console.error`: `extraer-ticket: <resultado> <ms>ms`, donde `resultado` es `ok` o el código de error. Para `ticket_ilegible` por esquema, se agrega el camino del campo (`medio.redImpresa`) y la regla que falló (`type`), nunca el valor. Para `interno`, el nombre del error o el estado HTTP de Groq.
- **Por qué**: FR-013 y constitución §IV (la imagen no va a los registros). El mensaje de un error de validación suele incluir el valor recibido: por eso el validador propio devuelve solo camino y regla.
- **Alternativas**: registrar el error completo (filtraría datos del ticket).

## R8. Validar el esquema sin dependencias

- **Decisión**: un validador propio y chico para este esquema fijo (`esquema.ts`): objeto con exactamente las claves esperadas, cada una `string` o `null`, y `medio` como objeto con sus cuatro claves. Devuelve `{ ok: true, lectura }` o `{ ok: false, camino, regla }`.
- **Por qué**: el esquema es plano y conocido; una librería de JSON Schema (Ajv) sería la primera dependencia del workspace para validar 8 campos. Un test verifica que el esquema que se le manda a Groq y el validador tienen las mismas claves, así no se desalinean.
- **Alternativas**: Ajv o Zod (dependencia nueva; Zod además obligaría a mantener el esquema en dos formatos).

## R9. La prueba manual con fotos reales (FR-019)

- **Decisión**: `supabase/functions/extraer-ticket/prueba-manual.ts`, que usa el mismo `ExtractorGroq` y el mismo servicio que la función (sin autenticación ni HTTP) y escribe en pantalla el JSON resultante. Se corre con Deno instalado desde npm, sin instalar nada global:

  ```bash
  read -rs GROQ_API_KEY && export GROQ_API_KEY   # Git Bash: la key no se ve ni queda en el historial
  npx deno run --no-lock --config supabase/functions/extraer-ticket/deno.json \
    --allow-net=api.groq.com --allow-read --allow-env=GROQ_API_KEY \
    supabase/functions/extraer-ticket/prueba-manual.ts foto1.jpg foto2.jpg foto3.jpg
  ```

  La corre el usuario en una terminal aparte, fuera de la sesión de IA, con las fotos fuera del repo. Comparte solo el JSON de salida.
- **Por qué**: prueba exactamente el código que va a correr en Supabase, sin desplegar nada. Los permisos de Deno limitan la red a Groq y el entorno a la key.
- **Alternativas**: desplegar y probar con la app (necesita la #49); un script en Node (no resuelve el `deno.json` ni `@vuelto/motor`).

## R10. Estructura según ADR-009

- **Decisión**: `index.ts` (arma las piezas) → `handler.ts` (HTTP, sesión, cuerpo, imagen, errores) → `servicio.ts` (`ServicioLecturaTicket`: llama al extractor, valida, normaliza, tapa y arma la respuesta) → `Extractor` (interfaz) con `ExtractorGroq` y, en los tests, un extractor simulado. Reusa `AutenticadorSupabase` de `_shared/autenticar.ts`, que ya rechaza la anon key (FR-001).
- **Por qué**: es la estructura de `recomendar`, y la interfaz cumple FR-016.
- **Alternativas**: todo en el handler (no se podría probar la lógica sin HTTP).
