# ADR-010: El motor corre en la app y Redux es la fuente de verdad

Estado: **propuesto** (01/11/2026). Entra en vigencia cuando el Product Owner
apruebe el PR que lo introduce.

## Context

El 13/10/2026 se movió el cálculo de la recomendación a una Edge Function
(ADR-001 §Actualización): un botón explícito, el motor corriendo solo en el
servidor y la app como puro formulario de entrada/salida. Se hizo porque no
sabíamos resolver bien el estado en el cliente: de dónde sacar el corpus y las
compras del usuario, cómo mantenerlos al día y cómo recalcular sin sincronizar
a mano (issue #42, cerrada por eso).

Al detallar la pantalla «¿Con qué pago?» (issue #43) apareció el requisito que
esa decisión no cubre: **mientras el usuario escribe el monto, la
recomendación tiene que ir cambiando en vivo**, sin botón de recarga y sin un
llamado al backend por cada tecla. Con la Edge Function, eso solo se logra con
debounce, con latencia y sin señal no funciona. Y la razón original de la
Edge Function (no saber manejar el estado del cliente) se resuelve con Redux.

Además, ADR-001 ya había establecido que la recomendación se usa en el momento
de pagar, a veces sin señal, y que el motor, por ser una función pura, puede
correr en el dispositivo. La actualización del 13/10 fue un desvío táctico, no
un cambio del argumento de fondo.

## Decision

### 1. El motor corre en la app

`apps/mobile` pasa a depender de `@vuelto/motor` y calcula la recomendación y
los topes localmente. El motor no cambia: sigue siendo el mismo paquete puro,
sin dependencias, sin red, con `ahora` por parámetro, determinístico y con su
suite de tests (ADR-004, ADR-009). El LLM sigue fuera del camino crítico.

Esto **supera la Actualización del 13/10/2026 de ADR-001** y devuelve su
Decision original ("lo importan tanto la app como el backend"). La constitución
pasa de 2.0.1 a 3.0.0 (Principio II).

### 2. Redux Toolkit es el estado del cliente

Se suma `@reduxjs/toolkit` y `react-redux` a `apps/mobile`. La app tiene un
solo store, con estos slices:

| Slice | Qué guarda | De dónde viene |
|---|---|---|
| `sesion` | Usuario autenticado | Supabase Auth |
| `perfil` | Medios de pago, comercios habituales, nombre para mostrar | `perfil` por RLS |
| `corpus` | Promociones vigentes y la marca de la última sincronización | `promocion` por RLS, sincronización incremental |
| `compras` | Compras del período en curso (mes o semana, lo que empiece antes) | `compra` por RLS; las escrituras de la app entran directo |
| `simulacion` | Comercio elegido y monto (opcional) de la pantalla «¿Con qué pago?» | La UI |
| `contactos` | Contactos y grupo en armado | Edge Function de grupo (ver §4) |

La recomendación y los topes **no se guardan en el store: se derivan** con
selectores memoizados (`createSelector`) que llaman a `recomendar()` y
`estimar…()` del motor con `perfil`, `corpus`, `compras`, `simulacion` y el
reloj. Cada cambio del monto vuelve a calcular en milisegundos, sin red, sin
botón y sin debounce.

El reloj entra al selector como un valor del store (`ahora`, que se actualiza
al abrir la app y al cambiar de día), nunca con `new Date()` adentro del
selector, para que los tests y la recomendación sigan siendo reproducibles.

### 3. Qué queda en el servidor

Supabase queda como **base, autenticación y reglas de acceso**; solo se
conserva una Edge Function cuando hay una razón que la app no puede cubrir:

| Pieza | Dónde | Razón |
|---|---|---|
| Perfil, compras, catálogos, corpus | App directo con `supabase-js` y RLS | CRUD, ADR-009 |
| Lectura del ticket (#48) | Edge Function | Gemini, la key nunca va en la app (Principio IV) |
| Gasto en grupo (#54) | Edge Function | Lee datos de otros usuarios que el RLS no deja ver (ADR-008 §4): solo viaja lo que ADR-008 §3 permite |
| Invitaciones | Edge Function y RPC `security definer` | ADR-008 §4 |
| Ingesta y publicación del corpus | Script de ingesta | Gemini y service role key, fuera de la app |
| `recomendar` (#43) | **Sale del camino de la app** | Ver §5 |

### 4. Qué hace falta en la base

- La tabla de promociones se puede **leer** para cualquier usuario autenticado
  (son datos públicos de MODO, sin información personal) y solo escribe la
  ingesta con la service role key. Lleva `actualizada_en` para poder bajar solo
  lo nuevo. Su policy va en la misma migración que la tabla (Principio IV).
- `compra` sigue siendo de lectura y escritura exclusiva del dueño.
- La sincronización del corpus es incremental: la app guarda la marca de la
  última sincronización y pide solo las promos con `actualizada_en` posterior,
  más las que vencieron, para sacarlas. Se filtra por vigencia y por jurisdicción
  para que el corpus local sea chico.

### 5. Qué pasa con la Edge Function `recomendar` y con #75

`recomendar` (PR #71) está terminada y testeada, pero deja de ser el camino de
la app. **No se borra todavía**: el servicio y el contrato (`specs/004`) sirven
de referencia, y su código de juntar datos puede reusarse en el gasto en grupo.
Se borra cuando se compruebe que nada lo usa. No se invierte más en ella.

La issue #75 ("monto opcional en la Edge Function") se reemplaza: el monto
opcional pasa a ser una extensión del **motor** (`CompraPropuesta.monto:
number | null`), que además cubre el caso de la app.

## Rationale

- **Es lo que pide la experiencia.** Una recomendación que se actualiza al
  tipear, instantánea y sin señal, es lo que diferencia a Vuelto de abrir
  la app de un banco. Un botón con viaje de red no lo logra.
- **Menos backend.** Se pasa de "una Edge Function por pantalla" a "una Edge
  Function solo donde hay un secreto o datos ajenos". Hay menos código propio
  en el servidor, menos despliegues y menos superficie de falla en el pitch.
- **El motor ya está pensado para esto.** Es puro y sin dependencias, así que
  corre en React Native sin cambios, y sus tests siguen valiendo igual.
- **Se conserva el argumento de innovación.** Lo que importa del motor
  (determinístico, testeable, sin LLM) no depende de dónde corre.
- **La razón del desvío del 13/10 ya no aplica.** El problema era el estado
  del cliente; Redux Toolkit lo resuelve con un patrón conocido y testeable.

## Consequences

- **Lo que decía "motor solo en el servidor" se enmienda**:
  constitución 3.0.0, `RNF-02`, `CLAUDE.md`, `rules-guardian` y la
  documentación de arquitectura (PR que introduce este ADR).
- **El corpus vive en el teléfono.** Es público, así que no es un problema de
  privacidad. Sí lo es el tamaño y la frescura: hay que medir cuántas promos
  hay vigentes para CABA/AMBA y decidir dónde persistirlas (ver Riesgos).
- **Las compras del período viven en el teléfono.** Son del propio usuario y
  `privacidad.md` se actualiza: antes decía que el celular no cacheaba el
  historial. Se cachea solo el período en curso, no los 90 días de retención.
- **Una promo vencida mientras el usuario estaba sin señal.** El motor ya
  filtra por vigencia con `ahora`, así que una promo vencida no se recomienda
  aunque el corpus esté viejo. Lo que no puede saber es una promo **nueva** o
  **modificada**: la app muestra la fecha de la última sincronización y
  actualiza el corpus al abrir y al volver a primer plano.
- **Un tope calculado en el cliente es una estimación sobre las compras
  registradas** (Principio V, sin cambios): si el usuario cargó una compra desde
  otro dispositivo y todavía no sincronizó, la base ("según N compras") lo dice.
- **El cliente puede alterar su propio cálculo.** No importa: solo afecta a su
  recomendación y los datos que lee son los suyos por RLS. Lo que no puede
  pasar a depender del cliente es nada que cruce usuarios (grupo), por eso
  queda en el servidor.
- **ADR-009 sigue vigente** para las Edge Functions que quedan. En la app se
  aplica la misma idea: núcleo funcional (motor y selectores) y capa
  imperativa (thunks, listeners y `supabase-js`).

## Riesgos y decisiones abiertas

| Riesgo | Cómo se resuelve |
|---|---|
| Persistir el corpus. AsyncStorage en Android tiene un tope de 6 MB por defecto | Medir el tamaño real del corpus filtrado en la issue de sincronización. Si no entra, persistir solo lo vigente de los rubros y medios del usuario, o usar `expo-sqlite` |
| Persistir el store (rehidratar al abrir) | Redux Toolkit con un listener propio que escribe `perfil`, `corpus` y `compras`; evitar `redux-persist` salvo que haga falta |
| Hoy `servidor-simulado.ts` es el reemplazo del backend, con una excepción al Principio II aprobada en la spec 006 | Se reemplaza por el motor real sobre `fixtures.ts` en el primer paso del plan: queda un cálculo real incluso antes de que exista la base |
| `@vuelto/motor` se publica compilado (`dist/`) y Metro tiene que resolverlo dentro del workspace | Configurar `metro.config.js` para el monorepo y validar con el APK de EAS desde el primer paso |
| Dos fuentes de verdad durante la migración (`sesion.ts`, `perfil-local.ts` y Redux) | Se migra por pantalla; mientras tanto el slice envuelve al módulo viejo. Al final se borran los dos |

## Plan de implementación (issues nuevas, en este orden)

1. **Motor en la app, sobre datos de ejemplo.** `apps/mobile` depende de
   `@vuelto/motor`; `api.recomendar` llama al motor sobre `fixtures.ts` y se
   borra `servidor-simulado.ts`. Metro resuelve el workspace.
2. **Store de Redux.** Slices `perfil`, `compras`, `simulacion`, `corpus`,
   selectores memoizados de recomendación y topes, y la migración de `sesion.ts`
   y `perfil-local.ts`. Tests de los reducers y selectores.
3. **«¿Con qué pago?» en vivo** (#43): la recomendación se recalcula al tipear el
   monto; `monto: null` en el motor.
4. **Esquema de Supabase** (#34) con el corpus legible por todos los usuarios
   autenticados y `actualizada_en`.
5. **Sincronización del corpus y de las compras** (reabre el objetivo de la
   issue #42): al abrir, al volver a primer plano y por incremental.
6. **Topes en la app** (#45) con el mismo store.
7. Limpiar lo que queda sin uso: `recomendar` y su contrato, o reutilizarlos.
