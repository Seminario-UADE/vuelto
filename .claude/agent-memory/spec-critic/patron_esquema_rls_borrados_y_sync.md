---
name: patron-esquema-rls-borrados-y-sync
description: En specs de esquema Supabase de Vuelto, revisar FK cross-tenant, ON DELETE que borra la base de topes, sync incremental sin bajas, re-ingesta que mueve la marca y seed con ids inventados
metadata:
  type: project
---

Visto 2026-11-01 en `specs/007-esquema-supabase-rls/spec.md` (issue #34). La spec
cubría bien el "A no ve lo de B" y fallaba en lo que pasa alrededor:

- **FK cross-tenant**: "la compra debe usar un medio del mismo usuario" sin decir
  cómo. La verificación de una FK no aplica RLS: una FK simple deja referenciar el
  medio de otro. Pedir garantía en la base y test de insert Y update.
- **ON DELETE que destruye la base del tope**: `promocion_id` SET NULL o borrar compras
  con su medio hace que el consumido baje y el restante salga optimista (Principio V).
  `Compra.medioDePagoId` no es nullable, así que SET NULL ni es opción. Además,
  RESTRICT puede romper el borrado de cuenta en cascada.
- **Sync incremental por `actualizada_en`**: no ve bajas físicas; una re-escritura
  idéntica de la ingesta mueve la marca y re-baja todo el corpus; con transacciones
  concurrentes se pierden filas; el valor en el INSERT también hay que forzarlo.
- **Identidad de la promo**: sin clave natural (id de MODO), la ingesta duplica o
  reemplaza con otro id, y lo segundo rompe `compras.promocion_id`.
- **Seed con ids de ejemplo**: medios cargados contra un UUID inventado quedan
  huérfanos cuando entra el catálogo real.
- Tabla sin policies a propósito (`capturas_crudas`) vs. "toda migración define sus
  policies": distinguir de un olvido. Vistas sin security_invoker y funciones security
  definer expuestas en `public` saltean RLS.
- Suite de tests de RLS que lista solo lo obvio: faltaban cambio de dueño, FK ajena,
  borrado de cuenta.
- Supuesto "puede quedar manual" que contradice un FR "DEBE correr en el CI".

**Why:** las specs de esquema se escriben desde el caso feliz de aislamiento; los
huecos están en borrados, en los caminos que saltean RLS y en la ingesta re-corriendo.

**How to apply:** en toda spec con tablas, por cada FK preguntar ON DELETE y si cruza
dueños; por cada marca de sync, preguntar por bajas, no-ops y concurrencia.
Relacionado: [[patron-pendientes-como-tapadero]], [[patron-regla-infalsable-y-aritmetica]].
