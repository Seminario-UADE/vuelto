# Contexto del proyecto — Vuelto

> Asistente de decisión de medio de pago y control de topes de reintegro.
> Proyecto de MVP para Seminario de Integración Profesional (UADE).
> Documento de contexto: qué estamos construyendo, por qué, con qué límites y qué falta decidir.

---

## 1. Estado

- **Idea seleccionada** por el equipo entre cuatro propuestas candidatas.
- Etapa actual: definición del problema y arranque del research. **Todavía no se escribe código.**
- Nombre tentativo: **Vuelto**. Falta verificar dominio `.com.ar` y disponibilidad de marca en INPI.
- Equipo: cuatro integrantes. La consigna de la materia indica equipos de seis a ocho — pendiente de resolver con la cátedra.

---

## 2. El problema

En Argentina una parte relevante del gasto cotidiano está condicionada por promociones que cambian por **día**, **billetera virtual**, **banco emisor** y **tarjeta**. Cada beneficio tiene letra chica:

- tope de reintegro mensual, **compartido entre promociones del mismo banco**
- tarjetas específicas incluidas o excluidas
- comercios y **sucursales adheridas**
- condición de no acumulable
- vigencia acotada y jurisdicción (nacional, provincial, CABA)

Al momento de pagar se genera una combinatoria — comercio × billetera × tarjeta × día × tope disponible × monto — que ninguna persona resuelve mentalmente.

**El problema no es la falta de información.** Las promociones están publicadas por bancos, billeteras y cadenas. El problema es la **decisión**: se paga con el primer medio disponible y se pierde dinero de forma silenciosa y recurrente, en gastos que se iban a hacer igual.

---

## 3. Qué nos diferencia

El agregador de promociones **ya existe** en el mercado argentino (Clash, Rebuscate, y cada billetera muestra las propias dentro de su app). Presentarnos como "todos los descuentos en un lugar" nos deja sin respuesta en el pitch.

Nuestro ángulo son las dos cosas que ningún competidor resuelve:

1. **Recomendación para una compra concreta**, no un listado filtrable.
2. **Control del tope de reintegro consumido**, que es mensual, compartido por banco y hoy invisible para el usuario. Es donde la gente efectivamente pierde la plata.

> Regla de oro del proyecto: si una funcionalidad se puede describir como "mostrar promociones", no es nuestro producto.

---

## 4. Alcance del MVP

### Dentro

| Eje | Definición |
|---|---|
| Geografía | CABA y AMBA, **modelando la jurisdicción** de cada promoción |
| Rubros | De uno a tres. El corpus se publica en las mismas fuentes, el costo marginal es bajo |
| Flujo de decisión | **Uno solo optimizado**: compra de supermercado. El resto se muestra como consulta |
| Medios de pago | Cuatro o cinco billeteras/bancos |
| Comercios | Conjunto acotado y explícito de cadenas adheridas |
| Corpus de promociones | **Ingesta asistida**: extracción automatizada desde las publicaciones web de bancos y billeteras, con **revisión y aprobación humana antes de publicar**. Ver sección 4.2 |
| Perfil del usuario | Declarado manualmente por el usuario. Ver sección 4.1 |

### Fuera (explícito, y hay que poder defenderlo)

- Integración con entidades bancarias o APIs de medios de pago
- Lectura automática de resúmenes o movimientos
- Publicación automática de promociones sin revisión humana
- Cobertura nacional
- App móvil nativa

> **Cambio de alcance registrado (26/08/2026).** El scraping estaba fuera de alcance en la versión anterior de este documento. Se movió a *dentro* al confirmarse que no existe ninguna API pública que devuelva promociones bancarias en Argentina: el BCRA publica APIs de variables macroeconómicas, y las APIs de "descuentos" de los procesadores de pago (PayU, Increase) son del lado del comercio, para aplicar cuotas en un checkout propio. La única fuente disponible del corpus es la publicación web de cada entidad. La integración bancaria se mantiene fuera.

### 4.1 Perfil del usuario

El perfil es **declarado por el usuario**, no inferido ni importado. No hay integración bancaria, así que no hay otra vía — y esto es una decisión de producto, no una limitación: el usuario sabe qué tarjetas tiene y dónde compra mejor que cualquier inferencia.

Tres capas, en orden de prioridad:

| Capa | Prioridad | Para qué sirve |
|---|---|---|
| **Medios de pago** — billeteras, bancos y tarjetas que el usuario efectivamente tiene | **Obligatoria.** Sin esto el motor no puede correr | Define el universo de combinaciones válidas |
| **Comercios recurridos** — dónde compra habitualmente | **Alta.** Es lo que acota la optimización y hace accionable la recomendación | Convierte "hay 40 promos" en "para vos, hoy, en tu supermercado, conviene esta" |
| **Gustos y preferencias** | **Diferible.** No entra al MVP salvo que sobre tiempo | Refinamiento futuro |

> **Cuidado con la tercera capa.** Los gustos tiran naturalmente hacia un feed de descubrimiento de comercios nuevos, que está descartado por decisión (es terreno de los agregadores y rompe la regla de oro de la sección 3). Si entra, entra como filtro sobre una recomendación existente, nunca como fuente de sugerencias nuevas.

### 4.2 Adquisición del corpus de promociones

No hay API. La fuente es la publicación web de cada banco, billetera y cadena. El flujo tiene tres etapas y **ninguna publica sola**:

1. **Obtención** — recuperación programada de las páginas de promociones de las fuentes del alcance. Antes de escribir parsers de HTML conviene inspeccionar el tráfico de red: varios de estos sitios son SPAs que consumen un endpoint JSON interno, mucho más estable de leer que el DOM.
2. **Extracción** — es la etapa difícil, y no es scraping. La letra chica viene en prosa legal corrida: vigencia, ámbito, tarjetas incluidas, medios excluidos y tope conviven en un mismo párrafo. Convertir eso en los atributos de la sección 5 es un problema de extracción de información sobre texto no estructurado, no de parsing. Se resuelve con un **modelo de lenguaje vía API** (Gemini, Claude u otro), bajo las cuatro reglas de diseño de 4.3.
3. **Revisión y aprobación** — la salida de la etapa 2 es un **borrador en una cola de revisión**, no un registro publicado. Una persona valida o corrige antes de que el motor pueda usarlo.

**Por qué la etapa 3 no es opcional:** el riesgo de dato erróneo (sección 8) es el que rompe la confianza de forma irreversible. Una extracción que falle en la jurisdicción o en el tope produce una recomendación que le arruina la compra al usuario. La revisión humana es la mitigación, y es además la respuesta defendible en el pitch: *no se publica nada que no haya validado una persona*.

**Consecuencia sobre el panel de administración:** el panel deja de ser un CRUD de carga y pasa a ser una **bandeja de revisión** (aprobar, corregir, rechazar, marcar vencida). Es menos trabajo de frontend que los formularios anidados que requeriría la carga 100% manual.

**Secuencia recomendada:** sembrar el corpus a mano en los primeros sprints para que el motor de reglas tenga contra qué correr, y construir la ingesta asistida después. El proyecto no puede depender de que el scraper funcione para tener una demo.

### 4.3 El extractor: modelo de lenguaje en la ingesta

**Qué resuelve y qué no.** El modelo no elimina el trabajo humano: lo convierte de *tipear* en *revisar*. Revisar un registro pre-llenado son segundos; cargarlo a mano son minutos. La ganancia es real y grande, pero la etapa 3 sigue existiendo. No presentarlo como automatización total.

**Por qué la revisión no se puede sacar.** El modelo no falla al azar: falla en los casos ambiguos, que son justo los que más valen. Si el tope es compartido entre promociones del mismo banco o exclusivo de esa; si "no acumulable" alcanza también al descuento propio de la cadena; si un ámbito que dice "CABA y GBA" incluye o excluye el resto de PBA. Esas distinciones a veces no están explícitas ni para un lector humano. Y cuando el modelo se equivoca ahí, **se equivoca con confianza y en silencio**: no devuelve un error, devuelve un valor plausible.

#### Cuatro reglas de diseño

| Regla | Por qué |
|---|---|
| **Salida estructurada forzada contra un esquema**, no prompt libre parseado a mano | Elimina toda una clase de fallas de formato y hace que el error que quede sea de contenido, que es el que importa revisar |
| **Cada campo extraído viene con el fragmento textual de la fuente** de donde salió | Es lo que hace barata la revisión: el revisor no lee el párrafo legal entero, mira el campo contra su cita y aprueba. Sin esto, revisar cuesta casi lo mismo que cargar |
| **Los campos ausentes se devuelven nulos, explícitamente**, nunca completados | Un "no especificado en la fuente" se resuelve leyendo; un valor inventado se descubre cuando ya arruinó una compra |
| **Se persiste el contenido crudo de la fuente junto con la extracción y quién aprobó** | Trazabilidad para depurar, y material directo para la documentación final |

#### Límite duro: el modelo no entra al motor de reglas

El modelo de lenguaje vive **solamente en la ingesta**: offline, en lote, fuera del camino crítico. La recomendación al usuario sale de código determinístico corriendo contra la base ya validada.

Va a aparecer la propuesta de "preguntarle directamente al modelo cuál medio de pago conviene". **Es la forma más rápida de matar el proyecto**: se pierde el determinismo, se pierden los tests, y el argumento de innovación tecnológica pasa de ser un problema de optimización con restricciones a ser un prompt — que es exactamente lo que un evaluador técnico abre y no encuentra nada adentro. Además ata la demo del pitch a que un servicio externo esté disponible ese día.

#### El argumento defendible no es "usamos IA"

Integrar una API de IA no distingue a nadie. Lo que sí es defendible es **medir qué tan bien funciona**:

> Etiquetar a mano un conjunto de promociones reales, correr el extractor contra ellas y reportar la precisión **por campo**. El resultado esperable es desparejo — alta en vigencia y porcentaje, baja en tope compartido y acumulabilidad — y esa desigualdad es precisamente lo que justifica el diseño del circuito de revisión.

Es un dato medido, no una afirmación. Cumple el requisito de la materia de hacer research con datos reales, y sostiene una decisión de arquitectura con evidencia en lugar de con intuición. **Este experimento es un entregable, no una tarea técnica interna.**

**Costo:** despreciable al volumen del MVP. No construir una justificación económica que no hace falta.

### Las tres vistas del producto

1. **Qué conviene hoy** — dados los medios de pago que el usuario declara y la compra que va a hacer.
2. **Cuánto ahorré** — acumulado del período, en pesos.
3. **Cuánto tope me queda** — por banco, en el mes en curso.

---

## 5. Núcleo técnico

Un **motor de reglas** que evalúa las combinaciones válidas para una compra concreta y devuelve la óptima, considerando topes ya consumidos, exclusiones de tarjeta, jurisdicción, sucursales adheridas y acumulabilidad.

No es un listado con filtros: es un **problema de optimización con restricciones**. Este es el argumento que sostiene el ítem *innovación tecnológica* de la evaluación de la materia — no diluirlo al recortar alcance.

La **ingesta asistida** (sección 4.2) es la segunda pata de ese argumento: extracción de datos estructurados desde texto legal no estructurado, con validación humana en el circuito. Es el complemento del motor, no su reemplazo. Si hay que sacrificar uno por tiempo, se sacrifica la ingesta y se siembra el corpus a mano: el motor es el núcleo.

### Atributos que el modelo de datos necesita sí o sí

- Jurisdicción de la promoción — hay beneficios provinciales que aplican en PBA y no en CABA (caso típico: Cuenta DNI). Recomendar una promo fuera de jurisdicción arruina la compra del usuario y destruye la confianza.
- Tope de reintegro con su período, su banco y su alcance (compartido entre promociones o exclusivo)
- Vigencia con fecha de inicio y fin, y días de la semana aplicables
- Comercios y sucursales adheridas
- Tarjetas incluidas/excluidas y condición de acumulabilidad

---

## 6. Lógica de negocio

- **Usuario final: gratis.** La app funciona como sensor de comportamiento de consumo.
- **Ingresos potenciales:**
  - acuerdos de afiliación con billeteras y comercios que compiten por transaccionalidad
  - destaque de comercios adheridos
  - reportes agregados y anonimizados sobre qué promociones mueven consumo — información que hoy las entidades no tienen sobre sus competidores
- **Costo principal:** no es infraestructura, es el **mantenimiento del corpus de promociones**. Debe estar reflejado en la estimación de costos y en el P&L. La ingesta asistida reduce este costo pero no lo elimina: la revisión humana es permanente, y hay que sumarle el costo de mantener los extractores cuando las fuentes cambian de estructura.

---

## 7. Research

Ventaja competitiva del proyecto frente a las otras propuestas evaluadas: el problema es transversal, así que la evidencia es barata de conseguir.

- **Auto-registro** — relevamiento manual de compras propias durante una semana: qué se compró, dónde, con qué se pagó, y cuánto se habría ahorrado con la mejor combinación de ese día. Produce una **cifra en pesos, medida, no estimada**. Es la apertura del pitch.
- **Encuesta** — alto volumen de respuestas alcanzable por lo transversal del problema.
- **Relevamiento documental** — las condiciones de las promociones son públicas: sirven de corpus real y de prueba de mantenibilidad del dato.
- **Observación en punto de venta** — cómo se decide el medio de pago en la caja.

---

## 8. Riesgos abiertos

| Riesgo | Estado |
|---|---|
| Obtención y mantenimiento del dato: es el 80 % del esfuerzo real | Mitigado por diseño (ingesta asistida + revisión), pero hay que planificarlo desde el sprint 1 |
| Dato desactualizado o mal extraído que induzca a pagar mal: rompe la confianza de forma irreversible | Mitigado parcialmente por la revisión humana obligatoria (4.2). Falta la política de vigencia y de responsabilidad del dato |
| **Extracción incorrecta de la letra chica**: la vigencia, el tope, la jurisdicción y las exclusiones vienen en prosa legal corrida | Sin resolver. Necesita un umbral de confianza y casos de prueba con promociones reales antes de confiar en la extracción |
| **Fragilidad de las fuentes**: si un banco rediseña su página, el extractor deja de funcionar en silencio | Sin resolver. Necesita alertas de ingesta vacía o anómala, no fallar callado |
| **Deriva hacia el modelo como motor**: la tentación de resolver la recomendación con un prompt en vez de con reglas | Vigilancia permanente. Ver límite duro en 4.3. Es el riesgo que más daño le hace al ítem de innovación tecnológica |
| **Dependencia de un proveedor externo de IA** en la ingesta | Bajo, por diseño: al ser offline y en lote, una caída retrasa la actualización del corpus pero no afecta al producto en uso ni a la demo |
| **Términos de uso de las fuentes**: la mayoría de los sitios prohíbe expresamente la extracción automatizada, y hacerlo expone a un reclamo por incumplimiento contractual | Sin resolver. A favor: no se tocan datos personales, que es la exposición más fuerte. Mitigaciones a definir: respetar `robots.txt`, limitar frecuencia, identificar el agente, y tener la respuesta preparada para el pitch |
| Momento de uso: si no interviene en el momento de la compra, no se usa aunque funcione | Sin resolver. Requiere notificación o disparo contextual |
| **Techo de las notificaciones**: en mobile el 48 % de los pedidos de permiso se ignoran y solo el 16 % se aceptan (Web Almanac 2025). Aplica igual a web y a app nativa: es comportamiento de usuario, no limitación técnica | Sin resolver. **Debilita la estrategia del disparo contextual como sea que se implemente.** No usar "vamos a nativo para poder notificar" como argumento sin tener esta cifra a mano |
| Cercanía con la lista de problemáticas no aceptadas por la cátedra | Pendiente de confirmación explícita con los docentes |
| Riesgo de que el producto derive en un buscador de promos más | Permanente. Ver regla de oro en la sección 3 |

---

## 9. Restricciones de la materia

- Producto: **MVP de producto digital** funcional y demostrable.
- Metodología ágil con sprints, dailies, reviews y retrospectivas. Tablero en Trello o Jira (se evalúa).
- **Dos entregas parciales** de evaluación previa, más documentación final, producto digital y **The Pitch** con todos los integrantes presentes.
- En las Sprint Reviews **rota quién presenta**, semana a semana.
- El research debe hacerse con **datos reales**, no supuestos.
- Se evalúa: calidad y completitud de los entregables, cumplimiento problema–solución, tableros, participación individual y grupal, **innovación tecnológica**, presentismo y puntualidad.
- 75 % de asistencia. Hay recuperatorio de **una sola** de las dos entregas, en la última clase.

> **Ojo con el calendario.** Las fechas del PDF de la clase 1 corresponden a un cuatrimestre que arranca en marzo. Este cuatrimestre arranca en agosto, así que las fechas literales no aplican: lo que se mantiene es la estructura (cuatro sprints, dos entregas, taller de oratoria, simulacro de pitch, pitch final). Confirmar el cronograma real con la cátedra.

---

## 10. Decisiones pendientes

- [ ] Confirmar con la cátedra que el problema no cae en la lista de exclusiones
- [ ] Resolver la conformación del equipo (cuatro integrantes vs. seis a ocho requeridos)
- [ ] Completar la entrega con al menos dos problemas por integrante, si la cátedra lo exige
- [ ] Definir nombre final y verificar dominio y marca
- [ ] Definir cuántos rubros entran finalmente al corpus (uno, dos o tres)
- [ ] Elegir las billeteras y cadenas concretas del alcance inicial
- [ ] Definir cómo se resuelve el momento de uso (notificación, geolocalización, otro), con el techo del 16 % de aceptación a la vista
- [ ] Ejecutar el auto-registro de una semana y obtener la cifra en pesos
- [ ] **Relevar las fuentes concretas**: para cada billetera y banco del alcance, verificar si la página de promociones es HTML estático o una SPA con endpoint JSON interno, y revisar sus términos de uso y su `robots.txt`
- [ ] **Definir el umbral de revisión** de la ingesta asistida: qué se aprueba automáticamente (si algo) y qué pasa siempre por una persona
- [ ] **Correr el experimento de precisión del extractor** (4.3) y reportar el acierto por campo — es entregable de research, no tarea interna
- [ ] Elegir proveedor y modelo para el extractor, y verificar que soporte salida estructurada contra esquema
- [ ] **Decidir la plataforma del cliente** y dejar la justificación escrita acá — ver `plataforma-web-vs-mobile.html`. Pendiente el dato del nivel real de los otros tres integrantes en TypeScript y en Dart

---

## 11. Glosario

- **Billetera virtual** — aplicación de pagos que agrupa tarjetas y cuentas (MODO, Mercado Pago).
- **Tope de reintegro** — monto máximo que un banco devuelve por promociones en un período, habitualmente mensual y **compartido entre varias promociones del mismo banco**.
- **Acumulable** — si un beneficio puede sumarse a otro sobre la misma compra. Habitualmente no lo es.
- **Sucursal adherida** — no todas las sucursales de una cadena participan de la misma promoción.
- **Jurisdicción** — alcance geográfico del beneficio. Determina si aplica en CABA, en PBA o a nivel nacional.
