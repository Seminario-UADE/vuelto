# Implementation Plan: Registrar una compra — borrar, promo aplicada y subida a la cuenta

**Branch**: `claude/elegant-hermann-7c2dcf` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-registro-compras-cola/spec.md`

## Summary

La captura local de una compra ya existe. Este plan agrega, en `apps/mobile`, cuatro piezas puras y su cableado al store (ADR-009: núcleo funcional, capa imperativa):

1. **Borrar** una compra desde «Mis compras» (thunk `eliminarCompra`); los topes se corrigen solos porque son selectores.
2. **Promo propuesta** única (`promoPropuesta`): la usan la hoja «Revisá tu compra» y el guardado, evaluada en la fecha de la compra; el borrador gana `usarPromo`.
3. **Cola de operaciones** (guardar / borrar), un slice aparte con su propia clave de almacenamiento, escrita antes que `compras`, con estados `pendiente | enviando | rechazada | bloqueada`, dueño, compactación y un único vaciado a la vez.
4. **Subida a Supabase** detrás de una interfaz (`RepositorioCompras`): `compraAFila` pura, clasificación de errores, versión en memoria y versión sobre Supabase **desconectada** hasta #40, #41 y #42.
5. **`aplicarPendientes`**, la mezcla pura que #42 debe usar al sincronizar.

No se cambia la forma del slice `compras` ni `persistencia.ts` (de #42): la cola se persiste con su propio listener y su propio thunk de arranque. Se suman tests pgTAP de lo que la feature asume de la tabla `compras`.

## Technical Context

**Language/Version**: TypeScript 6 strict (monorepo, Node ≥ 22.13), React Native 0.88 / Expo SDK 58.

**Primary Dependencies**: Redux Toolkit 2 y `react-redux` 9 (ya están), `@supabase/supabase-js` (ya está), `@vuelto/motor` (ya está). **Nueva**: `expo-crypto` (`randomUUID`) para los identificadores de las compras.

**Storage**: AsyncStorage del dispositivo: clave nueva `vuelto.cola.v1`; `vuelto.store.v1` no cambia de forma. Servidor: tabla `public.compras` (spec 007), ya con RLS.

**Testing**: Vitest en `apps/mobile` (como `store/*.test.ts` y `data/*.test.ts`), con `almacenamiento` en memoria, repositorio remoto en memoria y generador de ids determinista. pgTAP (`supabase test db`) para el esquema.

**Target Platform**: iOS y Android (Expo Go, APK de EAS) y web.

**Project Type**: mobile-app con backend Supabase.

**Performance Goals**: borrar o guardar actualiza topes y totales en < 1 s sin red (SC-001); el vaciado de la cola no bloquea la interfaz.

**Constraints**: modo avión funcional; el envío se abandona a los 10 s; la cola no puede crecer sin techo (descarte a los 90 días); ningún dato de ejemplo ni imagen de ticket llega a la cola.

**Scale/Scope**: decenas de operaciones por usuario; 4 estados; 2 repositorios; 1 slice nuevo; 1 pantalla tocada (`mis-compras`), 1 hoja (`revisa`) y el flujo de cierre de sesión.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Cómo |
|---|---|---|
| I. Decisión, no listado | ✅ | Registrar y corregir lo que el usuario pagó; no muestra promos sin una compra concreta. La promo propuesta aparece solo dentro de una compra |
| II. Motor determinístico, derivado y no guardado | ✅ | La promo propuesta sale del motor (`recomendarSeguro`). Topes y recomendación se siguen derivando; la cola guarda **entradas** (compras), nunca topes. `ahora` sale del store |
| III. Extracción con esquema y null explícito | ✅ | La fila y las operaciones usan `T \| null`, sin opcionales. No se inventa el medio del ticket (sin cambios) |
| IV. Secretos y privacidad | ✅ | Solo anon key + sesión; sin imágenes; RLS ya existe y se prueba más (FR-021). Cola con techo de 90 días y documentada en `privacidad.md` |
| V. Topes estimados con su base | ✅ | La hoja muestra el reintegro de la promo propuesta con su base; nada se presenta como cobrado |
| VI. Test-first en el motor | ✅ n/a | No se toca `packages/motor`. Las piezas puras nuevas se escriben con tests primero |
| ADR-009 | ✅ | Núcleo puro (cola, fila, mezcla, clasificación, promo) + capa imperativa (thunks, repositorios por interfaz inyectada) |
| ADR-010 | ✅ | Todo el cálculo en la app; la subida es solo persistencia |

**Complejidad que merece justificación**: dos almacenamientos locales (store y cola) obligan a una regla de orden de escritura y a una reconciliación al arrancar (R2). Se aceptan para no tocar `persistencia.ts`, que es de #42.

**Re-chequeo tras el diseño**: sin violaciones. `Compra.reintegroEsperado` ya se guardaba antes de esta feature; no se agregan valores derivados nuevos al store.

## Project Structure

### Documentation (this feature)

```text
specs/010-registro-compras-cola/
├── plan.md
├── research.md          # R1–R11
├── data-model.md        # Operación, estados, fila, borrador
├── quickstart.md        # cómo validar a mano y por tests
├── contracts/
│   ├── repositorio-compras.md   # interfaz y clasificación de errores
│   ├── fila-compras.md          # Compra → fila de public.compras
│   └── aplicar-pendientes.md    # contrato con #42
├── checklists/requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Source Code

```text
apps/mobile/src/
├── data/compras/                    # núcleo puro, sin React ni red
│   ├── operaciones.ts               # tipos, encolar con compactación, siguiente lote, aplicar resultado, descartar viejas
│   ├── fila.ts                      # compraAFila
│   ├── pendientes.ts                # aplicarPendientes
│   ├── promo-propuesta.ts           # promoPropuesta
│   ├── errores.ts                   # clasificarError: error de red / Postgrest → ResultadoEnvio
│   ├── repositorio.ts               # interfaz RepositorioCompras + ResultadoEnvio
│   ├── repositorio.memoria.ts       # para los tests (y la demo sin cuenta)
│   ├── repositorio.supabase.ts      # adaptador; desconectado hasta #40/#41/#42
│   └── *.test.ts
├── store/
│   ├── cola.ts                      # slice `cola` + persistencia propia (clave vuelto.cola.v1)
│   ├── thunks.ts                    # guardarCompra (id + cola), eliminarCompra, vaciarCola, iniciarCompras
│   ├── selectores.ts                # selectMarcasDeSubida, selectComprasDelPeriodo
│   └── index.ts                     # suma `cola` al reducer y `generarId` / `subida` al extra
├── app/
│   ├── mis-compras.tsx              # lista todo el período, borrar, marcas
│   ├── revisa.tsx                   # promo propuesta quitable
│   └── _layout.tsx                  # arranque (iniciarCompras) y disparadores de AppState
└── components/compra-row.tsx        # marca «Sin subir» / «Solo en este celular»
supabase/tests/database/compras_cliente.test.sql   # FR-021
docs/product/privacidad.md                          # FR-019
```

**Structure Decision**: núcleo puro en `src/data/compras/` (importable desde los tests sin React), slice y thunks en `src/store/` junto a los demás, y el cableado a pantallas mínimo. Archivos compartidos con la sesión de #42 (`store/index.ts`, `store/selectores.ts`): cambios chicos y aditivos; `store/persistencia.ts` y `store/acciones.ts` no se modifican; `store/compras.ts` solo recibe dos reducers aditivos (`compraEliminada`, `comprasReconciliadas`) sin cambiar la forma `{ lista }`.

## Complexity Tracking

| Decisión | Por qué hace falta | Alternativa descartada |
|---|---|---|
| Cola con su propia clave y escritura anterior a `compras` | No tocar `persistencia.ts` (#42) y garantizar que nunca quede una compra sin operación | Una sola clave: obliga a modificar `persistencia.ts` y `Persistido` |
| Estado `bloqueada` con motivo | Mercado Pago y las promos de ejemplo nunca subirán; no deben contar como error ni trabar la cola | Marcarlas `rechazada` (alarma permanente) o subirlas sin promo (falsea la base) |
| Reconciliación al arrancar | Cubre el cierre entre las dos escrituras y migra las compras `nN` | Confiar en que los dos `setItem` terminan juntos |
