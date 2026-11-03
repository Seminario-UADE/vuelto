---
name: patron-corpus-seed-manual
description: Specs de corpus/seed de Vuelto — el validador no chequea lo que la spec dice, null con dos significados que el motor convierte en "sin tope"/"mensual", seed JSON que db reset no lee, demo local vs. alojada, manual y modo duplicados
metadata:
  type: project
---

> 2026-11-03: el PO rechazó el corpus sembrado a mano (ADR-011). Las promos las publica la
> ingesta automática todos los días; una spec que proponga cargar o revisar promos a mano
> contradice ADR-011 y hay que marcarla. Los puntos de abajo siguen sirviendo para criticar
> specs que cargan datos reales.

Visto 2026-11-02 en `specs/008-corpus-promociones-seed/spec.md` (issue #35). Fallas que
aparecen cuando una spec carga datos reales en vez de definir lógica:

1. **Se le atribuye al validador más de lo que hace**: la spec decía que `esPromocionPublicable`
   valida rangos (porcentaje 0-100, desde ≤ hasta), pero solo mira los obligatorios, las redes y
   `tope.monto <= 0`. Los rangos los exige el `check` de la tabla. Siempre abrir `publicable.ts`.
2. **`null` sobrecargado**: "no informa" (tipos.ts) frente a "no tiene" frente a "excluir". El motor
   convierte `tope.monto null` en `sin_tope` (ahorro sin techo) y `periodo null` en mensual
   (`tope.ts`). Hacer la cuenta de qué recomienda el motor con cada `null` permitido.
3. **Mecanismo del seed**: `config.toml` solo corre `seed.sql` en `db reset`. Un corpus en JSON
   necesita un generador o un script; y en el proyecto alojado el seed no corre (requiere un
   secreto, lo que choca con "sin secretos"). Preguntar contra qué base corre la demo.
4. **Unicidad por par `(fuente, fuente_id)`**: `manual` y `modo` de la misma promo conviven, y la
   ingesta duplica el corpus manual. También `fuente_id` puede ser `null` para `manual`.
5. **El enum no alcanza para el alcance**: `pba` no es AMBA; la decisión "solo AMBA" no se puede
   expresar y el motor deja pasar Bahía Blanca.
6. **Trazabilidad con datos personales**: el revisor guardado en una tabla con `select` para todos
   los autenticados se sincroniza a todos los celulares.
7. Clave de identidad de la promo (tarjetas repetidas en el listado) y cómo se escribe `comercio`
   (clave de cruce con la compra; promos multi-comercio con `null` = toda la categoría).
   Ver [[patron-clave-de-join-sin-definir]].
8. "Dónde está la letra chica se confirma en el plan" = [[patron-pendientes-como-tapadero]]: todo
   US de trazabilidad y jurisdicción depende de eso.

**Why:** las specs de datos se escriben desde la fuente (MODO) y no desde lo que el motor y el
esquema hacen con cada valor cargado.
**How to apply:** en specs de corpus, seed o ingesta (#35, #50, #51, #53), recorrer cada campo
`null`able por el código real del motor y cada clave `unique` del esquema, y preguntar por el
camino a la base alojada. Relacionado: [[patron-esquema-rls-borrados-y-sync]],
[[patron-regla-infalsable-y-aritmetica]].
