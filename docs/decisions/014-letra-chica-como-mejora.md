# ADR-014: Leer la letra chica con Gemini pasa a ser una mejora posterior al MVP

Estado: **propuesto** (17/11/2026). Entra en vigencia cuando el Product Owner
apruebe el PR que lo introduce.

## Context

ADR-012 dejó a Gemini para leer la letra chica de las promociones (issue #51,
marcada *must*), y de ahí dependían el informe de precisión del extractor
(#53) y la carga de su key (#85).

Desde ADR-011 la ingesta toma las promociones de una API pública que ya trae
casi todo estructurado: banco, porcentaje, días, redes, tope y su período,
vigencia, canal y monto mínimo. Eso se mapea por código, sin modelo de
lenguaje. Lo único que queda solo en la prosa de la letra chica son dos datos:

- **Acumulabilidad**: si la promo se suma con otras.
- **Jurisdicción**: si vale solo en una provincia.

Hoy los dos quedan en `null`. El motor trata `acumulable = null` como no
acumulable (RF-04) y `jurisdiccion = null` como válida (`elegibilidad.ts`).

### Muestreo del 17/11

Para saber cuántas promociones dependen de esos dos datos se leyó el detalle de
**100 de las 1.830** promociones del listado del día (una de cada 18, en el
orden del listado), con el cliente de la ingesta (pausa de 1 s entre pedidos):

| Qué | Resultado |
|---|---|
| Dicen que valen **solo** en una provincia, localidad o sucursales (búsqueda por frases) | 0 de 100 |
| Mencionan la acumulabilidad | 29: **25** dicen «no acumulable» y **4** dicen que se acumulan |

Se revisaron a mano los fragmentos de 15 de esas promociones. Las menciones de
provincias eran casi todas texto legal de rutina (la dirección de la empresa o
del banco). Las dos restricciones reales eran de **locales puntuales** en otra
ciudad («locales adheridos de Sitio Córdoba», un local en Santa Fe): el motor
solo las aplica si el usuario elige ese comercio.

Límite: la búsqueda fue automática y orientativa, no una medición exacta (se le
escapan redacciones como «aplica en locales adheridos de…»).

## Decision

- Leer la letra chica con Gemini **deja de ser necesario para el MVP** y pasa a
  ser una **mejora**: completaría la acumulabilidad y la jurisdicción de las
  pocas promociones que las mencionan.
- La ingesta sigue sin modelo de lenguaje: lo estructurado se mapea por código
  y esos dos campos quedan en `null`, como hoy.
- Si en el futuro se suma una fuente **sin API** (un banco o una billetera que
  solo publique páginas), ahí sí haría falta extraer todos los datos del texto,
  y Gemini (ADR-012) es el candidato.

## Rationale

- La API ya trae estructurado lo que el motor necesita para decidir; el
  muestreo muestra que la letra chica cambia el resultado en pocas promociones.
- Sumar un modelo de lenguaje a la ingesta agrega una key, un proveedor y un
  informe de precisión (#53) para mejorar pocos casos. No se usa IA donde no
  hace falta.

## Consequences

- **Issue #51** (extractor con Gemini) pasa de *must* a *could*, como mejora.
- **Issue #53** (precisión del extractor) sigue a la #51: también mejora.
- **Issue #85** (keys): la de Groq ya está cargada; la de Gemini vuelve cuando
  se haga la #51. Se puede cerrar.
- **Issue #52** (salud de la ingesta) no depende de Gemini y se puede hacer igual.
- `CLAUDE.md`, `docs/product/estado.md` y `docs/product/pendientes.md` pasan a
  nombrar la letra chica como mejora. La presentación (`vuelto-mvp-v2.html`)
  también.
- ADR-012 sigue vigente para el ticket (Groq). Su parte de Gemini queda en
  espera de esta mejora.

## Riesgos aceptados

- **Promociones acumulables** (4 de 100 en la muestra): la app puede mostrar
  menos ahorro del real cuando dos promos se suman.
- **Promociones de un local en otra provincia**: se recomiendan solo si el
  usuario elige ese comercio. Una promo general limitada a una provincia no
  apareció en la muestra; si apareciera, se recomendaría también fuera de ella.

## Fuentes

- Muestreo del 17/11 (script temporal sobre `ingesta/src/corpus/modo.ts` y
  `listado.ts`, no versionado).
- ADR-011, ADR-012; `packages/motor/src/elegibilidad.ts`; issues #51, #52, #53, #85.
