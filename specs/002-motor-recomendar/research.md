# Research: Motor — recomendar el medio de pago óptimo

No hay `NEEDS CLARIFICATION` abiertos: el stack está fijado (constitución, ADR-001, ADR-009) y la
spec resolvió las decisiones de producto. Este documento registra las decisiones técnicas del
diseño.

## R1. Dónde vive cada regla

- **Decisión**: `recomendar.ts` es la única función pública nueva y orquesta. La lógica se reparte
  en módulos internos de `packages/motor/src/`, cada uno con su test:
  `elegibilidad.ts` (las 9 reglas como lista ordenada), `tope.ts` (consumo y base),
  `dinero.ts` (enteros), `fecha.ts` (hora de Argentina), `motivos.ts` (plantillas) y
  `errores.ts`.
- **Rationale**: la issue #37 generaliza el cálculo de tope y la issue #38 "reutiliza la lógica
  de saldos, no duplicarla"; tenerlo en `tope.ts` desde ahora evita extraerlo después. Las reglas
  como lista ordenada `[{ causa, cumple }]` hacen que el orden de FR-015 sea un dato, no un
  `if` encadenado.
- **Alternativas**: todo en `recomendar.ts` (más simple hoy, pero las issues #37 y #38 lo
  partirían igual); una clase `Motor` (descartada por ADR-009: el núcleo son funciones).

## R2. Orden de evaluación

- **Decisión**: por cada promoción, (1) reglas que no dependen del medio, en el orden de
  FR-015: `categoria`, `comercio`, `vigencia`, `dia`, `canal`, `jurisdiccion`, `monto_minimo`;
  (2) medios del perfil compatibles (`medio_de_pago`); (3) tope (`tope_agotado`). La primera que
  falla da la causa.
- **Rationale**: el tope consumido es de la promoción, no del medio (se cuenta por
  `promocionId`), así que se evalúa una sola vez por promoción. Esto cumple FR-015 tal como está
  escrito: `medio_de_pago` es causa solo si ningún medio pasa.

## R3. Aritmética con enteros (FR-018)

- **Decisión** (`dinero.ts`):
  - `aCentavos(pesos) = Math.round(pesos * 100)`.
  - `aCentesimosDePunto(porcentaje) = Math.round(porcentaje * 100)` (20% → 2000).
  - `aplicarPorcentaje(centavos, cp) = Math.floor(centavos * cp / 10000)`.
  - `aPesos(centavos) = centavos / 100`.
  Todo el cálculo interno (consumo, restante, ahorro) es en centavos; se convierte a pesos solo
  al armar la salida.
- **Rationale**: los productos y sumas de enteros son exactos mientras no pasen
  `Number.MAX_SAFE_INTEGER` (≈9·10¹⁵). Con `centavos × 10000`, eso permite montos de hasta
  ≈$900 millones por compra, muy por encima del dominio. Redondear hacia abajo evita prometer
  más reintegro del real.
- **Alternativas**: `number` en pesos con épsilon (frágil en los bordes "exactamente $0");
  `bigint` (no se serializa a JSON sin conversión y complica los tipos del contrato).

## R4. Fechas en hora de Argentina (FR-006, FR-007, FR-016)

- **Decisión** (`fecha.ts`): `fechaArgentina(ahora)` desplaza el instante −3 h y toma
  `toISOString().slice(0, 10)` → `FechaISO`; el día de la semana sale de `getUTCDay()` sobre el
  mismo instante desplazado; el mes es `fecha.slice(0, 7)`. Las `FechaISO` se comparan como
  strings (`YYYY-MM-DD` ordena igual que la fecha).
- **Rationale**: Argentina está en UTC−3 sin horario de verano (supuesto de la spec). No hace
  falta `Intl` ni una librería de zonas horarias, y el motor sigue sin `dependencies`.
- **Alternativas**: `Intl.DateTimeFormat` con `America/Argentina/Buenos_Aires` (depende de los
  datos ICU del runtime, que pueden diferir entre Node y Deno).

## R5. Normalización de comercio (FR-009)

- **Decisión**: `normalizar(s) = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ")`.
- **Rationale**: es la misma regla de normalización que usa la ingesta para `name_bank`
  (`01-data-models.md`). ES2015+, sin dependencias.

## R6. Comparación de ids (FR-021, FR-023)

- **Decisión**: `a < b ? -1 : a > b ? 1 : 0` sobre los strings (orden por unidad de código
  UTF-16), nunca `localeCompare`.
- **Rationale**: `localeCompare` depende del locale y de ICU del runtime; la Edge Function corre
  en Deno y los tests en Node.

## R7. Error de perfil sin medios (FR-004)

- **Decisión**: `export class PerfilSinMediosError extends Error` en `errores.ts`, con `name`
  fijo. La Edge Function lo distingue con `instanceof`.
- **Rationale**: ADR-009 pide que los **datos** del dominio sean `interface`/`type` porque viajan
  como JSON; un error no viaja como dato, se lanza y lo traduce la capa imperativa. Es la única
  clase del motor.
- **Alternativas**: devolver `{ ok: false }` (obliga a todos los llamadores a chequear un caso
  que la app ya evita; decidido con el usuario el 20/10).

## R8. Jurisdicciones válidas (FR-012)

- **Decisión**: `Jurisdiccion` suma `"otra_provincia"`. `JURISDICCIONES_VALIDAS: readonly
  Jurisdiccion[] = ["nacional", "caba", "pba"]` exportada desde `elegibilidad.ts`; `null` aplica.
- **Rationale**: decisión del usuario (alcance CABA/AMBA). Exportarla permite que un test y, en
  el futuro, la Edge Function la lean, sin repetir la lista.

## R9. Rendimiento (SC-003)

- **Decisión**: el consumo de tope se precalcula una vez en un `Map<promocionId, …>` recorriendo
  las compras (O(C)); cada promoción se evalúa en O(medios). Total O(P·M + C). Un test genera
  2.000 promociones y 100 compras y verifica que `recomendar` tarda menos de 1 s, medido con
  `Date.now()` en el test (el motor no lee el reloj; el test sí puede).
- **Rationale**: `performance` necesita los tipos de Node o del DOM, y `tsconfig.base.json` tiene
  `lib: ["ES2022"]`; `Date.now()` alcanza para un umbral de 1 s.

## R10. Lo que el contrato admite y esta issue no produce

- `OpcionDePago.promocionId: string | null`: esta issue siempre lo completa. El `null` queda
  para un medio sin promo, que hoy la pantalla deriva del perfil ("Sin promo en supermercados",
  mockup `2-recomendacion.png`). No se cambia el contrato.
- `Promocion.acumulable`, `tope.alcance`, `tope.grupoTopeId` y `tope.periodo` semanal / por
  compra: los ignora esta issue (issue #37).
