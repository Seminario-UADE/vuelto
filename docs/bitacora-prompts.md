# Bitácora de prompts

Registro de las sesiones de trabajo con IA usadas en el desarrollo de
Vuelto. Se entrega a la cátedra como evidencia de uso de IA en el proyecto
— actualizar en cada sesión relevante (no solo en las de código).

Cada entrada: fecha, herramienta, objetivo de la sesión, prompts
principales y resultado.

---

## 2026-09-01 — Reorganización del repositorio

**Herramienta:** Claude Code (Sonnet 5).

**Objetivo:** retro-documentar el repo con la skill `ai-project-setup`:
generar `CLAUDE.md`, `docs/architecture/`, `docs/decisions/`, y consolidar
los dos documentos originales (`contexto-proyecto.md`, `decision-stack.md`)
en la nueva estructura.

**Prompts principales:**
1. "usa la skill para acomodar el repositorio con sus respectivas sub
   carpetas, y substrayendo la información de los dos documentos que ahí se
   encuentran para dividirlo correctamente /ai-project-setup"
2. "descarga la skill que está en el repositorio así podemos usarla" (se
   aportó el archivo `.skill` local con la definición)
3. Aprobación paso a paso del proceso guiado por la skill (`CLAUDE.md`,
   `docs/architecture/`, `docs/decisions/`), incluida la decisión de
   saltear `docs/runbooks/` y `tools/scripts/` por no haber código todavía
4. "todos los archivos de producto estaban al pedo, resumí todo lo que
   puedas y que sea esencial" — recorte del contenido migrado a
   `docs/product/`

**Resultado:** `CLAUDE.md`, `docs/architecture/` (5 archivos),
`docs/decisions/` (6 ADRs) y `docs/product/` (8 archivos resumidos)
creados; `contexto-proyecto.md` y `decision-stack.md` eliminados tras
migrar todo su contenido relevante a la nueva estructura.

---

## 2026-09-19 — Runbook de configuración agéntica, alcance del MVP y CI

**Herramienta:** Claude Code (Sonnet 5).

**Objetivo:** ejecutar la parte de Vuelto del runbook de configuración
agéntica (link compartido por el equipo), definir el detalle concreto del
alcance del MVP, armar el CI base y subir todo a una branch nueva.

**Prompts principales:**
1. Análisis del proyecto + del link del runbook, filtrando qué aplica a
   Vuelto.
2. "Revisemos juntos el alcance del MVP" — definición conjunta de rubro (solo
   supermercado), 6 billeteras/bancos y cadenas de supermercado (CABA/AMBA).
3. "Configurar CI/CD" — workflow base de GitHub Actions (lint, typecheck,
   test, build), condicionado a que exista `package.json` para no fallar por
   código que todavía no existe.
4. Ejecución en orden de los pasos del runbook que aplican a Vuelto:
   auditoría de `.claude/`, instalación de la skill `implement` faltante,
   instalación de spec-kit y comparación de su formato de spec contra el de
   la cátedra (bloqueado: el PDF de la cátedra no está en el repo).
5. "subí la carpeta a una branch nueva" — push a `config/ci-y-speckit`
   (partiendo de `main`, no de `config/skills-y-agentes` para no pisar
   trabajo en paralelo).

**Resultado:** `docs/product/alcance-mvp.md` y `docs/product/pendientes.md`
actualizados; `.github/workflows/ci.yml` nuevo; skill `implement` instalada;
spec-kit inicializado (`.specify/`) con una feature de prueba
(`specs/001-perfil-billeteras/`); `docs/decisions/007-speckit-sobre-to-spec.md`
nuevo; branch `config/ci-y-speckit` pusheada a
`Seminario-UADE/vuelto` con 6 commits, PR sin abrir todavía; branch
`config/skills-y-agentes` eliminada del remoto.

---

## 2026-09-19 — Requisitos y roles de Scrum (issues #3 y #2)

**Herramienta:** Claude Code (Opus 5 / Sonnet 5), con `gh` CLI.

**Objetivo:** resolver las stories "Chequear requerimientos (funcionales y no
funcionales)" (#3), "Definir roles de Scrum" (#2) y "Crear épicas y asentar
roadmap inicial" (#6) del repositorio.

**Prompts principales:**
1. "si tenes github cli, realiza esta stories: Chequear requerimientos,
   Definir roles de Scrum #2, Crear épicas y asentar roadmap inicial #6"
2. Decisiones tomadas en la sesión: entregables en `docs/` + comentario en el
   issue; nombres del equipo como placeholders; el roadmap vive solo en el
   GitHub Project existente (nada de roadmap en `docs/`); cerrar los issues
   al terminar.

**Resultado:** `docs/product/requisitos.md` (RF/RNF con criterios de
aceptación y requisitos bloqueados por pendientes) y
`docs/product/roles-scrum.md` (roles, ceremonias, DoR/DoD). #6 se resolvió
en GitHub, no en `docs/`: tras ampliar el scope `project` del token de `gh`,
se crearon 8 épicas (#15-#22) como issues con etiqueta `epic`, se enlazaron
los issues existentes como sub-issues, se crearon 3 milestones sin fecha y
todo quedó en el Project "Seminario UADE - Vuelto".

---

## 2026-09-19 — Política de privacidad y retención de datos (issue #11)

**Herramienta:** Claude Code (Sonnet 5), con `gh` CLI.

**Objetivo:** resolver el issue #11 ("Añadir política de privacidad /
retención de datos"), que desbloqueaba RNF-06 en `requisitos.md`.

**Prompts principales:**
1. "Arranquemos con el issue 11 de privacidad, imagino que será una
   documentación."
2. Revisión conjunta del flujo existente (ADR-006, RNF-06, la Edge Function
   de tickets en `04-infrastructure.md`) antes de escribir la política, para
   no inventar reglas nuevas por fuera de lo ya decidido.

**Resultado:** `docs/product/privacidad.md` nuevo (qué datos se recopilan,
retención de imágenes de ticket durante el procesamiento, qué se persiste y
por cuánto tiempo, terceros involucrados, derechos del usuario);
`docs/product/pendientes.md` y `docs/product/requisitos.md` actualizados
para reflejar el pendiente resuelto.

---

## 2026-09-21 — Relevamiento de fuentes de promos (issue #12)

**Herramienta:** Claude Code (Sonnet 5), con WebFetch, WebSearch y Playwright
(instalado ad-hoc para la investigación, fuera del repo).

**Objetivo:** determinar, para las 6 billeteras/bancos del alcance del MVP,
si sus páginas de promociones son HTML tradicional o SPA/JSON, y si sus
términos de uso o `robots.txt` restringen el scraping — para resolver el
issue #12 y desbloquear RF-13/RNF-13.

**Prompts principales:**
1. Delegación del research inicial (robots.txt, términos de uso, estructura
   HTML/SPA de las 6 fuentes) a un subagente, para mantener el contenido
   crudo fuera de la conversación principal.
2. Definición del criterio de decisión ante un conflicto entre `robots.txt` y
   términos de uso (caso Mercado Pago), y del límite ético de probar
   Playwright solo contra fuentes sin prohibición contractual explícita.
3. Exigencia de verificar con fetch directo cada cláusula legal citada, en
   vez de aceptar resúmenes de búsqueda sin confirmar — esto llevó a
   corregir una atribución incorrecta sobre BBVA (la cláusula de
   "robots/arañas" pertenecía a otro documento, sobre geolocalización, no al
   sitio en general).

**Resultado:** `docs/product/fuentes-promos.md` nuevo, con la clasificación
de las 6 fuentes (3 automatizables con Playwright, 3 de captura manual) y su
justificación legal/técnica; `docs/product/pendientes.md` y
`docs/product/requisitos.md` actualizados.

---

## 2026-09-21 — Reducción del alcance de billeteras a MODO

**Herramienta:** Claude Code (Sonnet 5), con Playwright.

**Objetivo:** decidir el alcance de billeteras/bancos del MVP a partir de
las limitaciones de scraping encontradas en `fuentes-promos.md`, y validar
qué rubros de comercio publica efectivamente la fuente elegida.

**Prompts principales:**
1. Decisión de producto: dado que varios bancos exigen permiso explícito
   (o bloquean técnicamente) el scraping de sus promociones, se acota el
   alcance del MVP a una sola billetera, MODO. Coordinar el permiso con el
   resto de los bancos/billeteras queda fuera de alcance del MVP, para una
   etapa futura.
2. Pedido de revisar qué rubros de comercio muestra MODO en sus
   promociones, para validar si el corpus de rubros definido (supermercado,
   combustible, restaurantes) se sostiene con la fuente ya acotada.
3. Pedido de verificar más a fondo gastronomía (con ejemplos concretos,
   como el restaurante Kansas) ante una primera conclusión dudosa, y de
   sumar Farmacias al alcance del MVP.
4. A partir de revisar el filtro de categorías del propio sitio, decisión de
   ampliar el corpus a las 13 categorías completas que publica MODO, en vez
   de curar un subconjunto de rubros a mano.
5. Decisión de que el flujo de compra optimizado cubra las 13 categorías,
   no solo supermercado — la recomendación ya era genérica por compra, y
   limitarla a un rubro era el recorte de alcance original, no una
   necesidad técnica.

**Resultado:** `docs/product/alcance-mvp.md` actualizado (billeteras de 6 a
1; rubro ampliado de un subconjunto curado a las 13 categorías completas de
MODO; el flujo de compra optimizado deja de estar acotado a supermercado).
El rubro se revisó dos veces: la primera pasada, con Playwright sobre el
HTML renderizado, concluyó erróneamente que gastronomía no existía en MODO;
inspeccionar las requests de red de la propia página reveló que MODO expone
una **API REST pública sin autenticación** (`categories`, `banks`, `slots`
con filtros y paginación) — consultada con el id numérico correcto de
categoría, se relevó el conteo de promos activas de las 13 categorías (de
646 en Gastronomía a 10 en Ferretería, ~1864 en total). Cadenas de
supermercado quedan con reconciliación pendiente: un intento de validarlas
por `search_text` dio resultados no confiables (contradijo una observación
directa anterior), falta paginar la categoría completa.
`docs/product/requisitos.md` (RNF-12), `docs/product/pendientes.md` y
`docs/architecture/04-infrastructure.md` actualizados — este último porque
la API de MODO simplifica la ingesta: no hace falta Playwright para esta
fuente.

---

## 2026-09-21 — Organización y slides de la presentación del equipo

**Herramienta:** Claude Code (Sonnet 5), con `gh` CLI y la skill
`presentaciones-visuales`.

**Objetivo:** organizar la presentación de avance del equipo (encuestas,
repo con documentación, roles, Scrum con Kanban, bitácora y declaración de
uso de IA), repartir los bloques entre los 4 integrantes y generar las
slides.

**Prompts principales:**
1. "hacé una organización de cómo hacer la presentación, dividiendo el
   trabajo por 4 integrantes" — los nombres se tomaron de
   `docs/product/roles-scrum.md`.
2. Ajustes de reparto pedidos por el equipo (quién abre, quién cierra, quién
   toma el repo y la bitácora) y decisión de armar un deck corto combinado
   con demo en vivo del repo y del tablero.
3. "pulleá de main, que Santiago ya subió su parte. Hagamos las slides, con
   gráficos de los resultados de la encuesta y una línea de tiempo del uso
   de IA end to end."

**Resultado:** `docs/presentacion/vuelto-avance.html` (16 slides HTML
autocontenidas, navegables con teclado). Los datos de los gráficos salen
literalmente de `docs/product/encuesta-resultados.md` (51 respuestas); el
estado del tablero se leyó con `gh project item-list`. Quedó marcado para
verificar con la fuente (Google Forms) que la suma de las opciones de
"mayor frustración" da más de 100%, por lo que ese dato se usó solo como
"la más citada".

---

## 2026-09-21 — Cierre de la presentación: chequeo contra la pauta, diagrama de arquitectura y marca

**Herramienta:** Claude Code (Sonnet 5), con la skill de terceros `archify`
(`npx skills add tt-a1i/archify -g`) para el diagrama de arquitectura.

**Objetivo:** chequear la presentación y el repo contra la pauta del examen
del 22/09 (stakeholders, modelo de negocio, estudio de plataformas, líneas
futuras, marca, legajos), corregir duplicaciones entre slides, reemplazar el
diagrama de arquitectura por uno generado con una herramienta dedicada, y
aplicar la paleta e imagen de marca oficial del equipo a todo el deck.

**Prompts principales:**
1. "chequea nuevamente si cumple con estos requisitos" — auditoría línea por
   línea de la pauta contra el repo y el deck; se identificaron como
   faltantes stakeholders, modelo de negocio, estudio de plataformas, líneas
   futuras, marca/logo y legajos.
2. Ampliación de `logica-de-negocio.md` con el research legal de Agustín
   (MODO sin restricción de scraping ni redistribución, a diferencia de
   Mercado Pago/Galicia/BBVA) y la estrategia de crecimiento (pedir permiso a
   los bancos más populares).
3. Legajos de los 5 integrantes, agregados a `roles-scrum.md` y a la slide de
   roles.
4. "Diapositiva 14 y 15 de más [...] la 18 tiene que estar en arquitectura
   [...] ver si la 19 está duplicada [...] sacar la 5" — se eliminaron las
   slides de Estudio de plataformas y Stack (contenido ya cubierto por los
   ADRs y la arquitectura), se fusionó "IA en el producto" al bloque de
   Arquitectura (presentado por Agustín), se recortaron 2 tarjetas
   duplicadas de "Automatización y límites", y se eliminó "Research y datos:
   lo que sigue" migrando sus 2 pendientes únicos a "Líneas
   futuras". El deck bajó de 23 a 20 slides.
5. "instala esta skill [...] mostrando el flow de tecnologías" — instalación
   de `archify` y generación de un diagrama de arquitectura validado
   (`archify validate/deliver`, 9/9 checks, 0 errores) a partir de
   `arquitectura.architecture.json`. El embed inicial vía `<iframe>` al
   archivo entregado no cargó en el entorno de preview (restricción de
   `file://` entre documentos) — se optó por extraer el `<svg>` generado y
   sus reglas de color, e inlinearlo directo en el deck para no depender de
   un archivo externo en la presentación en vivo.
6. Nuevos logos (`vuelto-logo-light.svg`, `vuelto-logo-dark.svg`) y paleta
   oficial de marca (Verde Bosque, Verde Salvia, Blanco Hueso, Dorado
   Champán, Gris Neutro) — re-tematizado de punta a punta: variables CSS del
   deck, el diagrama de arquitectura y `docs/product/marca.md`.

**Resultado:** `vuelto-avance.html` con 20 slides, sin desbordes verificados
por medición geométrica en las 20; `docs/presentacion/arquitectura.architecture.json`
nuevo (spec fuente del diagrama); `docs/presentacion/assets/logo-light.svg`
y `logo-dark.svg` nuevos; `docs/product/marca.md`, `docs/product/roles-scrum.md`
y `docs/product/logica-de-negocio.md` actualizados; `guion.md` reescrito
para la estructura final.

---

## 2026-09-26 — Backlog de implementación, sprints y constitución de spec-kit

**Herramienta:** Claude Code (Opus 5.5), con `gh` y la skill `speckit-constitution`.

**Objetivo:** pasar de research a implementación con la agenda de la cátedra
(Sprint Review 1 el 13/10, 2da entrega el 27/10, documentación final el
10/11) y tener una V1 funcionando en dos semanas.

**Prompts principales:**
1. Buscar los issues de GitHub y proponer cómo dividir y asignar el trabajo
   entre los 4 integrantes.
2. Cruzar el cronograma de la cátedra (captura) contra lo que ya está hecho
   en el repo.
3. Crear las historias de usuario como issues para implementar con IA (con
   spec-kit donde haga falta), repartirlas en sprints para tener la V1 en
   dos semanas y ordenarlas por épica y dificultad.

**Resultado:** 26 issues nuevas (#31–#56) escritas como historias de usuario
o habilitadores, cada una con criterios de aceptación, dependencias nativas
de GitHub, sub-issue de su épica, label de MoSCoW y de área, milestone de
sprint (`Sprint 1 · V1`, `Sprint 2 · Ticket e ingesta`, `Sprint 3 · Cierre`)
y `Size` en el tablero. Las issues #5, #9 y #10 se integraron al plan.
Constitución de spec-kit completada (`.specify/memory/constitution.md`), para
que el chequeo de `/speckit-plan` haga cumplir las reglas de `CLAUDE.md`.
Se corrigieron dos docs de arquitectura que todavía describían la revisión
humana que ADR-005 había eliminado.

---

## 2026-10-13 — Monorepo con npm workspaces y CI en verde (issue #32)

**Herramienta:** Claude Code (Opus 5.5), con `gh` y los subagentes
`test-runner` y `code-review` (ejes Standards y Spec en paralelo).

**Objetivo:** implementar la issue #32 (que también cierra la #5). Es una
issue S, así que fue sin spec-kit: estructura del monorepo, configuración
compartida de TypeScript y ESLint, esqueleto de `@vuelto/motor` y CI
funcionando con código real.

**Prompts principales:**
1. "Vamos a resolver la issue #32 [...] Es una issue S: va SIN spec-kit."
   Venía con las reglas que no se negocian: el motor no tiene
   `dependencies`, `strict: true`, solo se reservan los cuatro workspaces y
   no se suman dependencias que ningún criterio justifique.
2. Pipeline pedido: implementar, actualizar `CLAUDE.md` §Estado, pasar por
   `test-runner` (y `debugger` si algo fallaba), `/code-review`, bitácora,
   commit y un punto de control antes del push y el PR.

**Resultado:**
- Se creó el `package.json` raíz con los workspaces `packages/motor`,
  `apps/mobile`, `supabase` e `ingesta`. Los scripts `lint`, `typecheck`,
  `test` y `build` recorren todos los workspaces con
  `--workspaces --if-present`.
- `tsconfig.base.json` usa `strict` y `noUncheckedIndexedAccess`. ESLint 10
  quedó con flat config y `typescript-eslint` en la raíz.
- Se creó `packages/motor` (`@vuelto/motor`). Sus únicas devDependencies son
  `typescript` y `vitest`, y tiene un `src/index.ts` y un test trivial. Los
  otros tres workspaces son solo un `package.json` mínimo; la app Expo
  queda para la #39.
- Vitest 5 y ESLint 10 no soportan Node 20, que además está fuera de
  soporte, así que el CI pasó a Node 22. La versión se fija en `.nvmrc` y
  `engines` pide `>=22.13`. TypeScript quedó alineado en 6.0.3 en la raíz y
  en el motor, porque `typescript-eslint` todavía no acepta la 7.
- La revisión de código encontró los jobs `check-project` y `no-code-yet`,
  que ya eran código muerto, y se borraron del CI. También corrigió la
  versión mínima de Node, que había quedado en 22.12 y ESLint pide 22.13.
  Quedó anotado como pendiente que el `dist` del motor no va a cargar en
  Node ESM ni en Deno cuando tenga imports relativos internos.
- Se actualizaron `CLAUDE.md` §Estado (con los comandos reales),
  `docs/product/estado.md` y `docs/architecture/04-infrastructure.md` §CI.
- `npm ci && npm run lint && npm run typecheck && npm run test && npm run build`
  pasa en local.

---

## 2026-10-13 — Spec de perfil: bancos, tarjetas y redes (issue #41)

**Herramienta:** Claude Code (Sonnet 5), con `gh` CLI, `/speckit-specify`, el subagente
`spec-critic` y `curl` directo contra la API pública de MODO para verificar datos.

**Objetivo:** regenerar `specs/001-perfil-billeteras/spec.md` (desactualizada desde el
19/09, listaba 6 billeteras genéricas) para la issue #41, alineada al alcance vigente
(una sola fuente, MODO, donde las promociones se definen por banco + tipo de tarjeta +
red). Solo la spec — la implementación queda bloqueada por #34 y #40, ambas abiertas.

**Prompts principales:**
1. Traer la issue #41, leer la spec vieja y `alcance-mvp.md`/`requisitos.md`, con datos
   ya verificados contra la API real de MODO que corrigen a la issue original: el
   catálogo trae 82 bancos (no ~28), 32 marcados `on_hub_list`; tipo de tarjeta y red
   no están en el catálogo de bancos sino en cada promoción; la red es un enum fijo de
   9 marcas de tarjeta (no redes interbancarias).
2. `/speckit-specify` con el cuerpo de la issue como entrada, reemplazando el spec.md
   existente en la misma carpeta `001-perfil-billeteras` (no una carpeta nueva).
3. `spec-critic` sobre la spec recién generada: encontró 3 huecos de modelado
   bloqueantes (clave de join del banco sin definir, cardinalidad banco×tipo×red
   contradictoria entre requisitos y ejemplos, y redes del enum sin emisor
   catalogable) más 7 hallazgos altos (semántica de búsqueda, estado transitorio de
   "banco sin tarjeta", edición offline y atomicidad del guardado, aislamiento por
   usuario, mapeo valor↔etiqueta de redes, alcance real de las historias de usuario,
   y una inconsistencia con `docs/product/fuentes-promos.md` sobre el conteo de
   bancos).
4. Verificación directa contra la API real (`GET /promos/api/rewards/banks`) para
   resolver dos de los bloqueantes con datos en vez de supuestos: confirmó 82
   bancos / 32 `on_hub_list`, y que de los 9 valores de red, `naranja` sí tiene banco
   homónimo en el catálogo ("NaranjaX") pero `confiable` y `tarjeta_sol` no — se
   documentó como limitación conocida del MVP, no como bug.
5. Reescritura de la spec con las 3 correcciones bloqueantes y los 7 hallazgos altos
   aplicados; checklist de calidad actualizado para no autoaprobarse en silencio.

**Resultado:** `specs/001-perfil-billeteras/spec.md` reemplazada y
`specs/001-perfil-billeteras/checklists/requirements.md` actualizado, en la rama
`spec/issue-41-perfil-bancos-tarjetas`. Lista para `/speckit-plan` apenas cierren #34 y
#40. Quedan como pendiente de otra sesión (fuera de alcance de esta): corregir
`docs/product/fuentes-promos.md` (dice "~28 bancos", el dato real es 82) y revisar el
uso de "billetera" en `docs/product/requisitos.md` y `docs/architecture/01-data-models.md`
ahora que el perfil declara banco + tarjeta + red, no una billetera genérica. El
subagente `spec-critic` también sumó 2 entradas a su memoria persistente del proyecto
(`.claude/agent-memory/spec-critic/`): el patrón de "clave de join sin definir" y el
de "checklist autoaprobada" (spec-kit marca todo en verde sin revisión real) — quedan
para que la próxima corrida de `spec-critic` los busque de entrada en otras specs.

---

## YYYY-MM-DD — Título de la sesión

**Herramienta:**

**Objetivo:**

**Prompts principales:**
1.

**Resultado:**
