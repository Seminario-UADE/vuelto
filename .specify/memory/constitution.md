# Constitución de Vuelto

Principios no negociables del proyecto. Salen de `CLAUDE.md`, de los ADR en `docs/decisions/` y
de `docs/product/requisitos.md`. Toda spec, plan y PR se chequea contra este documento.

## Principios

### I. Regla de oro: decisión, no listado

Vuelto recomienda **qué medio de pago usar en una compra concreta** y controla **cuánto tope de
reintegro queda**.

- Una funcionalidad que se pueda describir como "mostrar promociones" NO entra al producto.
- Ninguna pantalla muestra promociones si no hay una compra concreta (dónde y cuánto) que
  evaluar.
- Toda spec DEBE explicar qué decisión del usuario resuelve.

**Por qué:** el problema no es la falta de información sino la decisión (`docs/product/problema.md`).

### II. Motor de reglas determinístico

- El motor es un paquete TypeScript propio (`packages/motor`). No tiene `dependencies` de
  runtime y expone funciones puras.
- Corre en el dispositivo sin red. La hora actual se recibe como parámetro, nunca se lee adentro.
- Con el mismo perfil, la misma compra y el mismo corpus, el resultado DEBE ser idéntico.
- Un modelo de lenguaje NUNCA participa de la recomendación, ni directa ni indirectamente.
  Tampoco genera los textos de explicación (son plantillas determinísticas).

**Por qué:** ADR-001 y ADR-004. Sin esto se pierden los tests, el uso offline y el argumento de
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

- **Stack:** app en Expo (React Native) con Expo Router; Supabase (Postgres + Auth + Edge
  Functions); Gemini Flash solo del lado del servidor; motor en TypeScript con Vitest; monorepo
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

**Version**: 1.0.0 | **Ratified**: 2026-09-26 | **Last Amended**: 2026-09-26
