---
name: patron-mocks-vs-no-calcular-local
description: En specs de UI de Vuelto con datos de ejemplo, el mock fijo choca con "la app no calcula" (Principio II) — guardar compra no mueve topes, perfil declarado no cambia la respuesta
metadata:
  type: project
---

Detectado 2026-10-16 en `specs/006-app-mobile-pantallas/spec.md` (app Expo + 18 pantallas).
Una spec de frontend sin backend promete "respuesta real", "cuentas que cierran
entre pantallas" y "la compra se refleja", pero el Principio II prohíbe que la app
calcule recomendaciones/topes localmente. Resultado: o el mock es fijo (guardar
una compra no cambia Topes, declarar solo Macro sigue recomendando Galicia), o
alguien filtra/recalcula en el cliente y viola la constitución.

También: la spec dice que los tipos del mock son "los de la Edge Function", pero
`docs/architecture/02-api-routes.md` y `03-frontend.md` están en "Pendiente" —
el contrato lo inventa la UI. Y los datos de ejemplo de DESIGN.md §9 violan
sus propias reglas (Santander ≈$2.300 de $8.000 = 29% marcado "queda poco" con
umbral ≤20%).

**Why:** el equipo diseña primero en Stitch y después implementa; las reglas
de producto se escribieron pensando en el backend.

**How to apply:** en cualquier spec que use datos de ejemplo, preguntar (1) qué
pasa con el estado después de una acción del usuario, (2) si el mock depende del
input y quién hace ese cálculo, (3) contra qué contrato se tipan, (4) si los
números de ejemplo cumplen los umbrales declarados. Además chequear límites de
Expo Go (cámara escribe al cache, deep links con esquema propio no andan).

**(specs/007, issue #81, 2026-11-01) Cuando el mock se reemplaza por el motor real**
las cifras de ejemplo cierran (Galicia 10.000−3.500=6.500, etc.), pero fallan los
bordes: (a) los fixtures no tienen la forma del motor (bancoId, tipo, red, vigencia
desde/hasta, canal, jurisdicción, grupoTopeId, promocionId en compras) y la spec no
fija los valores; (b) "reloj fijo el miércoles 14/10" sin instante ni zona (medianoche
UTC es martes en Argentina); (c) `ahora` exigido "en el estado" sin slice que lo
contenga; (d) monto 0 como "sin monto" hace que el motor ordene por id de medio, no
por porcentaje; (e) la fecha del grupo/ticket distinta de `ahora`; (f) estimado
guardado en `descuentoObtenido` falsea la base; (g) "en vivo al tipear" se pisa
con la issue siguiente (#43). Revisar siempre a)–g) cuando una spec diga "sale del
motor real sobre fixtures".
Relacionado: [[patron-pendientes-como-tapadero]], [[patron-diseno-desactualizado-por-precedencia]].
