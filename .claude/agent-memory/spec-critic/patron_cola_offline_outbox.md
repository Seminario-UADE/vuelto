---
name: patron-cola-offline-outbox
description: En specs de Vuelto con cola offline / subida diferida (outbox), revisar ids del cliente vs. columnas uuid con FK, dueño de la cola sin identidad de sesión, compactación con envío en vuelo, taxonomía de errores, FIFO bloqueante y privacidad de la cola
metadata:
  type: project
---

Visto 2026-11-02 en `specs/009-registro-compras-cola/spec.md` (issue #44, cola de compras
hacia `public.compras`). La spec cubría el caso feliz (sin red → cola → reintento idempotente
por id) y fallaba en:

- **Ids del cliente que no entran en la fila**: la spec mapeaba el medio (#41) pero se olvidaba
  de `promocion_id uuid references promociones`, y el corpus de la app son fixtures con ids
  `promo-...`. Un medio sin forma en el servidor (Mercado Pago: sin banco ni red) no se puede
  subir nunca → "queda en la cola" para siempre.
- **Dueño de la cola**: "pertenece al dispositivo hasta que hay cuenta" vs. "pertenece a la sesión
  que la generó", sin ningún id de usuario en el store (`Cuenta` = email|null + proveedor).
  `sesionCerrada` resetea los slices a fixtures.
- **Compactación con envío en vuelo**: "guardar+borrar antes de subir no llama al servidor" deja
  una fila huérfana si el insert ya salió; varios disparadores de flush sin single-flight.
- **Taxonomía de errores** "inválida vs. transitoria" sin códigos: 23505 en el reintento,
  23503, 22P02, JWT vencido, timeout.
- **FIFO global** + operaciones que no pueden subirse = bloqueo de toda la cola.
- **Persistencia en dos claves** (slice y cola) sin atomicidad ni reconciliación al rehidratar.
- **Requisito a cargo de otra issue** (FR-015 para #42) que no se puede verificar en esta.
- **Privacidad**: la cola es almacenamiento nuevo, sin techo de antigüedad, fuera de lo que
  declara `privacidad.md` (solo el período en curso en el celular).
- Compras de ejemplo sin marca que las distinga de compras reales viejas (`nN`).

**Why:** las specs de sincronización se escriben desde "sin red/vuelve la red"; los huecos están
en la frontera con el esquema real y en los estados intermedios.

**How to apply:** por cada campo de la fila, verificar de dónde sale su valor en la app hoy y si
cumple tipo/FK; preguntar quién es dueño de la cola sin cuenta, qué pasa con una operación en
vuelo, qué código de error es "inválido", y si una operación bloqueada frena las demás.
Relacionado: [[patron-esquema-rls-borrados-y-sync]], [[patron-clave-de-join-sin-definir]],
[[patron-mocks-vs-no-calcular-local]], [[patron-checklist-autoaprobada]].
