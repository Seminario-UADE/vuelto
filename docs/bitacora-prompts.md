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

## 2026-10-26 — Integrar la Edge Function de recomendación con los topes nuevos del motor (PR #71, issues #43 y #37)

**Herramienta:** Claude Code (Opus 5.5), con `git`, `gh` CLI y el
subagente `rules-guardian`.

**Objetivo:** cuando entró a `main` el PR #73 (issue #37, topes del motor),
el PR #71 (Edge Function de la issue #43) quedó en conflicto. Había que
resolverlo sin romper nada, quedándose con lo mejor de los dos trabajos, y
revisar si alguna issue asignada quedaba desbloqueada.

**Prompts principales:**
1. "Mirá el repo: aprobé un issue de un compañero y mi rama en espera de
   aprobación quedó con conflictos en `.claude/agent-memory/spec-critic/MEMORY.md`,
   `.gitignore` y `docs/bitacora-prompts.md`. Resolvelo y fijate si puedo
   avanzar alguna de mis issues. No subas nada sin mi aprobación."
2. "Hacé todo lo que haya que resolver, lo más simple posible. Analizá lo
   que hizo mi compañero y lo que hice yo y quedate con lo mejor de los
   dos, sin que se rompa nada."

**Resultado:**
- Los tres conflictos que marcaba GitHub eran de texto y se resolvieron
  conservando los dos lados (las líneas de `.env` y la de `coverage/` en
  `.gitignore`, las dos notas del revisor de specs y las tres entradas de
  la bitácora en orden de fecha).
- La IA encontró además un conflicto que git no marca: la #37 cambió la
  respuesta del motor (cada opción de pago trae ahora una lista de promos)
  y le pide dos cosas nuevas a quien lo llama. Con eso fallaban 4 tests y
  el typecheck de la Edge Function. Se adaptó así:
  - las compras se piden desde el lunes de la semana cuando la semana
    empezó el mes anterior, usando la función de fechas del motor (no se
    duplica el cálculo en el servidor);
  - se le pasan al motor también las promos de las compras registradas
    aunque hayan vencido, para que descuente bien los topes compartidos;
  - se corrigieron los 4 tests y se sumaron 3 (semana que cruza de mes,
    tope compartido con una promo vencida, y no pedir dos veces la misma
    promo).
- De lo de cada uno:
  - Del compañero se adoptó la medición de cobertura con mínimo de 90%,
    también para la Edge Function: da 100% de las líneas.
  - De lo propio se mantuvo la Edge Function, sus piezas comunes y las specs.
- Se actualizaron la spec, el contrato del endpoint y
  `docs/architecture/02-api-routes.md` con la respuesta nueva. Se dio por
  resuelto el requisito que impedía publicar la pantalla hasta que cerrara
  la #37.
- Había dos specs con el número `003`. La de la issue #43 pasó a
  `specs/004-recomendar-pantalla/` y se actualizaron todas sus referencias.
- Resultado: lint, typecheck y build limpios, con 131 tests del motor y 37
  de la Edge Function en verde. `rules-guardian` no encontró
  incumplimientos.
- Ninguna issue asignada (#41, #43, #45, #47, #56) quedó desbloqueada del
  todo: siguen esperando #34, #38, #39, #40 y #44. La #43 ya no depende de
  la #37.
- Errores de la IA en el proceso: dos scripts de edición fallaron, uno por
  los finales de línea de Windows (CRLF) y otro por las comillas de la
  consola. Se corrigieron con un script en archivo aparte.

---

## YYYY-MM-DD — Título de la sesión

**Herramienta:**

**Objetivo:**

**Prompts principales:**
1.

**Resultado:**
