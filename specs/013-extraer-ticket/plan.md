# Implementation Plan: Leer los datos de un ticket a partir de su foto

**Branch**: `claude/48-ticket-groq` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-extraer-ticket/spec.md`

## Summary

Una Edge Function nueva, `extraer-ticket`, recibe la foto de un ticket de un usuario con cuenta, se la manda a Groq con un esquema estricto y devuelve monto, comercio, fecha, medio de pago tal como lo dice el ticket y el texto con los datos personales tapados. Groq devuelve cada dato **tal como está impreso** y la conversión (importe, fecha, red, tipo) la hace código propio, así la regla de no deducir se puede probar sin red (research R2). El tapado tiene dos capas: el pedido a Groq y reglas determinísticas (R5). La estructura es la de `recomendar` (ADR-009): `index.ts` → handler → servicio → interfaz `Extractor` con `ExtractorGroq`. Antes de escribir el servicio, una prueba manual con 3 fotos reales confirma que Groq lee imágenes con el esquema estricto (FR-019).

## Technical Context

**Language/Version**: TypeScript 6 (strict, `tsconfig.base.json`); Deno 2 en Supabase; los tests corren en Node ≥ 22.13 con Vitest.

**Primary Dependencies**: ninguna nueva. Se reusan `@supabase/supabase-js` (solo para Auth, ya en el `deno.json` de `recomendar`) y `@vuelto/motor` (`fechaArgentina` y el tipo `Red`). Groq se llama con `fetch` (R1).

**Storage**: ninguno. Nada se guarda en el servidor; la app guarda `textoExtraido` con la compra (#49).

**Testing**: Vitest en el workspace `supabase` (`functions/**/*.test.ts`), con un extractor simulado y un `fetch` simulado para `ExtractorGroq`. Sin red ni key (FR-017). Cobertura ≥ 90% de líneas. `deno check` de `index.ts` en el CI (ya recorre `supabase/functions/*/index.ts`).

**Target Platform**: Supabase Edge Functions (Deno), proyecto `wahvysbxwgbbyynjiczy`.

**Project Type**: servicio HTTP (Edge Function) dentro del monorepo.

**Performance Goals**: respuesta en menos de 25 s medidos en el servidor (FR-015); Groq se corta a los 20 s.

**Constraints**: imagen decodificada de hasta 2.500.000 bytes (FR-002); la imagen no se escribe en ningún lado ni en los registros (FR-010, FR-013); costo $0 (plan gratis de Groq con Zero Data Retention).

**Scale/Scope**: decenas de tickets por día (MVP). Una función nueva y un cambio aditivo en `_shared/http.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitución 3.0.1.

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Regla de oro | Resuelve una decisión (registrar la compra para estimar el tope); no muestra promociones | ✅ |
| II. Motor determinístico | El motor no cambia ni llama a Groq; solo se reusan `fechaArgentina` y el tipo `Red` | ✅ |
| III. Esquema y `null` explícito | Esquema con todos los campos `required` y `["string","null"]`, `additionalProperties: false`, validado de nuevo en el servidor (R8). Nada se infiere: la conversión es por tabla y lo desconocido queda `null` (R4). El medio de pago nunca se deduce (FR-006) | ✅ |
| III. Fragmento de origen | Cada dato sale de un texto impreso que queda en `textoExtraido`, que la app guarda con la compra. No se agregan fragmentos por campo a la respuesta: el texto completo permite auditar cualquier campo y la tabla `compra` ya lo tiene | ✅ (justificado) |
| IV. Secretos y privacidad | `GROQ_API_KEY` solo en la Edge Function (`Deno.env`). La imagen vive en memoria durante el pedido; ningún camino la escribe y los registros no tienen valores del ticket (R7). El texto devuelto se tapa en dos capas (R5). Sin tablas nuevas | ✅ |
| V. Topes estimados | No muestra topes | n/a |
| VI. Tests | Suite sin red, con mocks del extractor y de `fetch`; un test por código de error y por regla de normalización y de tapado | ✅ |
| Stack y costo | Supabase Edge Functions; Groq solo del lado del servidor; plan gratis | ✅ |

**Re-check post-diseño**: sin cambios. No hay violaciones que justificar en *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/013-extraer-ticket/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (R1-R10)
├── data-model.md        # PedidoLectura, LecturaCruda, LecturaTicket, errores
├── quickstart.md        # Prueba manual, tests, despliegue
├── contracts/
│   └── extraer-ticket.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
supabase/
├── functions/
│   ├── _shared/
│   │   └── http.ts                  # + 6 códigos de error (R6), aditivo
│   └── extraer-ticket/
│       ├── deno.json                # import map: @vuelto/motor y supabase-js
│       ├── index.ts                 # composition root: AutenticadorSupabase + ExtractorGroq
│       ├── handler.ts               # HTTP, sesión, cuerpo, errores → códigos
│       ├── imagen.ts                # tipo, tamaño, base64 y primeros bytes (R3)
│       ├── servicio.ts              # ServicioLecturaTicket: extractor → esquema → normalizar → tapar
│       ├── extractor.ts             # interfaz Extractor, LecturaCruda y errores del extractor
│       ├── extractor-groq.ts        # fetch a Groq, prompt, timeout de 20 s, modo estricto o JSON libre
│       ├── esquema.ts               # esquema para Groq y validador propio (R8)
│       ├── normalizar.ts            # importe, fecha, red, tipo, últimos 4 (R4)
│       ├── privacidad.ts            # tarjetas, CUIT/CUIL, DNI y recorte (R5)
│       ├── prueba-manual.ts         # FR-019: corre el servicio con fotos locales
│       ├── *.test.ts                # uno por archivo de lógica
│       └── test/
│           └── tickets.ts           # 3 tickets inventados: LecturaCruda y LecturaTicket esperada
└── vitest.config.ts                 # excluir prueba-manual.ts de la cobertura
docs/architecture/02-api-routes.md   # el endpoint nuevo (FR-018)
```

**Structure Decision**: misma organización que `recomendar` (ADR-009). La lógica que se prueba (handler, imagen, servicio, esquema, normalizar, privacidad, extractor-groq con `fetch` simulado) no depende de Deno; `index.ts` y `prueba-manual.ts` usan `Deno` y quedan fuera de `tsc` y de la cobertura, como el `index.ts` de `recomendar`. El tsconfig de `supabase` ya excluye `functions/*/index.ts`; se suma `prueba-manual.ts`.

## Orden de implementación

1. **Prueba de factibilidad (FR-019)**: `esquema.ts`, `extractor.ts`, `extractor-groq.ts`, `normalizar.ts`, `privacidad.ts`, `servicio.ts` mínimos y `prueba-manual.ts` (con `--modo=json-libre`). El usuario corre la prueba con 3 fotos reales. **Si no pasa, se frena acá** y se vuelve al equipo (ADR-012, respaldo).
2. **Servicio completo y tests**: normalización (US1), privacidad (US2), los 3 tickets de ejemplo (SC-001, SC-003).
3. **Handler, imagen y errores**: autenticación, validación del cuerpo y la imagen, cada código de error (US3, SC-005), registros sin valores (FR-013), tiempo máximo (FR-015).
4. **Documentación y cierre**: `02-api-routes.md`, despliegue (`quickstart.md` §3), `rules-guardian`, `/code-review`, bitácora.

## Complexity Tracking

Sin violaciones de la constitución.
