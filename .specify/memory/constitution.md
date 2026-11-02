<!--
Sync Impact Report
- Versión: 2.0.1 → 3.0.0 (MAJOR: redefine el Principio II)
- Principios modificados:
  - II. "Motor de reglas determinístico": el motor deja de correr solo en la Edge Function. Lo
    importa y ejecuta la app Expo para recomendar y estimar topes en vivo, con el estado en
    Redux. La Edge Function conserva lo que necesita un secreto o datos de otros usuarios (ticket,
    grupo, invitaciones). El motor y su determinismo no cambian.
- Decisión de origen: ADR-010 (docs/decisions/010-motor-en-la-app-y-redux.md), que supera la
  Actualización del 13/10/2026 de ADR-001. Requiere la aprobación del PO en el PR que la introduce.
- Archivos alineados:
  ✅ CLAUDE.md, docs/product/requisitos.md (RNF-02), docs/product/privacidad.md,
     docs/architecture/*, .claude/agents/rules-guardian.md y .agents/agents/rules-guardian.md
  ⚠ specs/004-recomendar-pantalla y specs/006-app-mobile-pantallas: con nota de que fueron
     superadas en este punto; se reescriben en las issues de implementación.
- Pendientes: ninguno en la constitución. El código que la cumple llega con las issues del plan de
  ADR-010.

Versión anterior (2.0.1):
- Versión: 2.0.0 → 2.0.1 (PATCH: aclaración del Principio I)
- Principios modificados:
  - I. "Regla de oro": se aclara qué es una compra concreta. Es un comercio elegido en un
    momento dado; el monto es opcional y solo refina el estimado. Sin monto, la respuesta
    sigue siendo una decisión sobre esa compra, no un listado.
- Decisión de origen: auditoría de pantallas v5, P1 #1 (docs/design/auditoria-pantallas-v5.md),
  aprobada por el PO en la spec 006 (specs/006-app-mobile-pantallas).
- Archivos alineados:
  ✅ specs/006-app-mobile-pantallas/spec.md (§Enmienda de constitución)
  ✅ .specify/templates/*: sin referencias, no requieren cambios
- Pendientes: ninguno.

Versión anterior (2.0.0): MAJOR que redefinió el Principio II (el motor corre solo en la Edge
Function; la app Expo no lo importa). Ver ADR-001 §Actualización y RNF-02.
-->

# Constitución de Vuelto

Principios no negociables del proyecto. Salen de `CLAUDE.md`, de los ADR en `docs/decisions/` y
de `docs/product/requisitos.md`. Toda spec, plan y PR se chequea contra este documento.

## Principios

### I. Regla de oro: decisión, no listado

Vuelto recomienda **qué medio de pago usar en una compra concreta** y controla **cuánto tope de
reintegro queda**.

- Una funcionalidad que se pueda describir como "mostrar promociones" NO entra al producto.
- Ninguna pantalla muestra promociones si no hay una compra concreta que evaluar. Una compra
  concreta es un comercio elegido en un momento dado (dónde y cuándo). El monto (cuánto) es
  opcional: solo refina el estimado.
- Toda spec DEBE explicar qué decisión del usuario resuelve.

**Por qué:** el problema no es la falta de información sino la decisión (`docs/product/problema.md`).

### II. Motor de reglas determinístico

- El motor es un paquete TypeScript propio (`packages/motor`). No tiene `dependencies` de
  runtime y expone funciones puras.
- El paquete no hace llamadas de red propias ni lee estado externo: la hora actual se recibe
  como parámetro, nunca se lee adentro.
- La recomendación y la estimación de topes de una persona las calcula la app Expo con este
  paquete, en el dispositivo y sin red, a partir del estado que tiene en Redux (perfil, corpus de
  promociones, compras del período y la compra simulada). El resultado es un valor **derivado**
  (selectores memoizados), nunca guardado ni escrito a mano en el store.
- Todo lo que cruza datos de más de un usuario (el gasto en grupo) se calcula en una Edge Function
  que llama al mismo paquete. La app no lee datos de otros usuarios.
- Con el mismo perfil, la misma compra y el mismo corpus, el resultado DEBE ser idéntico, corra
  donde corra.
- Un modelo de lenguaje NUNCA participa de la recomendación, ni directa ni indirectamente.
  Tampoco genera los textos de explicación (son plantillas determinísticas).

**Por qué:** ADR-010 (que supera ADR-001 §Actualización 13/10/2026), ADR-004 y RNF-02. La
recomendación tiene que ser instantánea, actualizarse al tipear el monto y funcionar sin señal. Sin
determinismo se pierden los tests, la reproducibilidad de la recomendación y el argumento de
innovación de la materia.

### III. Extracción con esquema y null explícito

- El LLM (Gemini) vive solo en la ingesta de promociones y en la Edge Function del ticket.
  Nunca está en el camino crítico de la recomendación.
- Su salida DEBE validarse contra un esquema donde todos los campos son requeridos y nullables
  (`{"type": [T, "null"]}`), sin campos opcionales. En TypeScript eso es `campo: T | null`,
  nunca `campo?: T`.
- Un dato ausente en la fuente se devuelve `null`. NUNCA se inventa ni se infiere, en especial
  el medio de pago de un ticket: si falta, se le pregunta al usuario.
- Lo que la fuente ya trae estructurado se mapea por código, no por LLM.
- La ingesta es 100% automática, sin revisión humana. Una promo se publica solo si completa los
  campos obligatorios (`esPromocionPublicable`); si no, se descarta sola, sin cola de aprobación.
- Cada campo extraído conserva su fragmento textual de origen, para poder auditarlo.

**Por qué:** ADR-005 y ADR-006. El esquema es el único control de calidad del corpus.

### IV. Secretos y privacidad

- La API key de Gemini NUNCA está en la app móvil. La letra chica se procesa en el script de
  ingesta y el ticket en una Edge Function de Supabase.
- La service role key la usa solo el proceso de ingesta. No aparece en el cliente ni en el repo.
- Las imágenes de ticket NUNCA se persisten: no van a disco, a Storage, a la base ni a los logs.
  Sí se persiste el texto extraído junto al registro de compra.
- Toda tabla nueva de Supabase lleva su row-level security **en la misma migración** que la crea.
- Cualquier cambio sobre datos de usuario DEBE ser consistente con `docs/product/privacidad.md`.

**Por qué:** RNF-04 a RNF-07. Una key en el instalador queda expuesta y no se puede revocar a
tiempo.

### V. Topes siempre estimados, con su base

- Todo tope de reintegro que ve el usuario se muestra como estimado y con su base. Ejemplo:
  "≈$18.000, según 4 compras registradas".
- Con cero compras registradas se dice explícitamente que no hay base. Si la promo no informa el
  tope, se dice eso; nunca se muestra un número inventado.
- Una compra sin confirmar no modifica ningún tope.

**Por qué:** RF-07 y ADR-006. Una cifra falsamente precisa es peor que no mostrar nada.

### VI. Test-first en el motor

- Toda lógica del motor se escribe con tests Vitest antes o junto con el código, y la suite corre
  sin red ni servicios externos.
- Cada dimensión de RF-04 tiene al menos un test: medio de pago, vigencia y día, comercio o
  categoría, monto mínimo, canal, jurisdicción, tope consumido o agotado, tope compartido vs.
  exclusivo y acumulabilidad (con `null` tratado como no acumulable).
- Las llamadas a Gemini se prueban con mocks. Ninguna suite depende de la red.

**Por qué:** ADR-001 y RNF-03. El motor es la pieza que un evaluador técnico abre y revisa.

## Stack y restricciones

- **Stack:** app en Expo (React Native) con Expo Router y Redux Toolkit como estado del cliente;
  Supabase (Postgres + Auth + Edge Functions, solo donde hay un secreto o datos de otros usuarios); Gemini Flash solo del lado del servidor; motor en TypeScript con Vitest; monorepo
  con npm workspaces (`packages/motor`, `apps/mobile`, `supabase/`, `ingesta/`).
- **Costo:** $0 durante el cuatrimestre. Todo servicio DEBE entrar en su tier gratuito.
- **Alcance:** CABA/AMBA. Hay una sola fuente de ingesta, MODO, a través de su API pública, y se
  toman sus 13 categorías.
- **Fuera de alcance:** integración bancaria, lectura de resúmenes, cobertura nacional y app
  nativa.
- **Scraping respetuoso:** User-Agent identificado, frecuencia limitada y respeto de `robots.txt`.
- **Demo:** la app corre en Expo Go con el corpus sembrado y la ingesta apagada, con un build de
  EAS como respaldo.

## Flujo de trabajo

- El backlog vive en GitHub Issues (`Seminario-UADE/vuelto`). Cada issue es una historia o
  habilitador con épica, sprint (milestone), MoSCoW, tamaño y dependencias.
- **Issues M, L y XL:** `/speckit-specify` (con la issue como entrada) → `spec-critic` →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/code-review` → `test-runner`.
- **Issues XS y S:** se implementan sin spec-kit, pero pasan igual por `/code-review` y
  `test-runner`.
- `rules-guardian` es obligatorio antes de mergear cambios que toquen el motor, el extractor, el
  ticket o migraciones y policies de Supabase.
- Una rama y un PR por issue, con `Closes #N`. Para mergear hace falta el CI en verde y al menos
  una revisión.
- Se aplica la Definition of Done de `docs/product/roles-scrum.md`. El trabajo con IA relevante
  se registra en `docs/bitacora-prompts.md`.

## Gobierno

- Esta constitución prevalece sobre cualquier otra práctica. El chequeo de constitución de
  `/speckit-plan` DEBE pasar. Una violación solo se acepta si queda justificada en la sección de
  complejidad del plan y aprobada por el Product Owner.
- Para enmendarla hace falta un PR que modifique este archivo, con la aprobación del Product
  Owner y, si cambia una decisión, un ADR nuevo o actualizado en `docs/decisions/`.
- Versionado semántico:
  - MAJOR: se elimina o redefine un principio.
  - MINOR: se agrega un principio o sección.
  - PATCH: aclaraciones.
- La guía operativa del día a día está en `CLAUDE.md`. Si contradice a esta constitución, se
  corrige `CLAUDE.md`.

**Version**: 3.0.0 | **Ratified**: 2026-09-26 | **Last Amended**: 2026-11-01
