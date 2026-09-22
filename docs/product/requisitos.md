# Requisitos

Requisitos funcionales (RF) y no funcionales (RNF) del MVP, con criterio de
aceptación verificable. No agregan alcance: cada uno sale de lo ya fijado en
`alcance-mvp.md`, `../architecture/` o `../decisions/`, y la columna
*Fuente* dice de dónde.

Prioridad: **M** = imprescindible para el MVP, **S** = deseable, **C** = última
prioridad del MVP.

> Regla de oro (`problema.md`): un requisito que se pueda describir como
> "mostrar promociones" no pertenece a este producto.

## Requisitos funcionales

### Perfil

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-01 | El usuario declara los medios de pago que tiene (billeteras, bancos, tarjetas). | M | `01-data-models.md` §Perfil |
| RF-02 | El usuario declara los comercios donde compra habitualmente. | S | `01-data-models.md` §Perfil |

**Criterios de aceptación**
- RF-01: sin al menos un medio de pago declarado no se puede pedir una recomendación.
- RF-02: el perfil se puede guardar sin comercios; el motor funciona igual.
- Gustos y preferencias quedan **fuera** del MVP.

### Recomendación

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-03 | Dada una compra concreta, la app recomienda el medio de pago óptimo entre los declarados. | M | `00-overview.md` §1, `problema.md` |
| RF-04 | La evaluación considera medio de pago, compra, tope ya consumido, jurisdicción y acumulabilidad. | M | `00-overview.md` §1, `01-data-models.md` §Promoción |
| RF-05 | La recomendación indica qué promo se aplica y por qué se eligió ese medio. | S | `problema.md` |

**Criterios de aceptación**
- RF-03: el mismo perfil, compra y estado del corpus dan siempre la misma recomendación.
- RF-04: hay un test del motor por cada dimensión (tope agotado, promo de otra jurisdicción, promo no acumulable, etc.).
- RF-04: una promo con `acumulable = null` se trata como **no acumulable** (default del modelo de datos).

### Control de topes de reintegro

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-06 | La app muestra cuánto tope de reintegro queda por banco/promo, contemplando topes compartidos entre promociones. | M | `problema.md`, `01-data-models.md` §Promoción |
| RF-07 | Todo tope se muestra como estimado, con su base. | M | `CLAUDE.md`, ADR-006 |

**Criterios de aceptación**
- RF-06: dos promos que comparten tope descuentan del mismo saldo; una con tope exclusivo, del suyo.
- RF-07: ninguna pantalla muestra un tope sin su base (ej. "≈$18.000, según 4 compras registradas"); con cero compras registradas se dice explícitamente que no hay base.

### Registro de compras por ticket

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-08 | El usuario fotografía el ticket y el extractor obtiene monto, comercio, medio de pago y descuento. | M | ADR-006 |
| RF-09 | El usuario revisa y confirma los campos extraídos antes de que el registro sea válido. | M | `00-overview.md` §3, ADR-006 |
| RF-10 | Si el ticket no identifica el medio de pago, la app lo pregunta; nunca lo infiere. | M | ADR-006 |
| RF-11 | El registro confirmado actualiza el tope consumido. | M | `00-overview.md` flujo de datos |
| RF-12 | Existen vías de menor confiabilidad: registro por excepción (acepta una recomendación) y carga manual. | S | ADR-006, `01-data-models.md` §Compra |

**Criterios de aceptación**
- RF-09: un registro sin confirmar no modifica ningún tope.
- RF-10: campo ausente en el ticket queda `null` y dispara la pregunta al usuario.
- RF-12: cada compra guarda su origen (`ticket` \| `excepción` \| `manual`).

### Ingesta automática del corpus de promociones

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-13 | El sistema captura el contenido de las fuentes de promociones y lo guarda crudo. | S | `04-infrastructure.md` §Pipeline |
| RF-14 | El extractor convierte la letra chica en los atributos de una promoción, con salida estructurada contra un esquema. | S | ADR-005, `CLAUDE.md` |
| RF-15 | Cada campo extraído trae el fragmento textual de la fuente. | S | ADR-005 |
| RF-16 | Ninguna promoción llega al motor sin haber completado el esquema (validación automática de campos obligatorios; sin persona en el circuito). | M | ADR-005, `CLAUDE.md` |
| RF-17 | Un chequeo de salud marca y avisa cuando una fuente devuelve cero resultados o contenido irreconocible. | S | `04-infrastructure.md` paso 5, `riesgos.md` |
| RF-18 | Hay un corpus sembrado a mano suficiente para correr el motor sin depender de la ingesta. | M | ADR-005 §Consecuencias |

**Criterios de aceptación**
- RF-14: campo ausente en la fuente se guarda `null` explícito; el esquema es `{"type": ["string", "null"]}`, sin campos opcionales.
- RF-16: no hay ruta de código que escriba en la base validada sin pasar por la validación automática de esquema.
- RF-17: simular una fuente vacía genera un aviso.
- RF-18: la demo del pitch corre con el corpus sembrado, con la ingesta apagada.

### Gasto en grupo (nivel 0)

| ID | Requisito | Prior. | Fuente |
|---|---|---|---|
| RF-19 | Un grupo declara sus integrantes con sus medios de pago; el motor evalúa la unión de medios y recomienda quién paga. | C | `alcance-mvp.md` §Gasto en grupo, `01-data-models.md` §Grupo |
| RF-20 | La división del gasto se genera sola a partir del resultado; nunca se carga a mano. | C | `alcance-mvp.md` §Gasto en grupo |

**Criterios de aceptación**
- RF-19: el nivel 0 no usa topes de otros integrantes.
- RF-20: no existe pantalla de carga manual de gastos compartidos.

## Requisitos no funcionales

| ID | Requisito | Criterio de aceptación verificable | Fuente |
|---|---|---|---|
| RNF-01 | **Determinismo.** El LLM nunca participa de la recomendación. | El paquete del motor no tiene dependencias ni importa ningún cliente de IA (revisable en `package.json` y en el código). | ADR-004, `CLAUDE.md` |
| RNF-02 | **Motor autónomo.** Corre en el dispositivo, sin red. | Con el celular en modo avión, RF-03 devuelve resultado. | `00-overview.md` §1 |
| RNF-03 | **Testeabilidad.** El motor tiene su propia suite. | `vitest run` pasa sin red ni servicios externos; cubre las dimensiones de RF-04. | ADR-001, ADR-004 |
| RNF-04 | **Secretos.** La API key de Gemini nunca está en la app. | Búsqueda de la key en el bundle de la app: 0 resultados. Letra chica sale del script de ingesta; ticket, de una Edge Function. | `04-infrastructure.md`, `CLAUDE.md` |
| RNF-05 | **Llave maestra.** La service role key solo la usa el proceso de ingesta. | No aparece en el cliente ni en el repo. | `04-infrastructure.md` |
| RNF-06 | **Privacidad de tickets.** La imagen no se persiste. | Tras procesar un ticket, no queda imagen en Storage ni en la base; sí el texto extraído junto al registro. | ADR-006, `CLAUDE.md`, `privacidad.md` |
| RNF-07 | **RLS desde el día uno.** | Cada migración que crea una tabla incluye sus policies en el mismo cambio. | `CLAUDE.md` |
| RNF-08 | **Trazabilidad.** | Cada promoción publicada conserva el crudo y la extracción, con el fragmento fuente de cada campo, para poder auditar una extracción que salió mal. | `01-data-models.md` §capturas_crudas |
| RNF-09 | **Extractor medido.** | Existe un informe de precisión por campo sobre 15-20 tickets reales y sobre el corpus de promos. | ADR-005, ADR-006 |
| RNF-10 | **Costo $0** durante el cuatrimestre. | Todos los servicios dentro del tier gratuito (`04-infrastructure.md` §Servicios). | `CLAUDE.md`, `04-infrastructure.md` |
| RNF-11 | **Demostrable.** | La app corre por Expo Go (QR); hay build de EAS de respaldo. | `04-infrastructure.md` §Distribución, `restricciones-catedra.md` |
| RNF-12 | **Alcance acotado.** | Solo CABA/AMBA; corpus de las 13 categorías que publica MODO (única fuente de ingesta); el flujo de compra optimizado cubre las 13, no solo supermercado. | `alcance-mvp.md`, `fuentes-promos.md` |
| RNF-13 | **Scraping respetuoso.** | Se respeta `robots.txt`, frecuencia limitada y agente identificado. | `riesgos.md`, `fuentes-promos.md` |
| RNF-14 | **Cumplimiento de la materia.** | Sprints con tablero, dos entregas parciales, documentación final, research con datos reales. | `restricciones-catedra.md` |

## Requisitos bloqueados por definiciones pendientes

No se dan por chequeados hasta resolver el pendiente que los frena
(`pendientes.md`).

| Requisito | Qué falta | Issue |
|---|---|---|
| RF-18 | Tamaño del corpus sembrado a mano: el alcance ya está definido (`alcance-mvp.md`) pero falta verificar sucursales reales de las cadenas | #8 |
| RF-13, RNF-13 | Dónde corre el cron de ingesta (relevamiento de fuentes ya resuelto, ver `fuentes-promos.md`) | `pendientes.md` |
| RF-08, RNF-09 | Proveedor/modelo del extractor y precisión sobre tickets reales | #10 |
| RF-16 | Umbral de validación automática de la ingesta (campos obligatorios) | `pendientes.md` |
| RF-05 | Cómo se dispara el momento de uso (notificación / geolocalización) | `pendientes.md` |
| RF-19, RF-20 | Promoción de débito y redondeo de la división | `pendientes.md` |
| RNF-14 | Cronograma real del cuatrimestre y tamaño del equipo | `restricciones-catedra.md`, `estado.md` |

## Chequeo de coherencia (issue #3)

Revisión hecha contra `alcance-mvp.md` (ya con rubros y billeteras
concretos), `restricciones-catedra.md` y `../architecture/`:

- Todo RF/RNF traza a una fuente; ninguno inventa alcance.
- Nada del listado cae en "Fuera" del alcance (integración bancaria, lectura de
  resúmenes, publicación sin revisión, cobertura nacional, app nativa).
- Tensión detectada: RF-05 es deseable pero depende del disparo del momento
  de uso, que además es un riesgo (`riesgos.md`: solo 16% acepta permisos).
