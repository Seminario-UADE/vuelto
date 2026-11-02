# Quickstart: validar la feature

Prerrequisito: `npm ci` en la raíz (Node ≥ 22.13).

## Por tests

```bash
npm run test -w @vuelto/mobile      # núcleo puro, cola, thunks, selectores
npm run lint && npm run typecheck   # desde la raíz, como el CI
```

Esperado: pasan los tests de `data/compras/*`, `store/cola.test.ts` y `store/thunks.compras.test.ts`.

El esquema (necesita Docker):

```bash
supabase db reset && supabase test db   # incluye compras_cliente.test.sql
```

## A mano en el simulador (modo avión)

1. Abrir la app con datos de ejemplo. Perfil → escenario «Normal».
2. «¿Con qué pago?» en Farmacity → «Usar…» → Guardar. Ver en «Topes» que el tope baja.
3. «Mis compras» → la compra aparece. Con la subida desconectada no hay marca (FR-014).
4. Borrarla con la confirmación → desaparece y el tope vuelve (SC-001).
5. Cargar a mano una compra de Farmacity con Galicia: la hoja muestra la promo propuesta; quitarla y guardar → el tope no cambia (SC-006).
6. Cargar una compra con fecha de ayer: la promo que muestra la hoja es la guardada (SC-007).
7. Cerrar la app a la fuerza y abrirla: la compra sigue ahí (FR-013).

## Con el repositorio en memoria (demo de la cola)

El arranque de la app puede crearse con `repositorio.memoria` y un `ContextoSubida` de prueba para ver las marcas «Sin subir» y su paso a subida. Detalle en las tareas de `tasks.md`.
