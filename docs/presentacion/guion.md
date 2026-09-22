# Guion de la presentación — Vuelto (~16 min)

Deck: `vuelto-avance.html` (20 slides). Abrirlo en el navegador y apretar `F`
(o el botón de la portada) para pantalla completa. `T` prende un cronómetro.
`vuelto-avance-completa.html` es un respaldo viejo — alcance, reparto y
colores desactualizados, no usarlo salvo como referencia de diseño.

## Reparto

| Persona | Slides | Cantidad |
|---|---|---|
| Joaquín | 1, 2, 3, 15, 16, 17, 18, 19, 20 | 9 (varias son livianas: portada, marca, cierre) |
| Kevin | 4 | 1 |
| Santiago | 5, 6, 7, 8 | 4 |
| Jesús | 9, 10 | 2 |
| Agustín | 11, 12, 13, 14 | 4 |

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Joaquín | 0:15 |
| 2 | Problema y propuesta | Joaquín | 1:15 |
| 3 | Alcance del MVP | Joaquín | 0:55 |
| 4 | Relevamiento de fuentes: por qué MODO | Kevin | 1:10 |
| 5 | Stakeholders y clientes objetivo | Santiago | 0:50 |
| 6 | Encuesta · hallazgo 1 | Santiago | 1:10 |
| 7 | Encuesta · hallazgo 2 | Santiago | 0:55 |
| 8 | Encuesta · hallazgo 3 | Santiago | 0:55 |
| 9 | Roles | Jesús | 0:55 |
| 10 | Tablero Kanban y Scrum | Jesús | 1:20 |
| 11 | Repo con documentación | Agustín | 0:55 |
| 12 | Decisiones técnicas (ADRs) | Agustín | 0:55 |
| 13 | Arquitectura: cómo se conectan las piezas | Agustín | 1:00 |
| 14 | IA en el producto | Agustín | 1:10 |
| 15 | IA para construir (línea de tiempo) | Joaquín | 1:00 |
| 16 | Automatización y límites | Joaquín | 0:50 |
| 17 | Modelo de negocio y crecimiento | Joaquín | 1:00 |
| 18 | Líneas futuras | Joaquín | 0:55 |
| 19 | Marca | Joaquín | 0:30 |
| 20 | Cierre | Joaquín | 0:45 |
| | **Total** | | **~16:20** |

Reglas para todos: hablar con los números de la slide, no leerla entera, y
pasar la palabra con una frase corta al final.

Si nos pasamos de tiempo, lo más fácil de acortar: slide 12 (ADRs, ya
resumida) y slide 16 (automatización, es un repaso).

---

## Joaquín — Apertura y alcance (slides 1-3, ~2 min 25 s)

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
- Vuelto **recomienda con qué pagar** en una compra concreta y **controla
  cuánto tope queda**. Siempre lo muestra como estimado, con su base.
- La regla de oro: si algo se puede describir como “mostrar promociones”, no
  es este producto.

**Slide 3 · Alcance del MVP**
- **Dentro:** CABA/AMBA para todo el producto. Una sola billetera como fuente
  de ingesta: **MODO**. El corpus cubre las **13 categorías** que publica su
  API, no solo supermercado, y el flujo de compra optimizado también.
- También entran el perfil declarado, el registro por ticket y la ingesta con
  revisión humana.
- **Fuera:** integración bancaria, lectura de resúmenes, publicar promos sin
  revisión humana, cobertura nacional y app nativa (usamos Expo).
- Honestidad: las otras 5 billeteras quedan para más adelante, y las cadenas
  de supermercado dentro de MODO todavía no están reconciliadas.
- Pase: “La decisión de acotar a MODO salió de un research bien concreto.
  Kevin cuenta cómo.”

---

## Kevin — Research y datos (slide 4, ~1 min 10 s)

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
- Anécdota corta: la primera pasada concluyó mal que gastronomía no existía,
  por confundir el slug de texto con el id numérico de categoría. Se
  corrigió y se confirmó con evidencia directa.
- Pendiente para más adelante (no ocupa slide propia, pero puede salir en
  preguntas): reconciliar las cadenas de supermercado contra las promos
  reales de MODO, probar el lector de tickets, auto-registro de una semana y
  una segunda ronda de encuesta. Está todo en `docs/product/pendientes.md`.
- Pase: “Con el alcance y la fuente definidos, Santiago cuenta a quién le
  apuntamos y cómo validamos el problema.”

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

## Jesús — Roles y Scrum (slides 9-10, ~2 min 15 s)

**Slide 9 · Roles** (con legajo de cada uno)
- **Product Owner:** Joaquín Nuñez (legajo 1224134). Custodia la regla de
  oro, prioriza el backlog y acepta o rechaza cada historia.
- Equipo de desarrollo con tres frentes:
  - **Front** (app Expo): Joaquín Nuñez y Jesús Quijada (1195298).
  - **Back** (Supabase, Edge Function, ingesta): Agustín Herrero (1174588,
    además a cargo del motor de reglas) y Santiago Pazos (1172896).
  - **Research y datos:** Kevin Calcagni (1172825).
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
  secreto en el cliente y la sesión de IA registrada en la bitácora.
- Pase: “Todo esto queda documentado en el repo; Agustín lo muestra.”

---

## Agustín — Repo, decisiones, arquitectura e IA en el producto (slides 11-14, ~4 min)

Abrir el repo en GitHub (no en el editor), con zoom del navegador al 125-150%.

**Slide 11 · Repo con documentación**
- Todo el proyecto vive en el repo: **`CLAUDE.md`** con las reglas para
  cualquier IA, y `docs/` dividido en producto, arquitectura y decisiones.
- **`docs/product/`:** problema, alcance, requisitos, roles, privacidad y los
  resultados de la encuesta.
- **`specs/`:** specs de feature con spec-kit, y **CI** en GitHub Actions.
- En números: **34 requisitos** (20 funcionales y 14 no funcionales), 7 ADRs.
- Todavía **no hay código**: es etapa de definición, a propósito.

**Slide 12 · Decisiones técnicas (ADRs)**
- Siete ADRs, cada uno con contexto, decisión, razonamiento y consecuencias.
- Los más importantes:
  - **ADR-001:** el motor de reglas es un paquete propio que corre en el
    dispositivo, sin red, y se testea solo.
  - **ADR-002 y ADR-003:** Expo sobre Flutter (Expo Go por QR, mismo
    TypeScript que el motor) y Supabase sobre Firebase (Postgres relacional,
    Auth sin pedir tarjeta).
  - **ADR-004:** el LLM vive solo en la ingesta, para que el motor sea
    determinístico.
  - **ADR-005:** ninguna promo se publica sin revisión humana.

**Slide 13 · Arquitectura: cómo se conectan las piezas**
- Diagrama de 4 piezas: **API de MODO** (la fuente), **Supabase** (Postgres +
  Auth + Edge Function del ticket, con RLS), **Gemini** (el extractor, nunca
  en el cliente) y **App Expo** (el dispositivo, con el motor de reglas
  adentro).
- El camino principal (resaltado) es MODO → Supabase → App Expo: la promo
  entra, se valida, y llega al motor. Gemini es la rama que hace la
  extracción.
- El motor de reglas es el único paso que corre en el dispositivo:
  recomendación instantánea, sin red.

**Slide 14 · IA en el producto** (la más importante del bloque)
- El LLM **extrae datos, nunca decide**.
- **Ingesta de promos:** Gemini convierte cada promo en un borrador
  estructurado (campo ausente = `null`). Una persona revisa antes de
  publicar.
- **Ticket:** Edge Function que lee el ticket. La imagen se descarta y el
  usuario confirma.
- El **motor de reglas** es TypeScript determinístico, sin LLM en el camino.
- Pase: “Y para construir todo esto usamos IA. Joaquín cuenta cómo.”

---

## Joaquín — IA, modelo de negocio, marca y cierre (slides 15-20, ~5 min 15 s)

**Slide 15 · IA para construir**
- Usamos Claude Code de punta a punta, **con una persona decidiendo**.
- Línea de tiempo: retro-documentación del repo (01/09), alcance del MVP y CI
  (19/09), requisitos y roles (19/09), privacidad y declaración de IA
  (19/09), relevamiento de fuentes y reducción del alcance a MODO (21/09).
- Al pie está el ciclo de desarrollo definido: specify, spec-critic, plan,
  tasks, implement, code-review y test-runner.

**Slide 16 · Automatización y límites**
- Automatizamos todo lo posible en cómo trabajamos: CI en cada PR, cuatro
  agentes de revisión, spec-kit para specs y tareas, y una bitácora con hook
  que avisa si falta actualizarla.
- Los límites: sin LLM en el motor de reglas, la API key de Gemini nunca va al
  celular y las imágenes de ticket no se guardan.

**Slide 17 · Modelo de negocio y crecimiento**
- **Hoy:** usuario final gratis, el costo principal es mantener el corpus
  (revisión humana), no infraestructura.
- Arrancamos por MODO porque es la única fuente sin restricción de scraping
  **ni de redistribución** de sus promos — Mercado Pago lo prohíbe explícito,
  y Galicia/BBVA restringen redistribuir o comercializar su contenido.
- **Cómo crece:** pedir **permiso explícito** a los bancos más populares de
  Argentina para consumir y mostrar sus promos. Cada banco sumado es más
  cobertura y una relación comercial formal, no una dependencia legal frágil.
- **Ingresos potenciales:** afiliación, destaque de comercios adheridos,
  reportes agregados y anonimizados.

**Slide 18 · Líneas futuras**
- **Resto del cuatrimestre:** diseño de la app en Expo, Supabase y secrets,
  reconciliar cadenas de supermercado, testear el lector de tickets,
  auto-registro de una semana y una segunda ronda de encuesta.
- **Después del MVP:** sumar bancos con permiso explícito, cobertura fuera de
  CABA/AMBA, gasto en grupo más allá del nivel 0, disparo proactivo por
  notificación o geolocalización.

**Slide 19 · Marca**
- Nombre y logo **tentativos** — todavía falta verificar dominio y marca en
  el INPI.
- La paleta oficial: Verde Bosque, Verde Salvia, Blanco Hueso, Dorado
  Champán y Gris Neutro — la misma que usamos en toda esta presentación.
- No hace falta detenerse mucho: mostrar y seguir.

**Slide 20 · Cierre**
- **Hecho:** alcance acotado a MODO con research real, stakeholders
  definidos, encuesta con análisis, requisitos, roles y tablero, repo
  documentado, modelo de negocio, y bitácora y declaración de IA.
- **Sigue:** lo mismo de la slide de líneas futuras, resumido en una línea.
- A resolver con la cátedra: el cronograma real de sprints y el tamaño del
  equipo (somos 5 y la materia pide de 6 a 8).
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
- **¿Por qué no publican las promos automáticamente?** Un error de
  jurisdicción o de tope le arruina la compra al usuario, y el modelo falla en
  silencio, con confianza. Por eso la extracción es automática pero una
  persona aprueba en una bandeja: cada campo viene con su cita de la fuente,
  así que revisar es rápido (ADR-005).
- **¿Qué pasa con las fotos de tickets?** No se guardan: se mandan a Gemini y
  se descartan. Solo se persiste el texto extraído, y el usuario confirma.
- **¿Por qué Expo y no Flutter?** Expo Go permite probar en el celular con un
  QR, y usa el mismo TypeScript que el motor de reglas.
- **¿Son 5 y la materia pide 6 a 8?** Está pendiente con la cátedra. El
  alcance del MVP está pensado para ser defendible con 5.
