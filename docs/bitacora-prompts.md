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

## 2026-10-13 — Mover el motor de recomendación al backend (issues #43, #45, #36, #19, #39, #42)

**Herramienta:** Claude Code (Sonnet 5 / Opus 5), con `gh` CLI.

**Objetivo:** corregir las historias de «¿Con qué pago?» y «Mis topes» para
que el cálculo de la recomendación deje de correr en el dispositivo, y
resolver en cascada las issues que quedaron desactualizadas con esa
decisión.

**Prompts principales:**
1. Pedido de cambiar la pantalla «¿Con qué pago?» de recalcular en cada
   dígito tipeado a un botón explícito que dispare el cálculo en el
   backend, en vez de en vivo en el cliente.
2. Señalamiento del conflicto de esa decisión con reglas ya documentadas
   (ADR-001, RNF-02, "modo avión") antes de aplicar el cambio, y
   confirmación explícita de seguir adelante aceptando el costo de perder
   la garantía de funcionamiento offline para ese flujo.
3. Corrección de una ambigüedad propia en la primera redacción ("el motor
   lo puede ejecutar tanto el dispositivo como la Edge Function"), tras la
   aclaración de que la app no debe tener ninguna lógica de cálculo, ni
   siquiera como fallback — solo el backend.
4. Pedido de revisar si alguna otra issue había quedado inconsistente con
   el cambio (escaneo de los 56 issues abiertos por palabras clave), y
   confirmación de que ninguna estaba ya resuelta antes de tocarlas.
5. Decisión de qué hacer con la issue #42 (sincronizar el corpus al
   dispositivo), que quedó sin objeto: cerrarla y recortar el PR que la
   tocaba a solo la parte todavía válida.

**Resultado:**
- Issue #43 («¿Con qué pago?»): reescrita con el contrato de
  `POST /functions/v1/recomendar` (Edge Function que llama a
  `recomendar()` de `@vuelto/motor`), botón "Simular", manejo explícito de
  sin conexión, y el criterio de que `apps/mobile` no tenga
  `@vuelto/motor` como dependencia.
- Issue #45 («Mis topes»): mismo patrón, con `GET /functions/v1/topes`; se
  avisó a la persona asignada (jeqm0302) con un comentario, porque el
  cambio le reescribe el enfoque de implementación.
- ADR-001: sección "Actualización (13/10/2026)" documentando el cambio sin
  reescribir el registro histórico original.
- RNF-02 (`requisitos.md`): deja de exigir "funciona en modo avión"; pasa
  a exigir que `@vuelto/motor` no tenga dependencias de red propias y que
  la app no lo tenga como dependencia.
- Issues #36, #19 (motor y su épica): se corrigió la frase "corre en el
  celular" / "en el dispositivo y sin red", que había quedado
  contradictoria con el cambio.
- Issue #39 (app base): se sacó el criterio de aceptación que pedía
  importar `@vuelto/motor` en una pantalla de prueba — ya no aplica.
- Issue #42 cerrada: su objetivo completo ("recomendación sin señal")
  quedó obsoleto. El PR #58, que originalmente corregía la ventana de
  sincronización de esa issue, se recortó a solo la política de retención
  de 90 días en `privacidad.md` (lo único que seguía siendo válido);
  `pendientes.md` se actualizó para reflejar que la sincronización quedó
  descartada, no resuelta.
- PR #60 (dos commits — el segundo corrige la ambigüedad "dispositivo o
  Edge Function"), y PR #58 recortado — ambos sin conflictos contra
  `main`.

---

## 2026-10-15 — Auditoría UX del mockup de Stitch y design system

**Herramienta:** Claude Code (Opus 5.5), con el MCP de Google Stitch y las
skills `design:design-critique`, `design:accessibility-review`,
`design:ux-copy` y `stitch-design-taste`.

**Objetivo:** revisar el mockup de Stitch ("Remix of Vuelto App Mobile
Design v2", 7 pantallas) contra los requisitos del producto, definir un
design system propio y regenerar las pantallas sin perder lo que ya
funcionaba.

**Prompts principales:**
1. Conectar el proyecto de Stitch y confirmar que se podían leer las 7
   pantallas (screenshots + HTML).
2. Instalar skills de diseño (`taste-skill`, `expo-native-ui`) y pedir una
   recomendación de cuáles aplicar para mejorar la UX, incluyendo las ya
   instaladas (`apple-design`, `emil-design-eng`, etc.).
3. "Dale, arrancá con la auditoría" → después, "hagamos el design md de
   stitch" y crear 7 pantallas nuevas sin modificar las originales.
4. Objeción: las pantallas nuevas quedaron "demasiado vacías y sin
   personalidad" respecto de las anteriores; pedido de justificarlo o
   recuperar elementos de las originales.
5. Pedido de revisar si tenían demasiado color y llevarlas a la paleta de
   la marca.

**Resultado:**
- `docs/design/auditoria-stitch-v2.md`: auditoría con 8 choques contra
  requisitos (topes sin "≈" ni base — RF-07; medio de pago preseleccionado
  en el ticket — RF-10; "Tope ok" de otro integrante en grupo — RF-19;
  Mercado Pago con topes aunque el MVP solo ingesta MODO; "estrategia
  semanal" fuera de alcance; "OCR 98%"), contrastes medidos (el gris
  secundario `#65786C` y el ámbar no llegaban a 4.5:1) y tabla de copy.
- `docs/design/DESIGN.md`: design system con paleta accesible medida,
  regla de topes estimados como componente, tab bar fija, glosario de
  copy, set único de datos ficticios con cuentas verificadas y lista de
  prohibiciones. Subido a Stitch como design system "Vuelto".
- Pantallas en Stitch (las originales no se tocaron): v3 corrigió las
  reglas pero quedó vacía — error de la IA, que aplicó como reglas del
  producto lo que eran preferencias de estilo. v4 recuperó la personalidad
  de las originales (tarjeta oscura, alcancía, cuenta regresiva, ticket
  dibujado) y la versión sobria de v4 sacó los colores de marca de bancos
  y comercios que había agregado la IA. El DESIGN.md quedó con las dos
  lecciones: "calma no es vacío" y "el color comunica, no decora".
- Skills instaladas a nivel proyecto: las 14 de `leonxlnx/taste-skill` y
  `expo-native-ui` de `expo/skills` (`skills-lock.json`). Se recomendó
  aplicar solo `redesign-existing-projects`, `stitch-design-taste` y, para
  la etapa de código, `expo-native-ui`, `apple-design`, `animate-expo` y
  `emil-design-eng`; el resto apunta a landings web.
- La "estrategia semanal" quedó fuera del MVP por ahora, a pedido del
  usuario.


---

## 2026-10-18 — Contrato de tipos del dominio y arquitectura de la capa externa (issue #33, ADR-009)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI, `curl` contra la
API pública de MODO para verificar datos, `/code-review` (ejes Standards y
Spec en paralelo) y el subagente `rules-guardian`.

**Objetivo:** retomar la implementación priorizando lo que destraba al
resto del Sprint 1. La issue #33 (contrato de tipos) bloquea a #34, #35,
#36 y #48. En el camino, revisar el PR #61 (spec de perfil, issue #41)
porque define parte de esos tipos, y dejar documentada la arquitectura de
las Edge Functions antes de que el equipo empiece a implementarlas.

**Prompts principales:**
1. Relevamiento del estado del proyecto: issues asignadas, dependencias
   entre ellas y blockers, para definir por dónde arrancar.
2. Revisión del PR #61 contra el contrato de tipos de la issue #33, con
   verificación directa contra la API de MODO, y aviso a las issues #51 y
   #35 de que el banco de cada promo se traduce de nombre a id del
   catálogo con comparación normalizada.
3. Revisión del diseño del contrato antes de escribir código: qué venía
   definido por la issue, los RF y el PR #61, y qué se agregaba en esta
   issue. Decisión de tratar las categorías como datos para que una
   categoría nueva de MODO no descarte promos en silencio.
4. Discusión de diseño sobre clases frente a interfaces y funciones, y
   sobre cómo organizar el backend (controller, service, repositorio,
   inyección de dependencias, SOLID), incluyendo cómo funciona la
   autenticación de Supabase y cómo escalaría la arquitectura si el
   producto crece.
5. Decisión de documentar la arquitectura en un ADR referenciado desde
   `CLAUDE.md`, en vez de comentar en cada issue, para que cualquier
   integrante que tome una Edge Function con Claude la siga sin ruido extra.
6. Triage de los hallazgos de la revisión: qué se corrige en esta issue y
   qué se deriva a la issue que corresponde (#36, #38, #51), para no
   adelantar diseño ajeno.

**Resultado:**
- PR #61 aprobado. Comentarios en las issues #51 y #35: las promos de MODO
  solo traen `name_bank`, y hay que traducirlo al UUID del catálogo
  comparando normalizado (minúsculas, sin acentos).
- `packages/motor/src/tipos.ts`: contrato completo, sin campos opcionales.
  Se aparta de la propuesta de la issue en: `Red` con los 9 valores de
  MODO (del PR #61), `CategoriaId = number` (categorías como datos, con la
  lista inicial en `categorias.ts`), `BorradorPromocion` para la salida de
  la ingesta y `nombreParaMostrar` en `Perfil` (ADR-008).
- `publicable.ts`: `CAMPOS_OBLIGATORIOS_PROMO`, `camposFaltantes()` (para
  registrar por qué se descarta un borrador, útil para la issue #53) y
  `esPromocionPublicable()` como guardia de tipo. 11 tests.
- ADR-009 (núcleo funcional, capa imperativa): datos del dominio como
  interfaces, Edge Functions con handler → service → repositorios
  inyectados, sin framework ni contenedor de DI, y etapas de crecimiento
  fuera del MVP. Referenciado desde `CLAUDE.md`.
- `01-data-models.md`: qué es `bancoId`, campos obligatorios, categorías
  como datos y lo que queda fuera de alcance (sucursales, tarjetas
  excluidas). `pendientes.md`: RF-16 resuelto; nuevos pendientes para
  distinguir "sin tope" de "tope no informado" y para validar rangos
  (porcentaje, vigencia) en el esquema del extractor (issue #51).
- Revisión: `rules-guardian` pasó todas las reglas duras. `/code-review`
  cumplió los 5 criterios de aceptación. Se corrigieron una contradicción
  en `01-data-models.md` y varios nombres de tipos. La base del tope
  estimado queda para la issue #36 (reusando el tipo de la issue #38) y el
  fragmento de origen de cada campo, para la issue #51. La jurisdicción de
  la compra no hacía falta en el contrato: la issue #36 ya la fija como
  constante del MVP (CABA/AMBA).
- Se detectó que la definición del subagente `rules-guardian` está
  desactualizada (todavía exige revisión humana antes de publicar promos,
  contra ADR-005); queda para un PR aparte.
- Error de la IA en el proceso: el primer commit incluyó un archivo que no
  estaba en la lista aprobada (un borrado que había quedado en staging).
  Se detectó al verificar el commit y se rehízo antes de subirlo.
- Queda para la issue #34: sumar la tabla `categorias`.


---

## 2026-10-20 — Motor de recomendación: spec, plan e implementación (issue #36)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit (`/speckit-specify`,
`/speckit-plan`, `/speckit-tasks`, `/speckit-implement`), el subagente
`spec-critic` (dos pasadas) y `gh` CLI para leer las issues #36, #37 y #38.

**Objetivo:** implementar el núcleo del producto: dada una compra, decidir
con qué medio de pago conviene pagar y por qué las demás promos no sirven.
Antes de escribir código, cerrar las decisiones de producto que la issue
dejaba abiertas y acordar la frontera con las issues #37 (topes
compartidos) y #38 (estimación de topes).

**Prompts principales:**
1. "Antes de escribir la spec, leé completas las issues #36 y #37 y decime
   dónde termina una y empieza la otra." Así quedó claro que los topes
   semanales y "por compra" ya eran de la #37, y se respetó esa división.
2. "Mostrame qué encontró el revisor de specs y qué proponés para cada
   punto." Después, decisión por decisión:
   - Si el usuario no tiene tarjetas cargadas, que la app se lo pida.
   - Los montos, en centavos.
   - Una compra grande nunca puede gastar más tope del que existe.
   - Si la promo no informa tope, se aplica el porcentaje completo.
3. "No entiendo para qué sirve marcar una compra como estimada: ¿es para
   recomendar, es por si no cargan el ticket? ¿Cómo está pensado en la
   UI?" Revisando las pantallas diseñadas vimos que hoy la app no tiene
   dónde cargar el reintegro real, y se decidió mantener el dato como lo
   proponía la issue #38.
4. "Contá las promos de CABA, Provincia de Buenos Aires y las nacionales;
   las de otras provincias, como Córdoba, no."
5. "Implementalo por etapas y frená al terminar cada una para que revise el
   código antes de seguir."
6. "¿Cómo es eso de que el motor compilado no carga en Deno? ¿Qué es Deno y
   dónde se usa? ¿No sirve importar con `.ts`?" Se eligió escribir los
   imports con `.ts` y que TypeScript los pase a `.js` al compilar.
7. "Corregí lo chico de la revisión de código; el texto del motivo de
   jurisdicción tiene que ser más formal." Lo que la revisión marcó sobre
   cómo se guarda el tope se deja para la issue #37, que va a rehacer esa
   parte.

**Resultado:**
- Quedó documentada la funcionalidad completa en
  `specs/002-motor-recomendar/`: qué tiene que hacer, el plan técnico y 25
  tareas internas.
- El motor ya recomienda. Recibe la compra, las tarjetas del usuario y las
  promos, y devuelve con cuál conviene pagar, las alternativas ordenadas y,
  para cada promo que no sirve, el motivo (por ejemplo, "Hoy no aplica: la
  promo es los sábados").
- Tiene en cuenta el tope que el usuario ya usó en el mes. Si está agotado,
  la promo se descarta y se indica en cuántas compras se basa esa
  estimación.
- Se agregó al modelo de datos la opción de marcar una promo como "de otra
  provincia". Sin eso, una promo válida solo en Córdoba se habría
  recomendado en CABA.
- Pasan 79 tests automáticos, incluido uno que verifica que con 2.000 promos
  la respuesta tarda menos de un segundo.
- Errores de la IA en el proceso:
  - Marcó como completa la lista de control de la spec cuando no lo estaba;
    el revisor encontró una regla que nunca podía fallar.
  - Recomendó resolver los topes "por compra" en esta issue sin haber leído
    antes la issue #37, y lo corrigió al leerla.
  - Uno de los hallazgos del revisor era incorrecto y no se aplicó.
- Se resolvió un pendiente que venía de la issue #32: el motor compilado no
  cargaba fuera de los tests, porque sus archivos se importaban entre sí
  sin extensión. Eso habría hecho fallar la Edge Function de la issue #43,
  que corre en Deno. Ahora los imports llevan `.ts` y TypeScript rechaza
  cualquier import sin extensión, así que el error no puede volver sin que
  el typecheck lo marque.
- La revisión de código (estándares y cumplimiento de la spec), los tests y
  el control de reglas del proyecto no encontraron incumplimientos. Se
  corrigieron cuatro detalles: el monto mínimo ahora también se compara en
  centavos, se sumaron dos pruebas de punta a punta del tope, el motivo de
  jurisdicción pasó a "La promo no es válida en tu jurisdicción" y el
  ADR-009 aclara que las clases de error sí se permiten en el motor.
- Queda para la issue #51: que el extractor marque las promos de otras
  provincias.


---

## 2026-10-22 — Tabla de requisitos bloqueados (PR #69)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** dejar al día la tabla "Requisitos bloqueados por definiciones
pendientes" de `docs/product/requisitos.md`.

**Prompts principales:**
1. "Arreglá el #69."
2. "Verificá si está resuelto el #33; si está resuelto, sumalo."

**Resultado:**
- Al sacar la fila de la constitución (ya resuelta en la 2.0.0) había
  quedado una línea vacía en el medio de la tabla, que la cortaba en dos y
  dejaba afuera la fila de RNF-14. Se borró.
- Se sacó la fila de RF-16: el umbral de campos obligatorios para publicar
  una promo se resolvió en la issue #33 (PR #67, `CAMPOS_OBLIGATORIOS_PROMO`
  en `packages/motor/src/publicable.ts`). La definición de RF-16 sigue en
  la tabla de requisitos; solo dejó de estar bloqueado.

---

## 2026-10-24 — Edge Function de recomendación: spec, plan e implementación del servidor (issue #43)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit (`/speckit-specify`,
`/speckit-plan`, `/speckit-tasks`, `/speckit-implement`), los subagentes
`spec-critic` y `rules-guardian`, la skill `/code-review` (ejes de
estándares y de spec) y `gh` CLI para leer las issues.

**Objetivo:** adelantar la issue #43 (pantalla «¿Con qué pago?») mientras
siguen abiertas las issues de las que depende (#34 esquema de Supabase, #39
app base, #40 login, #41 perfil): escribir la spec completa y construir y
testear la parte del servidor que no necesita la base de datos.

**Prompts principales:**
1. "Escribí la spec de la issue #43 con el endpoint que recomienda del
   lado del servidor, según ADR-001 y ADR-009. Marcá la frontera con las
   issues #36, #37, #41, #44 y #46, y dejá bloqueado lo que depende de
   #34, #39, #40 y #41."
2. "Pasá la spec por `spec-critic` y corregí cada hallazgo. Ojo con
   cualquier filtro que haga el servidor antes del motor: no puede
   duplicar ni esconder reglas del motor."
3. "Definí el contrato HTTP del endpoint, con un código y un cuerpo para
   cada error, y que los registros del servidor no guarden datos del
   usuario."
4. "Implementá la capa del servidor escribiendo primero los tests y con
   repositorios en memoria, sin depender de la base. Cubrí las fechas en
   hora de Argentina, el cambio de mes y el aislamiento entre usuarios."
5. "Revisá los cambios con `rules-guardian` y `/code-review`, y corregí
   lo que encuentren."

**Resultado:**
- Quedó documentada la funcionalidad completa en
  `specs/004-recomendar-pantalla/`: 4 historias de usuario, 30 requisitos,
  el plan técnico, 10 decisiones técnicas, el contrato del endpoint y 42
  tareas. Las tareas que dependen de otras issues quedaron marcadas como
  bloqueadas, con la issue que las bloquea.
- El revisor de specs (`spec-critic`) encontró 13 problemas en la primera
  versión y se corrigieron todos. Los principales:
  - El servidor iba a filtrar las promos "vigentes hoy" antes de pasarlas
    al motor. Eso escondía las promos de otro día de la semana, y el
    usuario no se enteraba de que existían. Ahora el servidor filtra solo
    por rubro y fechas, y el día lo evalúa el motor.
  - No estaba definido qué responde el servidor cuando algo falla. Ahora
    cada caso tiene su código y su mensaje, y la app sabe qué mostrar en
    cada uno.
  - Entrar con la clave pública de la app, sin haber iniciado sesión, no
    tiene que contar como usuario logueado.
  - La pantalla no puede llegar a usuarios reales antes de la issue #37:
    hasta entonces, los topes semanales y "por compra" se calculan como si
    fueran mensuales.
- Ya existe la primera Edge Function del proyecto (`recomendar`, en
  `supabase/functions/`). Recibe la compra que carga el usuario, verifica
  que haya iniciado sesión, valida los datos, junta sus tarjetas, las
  promos del rubro y sus compras del mes, y llama al motor. No agrega
  ninguna regla propia: la recomendación sigue saliendo solo del motor.
- Las piezas comunes (sesión, mensajes de error, validación y acceso a
  datos) quedaron en `supabase/functions/_shared/`, para reusarlas en las
  próximas funciones (#45 topes, #48 tickets).
- El motor ahora comparte su función de fecha con el servidor, para que
  los dos calculen "hoy" con la hora de Argentina. No cambia ninguna regla
  del motor.
- Pasan 34 tests nuevos, que corren sin base de datos ni internet. Entre
  otros, verifican que:
  - el resultado es el mismo que llamar al motor directamente;
  - una consulta a las 22:00 del último día del mes cuenta las compras de
    ese mes y no del siguiente;
  - nunca se mezclan datos de otro usuario;
  - cada error responde lo que dice el contrato;
  - los registros del servidor no guardan datos del usuario.
- El CI ahora también revisa la carpeta `supabase` (lint, tipos y tests).
  Se completó `docs/architecture/02-api-routes.md`, que estaba vacío.
- El control de reglas del proyecto (`rules-guardian`) no encontró
  incumplimientos. La revisión de código encontró dos problemas, ya
  corregidos:
  - Si el servicio de inicio de sesión de Supabase estaba caído, la app
    iba a decir "sesión vencida" y mandar al usuario a loguearse de nuevo,
    lo que no arreglaba nada. Ahora muestra "Probá de nuevo".
  - Un emoji en el nombre del comercio contaba como 2 caracteres.
- Errores de la IA en el proceso:
  - Lanzó un comando de consola que quedó esperando una respuesta y lo
    tuvo que cortar.
  - Las dos primeras corridas de lint y typecheck fallaron por detalles de
    configuración y de tests, y se corrigieron.
  - El caso del inicio de sesión caído no lo previó al escribir el código;
    lo detectó la revisión.
- Queda pendiente:
  - La conexión con la base de datos real y la lista de comercios, que
    dependen de la issue #34.
  - La pantalla en la app, que depende de #39, #40 y #41.
  - Proponer al equipo dos ajustes al ADR-009, que hoy no coinciden con
    cómo quedó el código: el handler vive en su propio archivo y la
    verificación de sesión se inyecta como las demás dependencias
    (motivos en el research, R3 y R4).

---

## 2026-10-25 — Plan y tareas del perfil de bancos y tarjetas (issue #41)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit (`/speckit-plan`,
`/speckit-tasks`) y `gh` CLI para leer las issues #34, #41 y #45.

**Objetivo:** dejar lista la implementación de la issue #41 (perfil: bancos,
tarjetas y redes) mientras siguen abiertas las issues de las que depende
(#34 esquema de Supabase, #39 app base, #40 login). La spec era del 13/10,
anterior a varias decisiones de arquitectura, así que había que cruzarla
con lo decidido después.

**Prompts principales:**
1. "Generá el plan de la spec `specs/001-perfil-billeteras/` cruzándola con
   lo decidido después del 13/10: constitución 2.0.0, ADR-001
   §Actualización, RNF-02, ADR-009 y el contrato de tipos de la issue #33.
   Indicá qué partes quedan bloqueadas por #34, #39 y #40."
2. "Generá las tareas y marcá cada fase bloqueada con la issue que la
   bloquea."
3. "Revisá los artefactos del plan y uní en `plan.md` y `tasks.md` todo lo
   que esté repetido entre archivos."
4. "Releé el plan y las tareas como si tuvieras que implementar la issue sin
   contexto, y completá lo que te haría dudar o perder tiempo."

**Resultado:**
- El plan confirma que la spec sigue vigente y no hubo que cambiarla. Lo
  decidido después se resolvió así:
  - El perfil no necesita Edge Function: la app lee y escribe directo en
    Supabase, y el RLS garantiza que cada usuario vea solo lo suyo
    (ADR-009).
  - La app no puede importar el motor, ni siquiera sus tipos (RNF-02).
    Declara los suyos con los mismos valores, y la base rechaza cualquier
    otro.
  - Se mantiene la lectura del perfil sin conexión. La actualización del
    13/10 sacó del celular el motor y el cálculo, pero no el perfil, que
    solo se muestra.
- Ocho decisiones técnicas, entre ellas:
  - Que no se repita la misma tarjeta lo controla la base, no la pantalla.
    Así también se cubre el caso de dos celulares o un doble toque.
  - Que el perfil no quede vacío lo controla la app. Una regla en la base
    habría impedido borrar la cuenta, y si el perfil igual queda vacío, la
    Edge Function de la issue #43 ya lo detecta.
  - El onboarding se guarda en un solo pedido: entra todo o nada.
  - El buscador filtra los 82 bancos en el celular, sin acentos ni
    mayúsculas, con los bancos frecuentes primero y un orden que no depende
    del idioma del teléfono.
  - Los bancos nunca se borran del catálogo, para que una tarjeta ya
    declarada siempre tenga su banco.
- Quedó una lista de lo que la issue #34 tiene que garantizar en las tablas
  `bancos` y `medios_de_pago`, para coordinarlo con quien la tiene asignada.
- 13 tareas. Las funciones puras (reglas del perfil, buscador y clasificación
  de errores) se pueden hacer con sus tests apenas cierre la #39. Las
  pantallas necesitan además la #34 y la #40.
- Errores de la IA en el proceso:
  - La primera versión del plan repartía el mismo contenido en seis
    archivos: la tabla de medios de pago aparecía descrita tres veces y los
    escenarios de prueba copiaban los de la spec. Se unió todo en `plan.md`
    y `tasks.md`.
  - Al unirlos quedaron huecos para implementar, que se encontraron en una
    segunda lectura:
    - no se decía cómo detectar cada error;
    - Perfil necesitaba bajar el catálogo solo para mostrar el nombre del
      banco;
    - el selector de tarjeta lo usaban dos pantallas y no tenía un archivo
      propio.
- Queda pendiente:
  - Avisar en la issue #34 qué necesita esta feature de las tablas.
  - El catálogo crudo de bancos de MODO que cita un comentario de la #34
    (`docs/product/data/modo-bancos-raw.json`) no está en el repo.

---

## 2026-10-25 — Topes semanales, compartidos y promos acumulables (issue #37)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit (`/speckit-specify`),
el subagente `spec-critic`, `gh` CLI y consultas a la API pública de MODO y
a la página de cada promo para leer su letra chica.

**Objetivo:** completar el cálculo del tope en el motor: que se renueve en
el período real de cada promo (mes, semana o compra), que varias promos
puedan compartir un mismo tope y que las promos acumulables se sumen sobre
la misma compra. Antes de especificar, cerrar las decisiones que la issue
dejaba abiertas, con datos reales de MODO.

**Prompts principales:**
1. "Traete los últimos cambios y arrancá con la issue #37."
2. "Si dos promos del mismo grupo informan montos distintos, dame un
   ejemplo. Si dos promos aplican al mismo comercio, se tiene que aplicar
   la que más da." Se aclaró que el motor compara pesos de ahorro y no
   porcentaje (con tope, un 20% puede devolver más que un 30%), y se
   confirmó ese criterio.
3. "No entendí el escenario de las compras de promos vencidas: mostrame un
   ejemplo. ¿Cuál sería el grupo de una compra?" Con el ejemplo de dos
   promos que comparten tope, una ya vencida, se decidió que la Edge
   Function le pase al motor también las promos de las compras del mes.
4. "¿Hay promociones acumulables realmente en MODO?" Se revisó la letra
   chica de 15 promos de supermercados: 9 se declaran acumulables, 2 no y
   4 no lo dicen. También apareció que el tope más común es semanal y que
   no hay topes compartidos explícitos.
5. "Opción 1 en A y no en B": una promo que se queda sin tope dentro de
   una combinación sigue en ella con $0, y las promos vencidas de un grupo
   cuentan su consumo pero no su monto.
6. "No entendí lo de 'el tope compartido se agota con el 20% en
   supermercados'." Con el ejemplo de dos promos del mismo banco que se
   reparten un tope, se eligió un texto más simple para la que queda en $0:
   "sin tope disponible: lo usa otra promoción de este banco".

**Resultado:**
- Spec en `specs/003-motor-topes-acumulables/`: topes mensuales, semanales
  (de lunes a domingo) y por compra; topes compartidos entre promos de un
  mismo grupo; y promos acumulables sumadas en una sola opción, con el
  detalle de cuánto aporta cada una.
- Cambio de contrato acordado: cada opción de pago pasa a llevar una lista
  de promos aplicadas, cada una con su ahorro, su tope restante y su base.
- Se suma la medición de cobertura de tests al CI (mínimo 90%), como pide
  la issue.
- `spec-critic` no encontró nada bloqueante; se corrigieron 8 detalles,
  entre ellos qué promos cuentan como parte de un grupo y que la Edge
  Function mande las compras desde el lunes de la semana cuando la semana
  empieza en el mes anterior.
- Plan técnico: el cálculo pasa a "saldos" de tope, propios de una promo o
  compartidos por un grupo, que se calculan una sola vez por consulta. Las
  promos de una combinación se reparten el saldo en un orden fijo, así el
  resultado es siempre el mismo. La cobertura se mide con la herramienta de
  Vitest dentro del mismo paso de tests del CI.
- 23 tareas internas en tres etapas con revisión entre cada una: topes
  semanales y por compra; promos acumulables; topes compartidos y cierre.
- Etapa 1: la opción de pago pasó al formato nuevo (lista de promos) sin
  cambiar ningún resultado de la issue #36, y el motor ya distingue topes
  mensuales, semanales (de lunes a domingo, aunque la semana cruce de mes)
  y por compra. Se sumó la medición de cobertura a los tests: da 100% de
  las líneas del motor.
- Etapa 2: las promos acumulables de una misma tarjeta se suman en una sola
  opción, que muestra cuánto aporta cada una y respeta el tope de cada
  promo. Las no acumulables, o las que no lo informan, siguen compitiendo
  por separado.
- Etapa 3: las promos de un mismo grupo comparten un único tope. Lo que se
  gasta con una se descuenta para las otras, aunque la promo con la que se
  compró ya haya vencido. Si dos promos del grupo se suman en una misma
  compra, entre las dos nunca pasan lo que le queda al grupo.
- Cierre: 128 tests en verde y 100% de las líneas del motor cubiertas; lint,
  typecheck y build limpios, y el motor sigue sin dependencias.
- La revisión de código (estándares y cumplimiento de la spec), los tests y
  el control de reglas del proyecto no encontraron incumplimientos. Se
  corrigieron: el texto de la promo que queda en $0, que además ahora solo
  aparece cuando otra promo de la misma opción usó el tope; el desempate
  entre opciones, que compara la lista de promos una por una; un test que
  faltaba (una promo vencida no aporta su período al grupo); y detalles de
  nombres y código repetido. Unificar en un solo lugar la regla de qué promo
  tiene tope queda para la issue #38. Quedan 131 tests en verde.
- Errores de la IA en el proceso: en dos tests escritos antes del código
  puso mal el resultado esperado (el orden de las promos dentro de una
  opción y la causa de descarte de una promo vencida). Los detectó al
  revisarlos contra la spec y los corrigió antes de escribir el código.

---

## 2026-10-26 — Edge Function de recomendación con los topes de la issue #37 (PR #71)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI y el subagente
`rules-guardian`.

**Objetivo:** resolver los conflictos del PR #71 (issue #43) con `main`
después del merge del PR #73 (issue #37), sin romper ninguno de los dos, y
revisar qué issues de la #41, #43, #45, #47 y #56 se pueden avanzar.

**Prompts principales:**
1. "Resolvé los conflictos del PR #71 con `main` en
   `.claude/agent-memory/spec-critic/MEMORY.md`, `.gitignore` y
   `docs/bitacora-prompts.md`, y revisá si alguna de las issues #41, #43,
   #45, #47 y #56 se puede avanzar."
2. "Compará los cambios del PR #73 y del PR #71, quedate con lo mejor de
   cada uno y dejá todo funcionando con la solución más simple."

**Resultado:**
- Los tres conflictos eran de texto y se resolvieron conservando los dos
  lados: las líneas de `.env` y la de `coverage/` en `.gitignore`, las dos
  notas del revisor de specs y las entradas de la bitácora en orden de
  fecha.
- Había un conflicto más que git no marca. La #37 cambió la respuesta del
  motor (cada opción de pago trae ahora una lista de promos) y le pide dos
  cosas nuevas a quien lo llama. Por eso fallaban 4 tests y el typecheck de
  la Edge Function. Se adaptó así:
  - las compras se piden desde el lunes de la semana cuando la semana
    empezó el mes anterior, con la función de fechas del motor, sin
    duplicar el cálculo en el servidor;
  - se le pasan al motor también las promos de las compras registradas
    aunque hayan vencido, para que descuente bien los topes compartidos;
  - se corrigieron los 4 tests y se sumaron 3: semana que cruza de mes,
    tope compartido con una promo vencida y no pedir dos veces la misma
    promo.
- Del PR #73 se adoptó la medición de cobertura con un mínimo de 90%,
  también para la Edge Function, que da 100% de las líneas. Del PR #71 se
  mantuvieron la Edge Function, sus piezas comunes y las specs.
- Se actualizaron la spec, el contrato del endpoint y
  `docs/architecture/02-api-routes.md` con la respuesta nueva. Quedó
  resuelto el requisito que impedía publicar la pantalla hasta que cerrara
  la #37.
- Había dos specs con el número `003`. La de la issue #43 pasó a
  `specs/004-recomendar-pantalla/` y se actualizaron todas sus referencias.
- Lint, typecheck y build limpios, con 131 tests del motor y 37 de la Edge
  Function en verde. `rules-guardian` no encontró incumplimientos.
- Errores de la IA en el proceso: dos scripts de edición fallaron, uno por
  los finales de línea de Windows (CRLF) y otro por las comillas de la
  consola. Se corrigieron con un script en archivo aparte.
- Queda pendiente:
  - Las issues #41, #43, #45, #47 y #56 siguen esperando a #34, #38, #39,
    #40 y #44. La #43 ya no depende de la #37.

---

## 2026-10-26 — Revisión de la Edge Function de recomendación (PR #71) y estimación de topes (issue #38)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI, los subagentes
`test-runner`, `rules-guardian` y `spec-critic`, la revisión de código en
dos ejes (estándares y cumplimiento de la spec) y spec-kit
(`/speckit-specify`).

**Objetivo:** revisar antes de aprobar el PR #71 de jeqm0302, que conecta
el motor con la Edge Function de «¿Con qué pago?», y arrancar la issue #38:
que el motor estime cuánto tope le queda al usuario en cada uno, con su
base, para la pantalla «Mis topes».

**Prompts principales:**
1. "¿El PR #71 está listo para aprobar y mergear? ¿No tiene conflictos?"
   No tenía conflictos y el CI estaba en verde, pero faltaba revisarlo. Se
   pidió revisarlo antes de aprobar.
2. "Publicá el comentario y aprobá el PR, pero en vez de 'todo bien,
   apruebo' poné 'aprobado'."
3. "Arrancá con la issue #38." Al comparar la issue con el diseño de la
   pantalla aparecieron diferencias, y se decidió seguir el diseño.
4. "Para el filtro por tarjetas, ¿se puede hacer parametrizable, por si se
   quiere usar sin la información del perfil?" Se hizo opcional, dejando
   escrito para qué sirve.
5. "1a, 2 y 3a": respetar la regla del 20% para "queda poco" aunque un
   ejemplo del diseño no la cumpla, que cada pantalla ponga sus etiquetas y
   mostrar "menos de $100" cuando queda casi nada.

**Resultado:**
- PR #71 revisado: 168 tests en verde, sin violaciones de las reglas del
  proyecto y sin errores de lógica. Cumple las dos condiciones que el motor
  le pide a la Edge Function. Se aprobó con un comentario de 7 pendientes
  que no bloquean (documentación desactualizada, el código de error cuando
  el usuario no tiene tarjetas, dos tests de casos borde y un chequeo de
  Deno en el CI). La función todavía no lee la base de datos: eso queda para
  la issue #34.
- Spec de la issue #38 en `specs/005-motor-estimar-topes/`: una estimación
  por cada tope que se va gastando, solo de promos vigentes que sirven para
  las tarjetas del usuario, con su base y los textos del diseño
  ("≈$6.500", "según 3 compras de octubre", "queda poco", "vuelve el
  1/11", "Sin compras registradas este mes: todavía no podemos estimar
  cuánto te queda.").
- Se suma a la issue #38 lo que quedó pendiente de la revisión de la issue
  #37: dejar en un solo lugar la regla de qué tipo de tope tiene cada promo.
- `spec-critic` encontró dos bloqueantes: un criterio que pedía reproducir
  textos del diseño que se contradicen entre sí, y etiquetas sin dueño
  claro. Se corrigieron junto con los demás hallazgos.
- Error del diseño detectado: un ejemplo de `DESIGN.md` marca "queda poco"
  con el 29% de tope restante, contra su propia regla del 20%.
- Plan técnico: la estimación reutiliza los saldos de la issue #37, una
  función nueva deja en un solo lugar la regla de qué tipo de tope tiene
  cada promo, y los textos se arman con los montos exactos para que el
  redondeo de la cifra no cambie el estado del tope.
- 13 tareas internas en dos etapas con revisión entre ellas: unificar la
  regla del tope y estimar cada saldo; después, los textos y el cierre.
- Etapa 1: la regla de qué tipo de tope tiene cada promo quedó en una sola
  función que usa todo el motor, sin cambiar ningún resultado de las issues
  anteriores. El motor ya devuelve, para cada tope que se va gastando, cuánto
  es, cuánto se usó, cuánto queda, en qué compras se basa, hasta cuándo dura
  y con qué tarjetas del usuario se usa.
- Etapa 2: el motor arma los textos de cada tope como los pide el diseño:
  la cifra con "≈" y redondeada hacia abajo, "según 3 compras de octubre",
  "queda poco", "vuelve el 1/11" y el aviso de que sin compras todavía no se
  puede estimar. Ningún texto muestra una cifra sin su base.
- Cierre: 168 tests en verde, 99,5% de las líneas del motor cubiertas;
  lint, typecheck y build limpios, y el motor sigue sin dependencias.
- La revisión de código (estándares y cumplimiento de la spec), los tests y
  el control de reglas del proyecto no encontraron incumplimientos. Se
  corrigieron detalles: dos funciones de fecha con el mismo nombre y distinto
  formato, código repetido, números sin nombre, un posible empate en el orden
  de los topes y cuatro tests de casos borde que faltaban. Quedan 172 tests en
  verde.
- Error de la IA en el proceso: al unificar la regla del tope, el primer
  diseño hacía que una promo de un grupo sin monto informado dejara de
  aportar sus compras al grupo. Se detectó al leer el código antes de
  escribirlo y se ajustó el diseño.

---

## 2026-10-26 — Pendientes de la revisión del PR #71 (issue #43)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI y Deno.

**Objetivo:** resolver los 7 pendientes no bloqueantes que dejó el
compañero al aprobar el PR #71.

**Prompts principales:**
1. "Mirá lo que aprobó mi compañero y lo que comentó. En base a eso,
   resolvé todas las indicaciones del comentario. No subas nada ni hagas
   un merge hasta que yo lo apruebe."
2. "Velo bien y decime si cumple con todo esto."

**Resultado:**
- Perfil sin medios de pago responde 422 en vez de 409, el código acordado
  en la issue #36. Se cambió en el código, los tests, la spec, el contrato
  (también en lo que muestra la pantalla), el plan del perfil (#41) y
  `docs/architecture/02-api-routes.md`.
- `tasks.md`, `plan.md` y `research.md` de la spec 004 describen la versión
  posterior a la #37: se exportan `fechaArgentina` e `inicioDelPeriodo`, las
  compras se piden desde el día 1 del mes o el lunes de la semana y el
  autenticador lanza un error propio si Supabase Auth no responde.
- ADR-009 suma una sección «Actualización»: el handler vive en
  `handler.ts`, separado de `index.ts`, y la autenticación es la interfaz
  `Autenticador` con la clase `AutenticadorSupabase`.
- `CLAUDE.md` ya no marca el workspace `supabase` como reservado.
- El CI suma el job `deno-check`, que chequea los `index.ts` de las Edge
  Functions (quedaban fuera de `tsc`, ESLint y la cobertura).
- 3 tests nuevos: una compra registrada sin promo (`promocionId: null`) y
  un pedido sin comercio, en el servicio y en el handler. 131 tests del
  motor y 40 de la Edge Function en verde, 100% de líneas cubiertas.
- Se corrigió la descripción del PR (la spec es la `004`, y son las compras
  del período, no del mes).
- Errores de la IA en el proceso: un test nuevo no compilaba porque la base
  del tope puede ser `null`; lo detectó el typecheck y se corrigió.
- Queda pendiente: la #43 sigue abierta hasta que existan las tablas (#34)
  y la pantalla (#39, #40, #41).

---

## 2026-10-16/17 — App mobile base y las 18 pantallas (issue #39)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit, `spec-critic`,
Stitch MCP y las skills `vercel-react-native-skills`, `expo-native-ui` e
`impeccable` (piso de craft e `ios.md`).

**Objetivo:** crear `apps/mobile` (issue #39) e implementar las 18
pantallas de Stitch v5 conectadas entre sí, aplicando las correcciones de
`docs/design/auditoria-pantallas-v5.md`.

**Prompts principales:**
1. Pedido completo: leer CLAUDE.md, DESIGN.md, la auditoría, la issue #39 y
   los ADR 002, 007 y 008; seguir ADR-007 (specify → spec-critic → plan →
   tasks → implement); traer las 18 pantallas de Stitch al scratchpad;
   Expo Router con tab bar Inicio · Comprar · Topes · Perfil; tema en un
   solo archivo; Hanken Grotesk; `<Icon>` por plataforma; datos de ejemplo
   detrás de `src/data/`; correcciones P1 y P2 obligatorias.
2. Cuatro decisiones del PO antes de implementar: un solo PR con un commit
   por fase; PATCH 2.0.1 de la constitución (monto opcional); excepción al
   Principio II para un servidor simulado aislado; instalar Xcode para el
   simulador.
3. "Intentar nuevamente" tras una interrupción de la sesión.

**Resultado:**
- `specs/006-app-mobile-pantallas/`: spec, plan, research, data-model,
  contratos, quickstart y 56 tareas. `spec-critic` encontró 3 bloqueantes:
  el monto opcional chocaba con la letra del Principio I, la cámara estándar
  de Expo escribe la foto al cache (se sacó la cámara de esta versión) y el
  botón "Usar Galicia" no tenía comportamiento definido (pasó a abrir
  Revisá tu compra en modo recomendación).
- Constitución 2.0.1: una compra concreta es el comercio elegido; el monto
  refina el estimado.
- `apps/mobile`: Expo SDK 58, tema de tokens con lint y test contra hex
  sueltos, solo modo claro, capa de datos con 17 tests de reglas (≈ y
  base, ADR-008, cuentas que cierran), y las 18 pantallas.
- Ajustes de coherencia de datos: el 15/10/2026 es jueves, así que "hoy
  miércoles" pasó al 14/10; el umbral de "Queda poco" pasó a 30% para que
  Santander (29%) cierre con su estado; el ejemplo de grupo ya no nombra la
  tarjeta de Lucía (ADR-008 §3).
- Docs: `docs/architecture/03-frontend.md` completo, contrato en
  `02-api-routes.md` y DESIGN.md actualizado con las reglas corregidas.
- Lección: Stitch HTML sirvió para copy y estructura; varias correcciones
  (tarjeta oscura en todas las pantallas, total de topes, fechas de 2024)
  venían del diseño, no de la implementación.

**Continuación (2026-10-27):**
1. "como hago lo de xcode?": se guió al usuario para aceptar la licencia y
   seleccionar Xcode (`sudo` no lo puede correr la IA).
2. Al traer `main` aparecieron la Edge Function `recomendar` (#43) y la spec
   004 con botón "Simular" y monto obligatorio. El PO decidió mantener la
   respuesta en un toque y adaptar la capa de datos al contrato real. Se abrió
   la issue #75 (monto opcional en la Edge Function y alinear la spec 004).
3. Verificación en el iOS Simulator (iPhone 17, iOS 27), con capturas de las
   18 pantallas en `docs/design/capturas-app/` y una pasada con el texto más
   grande de accesibilidad.

**Resultado de la continuación:**
- El simulador encontró cuatro bugs que la prueba en web no mostraba: el
  onboarding abría el sheet de cuenta como primera pantalla, el formSheet con
  detents no pintaba un ScrollView, el aviso de confirmación quedaba debajo del
  stack nativo y, con el texto más grande, se cortaban palabras al medio.
  Los cuatro se corrigieron y se volvieron a verificar.
- `rules-guardian`: sin bloqueantes; 10 hallazgos corregidos (bases en el
  grupo, rubro inventado, texto del ticket). `/code-review`: sin violaciones
  duras; se unificaron textos de base y catálogo de rubros, y la spec quedó
  alineada con lo que hace la app.
- La spec se renumeró a 006 (002 ya era del motor en `main`).

---

## 2026-10-27 — Explicar por qué se recomienda cada medio de pago (issue #46)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** que cada recomendación y cada promo descartada digan con
claridad por qué, con los textos del diseño, y dejarle a la pantalla los
datos para armar el "¿por qué no X?". Es una issue chica: va sin spec-kit.

**Prompts principales:**
1. "Tenemos que trabajar en las issues #46, #48, #10 y #55. Fijate si hay
   alguna que podamos ir tomando." Las issues #48, #10 y #55 están
   bloqueadas por tareas de otros compañeros; se arrancó con la issue #46,
   solo la parte del motor, porque la pantalla depende de las issues #43 y
   #39.
2. "Hacé las tres cosas como las proponés": que la recomendación diga
   cuánto tope queda después de la compra y en qué se basa, en el mismo
   texto; que los descartes usen el tono del diseño, sin el "Descartada:"
   de la issue; y que cada descarte diga a qué medios de pago del usuario
   le servía la promo.
3. "¿Existe alguna promo con tope de $0?" No existe en la realidad: solo
   puede venir de un error del extractor. "Arreglalo en el origen: si
   aparece, es un error y no hay que tomarla como promoción."
4. "Avanzá con los arreglos de la revisión y sumalos a la bitácora."

**Resultado:**
- La recomendación ahora dice, por ejemplo, "20% en supermercados los
  miércoles · te quedan ≈$1.600 de tope, según 3 compras de octubre". Si no
  hay compras registradas no da cifra, y si la compra usa todo el tope lo
  avisa.
- Los descartes dicen, por ejemplo, "Hoy no aplica, la promo es los
  sábados" o "Tope agotado este mes, según 2 compras".
- Cada descarte trae los medios de pago del usuario a los que aplicaba la
  promo, así la pantalla muestra "¿por qué no X?" sin calcular nada.
- Una promo con tope de $0 o negativo ya no se publica: la regla de
  publicación la toma como un error de lectura.
- Se actualizó el ejemplo del contrato de la Edge Function (spec 004).
- La revisión de código no encontró incumplimientos de las reglas; se
  ajustaron nombres, un comentario y un caso que faltaba testear. 192
  tests del motor y 40 de la Edge Function en verde.
- Queda pendiente: la pantalla del "¿por qué no X?" (issue #43) y avisar
  en la issue #51 que el extractor no publique topes de $0.

---

## 2026-11-01 — Estado de issues y versiones; motor en la app con Redux (ADR-010)

**Herramienta:** Claude Code (Sonnet 5.5), con la CLI `gh`.

**Objetivo:** resumir el avance (issues, milestones, PRs) y repartir lo que
falta; después, documentar el cambio de arquitectura para que la recomendación
se recalcule en vivo en la app.

**Prompts principales:**
1. "Haceme un resumen de cómo venimos en cuanto a issues, versiones, y qué nos
   falta por hacer, así nos dividimos"
2. "ok dale, con prioridades primero (de última asignáme lo de supabase a mí
   también…). Y recordá crear un issue que diga mejorar la UX, asignada a mí"
3. "ah en alguna de las issues habría que poner uno de los detalles técnicos
   que charlamos: […] implementar Redux […] mientras vamos cargando el monto va
   a ir reloadeando el medio de pago más conveniente"
4. "[…] la constitución lo veníamos hablando cuando no habíamos hecho un
   análisis muy intensivo […] Lo que sí puedes hacer es, si querés un PR,
   aclarando todo esto, poniendo unas nuevas decisiones de diseño […] la
   lógica de negocio, o la mayoría de lo que se pueda, directamente en la app"

**Resultado:**
- Resumen y reparto por prioridad; las issues #9 y #34 (Supabase) pasaron a
  Joaquín y se creó la #79 («Mejorar la UX»). El detalle técnico de Redux quedó
  como comentario de la #43.
- Se propuso al PO una opción 1 (debounce más llamada a `recomendar`) y una
  opción 2 (motor en la app). El PO eligió la 2: es lo que hace posible el
  cálculo en vivo y sin señal, y Redux resuelve el estado del cliente, que fue
  la razón por la que el 13/10 se movió el cálculo al servidor.
- ADR-010 (supera la Actualización del 13/10 de ADR-001), constitución 3.0.0
  (MAJOR, Principio II), RNF-02, `CLAUDE.md`, `rules-guardian`, arquitectura,
  privacidad y pendientes alineados; notas en las specs 004 y 006.
- Alcance acordado del PR: **solo documentación y decisiones**. El código
  (Redux, motor en la app, sincronización) llega con las issues del plan de
  ADR-010.
- Riesgos que quedaron anotados y sin resolver: el tamaño del corpus frente al
  tope de AsyncStorage en Android y la resolución de `@vuelto/motor` en Metro.

---

## 2026-11-01 — Esquema inicial de Supabase con RLS (issue #34)

**Herramienta:** Claude Code (Sonnet 5.5) con spec-kit, `spec-critic`,
`rules-guardian`, `test-runner`, `/code-review` y la skill
`supabase-postgres-best-practices`.

**Objetivo:** las tablas base de Supabase, cada una con su RLS en la misma
migración, más los requisitos del ADR-010 §4 que la issue no dice: promociones
con `actualizada_en` (trigger) para sincronizar solo lo nuevo, lectura para
autenticados y escritura solo de la service role.

**Prompts principales:**
1. Pedido con la issue #34, el ADR-010 §4, el modelo de datos y los tipos del
   motor, y el flujo de la constitución para issues M: specify, `spec-critic`,
   plan, tareas, implement, `/code-review`, `test-runner` y `rules-guardian`.
2. Requisitos extra: `actualizada_en` con trigger, test de RLS (A no lee
   compras de B; un autenticado no inserta en `promociones`), `db reset`
   limpio, sin columna de imagen de ticket y sin borrar `recomendar`.

**Resultado:**
- Spec 007 con 25 requisitos. `spec-critic` encontró 5 decisiones abiertas;
  se resolvieron con defaults que quedan para confirmar en el PR: un medio de
  pago con compras no se borra; una captura referenciada no se borra; las
  promociones se dan de baja (`dada_de_baja_en`), no se borran; los comercios
  se comparan sin mayúsculas ni espacios de más; forma de `capturas_crudas`.
- 7 migraciones, `seed.sql` y 4 suites pgTAP (129 pruebas). Una FK compuesta
  `(user_id, medio_de_pago_id)` impide usar el medio de pago de otro usuario,
  porque una FK simple no aplica RLS.
- Las pruebas encontraron un error real: la service role no tenía privilegios
  sobre las tablas nuevas; se agregó el `grant` explícito. Se comprobó además
  que las pruebas fallan si se rompe una policy a propósito.
- `/code-review` y `rules-guardian`: sin violaciones duras. Se aplicó el
  `revoke execute` de las funciones auxiliares; el resto fueron decisiones de
  juicio o columnas que el tipo `Compra` pide.
- El seed solo trae a Galicia con id real de MODO; el resto del catálogo de
  bancos lo carga la ingesta. El job de CI `supabase-rls` no se corrió todavía
  en GitHub.

---

## 2026-11-01 — Motor en la app y store de Redux (issue #81)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit, `spec-critic`, `/code-review`,
`test-runner`, `rules-guardian`, el simulador de iOS y el navegador integrado.

**Objetivo:** pasos 1 y 2 del plan de ADR-010: que la app calcule la
recomendación y los topes con `@vuelto/motor` sobre un store de Redux, para que
la recomendación cambie mientras se tipea el monto, sin red.

**Prompts principales:**
1. "Issue #81, siguiendo docs/decisions/010-motor-en-la-app-y-redux.md (plan,
   pasos 1 y 2) y la constitución 3.0.0 […] Empezá por lo que más riesgo tiene y
   verificalo antes de seguir: que Metro resuelva @vuelto/motor (paquete
   compilado a dist/) dentro del monorepo, en Expo Go, en la web y en el build
   preview de EAS. Si no resuelve, proponeme la solución antes de elegirla."
2. "Después: borrar servidor-simulado.ts y que api.recomendar use el motor real
   sobre fixtures.ts; Redux Toolkit con los slices sesion, perfil, corpus,
   compras, simulacion y contactos; selectRecomendacion y selectTopes con
   createSelector; `ahora` como valor del store […] La recomendación NO se
   guarda en el store ni en AsyncStorage."
3. Elección del PO ante la propuesta: `prepare` en el motor (en vez de resolver
   el código fuente con una condición de Metro) y un solo build de EAS al final.

**Resultado:**
- **Riesgo de Metro, medido primero**: con `dist/` el motor se empaqueta en iOS,
  Android y web sin `metro.config.js`; sin `dist/` (checkout limpio, como EAS y
  el CI) falla. Se propusieron dos salidas y el PO eligió `"prepare": "npm run
  build"` en `packages/motor` (research R1 de la spec 008).
- Spec 008 con `spec-critic`: las cifras de los escenarios coincidían con el
  motor, pero faltaban el mapeo de los fixtures a la forma del motor, el
  instante exacto del reloj (mediodía de Argentina, para que la zona no cambie
  el día) y en qué slice vive `ahora` (`sesion`). Se corrigieron antes del plan.
- Paso 1 (commit propio): `fixtures.ts` con la forma del motor, `calculo.ts`
  (motor → vista) y el grupo evaluado con el motor por integrante; se borró
  `servidor-simulado.ts`. Cambio de comportamiento aceptado: "queda poco" pasa
  del 30% del mock al 20% del motor (Santander, $2.300 de $8.000, queda
  "disponible").
- Paso 2: seis slices con solo datos de entrada; `selectRecomendacion` y
  `selectTopes` con `createSelector`; persistencia propia (listener) de perfil,
  corpus, compras y cuenta, con validación por parte y migración de
  `vuelto.perfil.v1`; `useReloj` escribe `ahora`. Se borraron `sesion.ts` y
  `perfil-local.ts`.
- Al mergear `main` (PR #77, issue #46) el motor pasó a incluir el tope y la
  base en el `motivo` y los medios en cada `Descarte`: la vista muestra solo
  "qué da" la promo en el título (la cifra y la base van aparte) y la spec se
  renumeró a 008 (007 ya era el esquema de Supabase).
- Tests: 136 en la app (cálculo, reducers, selectores con memoización y reloj,
  persistencia sin nada derivado ni compras de otro período).
- Verificado en la web: al tipear 1-0-0-0-0 la tarjeta cambia en cada tecla, sin
  ningún pedido de red; guardar la compra baja el tope de Galicia a ≈$4.500
  según 4 compras, y sigue ahí después de recargar. En lo guardado hay solo
  datos de entrada.
- Verificado en el simulador de iOS (Expo Go): el tipeo cambia la cifra en
  cada tecla; guardar recalcula la misma pantalla y Topes; al reabrir la app
  sigue la compra y la simulación arranca vacía. Capturas en el PR #86 y en
  `specs/008-motor-app-redux/capturas/`. Build `preview` de EAS en verde.
- `rules-guardian`: sin bloqueantes; se corrigió que al disco llegaran compras
  de períodos anteriores (privacidad.md).
- `/code-review`: sin violaciones duras. Se aplicaron las fechas del motor en vez
  de duplicarlas (el motor solo suma exports), el desfase horario en un único
  lugar, y la spec y el contrato quedaron alineados con el código.

---

## 2026-11-02 — Registrar una compra: borrar, promo quitable y cola de subida (issue #44, spec 010)

**Herramienta:** Claude Code (Sonnet 5.5), con spec-kit, `spec-critic`, `rules-guardian` y
`test-runner`; Supabase local con Docker para probar el esquema.

**Objetivo:** cerrar lo que faltaba de la issue #44 sobre el store de Redux (#81) y el esquema
de Supabase (#34) ya mergeados. La captura local de la compra ya existía; faltaban borrar,
la promo aplicada visible y quitable, y subir lo registrado a la cuenta aunque no haya señal.

**Prompts principales:**
1. «Issue #44: registrar una compra aceptando la recomendación ("Pagué con esto", origen
   excepcion) o cargándola a mano (origen manual). […] se sube a Supabase cuando hay red y
   queda en cola si no. Una compra sin confirmar no modifica ningún tope. Flujo spec-kit para
   issues M y rules-guardian antes del PR.» (con la nota de que #43, #40, #41 y #42 no estaban)
2. Mensaje de la sesión coordinadora: renumerar la spec de 009 a 010 para no chocar con la de #42.

**Resultado:**
- `spec-critic` encontró 5 bloqueantes en la primera spec (la promo del corpus de ejemplo y el
  medio Mercado Pago no se pueden subir nunca; a quién pertenece la cola; borrar durante un
  envío; qué error es transitorio). Todos se resolvieron en la spec antes de planificar.
- Borrar una compra (hoja de confirmación, no `Alert`, que no anda en la web); «Mis compras» lista
  todo el período de topes.
- Cola de operaciones en un slice aparte (`vuelto.cola.v1`), escrita antes que `compras`, con
  estados, dueño, compactación y un solo vaciado a la vez. La subida real queda **desconectada**
  (`Extra.subida = null`) hasta #40, #41 y #42.
- Un hallazgo al probar el cierre de la app entre escrituras: anular un guardado con su borrado
  dentro del mismo paso dejaba una compra sin operación; se separó `compactar` de `encolarBorrado`.
- Probado contra un Supabase local con el cliente real: `upsert` con `ignoreDuplicates` no duplica,
  borrar dos veces es éxito y los inválidos dan `23514` y `23503`. Se sumó un pgTAP con esos casos.
- Verificado a mano en el navegador: borrar, quitar la promo y que «Te devolvieron» no cambie.
  **No** se probó en el simulador de iOS.
- Coordinación con la sesión de #42, que proponía `pendientes` dentro de `EstadoCompras`: se le
  respondió con una nota (cola aparte + `aplicarPendientes`) y un mensaje.

---

## 2026-11-01 — Login y registro con Supabase Auth (issue #40)

**Herramienta:** Claude Code (Sonnet 5.5), con la CLI `gh`, el simulador de iOS y un
Supabase local.

**Objetivo:** email y contraseña en `apps/mobile`. Se empezó sobre `sesion.ts`
porque el store de Redux (#81) no estaba mergeado; al llegar #81 a `main` el
usuario pasó al slice `sesion`.

**Prompts principales:**
1. "Issue #40: login y registro con email y contraseña con Supabase Auth en
   apps/mobile. Es chica: sin spec-kit, pero con /code-review, test-runner y
   rules-guardian. Tiene que convivir con el store de Redux (#81) […] Probalo en
   el simulador con un usuario de prueba que crees en el Supabase local o de dev
   (nunca uses credenciales reales mías)."

**Resultado:**
- `lib/auth.ts` (validación, errores en español por `code`, con tests),
  `data/auth.ts` (thunks: sesión persistida y `SIGNED_OUT`), pantallas `login` y
  `registro` y cierre de sesión en Perfil. Toda la app queda detrás de la sesión
  y el usuario nuevo sin medios va al onboarding.
- Merge con #81: `sesion.usuario` y `sesion.authLista` (en memoria) reemplazan
  a `sesion.cuenta`, que era el viejo «guardar perfil» y se persistía; los
  tokens los guarda el cliente de Supabase. Cerrar sesión o una sesión vencida
  despachan `sesionCerrada`.
- Decisión que tomó el código y conviene revisar: la issue pide la app detrás
  de la sesión, así que desaparece el modo invitado de la spec 006 («Ahora no»,
  email sin contraseña, «Continuar con Apple»).
- Probado contra un Supabase local con usuarios de prueba, en web y en el
  simulador de iOS (Expo Go): registro, onboarding, sesión que sobrevive a
  matar y reabrir la app, cerrar sesión (vuelve a Bienvenida y borra el perfil
  del dispositivo), contraseña incorrecta y login. Esa prueba fue antes del
  merge con #81; después se repitió solo lo automático (tests, lint, typecheck). En el simulador hubo que
  tocar la tecla `@` a mano: el inyector de texto la deformaba.
- Revisiones: `test-runner`, `rules-guardian` y `/code-review` sin hallazgos
  graves; se corrigieron un fragmento sobrante en Perfil y un helper duplicado.

---

## 2026-11-02 — Perfil: plan alineado con ADR-010 y piezas base (issue #41)

**Herramienta:** Claude Code (Opus 5.5), con spec-kit (plan y tareas de la
spec 001) y `gh` CLI.

**Objetivo:** actualizar el plan de la #41, escrito el 25/10, con ADR-010 y
con lo que dejó la #34 en `main`, e implementar lo que no depende de la #81
(store de Redux) ni de la #40 (sesión).

**Prompts principales:**
1. "Actualizá `plan.md` y `tasks.md` de `specs/001-perfil-billeteras/` con
   ADR-010 y con las tablas reales de la #34. Marcá qué fases quedan
   bloqueadas y por qué issue. La spec no cambia."
2. "Implementá test-first las fases que no dependen de la #81 ni de la #40:
   modelo, buscador de bancos, acceso a Supabase con el cliente por
   parámetro y el selector de banco, tipo y red. No conectes las pantallas:
   eso lo reescribe la #81."
3. "Corré lint, typecheck, test y build, y abrí el PR sin cerrar la issue."

**Resultado:**
- Plan y tareas actualizados:
  - El perfil vive en el slice `perfil` de Redux, que lo persiste: se cayó
    el cache propio de la feature (decisión 6).
  - `Red` y `TipoTarjeta` se declaran con los valores del motor hasta que la
    #81 sume `@vuelto/motor`; un test compara las dos listas (decisión 2).
  - Perfil vacío: lo detecta el motor con `PerfilSinMediosError`, ya no la
    Edge Function (decisión 4).
  - Nueva decisión 9: `on_hub_list` es `boolean | null`, porque la tabla
    `bancos` no lo tiene. Nunca se inventa un valor.
  - Las fases 2b y 3 (conectar onboarding y Perfil) quedan bloqueadas por la
    #81 y la #40.
- Código en `apps/mobile/src/perfil/` (`modelo.ts`, `buscar-bancos.ts`,
  `datos.ts`) y `components/selector-medio.tsx`. 33 tests nuevos.
- Lo que encontró el plan al cruzarse con la #34:
  - la tabla `bancos` no tiene `imagen` ni `on_hub_list`, así que US3
    (bancos frecuentes primero) no se cumple con datos reales;
  - las columnas son `user_id` y `creado_en`, no `usuario_id` y `creado`.
- Errores de la IA en el proceso: el primer intento de editar el plan con un
  script falló por las comillas en la terminal; se reescribió el archivo
  entero.
- Queda pendiente:
  - Conectar el onboarding y Perfil (T008 a T011) cuando cierren la #81 y la
    #40.
  - Migración que sume `on_hub_list` (y `imagen`) a `bancos`, y que la
    ingesta lo cargue.
  - El selector no se probó en pantalla: todavía no lo usa ninguna.

---

## 2026-11-02 — Sincronizar el corpus y las compras del período (issue #42)

**Herramienta:** Claude Code (Sonnet 5.5), con spec-kit, `spec-critic`, `rules-guardian` y un Supabase local
en Docker para verificar las consultas.

**Objetivo:** implementar la issue #42 (reabierta tras ADR-010): que la app baje el corpus de promos y las
compras del período al store de Redux y siga funcionando sin señal.

**Prompts principales:**
1. "Implementá la issue #42 […] Primero medí […] y decidime con números si va en AsyncStorage […] Implementá la
   sincronización al store […] No inventes un store ni una base de mentira para destrabarte, y no midas el corpus
   con datos inventados"
2. (`/speckit-specify` → `spec-critic` → `/speckit-plan` → `/speckit-tasks` con la issue y las restricciones)

**Resultado:**
- `spec-critic` encontró 4 bloqueantes: marca sin margen de relectura, bajas que borraban el consumo de los topes
  compartidos, mezcla con el corpus de ejemplo (vigente hasta el 31/12) y reloj de ejemplo en la primera
  sincronización. Se reescribió la spec antes de planificar.
- Verificado contra un Supabase local aislado (puertos 563xx): el cursor `(actualizada_en, id)` no pierde los
  empates; `neq.otra_provincia` solo excluye las filas con jurisdicción `null` (hay que usar `or(is.null, neq)`);
  `supabase-js` no tiene `.and()` y dos `.or()` repetidos se combinan con AND.
- Decisiones que se apartan del texto de la issue, para que las apruebe el PO: la ventana de compras es el período
  (el más temprano entre mes y semana), no "los últimos N días del mes"; el corpus va en su propia clave de
  AsyncStorage.
- La medición del tamaño del corpus **no se hizo con datos reales** (#35 está abierta): queda el instrumento
  (`npm run medir:corpus`) y una proyección rotulada con promos de ejemplo (2.000 promos ≈ 880 KB).
- Sin `tsx` instalado, el medidor se corre con Vitest (sin dependencias nuevas).
- La prueba manual en modo avión queda bloqueada por #40 (login), #35 (corpus) y #41 (medios en la base).

---

## 2026-11-01/02 — Integración de PRs, análisis de ADR-010 y monto opcional en el motor (issue #75)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** destrabar los PRs pendientes (#77, #83, #84), revisar qué
issues propias se pueden cerrar o arrancar dentro de ADR-010 e implementar
la que no tiene dependencias (#75). Es una issue chica: va sin spec-kit.

**Prompts principales:**
1. "El PR #77 tiene conflicto con `main` en `docs/bitacora-prompts.md`.
   Resolvelo sin borrar ni reescribir ninguna entrada: dejá las de las dos
   ramas en orden de fecha, con el separador de siempre. Mostrame la
   solución antes de aplicarla y no mergees a `main`."
2. "Mergeá el PR #77 y actualizá `main`. Después resumime los PRs #83 y #84:
   qué hacen, si chocan con `main` o entre ellos y si cumplen las reglas de
   `CLAUDE.md`. No los mergees hasta que lo apruebe."
3. "Revisá criterio por criterio si las issues #41, #43 y #45 se pueden
   cerrar con lo que hay en `main`, y qué las bloquea."
4. "Leé completos el ADR-010 y el PR #80 y cruzalos con las issues
   abiertas: qué se puede arrancar ya, qué está bloqueado y qué quedó
   desactualizado."
5. "Implementá la #75 en el motor (`monto: number | null`) con los criterios
   de la issue y sus tests. Si la issue no define un caso, decidilo y
   avisame. No subas nada hasta que lo apruebe."

**Resultado:**
- PR #77: el conflicto era de dos entradas agregadas en el mismo lugar. Se
  dejaron las tres (#39, #46 y ADR-010) por fecha, sin perder ninguna línea.
  Mergeado con el CI en verde.
- PRs #83 (secrets, cierra #9) y #84 (esquema con RLS, cierra #34):
  mergeados, sin conflictos y con el CI de `main` en verde, incluido el job
  `supabase-rls`. Se aceptaron las 5 decisiones abiertas de la spec 007.
- Ninguna de las issues #41, #43 y #45 se puede cerrar: las tres dependen de
  la #81 (motor en la app y store de Redux). La #75 no depende de nada y la
  #43 la necesita.
- #75 implementada:
  - Sin monto, el ahorro es $0 y se muestra el tope disponible antes de la
    compra, con su base. Con cero compras registradas no hay cifra.
  - Orden sin monto: mayor porcentaje (las acumulables suman los suyos) y
    después mayor tope disponible; una promo sin tope informado va antes.
  - Decisión propia, aprobada: una promo con compra mínima no se descarta
    sin monto; el motivo avisa "pide una compra mínima de $X".
  - Con monto, el motor no cambia. La Edge Function `recomendar` no se tocó
    (ADR-010 §5).
  - 13 tests nuevos; 205 del motor y 40 de la Edge Function en verde.
    Contrato de la spec 002 y `01-data-models.md` actualizados.
- Errores de la IA en el proceso:
  - Dijo primero que a la #41 solo la bloqueaba el login (#40). Al leer
    ADR-010 se corrigió: el perfil pasa a Redux, así que también depende de
    la #81.
  - El lint y el typecheck fallaron al principio por un `node_modules`
    desactualizado, no por el cambio; se resolvió con `npm ci`.
- Queda pendiente:
  - `theme.test.ts` de la app falla solo en Windows: arma las rutas con `/`.
    En el CI (Linux) pasa.
  - El ADR-010 sigue en estado «propuesto» y nombra las tablas en singular;
    en la base quedaron en plural.
  - Sumar la #81 como dependencia en la #41 y la #44, y aclarar en la #45
    que el comentario sobre la Edge Function de topes quedó superado.
  - El plan de la #41 (`specs/001-perfil-billeteras/`) es anterior a
    ADR-010: dice que la app no importa el motor y no usa Redux.

---

## 2026-11-03 — Mis topes: tocar un tope muestra sus compras (issue #45)

**Herramienta:** Claude Code (Opus 5.5), con `test-runner`, `rules-guardian`, `/code-review`, un Supabase
local aislado (puertos 573xx) y el navegador integrado.

**Objetivo:** el único criterio pendiente de la #45: "Tocar un tope muestra las compras que lo consumieron".
Es S: sin spec-kit.

**Prompts principales:**
1. "Selector memoizado en apps/mobile/src/store/selectores.ts que, dado un tope (promo o grupo de tope
   compartido), devuelva las compras del período que lo consumieron. Debe salir de lo mismo que usa
   estimarTopes del motor; si el motor no expone qué compras consumió cada tope, NO dupliques la lógica en la
   app: proponé el cambio mínimo en @vuelto/motor y avisame antes de tocarlo. […]"
2. "ok" (aprobación del cambio en el motor)

**Resultado:**
- El motor no exponía las compras de cada saldo, y la app no podía derivarlas sin repetir su lógica: un grupo
  cuenta las compras de miembros **vencidos** (que no están en `promocionIds`) y su período depende de los
  miembros. Se propuso y aprobó `compraIds` en `EstimacionTope`, que se llena en el mismo loop que
  `base.comprasRegistradas` (mismo largo, orden `compararIds`). `BaseEstimacion` y `recomendar()` no cambian.
  Contrato y modelo de datos de la spec 005 actualizados.
- App: `selectComprasDeTope(state, clave)` sale de `selectTopes` y solo cruza esos ids con `compras.lista`.
  `TopeDetalle` es tocable y lleva a `/tope/[clave]`, que muestra el tope con su base, las promos de un tope
  compartido y las compras (con `CompraRow`, que permite borrarlas).
- `/code-review` y `rules-guardian` encontraron un caso: una compra con un medio fuera del catálogo contaba en
  la base pero no se podía pintar, y la lista contradecía el "según N compras". Primero se avisó aparte; al
  mergear #100 (que muestra esas compras como "medio que sacaste de tu perfil") el aviso sobró y se sacó: la
  lista ahora siempre coincide con la base. También se tipó la clave del tope y el test la usa.
- Verificado a mano en la web con un usuario de prueba y con Supabase apagado (sin red): registrar una compra
  pasa el tope a "según 4 compras" y la suma a la lista; borrarla desde la pantalla del tope vuelve a 3, y el
  estado sobrevive a recargar. Para eso hubo que apagar el REST de Supabase antes del login: la base local no
  tiene promos y sus bancos son UUID, no los ids de la app (#41), así que el corpus de ejemplo solo queda si la
  sincronización falla. El corpus de ejemplo no tiene topes compartidos: la agrupación se verificó solo con
  tests. **No** se probó en el simulador de iOS.
- Visto al pasar: `CompraRow` corta los nombres de comercio a 375 px ("Farmaci/ty"), también en «Mis compras».
## 2026-11-03 — Fila de compra legible a 375 px

**Herramienta:** Claude Code (Opus 5.5 / Sonnet 5.5), navegador integrado con `mobile-web`.

**Objetivo:** que `CompraRow` no parta el nombre del comercio a mitad de palabra
y se lea bien a 375 px, también con texto grande, sin cambiar lo que muestra.

**Prompts principales:**
1. «Arreglar el layout de `compra-row.tsx` a 375 px (Farmaci/ty, medio de pago en tres líneas), verificar con capturas antes y después.»

**Resultado:**
- Reproducido en «Mis compras» con viewport mobile. Causa: la columna derecha
  (monto + reintegro) y el botón de borrar le dejaban poco ancho al bloque central.
- Fila reorganizada: renglón 1 comercio + monto, renglón 2 medio de pago, renglón 3
  origen (y marca de subida) + reintegro, que envuelve si no entra. Mismo contenido y
  misma etiqueta de accesibilidad.
- Verificado con texto escalado a 1,5× en el navegador. Lint, typecheck y tests en verde.
- Errores de la IA: el primer intento dejó el medio de pago en tres líneas; se movió el
  reintegro al renglón del origen.
## 2026-11-02 — Corpus de promociones sembrado a mano desde MODO (issue #35, parte de Supermercados y Farmacias)

**Herramienta:** Claude Code (Sonnet 5.5), con spec-kit, el agente `spec-critic`, la CLI `gh`,
el navegador integrado, Docker (Postgres y PostgREST de Supabase) y la API pública de MODO.

**Objetivo:** dejar listo el corpus real de las categorías 1 y 4 para la demo con la ingesta
apagada, y las herramientas para armarlo, validarlo y cargarlo. Spec `specs/011-corpus-promociones-seed/`.

**Prompts principales:**
1. "Mi parte es la de spazos32, ¿con qué podemos avanzar?" (con la tabla de reparto por prioridad).
2. "Fijate que hubo un par de PR, decime si la parte que tengo que hacer yo está bloqueada por algo
   que falte." → #9 y #34 ya estaban mergeadas; quedaban cuatro huecos del esquema.
3. "Sí, pull y #35", con tres decisiones: resolver `skills-lock.json` con la versión de `main`;
   las promos sembradas llevan `fuente = 'manual'`; el corpus incluye solo CABA/AMBA.
4. Dos decisiones más en el camino: una promo que no aclara dónde rige se guarda con
   `jurisdiccion = null` (se trata como global); un tope que ni el detalle ni la letra chica
   informan queda `monto = null`.
5. "Avanzá con eso pero no hagas ningún PR todavía" y, por tandas, "Sí, Phase 4", "Sí, Phase 6" y
   "Sí, documentos".

**Resultado:**
- Spec, plan, investigación, modelo de datos, contrato, quickstart y 56 tareas. `spec-critic` encontró
  2 bloqueantes (de dónde sale la letra chica y la regla de jurisdicción) y 9 hallazgos altos; todos
  se resolvieron o quedaron como decisión escrita.
- **Hallazgo clave:** MODO sí tiene un endpoint de detalle por promo
  (`GET /promos/api/rewards/v2/benefit/<slug>`) con los legales, el tope estructurado, el monto
  mínimo, el canal y los bancos por id. Una lectura anterior («no existe») era un error de búsqueda.
- Workspace `ingesta/` con el cliente de MODO (User-Agent `VueltoBot (UADE)`, pausa de al menos 1 s,
  reintentos), el mapeo del detalle a borrador por código (sin ningún modelo de lenguaje), el validador,
  los ids UUID v5, la traducción de banco con alias, `resaltar` (marca frases de la letra chica sin
  interpretarlas), el generador de SQL y fixtures, la carga remota idempotente y el reporte de cobertura.
  El motor solo suma el export de `normalizar`.
- Relevamiento real (2026-11-02): 171 promos vigentes (117 y 54). Los datos reales corrigieron el
  diseño varias veces: `physical-card`, `all`, `reset_by: promo`, `limits: null`, la red
  `patagonia_365`, la categoría 15 y que «Exclusivo con» es exclusividad de banco y no el alcance del
  tope. 12 promos multibanco generan 258 de las 408 entradas candidatas.
- Hallazgos para el pitch (`docs/product/corpus-semilla.md`, `alcance-mvp.md`): Coto, Carrefour,
  Jumbo, Disco, Vea, Día y La Anónima tienen 0 promos vigentes; 21 promos que MODO lista como
  vigentes tienen una fecha de fin ya pasada en su letra chica; 121 de las 171 exigen pagar con MODO.
- Verificado con la imagen de Postgres de Supabase y PostgREST locales: las 7 migraciones, el seed,
  82 bancos y 408 promos reales de prueba cargan sin violar ningún `check`; la carga remota con el
  cliente real de `supabase-js` es idempotente (segunda carga sin cambios, `actualizada_en` quieto),
  da de baja y reactiva. La versión original de `rls.test.sql` falla justo las 2 aserciones que se
  ajustaron cuando hay corpus cargado.
- Lo que hizo el código y conviene revisar: un tope diario no se aproxima (se propone
  excluir como `tope_no_representable`, ver abajo); las redes que el contrato no tiene se ignoran con una nota; se partieron las
  promos multibanco en una entrada por banco; `montoMinimo` y `canal` no exigen fragmento de la letra
  chica porque salen de campos estructurados.
- **Errores propios corregidos con los tests:** el relevamiento abortaba entero ante un 500
  transitorio de MODO; el parser de argumentos tomaba el valor de una bandera suelta; el `dist/` del
  motor estaba desactualizado y Node no veía `normalizar`; dos mensajes ambiguos y una regex al revés.
- **Revisiones (`/code-review` con sus dos ejes, `test-runner` y `rules-guardian`).** No hubo violaciones
  duras de las reglas del proyecto. Encontraron defectos reales que se corrigieron con tests primero:
  `corpus:relevar` y `corpus:borrador` resolvían la carpeta de crudos contra el directorio actual y
  rompían con `npm run … -w ingesta` (el comando que documenté); las claves de `Object.prototype`
  (`constructor`, `toString`) pasaban como día o período válido; el validador lanzaba con un
  `exclusiones.json` malformado; la convivencia con la ingesta comparaba el `fuente_id` exacto y no el
  slug; `mapear.ts` leía la letra chica contra lo que decía la spec (la nota de fecha pasó a
  `corpus:borrador`); la alarma «transversal» se disparaba antes del filtro por dueño; `nivel_de_cliente`
  y el contraste del nombre de banco estaban en la spec pero no en el pipeline; y la verificación de
  desfase del generador no estaba en ningún gate (ahora es un test sobre los archivos reales). También
  se unificó la lista de columnas de `promociones` (estaba repetida en 8 lugares), se movieron los
  helpers duplicados a `crudo.ts` y `args.ts` y se quitó un ciclo de tipos.
- **Errores propios de esta etapa:** afirmé que los comandos documentados andaban cuando solo había
  probado `node ingesta/src/corpus/…` desde la raíz; y los scripts de edición que pasé por shell
  perdieron un nivel de barras invertidas (una regex quedó con caracteres de control y otra sin
  escapar), lo que se detectó con los propios tests y se corrigió con las herramientas de edición.
- **Decisión del equipo (tope diario):** `rules-guardian` señaló que cargar el tope diario (`reset_by =
  day`, 4 promos) como «por compra» puede sobrestimar el tope restante. El equipo decidió excluirlo: se
  propone como `tope_no_representable`, igual que el tope «para toda la promo». Con los crudos reales
  quedan 159 promos con 399 entradas candidatas y 12 exclusiones propuestas.
- **No verificado:** `supabase db reset` con la CLI (lo corre el job `supabase-rls` del CI; se probó el
  equivalente con la imagen de Postgres de Supabase, incluidas las cinco pruebas pgTAP), Node 22 (solo
  Node 24.14) y la revisión humana de las promos, que es lo que falta.

---

## 2026-11-03 — Review de los PR #92 y #93 y sus correcciones (issue #35)

**Herramienta:** Claude Code (Opus 5.5).

**Objetivo:** auditar los PR del corpus sembrado a mano (#92: spec 011 y workspace `ingesta`; #93:
relevamiento de MODO) y aplicar las correcciones del review.

**Prompts principales:**
1. "hace una auditoria y review de estos PR" (#92 y #93)
2. "podrias mandar directamente las correcciones y subirlas al PR?"

**Resultado:**
- Review publicado en los dos PR después de correr lint, typecheck, los tests de `ingesta`,
  `corpus:generar -- --verificar` y `corpus:cobertura`, y de cruzar las cifras de `corpus-semilla.md` con
  los 171 crudos.
- **Convivencia con MODO:** la carga remota salteaba una manual que ya existía como `modo` activa, pero
  no la daba de baja si seguía en el archivo: quedaban las dos activas. Ahora la da de baja, también si
  es una partida (`slug#b-…`), y el contrato de #51 dice que compara por slug, no por `fuente_id`.
- **Tope doble:** una promo con tope por período y además tope por transacción se cargaba solo con el
  primero (el segundo quedaba en una nota). `Tope` guarda uno solo, y quedarse con el del período
  sobrestima el reintegro de una compra grande: se propone como `tope_no_representable`, como el
  diario. Hoy ningún crudo tiene los dos.
- `CLAUDE.md` aclara que los scripts `corpus:*` piden Node ≥ 22.18.
- Quedaron sin cambiar, a propósito: el índice de bancos que se arma por llamada (barato; lo puede
  resolver #51), la detección de nivel de cliente por título (la cubre la revisión humana) y la cita
  «ADR-005 §Consecuencias», que el repo ya usa así en `requisitos.md`. La carga por lotes sin
  transacción ya estaba documentada en el contrato (M13): el review se equivocó al marcarlo.

---

## 2026-11-03 — El relevamiento leía una sola sección de MODO (issue #35)

**Herramienta:** Claude Code (Opus 5.5), con el navegador integrado para ver qué pide la web de MODO.

**Objetivo:** corregir de dónde lee las promos `corpus:relevar`, después de que el equipo marcara que no podía
ser que Coto, Jumbo, Disco, Vea y Día no tuvieran ninguna promo vigente.

**Prompts principales:**
1. "NO PUEDE SER que no haya promociones de los supermercados que marco el #93, son los principales que suelen
   aparecer casi siempre. Eso significa que el #92 esta mal hecho"
2. "Sí, arrancá por ahí" (corregir primero de dónde se leen las promos)

**Resultado:**
- La sospecha era correcta. Abriendo www.modo.com.ar/promos y mirando sus pedidos de red: la web arma la
  página con un contenedor de seis secciones (carrusel, destacadas, supermercados, exclusivas online,
  financiación y más promos), cada una pedida a `/v2/slots`. El relevamiento leía solo «más promos» con el
  endpoint anterior (`/slots`). Las promos de noviembre de Coto (25% los martes), Jumbo, Disco, Vea, Día y La
  Anónima están en carrusel, destacadas y supermercados, no en «más promos».
- `modo.ts` lee el contenedor activo, sus secciones y cada sección página por página; `relevar.ts` filtra
  vigentes, reintegros y categoría con los campos de la tarjeta nueva, y cuenta una vez la promo que aparece
  en varias secciones. `crudo.ts` lee comercio y banco de la tarjeta nueva y de la anterior.
- Al regenerar #93 apareció el caso inverso: 4 promos vigentes según su detalle (farmacias para jubilados
  del BNA, Grupo Farmacity con Hipotecario, Lácteos El Puente con Macro) que la web no muestra en ninguna
  sección pero el listado anterior sí. El relevamiento usa los dos listados y junta por slug o id.
- Las conclusiones de #93 sobre supermercados quedan inválidas: hay que volver a relevar.
- **Error de la sesión anterior:** en el review de #92/#93 verifiqué que las cifras de los documentos
  coincidieran con los crudos, pero no que los crudos estuvieran completos.

---

## 2026-11-03 — Las promos nunca se cargan a mano: ingesta automática diaria (issue #35, ADR-011)

**Herramienta:** Claude Code (Opus 5.5).

**Objetivo:** reemplazar el corpus sembrado a mano de #92 por una ingesta automática que publique las promos
de MODO todos los días, sin nadie en el medio.

**Prompts principales:**
1. "Las promos NUNCA se cargan a mano, es un error de decision y es inaceptable, las promos son cargadas
   automaticamente cada cierto tiempo, o cada vez que cambien."
2. Respuestas a las preguntas de diseño: sin revisión humana; GitHub Actions programado; una vez por día;
   rehacer #92 hacia lo automático.
3. "Sí, avanzá" (sobre el plan: qué se borra, qué se reutiliza y cómo se publica).

**Resultado:**
- `ingesta/src/corpus/ingestar.ts`: lista MODO (todas las secciones de la web más el listado anterior, las 13
  categorías), baja el detalle de cada promo vigente y el catálogo de bancos, mapea por código, valida y
  publica en Supabase: capturas crudas (solo si cambiaron), promos `modo` con su captura, y bajas.
- `.github/workflows/ingesta.yml`: todos los días a las 06:00 ART y a mano desde Actions.
- Descartes automáticos con motivo (vencida, tope diario o por toda la promo, nivel de cliente, más de tres
  categorías, formato desconocido, no publicable). Resguardos: no da de baja una promo cuyo detalle falló y no
  escribe nada si publicaría menos de la mitad de las activas.
- Decisión de la sesión: una promo de varios bancos se guarda una vez por banco, pero las partes comparten un
  solo tope (`modo:<slug>`), para no prometer un tope por banco.
- Se borró lo manual: `promociones.json`, exclusiones y grupos de tope, `corpus:borrador`, `corpus:generar`,
  `corpus:cobertura`, `corpus:relevar`, el seed de promociones y las fixtures del motor. ADR-011 reemplaza la
  consecuencia de ADR-005 sobre sembrar a mano.
- Lo que no hace todavía: leer la letra chica (#51) ni decir **cómo pagar** (QR/NFC de MODO, tarjeta física u
  online), que es el próximo paso.

---

## 2026-11-02 — Perfil: onboarding y Perfil conectados a Supabase (issue #41, fases 2b y 3)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** cerrar las fases 2b y 3 de la spec 001 ahora que la #81 (Redux) y
la #40 (sesión) están en `main`, y antes revisar que nada contradiga ADR-010.

**Prompts principales:**
1. "Analizá #80 (ADR-010) y decime si hay algún cambio; si no, comenzá con las
   fases 2b y 3."
2. Ante el hallazgo de abajo, el PO eligió la opción A: el slice guarda el medio
   completo.

**Resultado:**
- Hallazgo: el slice `perfil` guardaba solo ids del catálogo de ejemplo y el
  motor, las vistas y las compras se apoyaban en ellos. Un medio real de
  Supabase (UUID, banco de MODO) no se hubiera recomendado nunca.
- `perfil.medios` pasa a ser la lista de `medios_de_pago` tal como la devuelve
  Supabase (`id`, `bancoId`, `nombreBanco`, `tipo`, `red`). El motor la usa
  directo (`medioDelMotor`) y las pantallas arman el nombre con `medioVista`
  ("Galicia Visa crédito", "Crédito · Banco Galicia"). Sin catálogo aparte.
- Los datos de ejemplo pasan a la misma forma (`mediosGuardados`), con los
  mismos ids: las compras de ejemplo siguen coincidiendo y un test comprueba que
  los textos no cambiaron. Lo guardado con ids viejos se migra una vez.
- Thunks en `store/perfil-remoto.ts` (`leerMedios`, `confirmarMedios`,
  `agregarMedio`, `sacarMedio`, `leerBancos`) sobre `perfil/datos.ts`, inyectado
  en el store (`Extra.perfilRemoto`). Estado de la lectura (`carga`) en el
  slice, sin persistir.
- Onboarding: buscador de bancos, tipo y red; nada se guarda hasta «Confirmar»,
  que manda todo en un pedido. Pestañas: si el celular no tiene medios, esperan
  la lectura de Supabase y, si tampoco hay, mandan al onboarding.
- Perfil: lista del slice, agregar, sacar (nunca el último) y modo solo lectura
  sin conexión.
- `Red` y `TipoTarjeta` salen del motor (T012).
- Una compra con un medio que se sacó del perfil se sigue mostrando ("Medio que
  sacaste de tu perfil"); antes desaparecía de «Mis compras».
- Verificación: lint, typecheck, build y tests en verde (motor 192, app 222,
  supabase 40). No se probó en Expo Go ni en el simulador.
- Queda pendiente:
  - T013: `rules-guardian`, `/code-review` y `test-runner`, y el PR.
  - El seed de `bancos` tiene solo Galicia: los ~28 bancos los carga la ingesta
    (#35), y faltan `imagen` y `on_hub_list` (US3).
  - Un usuario que confirma sus medios y cierra la app antes de terminar el
    onboarding, al volver salta comercios y primera respuesta (sus medios ya
    están en Supabase).

---

## 2026-11-02 — Perfil: comercios habituales (issue #47)

**Herramienta:** Claude Code (Opus 5.5).

**Objetivo:** que el usuario marque los comercios donde compra seguido y los
elija con un toque en «¿Con qué pago?». Issue chica: sin spec-kit.

**Prompts principales:**
1. "Adelantá mis tickets" → se propuso #47 porque #41 la destrabó.
2. "#47, terminalo y subilo."

**Resultado:**
- `perfil.comercios` pasa de ids del catálogo de ejemplo a las filas de
  `comercios_habituales` (`{ id, nombre }`). Lo guardado con ids viejos se migra
  con el nombre del catálogo.
- `perfil/datos.ts` suma leer, confirmar (un solo insert), agregar y sacar, sin
  mandar `user_id`. Thunks en `store/perfil-remoto.ts`; se leen al entrar, junto
  con los medios. Si falla la lectura no se avisa: son opcionales (RF-02).
- Repetidos: mismo criterio que el índice único de la base (sin mayúsculas ni
  espacios de más; los acentos cuentan). Un repetido no llega a Supabase.
- Onboarding: «Continuar» guarda los elegidos en un pedido; «Saltar» no guarda
  nada; si falla, se puede saltear.
- Perfil: lista con quitar, y agregar con autocompletar del catálogo o el nombre
  escrito a mano. Uno del catálogo abre su pantalla; uno escrito a mano no
  (no tiene rubro).
- «¿Con qué pago?»: los habituales reemplazan a los frecuentes de ejemplo como
  accesos rápidos (`selectComerciosFrecuentes`), armados por nombre.
- Verificación: lint, typecheck, build y tests en verde (app 450, motor 192,
  supabase 40). No se probó en Expo Go.

**Ajustes del 2026-11-03** (después de integrar main con #41 cerrada, #92 y #93;
prompts: "Terminemos el otro que tengo asignado", "sigue los pasos para los
arreglos y haz la opción A"):
- rules-guardian sin hallazgos; `/code-review` marcó que los comercios no seguían
  los cuidados que #41 dejó para los medios. Se alinearon: las escrituras pasan
  por `escribir` (cambio de cuenta, sin conexión → solo lectura), `leerComercios`
  descarta una lectura que se cruzó con una escritura (contador propio por
  lista), `sacarComercio` verifica la fila borrada y Perfil edita solo con
  `carga === "lista"`.
- Onboarding: los repetidos se comparan con `comercioRepetido` («coto» = «Coto»)
  y un duplicado muestra el mensaje de comercios, no el de tarjetas.
- Opción A (elegida por el usuario): un habitual escrito a mano se puede tocar en
  Inicio y avisa «No conocemos promos para …» en vez de quedar en blanco.
  Asignarle categoría queda para #43.
- Limitación conocida: el autocompletar sale del catálogo de ejemplo (12
  comercios), no del corpus real de MODO; queda pendiente para #43.
- Segunda pasada de revisiones (prompt: "Arreglalo y subilo"): rules-guardian
  sin hallazgos. Se ajustó que en el onboarding un comercio ya guardado no se
  desmarque (se saca desde Perfil), que `comercioPorNombre` use el mismo criterio
  de repetidos que la base, que uno escrito a mano no sea un botón que no hace
  nada en Perfil y que el onboarding tenga su propia acción del slice
  (`comerciosConfirmados`).
- Verificación: lint, typecheck, build y tests en verde (motor 213, app 469,
  supabase 40, ingesta 274). No se probó en Expo Go.

---

## 2026-11-03 — "Queda poco" al 30% del tope, como pide el diseño

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** alinear el motor con el diseño nuevo de la app: un tope pasa
a "queda poco" con el 30% o menos, no con el 20%.

**Prompts principales:**
1. "Analizá el PR #76 y fijate si nuestro motor encaja con eso. ¿Podés
   mirar también las imágenes?" Se revisaron las capturas de la app y el
   código que traduce la respuesta del motor. Aparecieron cuatro choques;
   uno era que el diseño subió "queda poco" al 30% y el motor seguía en 20%.
2. "Traete los últimos cambios del proyecto: ya debería estar el cambio de
   que el motor corre en la app con Redux." Ya estaba (ADR-010 y los PRs
   de la app de Joaquín), y el motor seguía en 20%.
3. "Hacé el cambio al 30%."

**Resultado:**
- El motor marca "queda poco" con el 30% del tope o menos. El ejemplo de
  Santander del diseño ($2.300 de $8.000) ahora sale bien, y deja de ser el
  error que se había anotado en la issue #38.
- Se actualizaron los tests del motor, la spec 005 y un test de la app que
  esperaba el 20%. 193 tests del motor, 378 de la app y 40 de la Edge
  Function en verde.

---

## 2026-11-03 — La pantalla muestra el porqué de cada medio de pago (issue #46)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** terminar la issue #46 ahora que existe la pantalla, y hacer
los arreglos chicos que quedaron del monto opcional (PR #87, de jeqm0302).

**Prompts principales:**
1. "Revisemos el PR #87: ¿qué toca y afecta algo de lo que veníamos
   charlando?" Ya estaba mergeado. Toca los textos del motor de la issue
   #46, y el aviso nuevo de compra mínima se perdía porque la app corta el
   texto del motor en el " · ".
2. "¿Podemos hacer nosotros los arreglos chicos después de aprobarlo? ¿Bajo
   qué issue?" Bajo la issue #46, que sigue abierta.
3. "Revisá la pantalla." Mostraba el motivo y las otras tarjetas, pero no
   las tarjetas sin ninguna promo, y podía mostrar promos de bancos que el
   usuario no tiene.
4. "Avanzá así": si una tarjeta ya es una opción, no repetir sus descartes;
   si tiene dos promos descartadas, mostrar las dos.

**Resultado:**
- El motor manda, por cada promo, el texto de qué da y de qué período es su
  tope. La app deja de cortar los textos del motor, así el aviso de compra
  mínima llega al usuario y un tope semanal ya no dice "de octubre".
- La app le pasa al motor el monto vacío, no un 0: sin monto, las opciones
  se ordenan por porcentaje y las promos con compra mínima no se descartan.
- En "Otras opciones", cada tarjeta del usuario dice por qué no conviene, o
  "Sin promo para esta compra". Ya no aparecen promos de bancos que no
  tenés, ni la tarjeta recomendada repetida.
- Dentro de una opción con varias promos acumulables, van por porcentaje.
- Se actualizaron los contratos y las specs 005 y 008. Las revisiones de
  código no encontraron incumplimientos de reglas; se ajustaron nombres,
  una conversión repetida y un lugar que deducía el período leyendo un
  texto. 211 tests del motor, 385 de la app y 40 de la Edge Function en
  verde.

---

## 2026-11-03 — PR #98 al día con main (conflictos con el perfil del PR #100)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI.

**Objetivo:** que el PR #98 se pueda mergear después de que entró a `main` el
perfil con los medios guardados del usuario (PR #100).

**Prompts principales:**
1. "Traete los últimos cambios al repo."
2. "Revisás mi PR 98, que al parecer tenía conflictos con lo que está ahora en main?"

**Resultado:**
- Chocaban tres archivos. En el cálculo de la app, el PR #98 había borrado la
  lista de promociones que servía para adivinar el banco, y el PR #100 la había
  adaptado a los medios del perfil. Quedó borrada, como quería el PR #98, y la
  pantalla usa los medios que guardó el usuario, como quería el PR #100.
- Ahora "Sin promo para esta compra" aparece para los medios reales del perfil
  del usuario, no para los de ejemplo.
- En la bitácora quedaron las dos entradas, en orden de fecha.
- Tests en verde: 213 del motor, 447 de la app, 40 de la Edge Function y 274
  de la ingesta. Lint y typecheck en verde.

---

## 2026-11-03 — «¿Con qué pago?» sin monto, con el motor en la app (issue #43)

**Herramienta:** Claude Code (Opus 5.5), con `gh` CLI, el navegador integrado
(`expo start --web`) y subagentes (`/code-review`, `test-runner`,
`rules-guardian`).

**Objetivo:** cerrar lo que faltaba de la #43 una vez mergeada la #75 (PR #87,
`monto: null` en el motor). Es XS/S: va sin spec-kit.

**Prompts principales:**
1. "Leé CLAUDE.md, el ADR-010 y la issue #43. Trabajá en un branch nuevo desde
   main (con #87 ya mergeado). Falta: `recomendarSeguro` sin el parche
   `pedido.monto ?? 0`, pasando `null` al motor; el `MontoInput` de
   `comercio/[id].tsx` siempre visible; verificar a mano cada criterio de
   aceptación (dígito por dígito, inspector de red, modo avión, sin promo,
   alternativas, «Pagué con esto»); test del selector contra `recomendar()`
   directo. Después `/code-review`, `test-runner` y `rules-guardian`. PR con
   «Closes #43» y entrada en la bitácora. Decime qué criterio no pudiste
   verificar."

**Resultado:**
- La IA frenó antes de empezar: el PR #87 todavía no estaba mergeado (en
  `main`, `monto` seguía siendo `number`). Se esperó a que el PO lo mergeara.
- `recomendarSeguro` pasa el pedido tal cual: sin monto, el motor recibe
  `null`, ordena por porcentaje y tope y no descarta por compra mínima.
- `queDa` conservaba el aviso «pide una compra mínima de $X» que el motor
  agrega sin monto. Al traer `main` quedó de más: con la #46 la razón sale de
  `textoPromo` del motor (`razonDe`), que ya trae el aviso y no depende de
  cortar el texto. Se tomó la versión de `main`.
- El campo de monto se ve siempre, también sin promo; ahí no muestra el texto
  "te decimos cuánto te devuelven", porque el monto no cambia la respuesta.
- Tests nuevos: el selector con monto 10.000, 2.500 y `null` llama a
  `recomendar()` con los mismos argumentos que una llamada directa armada
  aparte y da lo mismo; compra mínima sin monto.
- Verificación a mano en la web, con un usuario de prueba en un Supabase
  local:
  - Al elegir Coto aparece la recomendación sin monto: tope ≈$6.500 según 3
    compras de octubre.
  - Tipeando 10000 dígito por dígito, el tope después de la compra pasa por
    $6.500, $6.498, $6.480 y $4.500, y queda «Te devuelven ≈$2.000».
  - Ningún request de red al tipear (inspector de red).
  - Sin red (`fetch` y XHR bloqueados y Metro apagado): YPF, Farmacity y Coto
    siguen funcionando y «Usar Galicia» lleva a «Revisá tu compra» en modo
    excepción, con cero intentos de red.
  - No se probó en el simulador ni con modo avión real: no había simulador
    booteado ni Expo Go instalado.
- `rules-guardian`: sin violaciones. `/code-review` (estándares): sin
  violaciones duras. La deuda que marcó (`queDa` dependía del texto del
  motivo) desapareció al tomar `razonDe` de `main`.
- `/code-review` (spec) marcó criterios de la #43 que el código todavía no
  cumple: elegir categoría, presencial/online, autocompletar desde el corpus,
  descartadas plegadas (DESIGN.md §6 pide lo contrario: visibles), el botón
  dice «Usar Galicia» y no «Pagué con esto» (DESIGN.md §5) y la fecha de
  sincronización no aparece en la pantalla del comercio.
- Decisión del PO: el PR #95 queda con «Refs #43» y no cierra la issue
  hasta resolver esos criterios.
- Conflictos con `main` (#46, #97, #98, #100): `calculo.ts`, `contracts.ts` y
  `vista-recomendacion.ts` quedaron como en `main`, que ya pasaba `null` al
  motor. El test del selector se adaptó al perfil con medios guardados
  (`mediosConfirmados`). En la bitácora quedaron todas las entradas, en orden.
## 2026-11-03 — Perfil: `on_hub_list` y logo en `bancos` (issue #41)

**Herramienta:** Claude Code (Sonnet 5.5), sesión lanzada desde la revisión del PR #88, con `supabase` CLI.

**Objetivo:** cerrar los pendientes que dejó el review del PR #88: que `bancos` tenga `on_hub_list` y el
logo, y que el slice `perfil` guarde lo que devuelve `perfil/datos.ts`.

**Prompts principales:**
1. "Sumá `on_hub_list` e `imagen` a `bancos` con su test pgTAP y hacé que `leerBancos` los pida."
2. "Reconciliá el slice `perfil` (hoy `medios: string[]`) con `MedioDePago`, sin conectar pantallas."
3. "Resolvé los conflictos del PR contra `main`."

**Resultado:**
- Migración `20261103000008_bancos_hub.sql`: `on_hub_list boolean` y `logo_url text`, ambos nullables
  (RLS y permisos sin cambios). El seed local los carga desde `docs/product/data/modo-bancos-raw.json`
  (32 bancos en el hub de 82). `leerBancos` pide `on_hub_list`.
- Error de la IA: la columna se llamó `imagen` y el test de estructura de RNF-06 ("ninguna columna
  guarda la imagen de un ticket") falló; se renombró `logo_url` en vez de aflojar el test.
- El slice `perfil` (`mediosGuardados`) se descartó al resolver los conflictos: mientras tanto el PR #100
  ya había dejado `medios: MedioGuardado[]` y las pantallas conectadas, con la misma idea. Se tomó la
  versión de `main` para todo `apps/mobile/src/store/`.
- Verificado: lint, typecheck y tests de los 4 workspaces; `supabase db reset` y `supabase test db`
  (165 tests) en un Supabase local con puertos propios.
- Queda pendiente: la ingesta no carga `on_hub_list` ni `logo_url` (`publicar.ts` escribe `id` y
  `nombre`); en el proyecto alojado quedan `null` hasta que se haga.

## 2026-11-10 — Revisión del flujo de gasto compartido

**Herramienta:** Claude Code (Sonnet 5.5), sesión derivada de una de planificación de pendientes (visual, grupo e
ingesta), con la app web (`mobile-web`) para recorrer las pantallas.

**Objetivo:** revisar de punta a punta el flujo de contactos y gasto en grupo (ADR-008, RF-19 a RF-22, spec 006
US5) y dejarlo escrito, sin tocar código de la app ni del backend.

**Prompts principales:**
1. "Hacé la parte B del plan: una revisión del flujo de gasto compartido, solo un documento, con el flujo esperado,
   el recorrido en la app en claro y oscuro, los bugs con archivo:línea y lo que falta del backend."

**Resultado:**
- `docs/product/revision-gasto-grupo.md` con 14 hallazgos (7 altos, 4 medios, 3 bajos), la lista de lo que falta del
  backend (#54/#56) y un orden sugerido. Capturas en `docs/design/capturas-grupo/`.
- Dos hallazgos reproducidos en la app: un comercio habitual fuera del catálogo deja el resultado cargando para
  siempre (G-04), y sin contactos el botón de armar queda deshabilitado sin salida (G-11).
- Aviso sobre el método: la app no inicia sesión sin Supabase y no había Docker ni credenciales, así que las pantallas
  se vieron con un cambio local temporal (sesión y perfil de ejemplo) que se revirtió antes de commitear. Por eso lo
  observado es el comportamiento sobre datos de ejemplo; lo demás se confirmó leyendo el código y el documento lo
  dice caso por caso.
- Error de la IA corregido al verificar: el primer borrador decía que el reparto mostraba "≈" aun sin reintegro; el
  código usa pesos exactos en ese caso (`resultado.tsx:128`) y se sacó la afirmación.
- Decisión que queda para el equipo: cómo resolver el choque entre `security definer` (ADR-008 §4) y
  `estructura.test.sql`. Se recomienda un schema propio con wrappers `security invoker` en `public`.
- No se corrió `supabase`: no hay migraciones nuevas.

---

## 2026-11-10 — Ingesta: que una promo que no se pudo leer no se dé de baja

**Herramienta:** Claude Code (Sonnet 5.5), sesión lanzada desde un plan de pendientes de varias partes
(visual, gasto compartido e ingesta); esta es la parte de ingesta.

**Objetivo:** revisar `ingesta/` y arreglar los riesgos que podían dar de baja promos vigentes por un
problema pasajero o de lectura, sin tocar el motor ni correr nada contra una base real.

**Prompts principales:**
1. "Revisá el script de consumir promociones" (exploración previa, solo lectura).
2. "Arreglá, cada uno con su test: formato desconocido y no publicable sin baja, 400 con reintento,
   429 con backoff y `Retry-After`, y timeout en cada pedido."

**Resultado:**
- `ingestar.ts`: un formato desconocido o una promo que no pasa la validación (banco fuera del
  catálogo, valor fuera de rango) agrega a `slugsSinDatos` el slug del listado y el del detalle
  (el `fuenteId` sale de `detalle.slug`), así `publicar` no la da de baja. Antes solo lo hacía un
  detalle caído y el único resguardo era el de la mitad de las promos.
- `modo.ts`: timeout de 30 s por pedido (`AbortSignal.timeout`, cuenta como corte de red); 429
  reintentado hasta 4 veces con el mayor entre `Retry-After` y un backoff exponencial (tope 60 s),
  sin gastar los reintentos de los 5xx; un 400 del detalle se reintenta una vez (los slugs de ICBC
  que siempre dan 400 cuestan un pedido más cada uno).
- ADR-011 ajustado en la línea de los resguardos. Tests nuevos en `modo.test.ts` e `ingestar.test.ts`.
- No se corrió `--aplicar` ni el workflow: todo se probó con Vitest sin red.
- Queda sin arreglar (va en la descripción del PR): escrituras no transaccionales, `max_rows` supuesto
  en 1000, sin índice en `capturas_crudas.origen`, sin resumen de GitHub, listado por categoría que
  corta con menos de 100, workflow sin tests previos y duraciones inconsistentes.

---

## YYYY-MM-DD — Título de la sesión

**Herramienta:**

**Objetivo:**

**Prompts principales:**
1.

**Resultado:**
