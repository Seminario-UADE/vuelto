---
name: patron-diseno-desactualizado-por-precedencia
description: Las specs de Vuelto resuelven choques con DESIGN.md por "orden de precedencia" en vez de corregir DESIGN.md, que sigue siendo la fuente de Stitch y queda contradiciendo la spec
metadata:
  type: project
---

Detectado 2026-10-16 en spec 006: la spec declara "la auditoría reemplaza al
diseño donde choque" y no actualiza `docs/design/DESIGN.md`. Quedan vivas en
DESIGN.md reglas que la spec invierte: §2 "una superficie oscura por pantalla,
y casi todas la tienen" (spec FR-028 la restringe), §5 íconos Material (spec:
SF Symbols en iOS), §5 píldora de ahorro dentro del botón (spec FR-010: arriba),
§5 botón alto 56 pt fijo (spec: crece con Dynamic Type), §1 "cada pantalla
tiene la tarjeta oscura". Además la constitución I ("dónde y cuánto") choca con
el monto opcional de la auditoría P1 #1.

**Why:** precedencia evita editar docs, pero DESIGN.md se usa para regenerar
pantallas en Stitch y la próxima generación reintroduce lo corregido.

**How to apply:** cuando una spec cite un orden de precedencia, listar cada
regla de la fuente de menor rango que queda contradicha y exigir que se
actualice; si la contradicha es la constitución, es bloqueante (falla el
chequeo de /speckit-plan).
Relacionado: [[patron-mocks-vs-no-calcular-local]].
