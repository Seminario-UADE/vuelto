# Guion de la presentación — Vuelto (~17 min)

Deck: `vuelto-avance.html` (18 slides). Abrirlo en el navegador y apretar `F`
(o el botón de la portada) para pantalla completa. `T` prende un cronómetro.
La versión larga de respaldo es `vuelto-avance-completa.html`.

## Reparto

| Persona | Slides | Cantidad |
|---|---|---|
| Joaquín | 1, 2, 15, 16, 17, 18 | 6 (portada y cierre son livianos) |
| Kevin | 3, 4, 5 | 3 |
| Santiago | 6, 7, 8 | 3 |
| Jesús | 9, 10 | 2 |
| Agustín | 11, 12, 13, 14 | 4 |

## Orden y tiempos

| # | Slide | Quién | Tiempo |
|---|---|---|---|
| 1 | Portada | Joaquín | 0:15 |
| 2 | Problema y propuesta | Joaquín | 1:15 |
| 3 | Alcance del MVP | Kevin | 0:50 |
| 4 | Corpus de promociones | Kevin | 0:50 |
| 5 | Research y datos: lo que sigue | Kevin | 0:50 |
| 6 | Encuesta · hallazgo 1 | Santiago | 1:10 |
| 7 | Encuesta · hallazgo 2 | Santiago | 0:55 |
| 8 | Encuesta · hallazgo 3 | Santiago | 0:55 |
| 9 | Roles | Jesús | 0:50 |
| 10 | Tablero Kanban y Scrum | Jesús | 1:20 |
| 11 | Repo con documentación | Agustín | 0:55 |
| 12 | Decisiones técnicas (ADRs) | Agustín | 0:55 |
| 13 | Stack | Agustín | 0:50 |
| 14 | Arquitectura: cómo se conectan las piezas | Agustín | 1:10 |
| 15 | IA para construir (línea de tiempo) | Joaquín | 1:00 |
| 16 | IA en el producto | Joaquín | 1:10 |
| 17 | Automatización y límites | Joaquín | 1:00 |
| 18 | Cierre | Joaquín | 0:45 |
| | **Total** | | **~16:55** |

Reglas para todos: hablar con los números de la slide, no leerla entera, y
pasar la palabra con una frase corta al final.

Si nos pasamos de tiempo, lo más fácil de acortar: slide 12 (ADRs) y slide 15
(línea de tiempo de IA).

---

## Joaquín — Apertura (slides 1-2, ~1 min 30 s)

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
- Pase: “Para no prometer todo, Kevin cuenta hasta dónde llega el MVP.”

---

## Kevin — Alcance, corpus y research (slides 3-5, ~2 min 30 s)

**Slide 3 · Alcance del MVP** (casi se puede leer de la slide)
- **Dentro:** CABA/AMBA, con supermercado como único flujo optimizado. El
  perfil declarado, el registro por ticket y la ingesta con revisión humana.
- **Fuera:** integración bancaria, lectura de resúmenes, publicar promos sin
  revisión humana, cobertura nacional y app nativa (usamos Expo).

**Slide 4 · Corpus de promociones**
- Entran **tres rubros** al corpus: supermercado, combustible y restaurantes.
  Solo supermercado tiene un flujo de compra propio; los otros dos alimentan
  el control de tope.
- **Seis proveedores:** Mercado Pago, MODO, Cuenta DNI, Santander, Galicia y
  BBVA.
- **Cadenas** con sucursales en CABA/AMBA: Coto, Carrefour, Jumbo, Disco, Vea,
  Día y Changomas.
- Sumar rubros cuesta poco: los 6 proveedores los publican en la misma página
  o portal (lo verificamos con research web).
- Riesgo: Día y Changomas tienen sucursales chicas y dispersas, y “no todas
  participan”.

**Slide 5 · Research y datos: lo que sigue**
- Me encargo de la parte de research y datos. Son cuatro frentes:
  - **En curso (#12):** relevar las fuentes reales de los 6 proveedores (HTML
    vs SPA/JSON, términos de uso y robots.txt).
  - **Pendiente (#10):** probar el lector de tickets con 15-20 tickets reales,
    para medir la precisión por campo.
  - **Auto-registro** de una semana de compras propias, con la cifra en pesos
    ahorrable.
  - **Segunda ronda de encuesta:** la primera no preguntó qué billeteras usa
    cada persona.
- Pase: “Con el alcance claro, Santiago cuenta cómo validamos el problema.”

---

## Santiago — Encuesta (slides 6-8, ~3 min)

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

## Jesús — Roles y Scrum (slides 9-10, ~2 min 10 s)

**Slide 9 · Roles**
- **Product Owner:** Joaquín. Custodia la regla de oro, prioriza el backlog y
  acepta o rechaza cada historia.
- Equipo de desarrollo con tres frentes:
  - **Front** (app Expo): Joaquín y Jesús.
  - **Back** (Supabase, Edge Function, ingesta): Agustín y Santiago. Agustín
    además está a cargo del motor de reglas.
  - **Research y datos:** Kevin.
- Equipo autoorganizado. Las revisiones de código las hacemos todos.

**Slide 10 · Tablero Kanban y Scrum** (mostrar el tablero en vivo si hay
conexión, con la pestaña abierta de antemano)
- Tablero en **GitHub Projects**: Backlog, Ready, In progress, In review y
  Done.
- Hoy hay **24 ítems: 12 terminados**, 3 en curso y 9 en backlog. Las 8
  épicas ordenan el roadmap.
- Trabajamos en **sprints de 2 semanas** con demo en Expo Go al final. Las
  fechas están **a confirmar** con el cronograma real de la cátedra.
- **Definition of Done:** tests Vitest del motor, RLS en cada tabla, ningún
  secreto en el cliente y la sesión de IA registrada en la bitácora.
- Pase: “Todo esto queda documentado en el repo; Agustín lo muestra.”

---

## Agustín — Repo con documentación (slides 11-14, ~3 min 50 s)

Abrir el repo en GitHub (no en el editor), con zoom del navegador al 125-150%.

**Slide 11 · Repo con documentación**
- Todo el proyecto vive en el repo: **`CLAUDE.md`** con las reglas para
  cualquier IA, y `docs/` dividido en producto, arquitectura y decisiones.
- **`docs/product/`:** problema, alcance, requisitos, roles, privacidad y los
  resultados de la encuesta.
- **`specs/`:** specs de feature con spec-kit, y **CI** en GitHub Actions.
- En números: **34 requisitos** (20 funcionales y 14 no funcionales), 7 ADRs,
  20 issues y 6 PRs mergeados.
- Todavía **no hay código**: es etapa de definición, a propósito.

**Slide 12 · Decisiones técnicas (ADRs)**
- Siete ADRs, cada uno con contexto, decisión, razonamiento y consecuencias.
- Los más importantes:
  - **ADR-001:** el motor de reglas es un paquete propio que corre en el
    dispositivo, sin red, y se testea solo.
  - **ADR-002:** Expo sobre Flutter, por Expo Go y por usar el mismo
    TypeScript que el motor.
  - **ADR-004:** el LLM vive solo en la ingesta, para que el motor sea
    determinístico.
  - **ADR-005:** ninguna promo se publica sin revisión humana.

**Slide 13 · Stack**
- **TypeScript de punta a punta** y costo $0 durante el cuatrimestre.
- Motor de reglas: paquete propio que corre en el dispositivo y en el backend.
- Cliente: Expo. Backend y base: Supabase con Postgres y Auth.
- Extractor: Gemini, **solo en servidor**. Ingesta: Playwright. Tests: Vitest
  y Expo Go.
**Slide 14 · Arquitectura: cómo se conectan las piezas**
- Cuatro piezas: **App Expo** en el dispositivo (con el motor de reglas
  adentro), y tres en el servidor: **Supabase** (Postgres, Auth y la Edge
  Function del ticket, con RLS), **Gemini** (el extractor, nunca en el
  cliente) y **Playwright** (captura las fuentes de promos).
- **Flujo de ingesta:** fuentes web → Playwright → Supabase (crudo) → Gemini
  extrae → revisión humana → motor de reglas.
- **Flujo de ticket:** foto → Edge Function → Gemini extrae → el usuario
  confirma → Postgres → actualiza el tope.
- El motor de reglas es el único paso que corre en el dispositivo: recomendación
  instantánea, sin red. Todo lo demás vive en el servidor.
- Pase: “Y para construir todo esto usamos IA. Joaquín cuenta cómo.”

---

## Joaquín — Uso de IA y cierre (slides 15-18, ~4 min)

**Slide 15 · IA para construir**
- Usamos Claude Code de punta a punta, **con una persona decidiendo**.
- Línea de tiempo:
  - 01/09: retro-documentación completa del repo.
  - 19/09: alcance del MVP, CI y spec-kit. La IA propone y el equipo confirma
    cada decisión de alcance.
  - 19/09: requisitos, roles y 8 épicas cargadas con la CLI de GitHub.
  - 19/09: política de privacidad y declaración de uso de IA.
  - 21/09: agentes, skills y un hook que exige actualizar la bitácora.
- Al pie está el ciclo de desarrollo definido: specify, spec-critic, plan,
  tasks, implement, code-review y test-runner.

**Slide 16 · IA en el producto** (la más importante)
- El LLM **extrae datos, nunca decide**.
- Dos lugares donde entra Gemini, siempre en servidor:
  - **Ingesta de promos:** convierte la letra chica en un borrador
    estructurado (campo ausente = `null`). Una persona revisa el borrador en
    una bandeja antes de publicar.
  - **Ticket:** Edge Function que lee el ticket. La imagen se descarta y el
    usuario confirma el resultado.
- Después viene el **motor de reglas**: TypeScript determinístico, corre en el
  dispositivo, **sin LLM en el camino**.

**Slide 17 · Automatización y límites**
- Automatizamos todo lo posible, en el producto y en cómo trabajamos:
  - **Producto:** ingesta de promos (Playwright y Gemini) y lectura de tickets
    con una Edge Function.
  - **CI:** GitHub Actions corre lint, typecheck, test y build en cada PR.
  - **Agentes:** test-runner, spec-critic, rules-guardian y debugger.
  - **Proceso:** spec-kit genera spec, plan y tasks.
  - **Bitácora:** 5 sesiones registradas y un hook que avisa si falta
    actualizarla.
- Los límites: sin LLM en el motor de reglas, la API key de Gemini nunca va al
  celular y las imágenes de ticket no se guardan.
- Si hay tiempo, abrir `docs/bitacora-prompts.md` y `docs/uso-de-ia.md` en el
  repo.

**Slide 18 · Cierre**
- **Hecho:** encuesta con análisis, requisitos, roles y tablero, repo
  documentado, y bitácora y declaración de IA.
- **Sigue:** el diseño de la app en Expo (épica #20), Supabase y manejo de
  secrets (#9) y testear la precisión del lector de tickets (#10).
- A resolver con la cátedra: el cronograma real de sprints y el tamaño del
  equipo (somos 5 y la materia pide de 6 a 8).
- Frase final: “Problema validado, equipo organizado e IA con límites claros.
  Gracias, ¿preguntas?”

---

## Posibles preguntas y respuestas cortas

- **¿Por qué no hay código todavía?** Estamos en definición del problema y del
  alcance. Primero validamos el problema (encuesta) y fijamos las reglas.
- **¿La encuesta representa a todos los usuarios?** No: 62,7% tiene entre 18 y
  25 años y llegó por nuestros contactos. Valida que el problema existe, no el
  tamaño del mercado.
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
