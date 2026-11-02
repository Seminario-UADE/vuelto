# Research: Registrar una compra — borrar, promo aplicada y subida

Cada punto: **Decisión**, **Por qué**, **Alternativas**.

## R1 — Identificador de la compra

- **Decisión**: UUID v4 generado en el dispositivo con `expo-crypto` (`randomUUID`), inyectado en el `extra` del store como `generarId` (en los tests, un contador determinista que produce UUID válidos). Reemplaza el `n${n}` de `guardarCompra`.
- **Por qué**: la columna `compras.id` es `uuid` con default; acepta uno del cliente, y reinsertar el mismo id es lo que hace idempotente el reintento (FR-004). `expo-crypto` funciona en Expo Go, web y APK sin código nativo propio.
- **Compras ya guardadas con `nN`** (FR-007): al arrancar, las que no son de ejemplo y no tienen un UUID reciben uno nuevo y se encolan una vez.
- **Alternativas**: `crypto.randomUUID` global (no está garantizado en Hermes); `uuid` de npm (otra dependencia con `getRandomValues`); dejar que el servidor asigne el id (no hay idempotencia).

## R2 — Dónde vive la cola y en qué orden se escribe

- **Decisión**: slice `cola` en el store, con su propio listener de persistencia y la clave `vuelto.cola.v1`. `persistencia.ts` no se toca. Cada operación de guardar lleva la **compra completa**.
- **Orden**: `guardarCompra` despacha primero `operacionEncolada` y después `compraAgregada` (idem borrar). Como el listener de la cola emite su `setItem` antes que el de `compras` y AsyncStorage los atiende en orden, el disco nunca tiene una compra nueva sin su operación.
- **Reconciliación al arrancar** (FR-013, `iniciarCompras`): una operación de guardar cuya compra no está en `compras` la restaura; una de borrar cuya compra sigue en `compras` la saca. El caso inverso (compra sin operación) queda cubierto por el orden de escritura.
- **Hidratación**: el listener de la cola no escribe hasta que la cola se leyó (`cola.hidratada`), igual que `sesion.hidratado` para el resto.
- **Por qué**: la sesión de #42 es dueña de `persistencia.ts`; cambiar `Persistido` ahí genera conflictos y acopla dos features.
- **Alternativas**: una sola clave con `compras` y cola juntas (atómica, pero modifica `persistencia.ts` y `Persistido`); `redux-persist` (descartado en ADR-010 R6).
- **Se prueba** con un almacenamiento falso que "corta" después de N escrituras (cierre entre las dos) y reabre.

## R3 — Estados, compactación y un solo vaciado

- **Decisión**: estados `pendiente → enviando → (éxito: se quita) | rechazada | bloqueada`; un error transitorio vuelve a `pendiente`. `vaciando` en el slice es la exclusión mutua: el thunk `vaciarCola` no arranca si ya hay uno (FR-010); los disparadores piden vaciar y el que llega durante uno en curso marca `volver = true` para correr otra pasada al terminar.
- **Compactación** (FR-011): solo un guardar `pendiente` + su borrar se anulan sin llamar al servidor. Con el guardar en `enviando`, el borrar se encola detrás y se envía después de que el guardar termine.
- **Orden** (FR-009): solo dentro de la misma compra; `rechazada` y `bloqueada` se saltean.
- **Por qué**: evita la fila huérfana (B4) y el doble envío.
- **Alternativas**: cancelar el envío en curso (no es fiable con `fetch`); bloquear la cola entera ante un error (viola SC-008).

## R4 — Clasificación de errores y envío idempotente

- **Decisión**: `clasificarError(error | respuesta) → "exito" | "transitorio" | "rechazada"` según la tabla de FR-012:
  - guardar = `upsert(fila, { onConflict: "id", ignoreDuplicates: true })`; un conflicto de id es éxito;
  - borrar = `delete().eq("id", id)`; cero filas borradas es éxito;
  - sin red, timeout, 5xx, 401/JWT vencido, 429 → transitorio;
  - `22P02` (uuid inválido), `23514` (check), `23503` (medio o promo inexistentes), `23502` (null) → rechazada.
- **Plazo**: 10 s con `AbortController` pasado a la consulta (`.abortSignal`).
- **Por qué**: un `INSERT` simple convertiría el reintento de un envío que sí llegó en `23505`, y la compra quedaría marcada como rechazada (B5).
- **Nota de seguridad**: con `ON CONFLICT DO NOTHING`, un id que ya existe de **otra** cuenta no produce error; con UUID v4 la colisión es despreciable y la política `compras_dueno` impide leer o pisar la fila ajena. Se prueba en pgTAP (R9).
- **Alternativas**: `insert` y tratar `23505` como éxito (equivalente, pero no distingue una fila propia de una ajena y mezcla señales).

## R5 — Dueño de la operación, adopción y cierre de sesión

- **Decisión**: cada operación lleva `dueno: string | null`, el id de usuario de la sesión de Supabase (no el email: `Cuenta` ni siquiera lo tiene y con Apple puede ser `null`). Sin sesión al encolar, `dueno = null`.
- **Adopción**: al iniciar sesión, si hay operaciones con `dueno = null`, la app muestra el aviso «Tenés N compras de este teléfono. ¿Subirlas a tu cuenta?». «Sí» → `operacionesAdoptadas(userId)`. «No» → quedan `bloqueada` con motivo `decision` (solo en este celular).
- **Una operación con dueño X nunca se envía con la sesión Y**: `siguienteLote` filtra por `dueno === userId`.
- **Cerrar sesión**: `sesionCerrada` vacía la cola en el mismo reducer (FR-016). El aviso previo con los recuentos (guardados y borrados) lo muestra la pantalla de Perfil antes de despachar `sesionCerrada`.
- **Por qué**: B3. El id de usuario es lo único estable que tiene la app y lo único que el servidor valida (`auth.uid()`).
- **Dependencia**: el `userId` y el aviso de adopción dependen de #40 (sesión). Hasta entonces, `contexto.userId` es `null` y nada se envía.

## R6 — Una sola función de promo propuesta

- **Decisión**: `promoPropuesta(entradas, comercio, medioId, fecha, monto)` en `data/compras/promo-propuesta.ts`. Evalúa el motor al **mediodía de la fecha de la compra** (como hoy `compraParaGuardar`), toma la opción del medio elegido y devuelve todas sus promos acumulables, el reintegro estimado y la base. La hoja la usa para mostrar y `compraParaGuardar` para guardar.
- **Quitar**: `BorradorCompra.usarPromo: boolean` (por defecto `true`). Con `false`, la compra queda con `promocionId = null` y `reintegroEsperado = null`. Cambiar de medio en la hoja reinicia `usarPromo` a `true`.
- **Varias promos**: la compra guarda `promocionId` de la primera (como hoy); quitar quita todas. **Tope agotado**: el motor ya descarta la promo, así que no se propone.
- **Por qué**: B1/I6. Hoy la hoja calcula con `ahora` y el guardado con el mediodía de la fecha: un ticket de un día anterior mostraba una cosa y guardaba otra.

## R7 — «Mis compras» muestra todo el período

- **Decisión**: la pantalla lista `comprasDelPeriodo` (mes o semana, lo que empiece antes), agrupadas por día; los totales «Gastaste» y «Te devolvieron» siguen siendo los del mes. Una función de vista nueva (`comprasDelPeriodoVista`) devuelve las compras y el selector `selectMarcasDeSubida` devuelve `{ [compraId]: "sin-subir" | "solo-celular" }` más los recuentos.
- **Por qué**: I7; una compra que consume el tope semanal tiene que poder verse y borrarse.
- **Marcas**: solo si la subida está conectada (`cola.subidaConectada`); con la subida desconectada (FR-020) no se muestra nada (M6).

## R8 — Cuándo se intenta subir

- **Decisión**: sin dependencia de estado de red. Los disparadores son: al guardar o borrar, al terminar `iniciarCompras` (arranque), cuando `AppState` pasa a `active` y cuando cambia el `userId` de la sesión. Todos piden `vaciarCola()`.
- **Por qué**: FR-005/FR-010. Una consulta previa de conectividad (`NetInfo`) no es fiable y suma una dependencia; el fallo del envío ya dice si hay red.
- **Alternativas**: reintento periódico con temporizador (gasta batería); `NetInfo` (otra dependencia nativa).

## R9 — Pruebas de lo que se asume del esquema

- **Decisión**: `supabase/tests/database/compras_cliente.test.sql` (pgTAP, mismo estilo que `rls.test.sql`) con: insertar con un `id` propio; reinsertar el mismo `id` con `on conflict do nothing` (queda una fila); borrar un `id` inexistente (0 filas, sin error); la cuenta B no puede leer ni borrar la fila de A, ni pisarla; `medio_de_pago_id` de otro usuario falla con `23503`.
- **Por qué**: I8; probar el adaptador contra un cliente falso es tautológico. El job `supabase-rls` ya corre `supabase test db` en el CI.

## R10 — Qué es una compra de ejemplo

- **Decisión**: es de ejemplo si su `id` está en `comprasOctubre` (`data/fixtures.ts`). `eliminarCompra` y `guardarCompra` comprueban esa lista; nunca generan operación para ellas. La reconciliación (R2) también las ignora.
- **Por qué**: I2. El formato del id no distingue (`c1…` vs `nN` vs UUID) y los escenarios de prueba (`escenarioElegido`) las reponen.

## R11 — Coordinación con #42

- **Archivos compartidos**: `store/index.ts` (se suma `cola` al reducer y dos campos al `extra`) y `store/selectores.ts` (selectores nuevos al final). No se tocan `persistencia.ts`, `compras.ts` ni `acciones.ts`.
- **Contrato**: `aplicarPendientes(filasDelServidor, cola)` (ver `contracts/aplicar-pendientes.md`). La #42 la llama al mezclar lo que baja y relee el período completo en cada sincronización, porque la tabla no tiene borrado lógico ni `actualizada_en`.
- **Qué no se hace acá**: bajar compras del servidor, mapear medios (#41), mapear promos (#42) ni la sesión (#40).
