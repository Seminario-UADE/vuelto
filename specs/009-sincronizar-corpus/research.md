# Research: sincronizar el corpus y las compras del período

Todo lo verificable se verificó contra un Supabase local aislado (CLI 2.113, project_id `vuelto-sync42`, puertos 563xx,
migraciones del repo, un usuario de prueba con la anon key y su sesión). Los resultados son salidas reales.

## R1. Cursor `(actualizada_en, id)`, filtro de jurisdicción y texto exacto de la marca

**Decision**: la consulta de promos usa `order=actualizada_en.asc,id.asc`, `limit=500` y un solo parámetro `and=(…)`
que junta el filtro de jurisdicción y el cursor:

```text
and=(or(jurisdiccion.is.null,jurisdiccion.neq.otra_provincia),
     or(actualizada_en.gt.T,and(actualizada_en.eq.T,id.gt.I)))
```

con `T` e `I` el `actualizada_en` y el `id` de la última fila de la página anterior, tal como llegaron. Con
supabase-js: `.order("actualizada_en").order("id").limit(500).and("…")`. La marca y el cursor se guardan como **texto**,
sin pasar por `Date`.

**Verificado** (6 promos; 3 con el mismo `actualizada_en` = `…12:00:00.123456`; una `otra_provincia`; una con jurisdicción
`null`; una dada de baja; todas leídas con el token de un usuario `authenticated`):

| Prueba | Resultado |
|---|---|
| Página 1 con `limit=2` | devuelve las filas 1 y 2, en orden |
| Cursor tras `(…12:00:00.123456+00:00, id …2)` con el filtro de jurisdicción | devuelve `…3` (jurisdicción `null`), `…5` y `…6`; **no** devuelve `…4` (`otra_provincia`). Los empates del borde no se pierden ni se repiten |
| Solo `jurisdiccion=neq.otra_provincia` | **excluye** la fila con jurisdicción `null` (`…3`): hay que usar `or(is.null, neq)` |
| Formato de `actualizada_en` en la respuesta | `"2026-11-02T12:00:00.1+00:00"` (PostgREST recorta ceros finales, conserva microsegundos); sirve como cursor tal cual |
| `Prefer: count=exact` con `Range: 0-1` | `Content-Range: 0-1/6` (sirve para saber cuántas hay) |
| `POST` como `authenticated` | `42501 permission denied for table promociones` (la app no puede escribir) |

**Rationale**: OFFSET pierde filas si la ingesta toca una de las anteriores entre dos páginas; `>` sin desempate pierde las
que empatan; convertir a `Date` pierde microsegundos y el `eq` del cursor deja de coincidir. `max_rows = 1000`
(`supabase/config.toml:18`) recorta en silencio un `limit` mayor: la página de 500 deja margen y el fin se decide por
"página incompleta".

**El `+` del offset**: el texto trae `+00:00`; en una URL el `+` es un espacio. supabase-js arma la query con
`URLSearchParams`, que lo codifica como `%2B`. El test de integración lo cubre (si no, el cursor fallaría en silencio).

**El margen de 10 minutos** (FR-007) se calcula con `Date` sobre la marca (`marca − 10 min`), no sobre el cursor: perder
sub-milisegundos en el margen es irrelevante. El cursor de la paginación sí es el texto exacto.

**Alternativas**: OFFSET/`range()` (pierde filas); un RPC de Postgres con keyset (cambia el esquema, que esta spec no
toca); LISTEN/realtime (la app tiene que funcionar sin conexión y el free tier lo limita).

## R2. Dónde y cómo se dispara la sincronización, y el cambio de reloj sin un render equivocado

**Decision**:

- **Disparo**: un hook `useSincronizacion()` en `Raiz` (`apps/mobile/src/app/_layout.tsx`), al lado de `useReloj()`. Cuando
  `sesion.hidratado` pasa a `true` despacha `sincronizar("apertura")`; en cada `AppState` → `active` despacha
  `sincronizar("primer-plano")`. La espera de 5 minutos, la exclusión mutua y el timeout viven en el thunk, no en el hook.
- **Estado de coordinación no serializable** (en vuelo, último intento): un objeto creado con el store y puesto en
  `Extra`, no en Redux. Así los tests lo inyectan y el store sigue siendo solo datos de entrada.
- **Reloj real inyectable** en `Extra` (`reloj: () => Date`): los tests controlan el tiempo; la app usa `new Date()` solo
  en `_layout.tsx` al armar el store.
- **Cambio de reloj**: `useReloj(fuente)` se re-ejecuta cuando cambia `fuente` (su `useEffect` depende de ella). El hook
  elige `relojReal` si `corpus.marca !== null`, si no `relojDeEjemplo`. **Pero** eso deja un render con el reloj
  equivocado: el efecto corre después del commit. Para evitarlo, `sesion.ahora` lo escriben también las acciones que
  hacen cambiar la marca: `rehidratado` y `sincronizado` llevan el campo `ahora` (calculado en la capa imperativa con
  `Extra.reloj`) y el reducer de `sesion` lo aplica en la **misma** acción que fija la marca. `Raiz` no pinta nada hasta
  que `hidratado` es `true` (ya existe: `listo = fuentes && hidratado`), así que el primer fotograma ya sale con el reloj
  correcto.

**Rationale**: los reducers no pueden llamar a `new Date()` (spec 008 FR-005); la capa imperativa sí, y se lo pasa por la
acción. Reusar el gate `hidratado` evita un parpadeo.

**Alternativas**: un `Provider` de reloj aparte (otra fuente de verdad); dejar que `useReloj` lo resuelva solo (un render
con el 14/10 y una pantalla de Inicio que sale con la fecha equivocada).

## R3. Descartar el resultado que llega después de cerrar sesión o de cambiar de cuenta

**Decision**: dos controles, ambos en el thunk, **inmediatamente antes** de despachar el resultado:

1. `sesion.epoca` (entero, no persistido) que `sesionCerrada` incrementa. El thunk lo lee al empezar y lo compara con el
   valor actual justo antes de aplicar. Si cambió, descarta.
2. `repositorio.usuarioId()` se llama al empezar y de nuevo antes de aplicar. Si cambió, o ahora es `null`, descarta.

La pertenencia de las compras pendientes a una cuenta la resuelve la cola de #44 (cada operación tiene dueño y
`aplicarPendientes` ignora las de otro). Esta spec no guarda `duenoId` en `compras`.

**Rationale**: comparar `usuarioId` solo no detecta "cerró sesión y volvió a entrar con la misma cuenta mientras
volaba el pedido" (válido: los datos siguen siendo de ese usuario). La época detecta el cierre; `usuarioId` detecta el
cambio de cuenta sin cierre (sesión vencida y otra entra, responsabilidad de #40). El chequeo y el `dispatch` son
sincrónicos entre sí: no hay hueco para otra acción.

**Alternativas**: `AbortController` que se aborta en `sesionCerrada` (corta el pedido pero no cubre un resultado que ya
llegó; se usa igual como timeout); un token de generación aparte (es la `epoca`).

## R4. Medir y proyectar el tamaño del corpus

**Decision**:

- La función `medirCorpus(promos)` (pura, testeada) está en `apps/mobile/src/sync/medicion.ts`: serializa cada promo
  con el mismo `JSON.stringify` que guarda la persistencia y reporta cantidad, bytes totales (UTF-8), promedio, máximo,
  y la fracción de 6 MB y de 2 MB.
- El script `apps/mobile/scripts/medir-corpus.ts` la usa: se loguea en Supabase con la **anon key** y el email y la
  contraseña de un usuario de prueba (variables de entorno `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `MEDICION_EMAIL`, `MEDICION_PASSWORD`), baja el corpus con la misma función de lectura que usa la app y lo mide. Nunca
  usa la service role. Se corre con Node 22.13+ (`node --experimental-strip-types apps/mobile/scripts/medir-corpus.ts`).
- **Proyección rotulada** (mientras no haya corpus): se mide el tamaño serializado de las 4 promos de ejemplo
  (`fixtures.ts`) y se extrapola a 2.000 promos (la estimación de la issue). Va a la documentación como
  "PROYECCIÓN con promos de ejemplo, no una medición".

**Rationale**: una medición real depende de #35; el instrumento y el cálculo quedan listos y testeados, y la decisión
no se toma sobre un número inventado. La clave aparte del corpus (R5) hace que la decisión final solo afecte al
corpus, no al perfil ni a las compras.

**Alternativas**: medir contra el JSON crudo de la API de MODO (otra forma de dato, no es lo que la app guarda); usar la
service role (la constitución §IV la reserva a la ingesta).

## R5. Persistencia en dos claves y compatibilidad con lo guardado

**Decision**: `vuelto.corpus.v1` = `{ version: 1, promociones, marca, sincronizadoEn }`; `vuelto.store.v1` conserva
`perfil`, `compras` (`{ lista }`) y `cuenta`, y sigue en `version: 1`. Un `corpus` dentro de
`vuelto.store.v1` se ignora. El listener escribe cada clave solo cuando cambió su parte, y la del corpus solo cuando
cambia el corpus. Si `setItem` del corpus falla, no se reintenta con otra marca: la marca vive en el mismo valor.

**Verificación** (`persistencia.ts`): hoy el validador hace `x as EstadoCorpus` y deja `undefined` los campos que faltan,
así que se agrega la normalización explícita; `version !== 1` descarta todo (por eso no se sube la versión).

**Rationale**: el límite de 2 MB por valor de AsyncStorage en Android aplica al valor; separar el corpus evita que un
corpus grande se lleve el perfil y las compras. Que la marca viaje con las promos garantiza que nunca
apunte a un corpus que no se guardó.

## R6. La leyenda "Promos actualizadas hace X"

**Decision**: función pura `textoFrescura(ahora: Date, sincronizadoEn: string | null): string | null` en
`apps/mobile/src/lib/frescura.ts`, con los cortes de FR-019 (menos de 60 min → "unos minutos"; 1–23 h → "N hora(s)";
24 h o más → "N día(s)"; diferencia negativa = 0; `null` → `null`). En `apps/mobile/src/app/(tabs)/index.tsx`, un
`<Text variant="label" tone="inkSecondary">` al final de `Screen`, debajo de «Últimas compras». Lo alimenta un selector
`selectFrescura` que usa `sesion.ahora` y `corpus.sincronizadoEn`. `sesion.ahora` se actualiza al abrir, al volver a
primer plano y a medianoche: la leyenda no avanza minuto a minuto con la app abierta, y está bien.

**Rationale**: puro y testeable sin React; un lugar discreto que no compite con la decisión (Principio I).

## R7. Ventana de compras

**Decision**: `desde = min(inicioDelPeriodo("mensual", hoy), inicioDelPeriodo("semanal", hoy))` con `hoy =
fechaArgentina(reloj real)`. Es la misma regla que `comprasDelPeriodo` (`calculo.ts:239-244`). Se importa
`inicioDelPeriodo` y `fechaArgentina` de `@vuelto/motor`; no se reimplementa aritmética de fechas en la app.

**Rationale**: una sola definición de "período" para lo que se baja, lo que se persiste y lo que cuenta el motor.

## R8. Bajas y poda

**Decision**: la baja (`dada_de_baja_en` no nulo) se mapea a `vigencia.hasta = min(hasta, (fecha en Argentina de la
baja) − 1 día)`. `diaAnterior` se calcula con las funciones de fecha del motor (`diaSiguiente` existe; si falta la
inversa se agrega a la app, no al motor). La poda saca las promos con `vigencia.hasta < inicioDelPeriodo`. El motor sigue
descartándolas por vigencia y suma sus compras al tope compartido (`packages/motor/src/tope.ts:101-105`).

**Rationale**: el restante de un tope compartido no puede subir porque una promo se dio de baja (Principio V).

## R9. Reconciliación de ids (borrado físico y re-siembra)

**Decision**: cada sincronización pide además `idsDePromociones(vigenteDesde)` (select=id, paginado por id, mismo filtro
de jurisdicción) y saca del corpus los ids que el servidor no tiene. Con unos 2.000 UUID son ~80 KB por sincronización;
con la espera de 5 minutos al volver a primer plano es aceptable. Si la medición real lo desaconseja, el plan de #35
puede reemplazarlo por `count=exact` (verificado en R1) y pedir los ids solo cuando el conteo difiera.

**Rationale**: ni el borrado físico ni una re-siembra mueven una marca; sin esto el teléfono acumula duplicados.

## R10. Implementación real y de memoria del repositorio

**Decision**: `repositorio-supabase.ts` recibe el cliente de `lib/supabase.ts` (o `null` ⇒ no se arma el repositorio y
nunca se sincroniza). Cada pedido usa `.abortSignal(AbortSignal.timeout(15_000))`. `repositorio-memoria.ts` implementa la
misma interfaz sobre arreglos, con el mismo orden y el mismo cursor, y un modo "falla en la página N" para los tests de
atomicidad. Una prueba de integración (`supabase/` o `apps/mobile`, a decidir en las tareas) corre las mismas
consultas contra un Supabase local; no corre en el CI si no hay Docker.

**Alternativas**: mockear `supabase-js` (probaría el mock, no la sintaxis de PostgREST).
