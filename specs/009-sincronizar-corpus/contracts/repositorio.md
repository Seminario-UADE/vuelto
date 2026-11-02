# Contrato: `RepositorioSincronizacion` y el thunk `sincronizar`

La forma del repositorio está en `data-model.md`. Acá, lo que el thunk promete y exige.

## El thunk `sincronizar(motivo: "apertura" | "primer-plano")`

Orden de ejecución:

1. **Puerta**: sale sin hacer nada si no hay repositorio (`Extra.repositorio === null`), si ya hay una sincronización en
   vuelo, o si el motivo es `primer-plano` y pasaron menos de 5 minutos desde el inicio del último intento
   (`Extra.reloj()`, no `sesion.ahora`).
2. **Parámetros**: `hoy = fechaArgentina(Extra.reloj())`, `desde = inicioDelPeriodo`, `epoca = sesion.epoca`,
   `usuario = await repositorio.usuarioId()`; sale si `usuario === null`.
3. **Lectura**: compras y promos paginadas; ids del período. Cada pedido con timeout de 15 s. Cualquier excepción ⇒
   sale sin tocar el store (atomicidad, FR-005).
4. **Mapeo y mezcla** (puros): filas → `Promocion`/`Compra`, bajas → vencidas, reemplazo o mezcla, reconciliación de ids,
   poda. Si la primera sincronización trae cero promos ⇒ sale sin cambios (FR-013).
5. **Chequeo** (sincrónico con el `dispatch`): `sesion.epoca === epoca` y `await repositorio.usuarioId() === usuario`.
   Si no, descarta.
6. **Aplicación**: una sola acción `sincronizado({ corpus, compras, usuarioId, ahora })`. Los reducers de `corpus`,
   `compras` y `sesion` la atienden.

Nunca lanza hacia la UI: los fallos son silenciosos para el usuario (la leyenda sigue mostrando la última exitosa).

## Reglas del repositorio

- `promociones` y `compras` devuelven las filas en el orden pedido y respetan el cursor y el límite.
- `idsDePromociones` devuelve **todos** los ids que cumplen el filtro (el repositorio pagina por dentro).
- Nunca usa la service role; la implementación de Supabase usa el cliente con la sesión del usuario.
- Un error (red, timeout, 4xx/5xx) se propaga como excepción; no devuelve resultados parciales.
