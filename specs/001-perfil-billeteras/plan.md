# Implementation Plan: Perfil — declarar bancos, tarjetas y redes (MODO)

**Branch**: `feat/41-perfil-plan` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

> **Actualizado el 02/11/2026** por ADR-010 (motor en la app, Redux como fuente de verdad) y por
> lo que dejó la #34 en `main`. Cambian las decisiones 2, 4 y 6, se suma la 9, la tabla de la #34
> pasa a tener las columnas reales y lo que falta, y cambia el orden de las fases: el perfil vive
> en el slice `perfil` del store de Redux (#81). La spec no cambia.

## Summary

Onboarding y pestaña Perfil donde el usuario declara sus medios de pago (banco del catálogo de
MODO + tipo de tarjeta + red). La app lee y escribe directo en Supabase con `supabase-js` y el
RLS, sin Edge Function (ADR-009), y guarda el resultado en el slice `perfil` de Redux (ADR-010).
La integridad la garantiza la tabla. La lógica de la pantalla (buscador, duplicados, mínimo de un
medio) va en funciones puras con tests.

**Estado de las dependencias (02/11)**: #34 y #39 cerradas. La #81 cerró (store de Redux). Falta #40 (sesión). El slice `perfil` ya tiene `mediosGuardados: MedioDePago[]`
(lo que devuelve `datos.ts`), al lado de `medios: string[]` (ids del catálogo fijo), que sigue siendo lo que lee el
motor hasta T008. Lo que no depende de ellas (modelo, buscador, acceso a Supabase y
selector de medio) se hace ya. Conectar las pantallas espera a esas dos.

## Technical Context

- **Stack**: TypeScript strict, Expo + Expo Router, `@supabase/supabase-js` (los instaló la #39).
  Redux Toolkit y `@vuelto/motor` ya están en la app (#81, cerrada).
- **Datos**: tablas `bancos` (lectura) y `medios_de_pago` (del dueño), de la #34. En la app, el
  slice `perfil`, que la #81 persiste en el dispositivo: esa es la lectura sin conexión.
- **Tests**: funciones puras de `apps/mobile/src/perfil/` con Vitest (`npm run test -w
  @vuelto/mobile`). RLS: pgTAP de la #34. Pantallas: a mano en Expo Go.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | No muestra promociones. Declara los medios con los que la #43 decide qué conviene | ✅ |
| II. Motor determinístico | No calcula recomendaciones. Los medios que declara son la entrada del motor, que corre en la app (constitución 3.0.0, ADR-010) | ✅ |
| III. Null explícito | Tipos sin `?:`; `onHubList` es `boolean \| null` (decisión 9) | ✅ |
| IV. Secretos y privacidad | Sin service role ni Gemini. RLS del dueño, creada por la #34 junto con la tabla. Al cerrar sesión se vacía el slice | ✅ |
| V. Topes con base | No muestra topes | N/A |
| VI. Test-first | El motor no cambia; las funciones puras se escriben test-first | ✅ |

Sin violaciones. `rules-guardian` antes del PR que conecte las pantallas (usa una tabla con RLS).

## Decisiones

La spec es del 13/10. Estas decisiones la cruzan con lo decidido después (constitución 3.0.0,
ADR-010, RNF-02, ADR-009, contrato de tipos #33). La spec no cambia.

1. **Sin Edge Function.** ADR-009 y ADR-010 dejan el perfil como CRUD directo con `supabase-js` y
   RLS. Una función `perfil` haría lo mismo que una policy, con más código.
2. **Los tipos de red y tarjeta son los del motor.** ADR-010 deja que la app importe
   `@vuelto/motor` y la #81 ya lo sumó: `modelo.ts` hace `import type { Red, TipoTarjeta }` y
   `ETIQUETAS_RED` / `ETIQUETAS_TIPO` son `Record<...>` sobre esos tipos, así que si el motor suma
   un valor, la app no compila. `REDES` y `TIPOS_TARJETA` salen de las claves de esos mapas. El
   `check` de la tabla rechaza cualquier otro valor.
3. **La integridad está en la base, no en la pantalla.** El `unique` de la tripleta (FR-004)
   también protege contra dos dispositivos o un doble toque. `not null` y `check` cubren FR-005
   y FR-011. La app no usa `update`: la spec solo pide agregar y sacar.
4. **"Al menos un medio" lo controla la app** (FR-007, FR-009). Un trigger en la base frenaría
   el borrado en cascada al eliminar la cuenta. Si el perfil igual queda vacío, el motor lanza
   `PerfilSinMediosError` en el selector de recomendación (#43) y la app lleva al onboarding.
5. **El onboarding se guarda en un solo `insert` de varias filas** (FR-011): entra todo o nada.
   Desde Perfil, cada alta o baja es un pedido aparte.
6. **La lectura sin conexión la da el store** (FR-012, SC-003). Con ADR-010 el perfil vive en el
   slice `perfil` y la #81 lo persiste en el dispositivo; el motor lo necesita para recomendar
   sin señal. No hace falta un cache propio de esta feature: `datos.ts` lee y escribe Supabase y
   el slice guarda el resultado. Al cerrar sesión se vacía el slice (FR-013).
7. **Buscador en el dispositivo.** Son 82 bancos: se bajan al abrir el buscador y se filtran en
   cada tecla.
   - **Normalización**, igual para el texto y el nombre:
     `toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim()`.
   - **Coincidencia**: por substring.
   - **Orden**: primero los `onHubList === true`, después por nombre normalizado y, si dos
     empatan, por `id`. Se comparan códigos de carácter (`<` y `>`), no `localeCompare`, para que
     el orden no dependa del idioma del dispositivo.
   - **Sin resultados**: con texto vacío no se muestra nada. Con texto pero sin coincidencias,
     aparece el aviso de US1-7.
8. **Los bancos no se borran del catálogo.** El sembrado hace upsert por `id`, y `banco_id` es FK
   sin `on delete` (no deja borrar un banco con medios). Así un medio ya declarado siempre tiene
   un banco que mostrar (Edge Cases de la spec).
9. **`on_hub_list` puede faltar.** La tabla `bancos` de la #34 no lo tenía; una migración lo suma
   (nullable, ver abajo) pero la ingesta todavía no lo carga. El modelo lo lleva como
   `boolean | null`: `null` = no se sabe, y el buscador lo ordena como no priorizado. Nunca se
   inventa un valor.
10. **El slice `perfil` guarda los medios de la base al lado de los del catálogo fijo.** Se suma
    `mediosGuardados: MedioDePago[]` (aditivo: lo persistido antes entra con `[]`, un medio con red
    o tipo inválidos descarta el perfil). `medios: string[]` y los selectores no cambian: T008
    mueve `selectEntradasMotor` a `mediosGuardados` y retira `medios` cuando conecte las pantallas.
    Al cerrar sesión se vacía junto con el resto del slice.

## Lo que dejó la #34 (PR #84)

| Tabla | Qué hay en `main` | Diferencia con lo pedido |
|---|---|---|
| `bancos` | `id` uuid (id de MODO), `nombre` not null. `select` para `authenticated`; escribe solo la service role | **Faltaban `on_hub_list` y el logo.** La migración `20261103000008_bancos_hub.sql` suma `on_hub_list boolean` y `logo_url text`, ambos nullables (la columna no se llama `imagen`: el test de estructura la prohíbe por RNF-06). El seed local los trae de MODO. **Falta que la ingesta los cargue** (`publicar.ts` solo escribe `id` y `nombre`); hasta entonces, en el proyecto alojado quedan `null` |
| `bancos` (seed) | Solo Galicia, con su id real | El resto lo carga la ingesta. Hasta entonces el buscador tiene un banco |
| `medios_de_pago` | `id`, `user_id` default `auth.uid()` (cascade), `banco_id` FK, `tipo` y `red` con `check`, `creado_en`. `unique (user_id, banco_id, tipo, red)` | Las columnas son `user_id` y `creado_en` (el plan decía `usuario_id` y `creado`) |
| `medios_de_pago` | Una policy `for all` del dueño | Permite `update`; la app no lo usa |
| Test de RLS | pgTAP en `supabase/tests/database/rls.test.sql` | — |

Es la misma tabla que el motor recibe como `perfil.mediosDePago`, mapeada a `MedioDePago` (`id`,
`bancoId`, `tipo`, `red`).

## Código de la app

```text
apps/mobile/src/
├── app/(onboarding)/medios.tsx         # US1 (la pantalla ya existe desde la #39)
├── app/(tabs)/perfil.tsx               # US2 (ídem)
├── components/selector-medio.tsx       # banco → tipo → red; lo usan las dos pantallas
└── perfil/                             # sin imports de React Native: se testea solo
    ├── modelo.ts         # tipos, ETIQUETAS_RED, reglas y mensajes de error (todo puro)
    ├── modelo.test.ts
    ├── buscar-bancos.ts  # decisión 7
    ├── buscar-bancos.test.ts
    ├── datos.ts          # Supabase (recibe el cliente por parámetro)
    └── datos.test.ts     # con un cliente falso
```

Nombres en kebab-case, como el resto de `apps/mobile`. El slice `perfil` y su persistencia son de
la #81.

**`modelo.ts`**
- `Red` (los 9 valores), `TipoTarjeta`, `Banco { id, nombre, onHubList: boolean | null }`,
  `MedioDePago { id, bancoId, nombreBanco, tipo, red }` y `MedioNuevo { bancoId, tipo, red }`.
  `nombreBanco` viene del mismo pedido que el medio (ver `leerMisMedios`).
- `ETIQUETAS_RED` con la tabla de la spec.
- `esDuplicado(medios, nuevo)` compara `bancoId`, `tipo` y `red`; vale tanto contra los medios
  guardados como contra los agregados en el onboarding.
- `puedeConfirmar(nuevos)` (≥ 1) y `puedeSacar(medios)` (≥ 2).
- `clasificarError(error)` devuelve uno de cinco casos, que la pantalla muestra así:

  | Caso | Cómo se detecta | La pantalla |
  |---|---|---|
  | `duplicado` | `code === "23505"` | "Esa tarjeta ya está en tu perfil" |
  | `banco_inexistente` | `code === "23503"` | "Ese banco ya no está disponible" y recarga el catálogo |
  | `sesion_vencida` | `status === 401` | Login de la #40, conservando lo cargado |
  | `sin_conexion` | Falló el `fetch` o `status === 0` | "Necesitás conexión para editar tu perfil" |
  | `otro` | Cualquier otro | Genérico con "Reintentar" |

**`datos.ts`** (recibe el cliente de Supabase por parámetro)

| Operación | Llamada |
|---|---|
| `leerBancos()` | `from("bancos").select("id, nombre, on_hub_list")` (`null` si la ingesta no lo cargó) |
| `leerMisMedios()` | `from("medios_de_pago").select("id, banco_id, tipo, red, bancos(nombre)").order("creado_en")` |
| `confirmarOnboarding(nuevos)` | `insert([...]).select(<lo mismo que leerMisMedios>)`, un solo pedido (decisión 5) |
| `agregarMedio(nuevo)` / `sacarMedio(id)` | `insert(...).select(...)` / `delete().eq("id", id)` |

- Mapea `banco_id` ↔ `bancoId` y `bancos.nombre` ↔ `nombreBanco`. Con el nombre embebido, Perfil
  no necesita el catálogo para mostrar los medios.
- Nunca manda ni filtra `user_id`: de eso se encargan el default y el RLS.
- Cada función devuelve `{ ok: true, datos } | { ok: false, error: clasificarError(...) }`, sin
  lanzar.
- **Sin cache propio** (decisión 6): el resultado de cada lectura o cambio exitoso entra al slice
  `perfil`, que la #81 persiste. Al cerrar sesión se vacía el slice.
- **Sin conexión**: si `leerMisMedios()` da `sin_conexion`, la pantalla muestra lo que tiene el
  slice y entra en modo solo lectura, con agregar y sacar deshabilitados. No hace falta detectar
  la red aparte.
- **Onboarding**: hasta "Confirmar" no se guarda nada, ni el banco elegido ni los medios
  agregados (FR-006). Si el usuario cierra la app antes, empieza de cero.

## Cómo validar

- **Tests** de `modelo.ts`, `buscar-bancos.ts` y `datos.ts` en verde (`npm run test -w
  @vuelto/mobile`).
- **Escenarios de aceptación de la spec** (US1-1 a US1-7, US2-1 a US2-3, US3-1), a mano en Expo
  Go, con el esquema de la #34 sembrado.
- **Dos usuarios**: al cerrar sesión con A y entrar con B, B no ve nada de A, ni siquiera de lo
  persistido en el dispositivo (FR-013).
