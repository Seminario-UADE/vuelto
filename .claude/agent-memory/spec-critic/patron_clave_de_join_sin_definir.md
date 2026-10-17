---
name: patron-clave-de-join-sin-definir
description: Patrón en specs de Vuelto — se persisten datos del usuario que después tienen que matchear contra el corpus de MODO, pero nunca se define la clave ni la cardinalidad del join
metadata:
  type: project
---

Variante del patrón [[patron-motor-consume-datos-inexistentes]], detectada el
2026-10-13 en `specs/001-perfil-billeteras/spec.md`: la spec define qué declara
el usuario (banco + tipo de tarjeta + red) pero **no define la clave con la que
ese dato se cruza contra las promos de MODO**, ni la cardinalidad.

Síntomas concretos a buscar en cada spec de este repo:
- La entidad dice "identificador" en singular cuando la fuente expone varios
  (`id`, `bcra_code`, `hub_bank_id`) y las promos filtran por uno específico.
- Un atributo declarado "uno por X" (una red por tipo de tarjeta) sin decir si
  puede haber dos del mismo tipo, ni regla de duplicados.
- Dos enums de fuentes distintas (catálogo de bancos vs. redes de las promos)
  que se combinan en producto cartesiano sin decir qué combinaciones son
  válidas.
- Valores crudos de la API usados como requisito de producto (`on_hub_list`,
  `master`, `dinners_club`) sin separar valor almacenado de etiqueta visible.

**Why:** el equipo verifica los datos contra la API real (bien) y después pega
los nombres de campo de la API dentro de la spec, lo que da sensación de
precisión y tapa que la decisión de modelado no se tomó.

**How to apply:** en toda spec que persista datos de perfil o de corpus, exigir
explícitamente: qué campo es la clave estable, qué pasa si la fuente la cambia,
y cuál es la cardinalidad máxima. Es hallazgo bloqueante, no de modelado fino:
sin eso el esquema de Supabase (#34) se escribe a ciegas.
