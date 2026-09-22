# Guion de la presentación — Vuelto (~19 min)

Deck: `vuelto-avance.html` (21 slides). Abrirlo en el navegador y apretar `F`
(o el botón de la portada) para pantalla completa. `T` prende un cronómetro.
`vuelto-avance-completa.html` es un respaldo viejo — alcance, reparto y
colores desactualizados, no usarlo salvo como referencia de diseño.

## Reparto

| Persona | Slides | Cantidad |
|---|---|---|
| Joaquín | 1, 2, 3, 4, 16, 17, 18, 19, 20, 21 | 10 (varias son livianas: portada, marca, cierre) |
| Santiago | 5, 6, 7, 8 | 4 |
| Jesús | 9, 10, 11 | 3 |
| Agustín | 12, 13, 14, 15 | 4 |

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Joaquín | 0:15 |
| 2 | Problema y propuesta | Joaquín | 1:10 |
| 3 | Alcance del MVP | Joaquín | 0:55 |
| 4 | Relevamiento de fuentes: por qué MODO | Joaquín | 1:05 |
| 5 | Stakeholders y clientes objetivo | Santiago | 0:50 |
| 6 | Encuesta · hallazgo 1 | Santiago | 1:10 |
| 7 | Encuesta · hallazgo 2 | Santiago | 0:55 |
| 8 | Encuesta · hallazgo 3 | Santiago | 0:55 |
| 9 | Roles | Jesús | 0:55 |
| 10 | Tablero Kanban y Scrum | Jesús | 1:15 |
| 11 | Roadmap: cómo caen las épicas | Jesús | 0:50 |
| 12 | Repo con documentación | Agustín | 0:55 |
| 13 | Decisiones técnicas (ADRs) | Agustín | 0:55 |
| 14 | Arquitectura: cómo se conectan las piezas | Agustín | 1:00 |
| 15 | IA en el producto | Agustín | 1:10 |
| 16 | IA para construir (línea de tiempo) | Joaquín | 1:15 |
| 17 | Automatización de nuestro propio trabajo | Joaquín | 0:40 |
| 18 | Modelo de negocio y crecimiento | Joaquín | 1:05 |
| 19 | Líneas futuras | Joaquín | 0:55 |
| 20 | Marca | Joaquín | 0:30 |
| 21 | Cierre | Joaquín | 0:40 |
| | **Total** | | **~19:20** |

Reglas para todos: hablar con los números de la slide, no leerla entera, y
pasar la palabra con una frase corta al final.

Si nos pasamos de tiempo, lo más fácil de acortar: slide 13 (ADRs, ya
resumida), slide 11 (roadmap, es un repaso del tablero) y slide 17
(automatización, ya trimeada).

---

## Joaquín — Apertura, alcance y research de fuentes (slides 1-4, ~3 min 25 s)

**Slide 1 · Portada**
- Somos el equipo de Vuelto, del Seminario de Integración Profesional de UADE.
- Vamos a mostrar qué hicimos hasta ahora: problema, research, organización y
  cómo usamos IA.

**Slide 2 · Problema y propuesta**
- El problema: las promos bancarias cambian por día, billetera, banco y
  tarjeta, y el tope de reintegro es mensual, compartido entre promos e
  invisible para el usuario.
- Resultado: paga con el primer medio disponible y pierde plata sin darse
  cuenta. **No es falta de información, es la decisión.**
- Vuelto es un asistente de decisión: en el momento de pagar, **recomienda
  con qué medio pagar** una compra concreta, con el porqué, y en todo
  momento **controla cuánto tope de reintegro le queda**, siempre como
  estimado, con su base.
- No es un buscador de promociones — es una decisión tomada por código
  determinístico, específica para los medios de pago que el usuario declaró.

**Slide 3 · Alcance del MVP**
- **Dentro:** CABA/AMBA para todo el producto. Una sola billetera como fuente
  de ingesta: **MODO**. El corpus cubre las **13 categorías** que publica su
  API, no solo supermercado, y el flujo de compra optimizado también.
- También entran el perfil declarado, el registro por ticket y la ingesta
  **100% automática** (sin revisión humana, validada contra un esquema).
- **Fuera:** integración bancaria, lectura de resúmenes, cobertura nacional y
  app nativa (usamos Expo).
- Honestidad: las otras 5 billeteras quedan para más adelante, y las cadenas
  de supermercado dentro de MODO todavía no están reconciliadas.
- Pase: “La decisión de acotar a MODO salió de un research bien concreto.
  Cuento cómo.”

**Slide 4 · Relevamiento de fuentes: por qué MODO**
- Evaluamos las 6 billeteras/bancos originales. Tres quedaron **bloqueadas**:
  Mercado Pago prohíbe el scraping en sus términos, y Santander y BBVA
  bloquean el acceso automatizado con un firewall, incluso con navegador
  real.
- De las 3 automatizables (MODO, Cuenta DNI, Galicia), elegimos **una sola:
  MODO**, para no mezclar automatización parcial con captura manual.
- Descubrimos que MODO tiene una **API REST pública, sin autenticación**: no
  hace falta Playwright para esta fuente.
- La API expone **13 categorías fijas**, con **~1864 promos activas** hoy:
  Gastronomía (646), Supermercados (226), Farmacias (170), Combustibles (22),
  entre otras.
- Con la fuente y el corpus definidos, falta confirmar algo más básico: que
  el problema **es real y no supuesto**. Eso lo corroboramos con una
  encuesta propia, no con intuición.
- Pendiente para más adelante (no ocupa slide propia, pero puede salir en
  preguntas): reconciliar las cadenas de supermercado contra las promos
  reales de MODO, probar el lector de tickets, auto-registro de una semana y
  una segunda ronda de encuesta. Está todo en `docs/product/pendientes.md`.
- Pase: “Con el alcance y la fuente definidos, Santiago cuenta cómo
  validamos con datos que el problema existe, empezando por a quién le
  apuntamos.”

---

## Santiago — Stakeholders y encuesta (slides 5-8, ~3 min 50 s)

**Slide 5 · Stakeholders y clientes objetivo**
- No apuntamos a todo el mercado: son **grupos reducidos**, tres perfiles.
  - El perfil de la propia encuesta: 18 a 25 años, CABA/AMBA.
  - Gente con **3 o más medios de pago** por mes (43,1% de la muestra) — el
    caso que el motor de reglas resuelve.
  - **Usuarios de MODO**, porque es la única fuente de ingesta del MVP.
- Decisión explícita: **encuesta en vez de entrevistas 1:1**. Con 51
  respuestas priorizamos volumen, dado lo transversal del problema.

**Slide 6 · Hallazgo 1: el problema es real**
- Encuesta en Google Forms: **51 respuestas** entre el 8 y el 20 de
  septiembre.
- Aclarar el sesgo: **62,7% tiene entre 18 y 25 años**. Sirve para validar que
  el problema existe, no para dimensionar el mercado.
- **98%** pagó y se enteró después de una promo mejor: 68,6% alguna vez y
  29,4% seguido.
- Sobre el control del tope: **47,1% no lleva ningún control** y solo **7,8%**
  lleva un registro exacto.
- Lo más citado como frustración (54,9%): llegar a la caja y descubrir que la
  promo era con otra app o no aplicaba hoy.

**Slide 7 · Hallazgo 2: se sienten seguros, pero deciden a ciegas**
- **51%** dice estar seguro de qué tarjeta conviene usar. Pero solo **7,8%**
  lleva un registro exacto del tope.
- Al elegir entre dos tarjetas, **68,6%** mira solo el mayor % de descuento.
  Solo 13,7% mira si le queda tope disponible.
- Ese es exactamente el error que corrige el motor de reglas.

**Slide 8 · Hallazgo 3: piden una decisión, no un buscador**
- A la pregunta “¿qué te daría tranquilidad?”: **41,2%** pide que la app diga
  “pagá con la billetera X” en el momento, y **39,2%** que avise qué días
  comprar.
- El buscador unificado de promos, que es “mostrar promociones”, quedó
  último: **15,7%**. Es evidencia a favor de la regla de oro.
- **96,1%** dice que usaría una app así. Es intención declarada, pesa menos
  que los datos de comportamiento.
- Riesgo: piden avisos proactivos, pero solo ~16% acepta permisos de
  notificaciones push. Está pendiente de definir.
- Pase: “Con el problema validado, Jesús cuenta cómo nos organizamos.”

> Antes de la exposición: verificar en el Google Form los números de
> “mayor frustración” (en el análisis suman más de 100%). Por eso se cita solo
> el 54,9% como “la más citada”.

---

## Jesús — Roles, Scrum y roadmap (slides 9-11, ~3 min 5 s)

**Slide 9 · Roles** (con legajo de cada uno)
- **Product Owner:** Joaquín Nuñez (legajo 1224134). Custodia la regla de
  oro, prioriza el backlog y acepta o rechaza cada historia.
- Equipo de desarrollo con tres frentes:
  - **Front** (app Expo): Joaquín Nuñez y Jesús Quijada (1195298).
  - **Back** (Supabase, Edge Function, ingesta): Agustín Herrero (1174588,
    además a cargo del motor de reglas) y Santiago Pazos (1172896, además a
    cargo de Research y datos).
- Equipo autoorganizado. Las revisiones de código las hacemos todos.

**Slide 10 · Tablero Kanban y Scrum** (mostrar el tablero en vivo si hay
conexión, con la pestaña abierta de antemano)
- Tablero en **GitHub Projects**: Backlog, Ready, In progress, In review y
  Done.
- Hoy hay **25 ítems: 14 terminados**, 1 en curso, 1 en revisión y 9 en
  backlog. Las 8 épicas ordenan el roadmap.
- Trabajamos en **sprints de 2 semanas** con demo en Expo Go al final. Las
  fechas están **a confirmar** con el cronograma real de la cátedra.
- **Definition of Done:** tests Vitest del motor, RLS en cada tabla, ningún
  secreto en el cliente, ninguna promoción publicada sin pasar la validación
  automática de esquema, y la sesión de IA registrada en la bitácora.
- Pase: “Y así van cayendo las 8 épicas en el tiempo — el roadmap completo,
  a continuación.”

**Slide 11 · Roadmap: cómo caen las épicas**
- Las 8 épicas se agrupan en las **3 entregas de la cátedra**: Entrega
  parcial 1, Entrega parcial 2 y Pitch y documentación final — mismos hitos
  que ya usa GitHub Projects como milestones.
- **Entrega parcial 1:** Research y validación del problema, Alcance y
  corpus de promociones, Gestión ágil y documentación (ya cerrada), y
  Plataforma/secretos/CI-CD.
- **Entrega parcial 2:** Motor de reglas determinístico y App Expo — todavía
  en backlog, sin issues abiertos, se planifican después.
- **Pitch y documentación final:** Registro por ticket y control de topes
  (backlog) y Privacidad y cumplimiento — esta ya está resuelta, adelantada
  desde la primera entrega.
- Las fechas de cada entrega siguen **a confirmar** con la cátedra; el orden
  de las épicas sí está fijado.
- Pase: “Con roles, tablero y roadmap documentados, Agustín muestra cómo
  está organizado el repo.”

---

## Agustín — Repo, decisiones, arquitectura e IA en el producto (slides 12-15, ~4 min)

Abrir el repo en GitHub (no en el editor), con zoom del navegador al 125-150%.

**Slide 12 · Repo con documentación**
- Todo el proyecto vive en el repo: **`CLAUDE.md`** con las reglas para
  cualquier IA, y `docs/` dividido en producto, arquitectura y decisiones.
- **`docs/product/`:** problema, alcance, requisitos, roles, privacidad y los
  resultados de la encuesta.
- **`specs/`:** specs de feature con spec-kit, y **CI** en GitHub Actions.
- En números: **34 requisitos** (20 funcionales y 14 no funcionales), 7 ADRs.
- Todavía **no hay código**: es etapa de definición, a propósito.

**Slide 13 · Decisiones técnicas (ADRs)**
- Siete ADRs, cada uno con contexto, decisión, razonamiento y consecuencias.
- Los más importantes:
  - **ADR-001:** el motor de reglas es un paquete propio que corre en el
    dispositivo, sin red, y se testea solo.
  - **ADR-002 y ADR-003:** Expo sobre Flutter (Expo Go por QR, mismo
    TypeScript que el motor) y Supabase sobre Firebase (Postgres relacional,
    Auth sin pedir tarjeta).
  - **ADR-004:** el LLM vive solo en la ingesta, para que el motor sea
    determinístico.
  - **ADR-005:** la ingesta de promos es **100% automática, sin revisión
    humana** — se publica sola si completa el esquema; si no, se descarta
    sola.

**Slide 14 · Arquitectura: cómo se conectan las piezas**
- Diagrama de 4 piezas: **API de MODO** (la fuente), **Supabase** (Postgres +
  Auth + Edge Function del ticket, con RLS), **Gemini** (el extractor, nunca
  en el cliente) y **App Expo** (el dispositivo, con el motor de reglas
  adentro).
- El camino principal (resaltado) es MODO → Supabase → App Expo: la promo
  entra, se valida contra el esquema, y llega al motor. Gemini es la rama
  que hace la extracción.
- El motor de reglas es el único paso que corre en el dispositivo:
  recomendación instantánea, sin red.

**Slide 15 · IA en el producto** (la más importante del bloque)
- El LLM **extrae datos, nunca decide**.
- **Ingesta de promos:** Gemini convierte cada promo en un borrador
  estructurado (campo ausente = `null`). Se publica sola si completa el
  esquema; si falta un campo obligatorio, se descarta sola — sin revisión
  humana (ADR-005).
- **Ticket:** Edge Function que lee el ticket. La imagen se descarta y el
  usuario confirma — ese sí es un paso con una persona, pero es el propio
  usuario revisando su propia compra, no una cola interna.
- El **motor de reglas** es TypeScript determinístico, sin LLM en el camino.
- Pase: “Y para construir todo esto usamos IA. Joaquín cuenta cómo.”

---

## Joaquín — IA, modelo de negocio, marca y cierre (slides 16-21, ~5 min 20 s)

**Slide 16 · IA para construir**
- Usamos Claude Code de punta a punta, **con una persona decidiendo**.
- Línea de tiempo: retro-documentación del repo (01/09), alcance del MVP y CI
  (19/09), requisitos y roles (19/09), privacidad y declaración de IA
  (19/09), relevamiento de fuentes y reducción del alcance a MODO (21/09).
- Al pie está el ciclo de desarrollo definido, en 7 pasos — vale explicar qué
  hace cada uno:
  - **specify:** convierte una feature en una spec formal, con criterios de
    aceptación verificables.
  - **spec-critic:** agente que ataca esa spec buscando ambigüedad y casos
    borde antes de escribir una línea de código.
  - **plan:** decide el diseño técnico y qué archivos toca.
  - **tasks:** baja el plan a tareas concretas, ordenadas por dependencia.
  - **implement:** ejecuta esas tareas y escribe el código.
  - **code-review:** agente que revisa el diff contra los estándares del
    repo y contra la spec original.
  - **test-runner:** corre tests, typecheck y lint, y reporta solo lo que
    falló.

**Slide 17 · Automatización de nuestro propio trabajo**
- Automatizamos todo lo posible en cómo trabajamos: CI en cada PR, cuatro
  agentes de revisión (test-runner, spec-critic, rules-guardian, debugger),
  spec-kit para specs y tareas, y una bitácora con hook que avisa si falta
  actualizarla.
- Los límites técnicos del producto en sí ya los contó Agustín (ADR-004,
  ADR-005): sin LLM en el motor, ingesta automática sin revisión humana. Acá
  el foco es el proceso propio del equipo, no repetir eso.

**Slide 18 · Modelo de negocio y crecimiento**
- **Hoy:** usuario final gratis. Como la ingesta es 100% automática (sin
  cola de revisión humana), el costo principal no es mantenimiento de esa
  cola — es infraestructura y, a medida que crece, negociar acuerdos.
- Arrancamos por MODO porque es la única fuente sin restricción de scraping
  **ni de redistribución** de sus promos — Mercado Pago lo prohíbe explícito,
  y Galicia/BBVA restringen redistribuir o comercializar su contenido.
- **Cómo crece:** pedir **permiso explícito** a los bancos más populares de
  Argentina para consumir y mostrar sus promos. Cada banco sumado es más
  cobertura y una relación comercial formal, no una dependencia legal frágil.
- **Ingresos potenciales:** afiliación con billeteras/comercios; **destaque
  de comercios adheridos** — un comercio que ya es una opción válida para el
  usuario puede pagar por aparecer resaltado, nunca se recomienda un medio
  peor para forzarlo; y reportes agregados y anonimizados de consumo.

**Slide 19 · Líneas futuras**
- **Resto del cuatrimestre:** diseño de la app en Expo, Supabase y secrets,
  **implementar el gasto en grupo nivel 0** (ya es parte del MVP, no de más
  adelante), reconciliar cadenas de supermercado, testear el lector de
  tickets, auto-registro de una semana y una segunda ronda de encuesta.
- **Después del MVP:** sumar bancos con permiso explícito, cobertura fuera de
  CABA/AMBA, gasto en grupo más allá del nivel 0 (cuentas y topes reales del
  grupo), disparo proactivo por notificación o geolocalización.

**Slide 20 · Marca**
- Nombre y logo **tentativos** — todavía falta verificar dominio y marca en
  el INPI.
- La paleta oficial: Verde Bosque, Verde Salvia, Blanco Hueso, Dorado
  Champán y Gris Neutro — la misma que usamos en toda esta presentación.
- No hace falta detenerse mucho: mostrar y seguir.

**Slide 21 · Cierre**
- **Hecho:** alcance acotado a MODO con research real, stakeholders
  definidos, encuesta con análisis, requisitos, roles, tablero y roadmap,
  repo documentado, modelo de negocio, y bitácora y declaración de IA.
- **Sigue:** lo mismo de la slide de líneas futuras, resumido en una línea.
- Frase final: “Problema validado, alcance concreto, equipo organizado e IA
  con límites claros. Gracias, ¿preguntas?”

---

## Posibles preguntas y respuestas cortas

- **¿Por qué no hay código todavía?** Estamos en definición del problema y del
  alcance. Primero validamos el problema (encuesta) y fijamos las reglas.
- **¿Por qué solo MODO y no las otras billeteras?** Las evaluamos: Mercado
  Pago prohíbe el scraping en sus términos, y Santander/BBVA lo bloquean
  técnicamente. De las que sí se pueden, elegimos una sola para no mezclar
  automatización con carga manual. Las demás quedan para más adelante, con
  permiso explícito.
- **¿Por qué 13 categorías y no solo supermercado?** Es la misma API y el
  mismo mecanismo de paginación para las 13; filtrar rubros no ahorraba
  complejidad de ingesta, solo reducía cobertura sin un motivo técnico.
- **¿Por qué no hicieron entrevistas?** Se evaluó y se priorizó una encuesta
  de mayor volumen (51 respuestas) porque el problema es transversal — no
  necesita profundidad cualitativa por segmento, necesita confirmar que le
  pasa a mucha gente.
- **¿La encuesta representa a todos los usuarios?** No: 62,7% tiene entre 18 y
  25 años y llegó por nuestros contactos. Valida que el problema existe, no el
  tamaño del mercado — coincide con el stakeholder primario que definimos.
- **¿Cómo se sostiene el proyecto si crece?** Ver el modelo de negocio: se
  arranca gratis con una sola fuente sin fricción legal, y se crece pidiendo
  permiso formal a más bancos, lo que abre además relaciones comerciales.
- **¿Por qué el LLM no recomienda el medio de pago?** Rompería el
  determinismo y los tests. El LLM solo extrae datos, y la recomendación sale
  de código verificable.
- **¿No es arriesgado publicar promos sin que nadie las revise?** El riesgo
  se acepta y se mitiga distinto: con el esquema forzado (un campo
  obligatorio ausente bloquea la publicación de esa promo) y midiendo la
  precisión del extractor por campo. Una cola de revisión humana permanente
  no escala con 4 personas ni con el volumen del corpus (ADR-005).
- **¿Qué pasa con las fotos de tickets?** No se guardan: se mandan a Gemini y
  se descartan. Solo se persiste el texto extraído, y el usuario confirma.
- **¿Por qué Expo y no Flutter?** Expo Go permite probar en el celular con un
  QR, y usa el mismo TypeScript que el motor de reglas.
- **¿Son 4 y la materia pide 6 a 8?** Está pendiente con la cátedra. El
  alcance del MVP está pensado para ser defendible con 4.
