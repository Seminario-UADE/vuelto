---
name: patron-sugerencia-fuzzy-comercio
description: Specs de sugerencia/búsqueda aproximada (015 sugerir comercio) — umbral calibrado con la lista del SC, "exacto" con dos definiciones, rubro elegido que el estado no puede guardar, criterio de búsqueda invertido.
metadata:
  type: project
---

Visto en specs/015-sugerir-comercio (issue #134, 2026-11-15):

- El umbral de parecido "se fija en el plan con la lista de SC-001/SC-002": el SC pasa por construcción. Pedir lista congelada en la spec y otra lista separada para medir.
- "Coincide exacto" definido dos veces: FR-001 (mayúsculas, tildes, espacios = claveDeComercio) vs. Edge Cases (además formas societarias, números, puntuación). Decide si aparece línea o recuadro.
- Regla "palabra entera" que falla su propio ejemplo («día de la semana» contiene «día» como palabra entera) — repetición del patrón de 014 [[patron-regla-infalsable-y-aritmetica]].
- En revisa.tsx, `categoriaId` solo vale si `comercio === comercioInicial`: elegir una sugerencia en el 2do rubro se pierde y cae al primero por categoría. Toda spec que "toma el rubro" al elegir necesita estado nuevo.
- Buscador "con el mismo criterio de FR-002" (catálogo contenido en lo escrito) es la dirección inversa al buscarComercios actual (lo escrito contenido en el catálogo): «jum» no encuentra «Jumbo».
- selectCatalogoParaCompras incluye RUBROS_DE_MODO como pseudo-comercios («Supermercados»): cualquier búsqueda sobre "el catálogo" debe decir si los rubros entran.
- Por confirmar + ticket tiene modo "ticket": reglas "con ticket aparece" vs. "por confirmar no aparece" chocan.

**How to apply:** en specs de matching/sugerencia, revisar quién fija el umbral, cuántas definiciones de igualdad hay, si el estado de la pantalla puede guardar la elección, y que los ejemplos pasen la regla.
