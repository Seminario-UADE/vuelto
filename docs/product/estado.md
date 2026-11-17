# Estado

> Relevado el **17/11/2026** sobre `main` (commit `7759860`, CI verde ese día),
> contra el código, `git log`, los ADR, las specs de `specs/` y el CI de
> GitHub. Lo que no se pudo comprobar desde el repo dice **sin verificar**.
> Se actualiza al cerrar cada hito, no cada sesión: si pasó más de una semana,
> desconfiar de las cifras.

- **Etapa:** MVP funcionando de punta a punta, en la recta final antes del
  pitch. El motor, la app, el esquema de Supabase con RLS, la ingesta diaria de
  MODO y la lectura del ticket están implementados y con tests. Lo que queda
  son terminaciones de UX, la letra chica con Gemini, la auditoría de
  secretos y la preparación de la entrega (ver «Qué falta»).
- **Nombre:** Vuelto es tentativo; falta verificar dominio y marca (INPI).
  Ver `marca.md`.
- **Equipo:** 4 integrantes (la materia pide 6-8, sin resolver con la
  cátedra). Ver `roles-scrum.md`.
- **Web publicada:** https://vuelto.expo.app, republicada sola cuando el CI de
  `main` pasa (`.github/workflows/deploy-web.yml`; las últimas corridas del
  17/11 salieron bien).

## Qué está hecho

| Pieza | Estado | Evidencia |
|---|---|---|
| **Motor de reglas** (`packages/motor`) | Hecho. `recomendar` (medio óptimo con tope compartido, acumulabilidad, días, mínimos, débito/crédito, jurisdicción), `estimarTopes` (restante con su base), `recomendarGrupo` y `dividir` (gasto en grupo). TS puro, sin `dependencies`, monto opcional. | Specs 002, 003, 005, 016; PR #70, #73, #74, #77, #87, #150 |
| **App móvil** (`apps/mobile`, Expo) | Hecha en lo central. Onboarding **sin cuenta** (se guarda el borrador y pasa a la cuenta al registrarse), login con Supabase Auth, perfil de medios y comercios, «¿Con qué pago?» en vivo (la recomendación se deriva con selectores de Redux, sin red), flujo de compra paso a paso con compra «por confirmar», Mis compras, Mis topes con su base, tema claro y oscuro. Verificada a mano en un Android real el 15/11 (issue #43). | ADR-010; specs 006, 008, 010, 012; PR #86, #95, #107, #114, #121, #155 |
| **Topes siempre estimados con su base** | Hecho en motor y pantallas. | PR #74, #77, #98 |
| **Sincronización** del corpus y de las compras del período | Hecha: primera sincronización completa, después incremental por `actualizada_en`; las compras sin red van a una cola. | Specs 009 y 010; PR #90, #91 |
| **Supabase** | Esquema con RLS desde la creación de cada tabla, 12 migraciones, pruebas pgTAP en `supabase/tests/database/` (el CI las corre en el job `supabase-rls`). | Spec 007; PR #84, #125 |
| **Ingesta de promos de MODO** (`ingesta/`) | Hecha: baja las 13 categorías, guarda lo crudo en `capturas_crudas`, mapea por código (sin modelo de lenguaje), valida (porcentaje, vigencia, obligatorios) y publica sin revisión humana. Descarta sola lo que no puede representar. Corre diaria en GitHub Actions; las corridas del 8 al 15/11 salieron bien salvo una (10/11). | ADR-005, ADR-011; PR #92, #117, #122, #154 |
| **Lectura del ticket** | Hecha: la app achica la foto y la manda a la Edge Function `extraer-ticket`, que la lee con Groq sin guardarla; la app borra los temporales; lo que el ticket no trae queda `null` y el medio de pago se pregunta. Incluye sugerir el comercio del catálogo. | ADR-012; specs 013, 014, 015; PR #133, #135, #143, #146 |
| **Gasto en grupo (nivel 1)** | Hecho: contactos vinculados por invitación (link, sin buscador de usuarios), armado del grupo, «quién paga» con los datos reales de cada integrante (Edge Function `recomendar-grupo`) y división en pesos enteros. | ADR-008, ADR-010; spec 016; PR #141, #150 |
| **CI** | Lint, typecheck, tests, build, `deno check` de las Edge Functions y `supabase-rls`. Verde en `main` el 17/11. | `.github/workflows/ci.yml` |
| **Documentación de la materia** | Bitácora de prompts, declaración de uso de IA, 13 ADR, requisitos, riesgos, privacidad, deck y guion de la entrega (video, un teléfono por slide). | `docs/bitacora-prompts.md`, `docs/uso-de-ia.md`, `docs/presentacion/`; PR #140, #157, #160, #162 |

## Qué falta

**Código, con issue abierta**
- **Letra chica con Gemini (#51)**: no está empezada. Sin eso, `acumulable` y
  `jurisdiccion` salen `null` en la mayoría de las promos publicadas (el motor
  lo tolera: `acumulable = null` se trata como no acumulable). Dependen de #51:
  el chequeo de salud de la ingesta (#52) y el informe de precisión por campo
  (#53, que además hay que redefinir porque ya no hay corpus revisado a mano
  contra el cual medir, ADR-011).
- **Precisión del lector de tickets (#10)**: cerrada con 5 tickets medidos campo por campo
  (monto, fecha y comercio 5 de 5; medio de pago 3 de 3), por debajo de los 15-20 de RNF-09.
  Informe en `docs/product/precision-extractor.md`.
- **Auditoría de secretos y privacidad (#55)** y **cargar las keys (#85)**:
  en curso / abiertas.
- **Compra por confirmar con el ticket (#110)**, **estado vacío de «Armar
  grupo» (#139)** e **invitación con «Ya tengo cuenta» (#137)**: las están
  implementando otras sesiones.
- **Qué hace «Confirmar» en el resultado del grupo (#138)** y el **flujo de
  compra completo (#105)**: abiertas, sin revisar acá.
- **UX**: #79 (pasada general) y #103 (barra inferior y márgenes) siguen
  abiertas; ver `pendientes.md` y el veredicto por issue en el PR de #132.

**Operación y entrega**
- **Build de respaldo del APK (#56)**: el perfil `preview` de EAS y la guía
  (`docs/presentacion/build-respaldo.md`) están, pero no se verificó que haya un
  APK generado con el corpus actual.
- **Chequeo de migraciones al día**: `migraciones.yml` falla en cada corrida
  (15 y 16/11) porque falta el secret `SUPABASE_DB_URL` en el repo, así que
  **no hay chequeo automático de que la base alojada tenga las 12 migraciones**.
  Si está al día: sin verificar (se mira a mano con
  `supabase migration list --linked`).
- **Ingesta del 16 y 17/11**: no hay corridas programadas registradas después
  de la del 15/11 (a las 16:04 UTC del 17/11). Sin verificar por qué (GitHub
  atrasa las corridas programadas, ver el comentario de `ingesta.yml`); correrla
  a mano desde Actions si el corpus de la demo tiene que estar al día.
- **Tamaño real del corpus**: `npm run medir:corpus -w @vuelto/mobile` existe y
  la ingesta ya publica, pero no hay una medición documentada (el número de
  `03-frontend.md` sigue siendo una proyección con promos de ejemplo).
- **Con la cátedra**: tamaño del equipo, exclusiones del problema y formato
  exacto de los requisitos, todo sin respuesta registrada en el repo.

## Qué está simulado o incompleto a propósito

- **El pago.** Vuelto recomienda con qué pagar; no paga ni habla con bancos
  (integración bancaria fuera de alcance). «Pagá con X» es una guía: la compra
  queda **por confirmar** (vence a las 48 h) y recién al confirmarla (a mano o
  con el ticket) consume tope.
- **Datos de ejemplo hasta la primera sincronización.** Sin haber sincronizado,
  la app usa el corpus de ejemplo y un reloj fijo (14/10/2026,
  `apps/mobile/src/data/fixtures.ts`); con una sincronización hecha pasa al
  corpus real y al reloj real. Los escenarios de prueba del ticket (ejemplo,
  ilegible, sin red) solo se ven en desarrollo (`__DEV__`, en Perfil).
- **Letra chica.** Hasta que exista #51, lo que MODO no declara como dato
  estructurado queda `null`, no inventado.
- **Retención de 90 días.** Es una política declarada (`privacidad.md`); no hay
  un job que borre compras vencidas ni invitaciones vencidas.
- **Aplicar migraciones.** Mergear una migración no la aplica a la base
  alojada: la aplica una persona (ADR-013).
- **Specs con tareas sin tildar.** Varios `tasks.md` tienen casillas sin marcar
  aunque el trabajo se hizo o se reemplazó: la 004 (la recomendación pasó a la
  app, ADR-010), la 011 (el corpus a mano se reemplazó por la ingesta, ADR-011),
  la 012 y la 009 (T058, la prueba en el teléfono en modo avión con el corpus real, está hecha en la #43). La fuente
  de verdad es el código y este documento, no esas casillas.
- **ADR-012** sigue figurando como «propuesto» aunque el PR #126 se mergeó y el
  código lo sigue; falta pasarlo a «aceptado».
