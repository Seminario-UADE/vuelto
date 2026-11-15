# Implementation Plan: Registrar una compra con la foto del ticket

**Branch**: `claude/49-ticket-app` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-ticket-con-foto/spec.md`

## Summary

«Escanear ticket» deja de simular: abre la cámara o la galería del sistema (`expo-image-picker`), achica la foto a JPEG de 2,5 MB como máximo (`expo-image-manipulator`), la manda al servicio de la spec 013 con `supabase.functions.invoke` y lleva lo leído a «Revisá tu compra». Las copias temporales se borran en todos los caminos (constitución 3.0.2). El medio leído se convierte en una sugerencia, nunca marcada, y la fecha se puede cambiar con un calendario propio. La lógica vive en `src/ticket/`, sin React Native ni Expo, para probarla en Node; lo nativo es un adaptador fino (research R5).

## Technical Context

**Language/Version**: TypeScript 6 (strict); Expo SDK 58 (React Native 0.88, Expo Router); tests en Node ≥ 22.13 con Vitest.

**Primary Dependencies**: nuevas, con `npx expo install`: `expo-image-picker`, `expo-image-manipulator` y `expo-file-system` (versiones del SDK 58, oficiales de Expo, funcionan en Expo Go). Se reusan `@supabase/supabase-js`, Redux Toolkit y `@vuelto/motor` (tipo `Red`).

**Storage**: ninguno nuevo. La foto no se guarda; la compra se guarda como hoy (cola de la spec 010), con el texto del ticket.

**Testing**: Vitest en `apps/mobile` (`src/**/*.test.ts`), con la cámara, el manipulador, el borrado y el cliente de Supabase simulados. Las pantallas se prueban a mano (quickstart §2), como en las specs anteriores de la app.

**Target Platform**: iOS y Android (Expo Go y build de EAS) y web (vuelto.expo.app, sin cámara: selector de archivos o «Ticket de ejemplo»).

**Project Type**: app móvil (workspace `apps/mobile` del monorepo).

**Performance Goals**: menos de 8 s desde la foto confirmada hasta «Revisá» en 9 de 10 lecturas con 4G o Wi-Fi (SC-001).

**Constraints**: foto de 2,5 MB como máximo; 30 s de espera; 0 copias temporales después de cada lectura; la app nunca tiene la key del proveedor.

**Scale/Scope**: una pantalla rehecha («Escanear ticket»), una ajustada («Revisá tu compra»), 4 módulos de lógica nuevos, un adaptador nativo y un componente de calendario.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitución 3.0.2.

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Regla de oro | Registra una compra para decidir mejor la próxima; no muestra promociones | ✅ |
| II. Motor determinístico | El motor no cambia. La app sigue calculando con él (ADR-010) | ✅ |
| III. `null` explícito, nunca inferir | El medio leído es solo una sugerencia, nunca se marca (FR-008); la sugerencia exige una sola coincidencia exacta. Los tipos nuevos usan `T \| null` | ✅ |
| IV. Secretos y privacidad | La app no tiene la key del proveedor (llama a la Edge Function con la sesión). Las copias temporales se borran en todos los caminos y la foto no va a la galería, al store, a la persistencia ni a los registros (aclaración 3.0.2, que entra en este mismo PR) | ✅ |
| V. Topes estimados | No muestra topes nuevos; la confirmación ya los muestra con su base | ✅ |
| VI. Tests | La lógica en `src/ticket/` se prueba en Node sin red; un test por camino de borrado y por fila de errores | ✅ |
| Stack y costo | Librerías oficiales de Expo, sin costo | ✅ |

**Re-check post-diseño**: sin cambios. Nada para *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/014-ticket-con-foto/
├── plan.md
├── research.md          # R1-R8
├── data-model.md        # FotoPreparada, MedioLeido, LecturaApp, Sugerencia, parámetros
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

El contrato con el servicio es el de la spec 013 (`specs/013-extraer-ticket/contracts/extraer-ticket.md`), sin cambios.

### Source Code

```text
apps/mobile/
├── app.json                              # plugin de expo-image-picker con los permisos en castellano
├── package.json                          # + expo-image-picker, expo-image-manipulator, expo-file-system
└── src/
    ├── ticket/                           # nuevo: lógica sin React Native ni Expo
    │   ├── leer.ts / leer.test.ts         # preparar → mandar → traducir → borrar (FR-004 a FR-007)
    │   ├── servicio.ts / servicio.test.ts # supabase.functions.invoke y la traducción de errores (R3)
    │   ├── sugerencia.ts / .test.ts       # el medio leído contra el perfil (FR-008)
    │   ├── resultados.ts / .test.ts       # la tabla de FR-011
    │   ├── fechas.ts / .test.ts           # el rango de FR-010
    │   └── camara.ts                      # adaptador Expo: selector, manipulador, borrado (sin lógica)
    ├── components/selector-fecha.tsx     # nuevo: calendario del mes (R7)
    ├── data/
    │   ├── contracts.ts                  # LecturaTicket → LecturaApp
    │   ├── api.ts                        # leerTicket: escenarios de desarrollo con la forma nueva (R8)
    │   ├── fixtures.ts                   # el ticket de ejemplo con VISA DEBITO
    │   └── por-confirmar.ts (+ test)     # medio sugerido en vez de marcado; rango de días (R6)
    ├── store/acciones.ts                 # + escenario "ticket-de-ejemplo"
    └── app/
        ├── escanear.tsx                  # cámara, galería, sin sesión, leyendo, errores
        └── revisa.tsx                    # sugerencia y notas del medio, avisos, fecha editable
```

**Structure Decision**: la lógica nueva va a una carpeta propia `src/ticket/`, como `src/perfil/` y `src/sync/`, con módulos que reciben lo nativo y el cliente de Supabase por parámetro (patrón de `perfil/datos.ts`). `camara.ts` y los componentes no tienen tests de unidad: se prueban a mano.

## Orden de implementación

1. **Lógica pura**: `resultados.ts`, `sugerencia.ts`, `fechas.ts` y `data/por-confirmar.ts`, con sus tests. No necesitan ninguna librería nueva.
2. **La lectura**: `servicio.ts` y `leer.ts` con sus tests (cliente y cámara simulados), y `LecturaApp` y los escenarios en `api.ts`.
3. **Lo nativo y las pantallas**: instalar las librerías, `camara.ts`, `escanear.tsx`, `selector-fecha.tsx` y `revisa.tsx`. Prueba a mano en Expo Go (quickstart §2).
4. **Cierre**: verificación completa, `rules-guardian`, `/code-review`, bitácora y PR (con la aclaración 3.0.2 de la constitución para el PO).

## Complexity Tracking

Sin violaciones de la constitución.
