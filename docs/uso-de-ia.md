# Uso de IA en Vuelto — declaración end-to-end

Este documento declara, en un solo lugar, todos los puntos del proyecto
donde se usa inteligencia artificial — tanto en el **producto** (lo que
corre para el usuario final) como en cómo el equipo **construye y gestiona**
el proyecto con Claude Code. Se entrega a la cátedra junto con
`bitacora-prompts.md`.

## 1. IA en el producto (en producción)

Vuelto usa un LLM (Gemini API) en un solo rol, acotado y explícito: **extraer
datos estructurados de texto no estructurado**. Nunca decide nada por el
usuario.

| Dónde | Qué hace | Corre en | Revisión humana |
|---|---|---|---|
| Ingesta de letra chica de promociones | Convierte la prosa legal de cada banco/billetera en los atributos del modelo de datos, contra un esquema forzado (`null` explícito si un campo no está) | Servidor, offline, en lote | Ninguna — publicación automática si el borrador completa el esquema (campos obligatorios no `null`); si no, se descarta solo (ver `decisions/005-ingesta-automatica-sin-revision-humana.md`) |
| Registro de compras por ticket | Extrae monto, comercio, medio de pago y descuento de la foto del comprobante | Edge Function de Supabase (servidor) | El propio usuario confirma antes de que el registro sea válido (ver `decisions/006-registro-de-compras-por-ticket.md`) |

**Frontera que no se cruza:** el motor de reglas — la pieza que efectivamente
le dice al usuario qué medio de pago usar — es código determinístico,
100% TypeScript sin dependencias, sin LLM en el camino. Esta es la regla de
oro del proyecto (ver `CLAUDE.md` y `decisions/004-llm-solo-en-ingesta.md`):
preguntarle a un modelo "con qué pago" en vez de correr el motor mata el
determinismo, los tests, y el argumento de innovación tecnológica de la
materia.

Las imágenes de ticket no se persisten (se mandan a Gemini y se descartan);
sí se persiste el texto extraído. La API key de Gemini nunca viaja al
celular — solo el script de ingesta y la Edge Function la usan.

## 2. IA para construir y gestionar el proyecto (Claude Code)

Todo lo que no es el producto en sí también se construyó con asistencia de
IA, de punta a punta:

- **Documentación**: retro-documentación completa del repo (`CLAUDE.md`,
  `docs/architecture/`, `docs/decisions/`, `docs/product/`) a partir de los
  documentos originales del equipo.
- **Definición de producto**: acotar el alcance del MVP (rubro, billeteras y
  cadenas concretas) — siempre con confirmación humana explícita en cada
  decisión de scope, nunca resuelto de forma autónoma por la IA (ver
  `docs/product/alcance-mvp.md` y su historial en `bitacora-prompts.md`).
- **Research de producto**: validación de hipótesis con búsqueda web real
  (ej.: confirmar que los proveedores de pago comparten página/categoría
  entre rubros antes de sumarlos al alcance).
- **Configuración agéntica**: subagentes de proyecto (`test-runner`,
  `spec-critic`, `debugger`), skills (`code-review`, `implement`,
  `supabase-postgres-best-practices`, `vercel-react-native-skills`,
  `imagegen-frontend-mobile`, `setup-matt-pocock-skills`) y spec-kit para
  generar specs de feature (ver `decisions/007-speckit-sobre-to-spec.md`).
- **CI/CD**: workflow base de GitHub Actions (`.github/workflows/ci.yml`).
- **Gestión de GitHub**: creación de branches y pull requests, respuesta a
  comentarios de revisión, con `gh` CLI.

**Principio transversal**: la IA propone y ejecuta, pero ninguna decisión de
producto (alcance, rubros, billeteras) se toma sin que una persona del
equipo la confirme explícitamente primero. Las decisiones de arquitectura y
tooling quedan registradas con su razonamiento en `docs/decisions/`; cada
sesión de trabajo con IA queda registrada en `docs/bitacora-prompts.md`.

## 3. Trazabilidad

- **Qué se hizo en cada sesión**: `docs/bitacora-prompts.md`.
- **Por qué se decidió cada cosa**: `docs/decisions/` (motor de reglas
  separado, Expo sobre Flutter, Supabase sobre Firebase, LLM solo en la
  ingesta, ingesta automática sin revisión humana, registro por ticket,
  spec-kit sobre `to-spec`).
- **Qué falta o está en duda**: `docs/product/pendientes.md`.
