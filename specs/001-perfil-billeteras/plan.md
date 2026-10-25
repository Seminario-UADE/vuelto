# Implementation Plan: Perfil — declarar bancos, tarjetas y redes (MODO)

**Branch**: `feat/41-perfil-plan` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

## Summary

Onboarding y pestaña Perfil donde el usuario declara sus medios de pago (banco del catálogo de
MODO + tipo de tarjeta + red). La app lee y escribe directo en Supabase con `supabase-js` y el
RLS, sin Edge Function (ADR-009). La integridad la garantiza la tabla. La lógica de la pantalla
(buscador, duplicados, mínimo de un medio) va en funciones puras con tests.

**Bloqueada por**: #34 (crea las tablas), #39 (app base: navegación, cliente de Supabase, tests,
almacenamiento local) y #40 (sesión).

## Technical Context

- **Stack**: TypeScript strict, Expo + Expo Router, `@supabase/supabase-js` (los instala la #39).
  Sin `@vuelto/motor` en la app (RNF-02).
- **Datos**: tablas `bancos` (lectura) y `medios_de_pago` (del dueño), de la #34. Cache local
  para leer sin conexión.
- **Tests**: funciones puras de `apps/mobile/src/perfil/` con el runner de la #39 (Vitest si no
  deja otro). RLS: test de la #34. Pantallas: a mano en Expo Go.

## Constitution Check

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Decisión, no listado | No muestra promociones. Declara los medios con los que la #43 decide qué conviene | ✅ |
| II. Motor determinístico | No usa ni importa el motor. No calcula nada en el dispositivo | ✅ |
| III. Null explícito | Tipos sin `?:`; `imagen` del banco es `string \| null` | ✅ |
| IV. Secretos y privacidad | Sin service role ni Gemini. RLS del dueño, creada por la #34 junto con la tabla. Cache por usuario, borrado al cerrar sesión | ✅ |
| V. Topes con base | No muestra topes | N/A |
| VI. Test-first | El motor no cambia; las funciones puras se escriben test-first | ✅ |

Sin violaciones. `rules-guardian` antes del PR de implementación (usa una tabla con RLS).

## Decisiones

La spec es del 13/10. Estas decisiones la cruzan con lo decidido después (constitución 2.0.0,
ADR-001 §Actualización, RNF-02, ADR-009, contrato de tipos #33). La spec no cambia.

1. **Sin Edge Function.** ADR-009 deja el perfil como CRUD directo con `supabase-js` y RLS. Una
   función `perfil` haría lo mismo que una policy, con más código.
2. **La app declara sus propios tipos.** RNF-02 pide 0 resultados al buscar `@vuelto/motor` en
   `apps/mobile`, así que no se puede importar ni con `import type`. Los valores son los mismos
   de `packages/motor/src/tipos.ts`, y el `check` de la tabla rechaza cualquier otro.
3. **La integridad está en la base, no en la pantalla.** El `unique` de la tripleta (FR-004)
   también protege contra dos dispositivos o un doble toque. `not null` y `check` cubren FR-005
   y FR-011. Sin `update`: la spec solo pide agregar y sacar.
4. **"Al menos un medio" lo controla la app** (FR-007, FR-009). Un trigger en la base frenaría
   el borrado en cascada al eliminar la cuenta. Si el perfil igual queda vacío, `recomendar`
   (#43) responde 409 `perfil_sin_medios` y la app lleva al onboarding.
5. **El onboarding se guarda en un solo `insert` de varias filas** (FR-011): entra todo o nada.
   Desde Perfil, cada alta o baja es un pedido aparte.
6. **Se mantiene la lectura sin conexión** (FR-012, SC-003). La Actualización del 13/10 sacó del
   celular el motor, el corpus y las compras, pero no el perfil. La constitución 2.0.0 deja
   registrado que esta spec no depende del motor. El comentario de la #45 sobre "funciona
   offline" se refiere a recomendación y topes. Si el equipo prefiere sacarlo, hay que cambiar
   la spec antes de implementar.
7. **Buscador en el dispositivo.** Son 82 bancos: se bajan al abrir el buscador y se filtran en
   cada tecla.
   - **Normalización**, igual para el texto y el nombre:
     `toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim()`.
   - **Coincidencia**: por substring.
   - **Orden**: primero los `on_hub_list`, después por nombre normalizado y, si dos empatan, por
     `id`. Se comparan códigos de carácter (`<` y `>`), no `localeCompare`, para que el orden
     no dependa del idioma del dispositivo.
   - **Sin resultados**: con texto vacío no se muestra nada. Con texto pero sin coincidencias,
     aparece el aviso de US1-7.
8. **Los bancos no se borran del catálogo.** El sembrado hace upsert por `id`, y `banco_id` es FK
   con `on delete restrict`. Así un medio ya declarado siempre tiene un banco que mostrar (Edge
   Cases de la spec).

## Lo que necesita de la #34

| Tabla | Requisito |
|---|---|
| `bancos` | `id` (id de MODO), `nombre` not null, `imagen` null, `on_hub_list` not null. `select` para `authenticated`; escribe solo la service role. El sembrado hace upsert y no borra |
| `medios_de_pago` | `id` uuid default `gen_random_uuid()`. `usuario_id` default `auth.uid()`, FK `auth.users` `on delete cascade`. `banco_id` FK `bancos` `on delete restrict` (la FK también permite leer `bancos(nombre)` en el mismo pedido). `tipo` `check in ('debito','credito')`. `red` `check` con los 9 valores de `Red`. `creado` default `now()`. Todo `not null` |
| `medios_de_pago` | `unique (usuario_id, banco_id, tipo, red)` |
| `medios_de_pago` | Policies en la misma migración: `select` y `delete` con `usuario_id = auth.uid()`, `insert` con `with check (usuario_id = auth.uid())`, sin `update` |
| Test de RLS | A no lee ni borra medios de B, y no inserta con `usuario_id` de B |

Es la misma tabla que lee `recomendar` (#43), mapeada a `MedioDePago` (`id`, `bancoId`, `tipo`,
`red`).

## Código de la app

```text
apps/mobile/
├── app/onboarding/medios-de-pago.tsx   # US1 (ruta final según la navegación de la #39)
├── app/(tabs)/perfil.tsx               # US2
├── components/SelectorMedio.tsx        # banco → tipo → red; lo usan las dos pantallas
└── src/perfil/                         # sin imports de React Native: se testea solo
    ├── modelo.ts        # tipos, ETIQUETAS_RED, reglas y mensajes de error (todo puro)
    ├── modelo.test.ts
    ├── buscarBancos.ts  # decisión 7
    ├── buscarBancos.test.ts
    └── datos.ts         # Supabase y cache local
```

**`modelo.ts`**
- `Red` (los 9 valores), `TipoTarjeta`, `Banco { id, nombre, imagen: string | null, onHubList }`,
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

**`datos.ts`** (recibe el cliente de Supabase de la #39)

| Operación | Llamada |
|---|---|
| `leerBancos()` | `from("bancos").select("id, nombre, imagen, on_hub_list")` |
| `leerMisMedios()` | `from("medios_de_pago").select("id, banco_id, tipo, red, bancos(nombre)").order("creado")` |
| `confirmarOnboarding(nuevos)` | `insert([...]).select(<lo mismo que leerMisMedios>)`, un solo pedido (decisión 5) |
| `agregarMedio(nuevo)` / `sacarMedio(id)` | `insert(...).select(...)` / `delete().eq("id", id)` |

- Mapea `banco_id` ↔ `bancoId`, `bancos.nombre` ↔ `nombreBanco` y `on_hub_list` ↔ `onHubList`.
  Con el nombre embebido, Perfil no necesita el catálogo para mostrar los medios.
- Nunca manda ni filtra `usuario_id`: de eso se encargan el default y el RLS.
- Cada función devuelve `{ ok: true, datos } | { ok: false, error: clasificarError(...) }`, sin
  lanzar.
- **Cache**:
  - Claves `perfil.medios.<usuarioId>` (con el `user.id` de la sesión) y `perfil.bancos`, en el
    almacenamiento que deje la #39 (AsyncStorage si no deja otro).
  - Se escribe después de cada lectura o cambio exitoso. Un valor corrupto se lee como `null`.
  - `borrarCache()` se llama al cerrar sesión.
- **Sin conexión**: si `leerMisMedios()` da `sin_conexion`, la pantalla usa el cache y entra en
  modo solo lectura, con agregar y sacar deshabilitados. No hace falta detectar la red aparte.
- **Onboarding**: hasta "Confirmar" no se guarda nada, ni el banco elegido ni los medios
  agregados (FR-006). Si el usuario cierra la app antes, empieza de cero.

## Cómo validar

- **Tests** de `modelo.ts` y `buscarBancos.ts` en verde (`npm run test -w @vuelto/mobile`).
- **Escenarios de aceptación de la spec** (US1-1 a US1-7, US2-1 a US2-3, US3-1), a mano en Expo
  Go, con el esquema de la #34 sembrado.
- **Dos usuarios**: al cerrar sesión con A y entrar con B, B no ve nada de A, ni siquiera del
  cache (FR-013).
- `grep -rn "@vuelto/motor" apps/mobile` → 0 resultados (RNF-02).
