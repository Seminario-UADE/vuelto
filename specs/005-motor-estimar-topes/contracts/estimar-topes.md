# Contrato: `estimarTopes()` y `formatearEstimacion()`

Interfaz pública nueva de `@vuelto/motor`. La consume la Edge Function `GET /topes` (issue #45);
la app no importa el motor. Tipos en `../data-model.md`.

## Precondiciones (las garantiza la capa externa)

Las mismas de `recomendar()` en la issue #37: promociones evaluables más las referenciadas por
las compras del período, y compras desde el lunes de la semana o el día 1 del mes, lo que sea
anterior. Ids únicos; datos validados.

## Postcondiciones de `estimarTopes`

- Pura y determinística: el mismo resultado sin importar el orden de las listas de entrada; no
  muta sus argumentos.
- Una estimación por saldo con al menos una promo vigente aplicable (FR-002); ordenadas por
  `grupoTopeId`, o por el id de la promo si el saldo es propio (FR-006).
- `restante = tope − consumido`, con `0 ≤ restante ≤ tope`; importes en pesos con a lo sumo dos
  decimales.
- Con `perfil === null`, `mediosDePagoIds` es `[]` y no se filtra. Con un perfil sin medios, la
  lista es `[]`.

## Postcondiciones de `formatearEstimacion`

- `cifra !== null` ⇒ `base !== ""`, y la cifra nunca representa más que el restante (FR-011).
- Sin LLM: plantillas fijas (FR-007).

## Ejemplo (US2-1)

```json
{ "estado": "disponible", "cifra": "≈$6.500", "base": "según 3 compras de octubre" }
```
