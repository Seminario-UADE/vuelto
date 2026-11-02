# Data Model: App — sincronizar el corpus y las compras del período

Datos planos y serializables. Lo ausente es `null`, sin campos opcionales (Principio III). Parte de
[`specs/008-motor-app-redux/data-model.md`](../008-motor-app-redux/data-model.md); acá solo lo que cambia.

## Cambios a los slices

```ts
type EstadoCorpus = {
  promociones: Promocion[];       // forma del motor
  /** Texto exacto de `actualizada_en` que devolvió el servidor (la mayor recibida). `null` = nunca sincronizó. */
  marca: string | null;
  /** Cuándo terminó la última sincronización exitosa (ISO, reloj del sistema). `null` = nunca. Reemplaza a `cargadoEn`. */
  sincronizadoEn: string | null;
  /** Filas que la última sincronización descartó por inválidas (diagnóstico). */
  descartadas: number;
};

type EstadoCompras = {
  lista: Compra[];                // forma del motor, la más nueva primero
  /** Ids de compras locales que el servidor todavía no confirmó. Las escribe la compra local y las saca #44. */
  pendientes: string[];
  /** `auth.uid()` del dueño de `lista`. `null` = datos de ejemplo o nunca sincronizó. */
  duenoId: string | null;
};
```

- `corpus.marca === null` ⇔ la app usa los datos y el reloj de ejemplo (FR-016).
- `cargadoEn` desaparece: con los datos de ejemplo era el instante del reloj fijo y no significa nada.
- `sesionCerrada`: `compras` vuelve a `{ lista: comprasDeEjemplo, pendientes: [], duenoId: null }`. El `corpus` no se toca (es público).

## Persistencia

| Clave | Contenido | Se escribe |
|---|---|---|
| `vuelto.store.v1` | `{ version: 1, perfil, compras: { lista, pendientes, duenoId }, cuenta }` | Cuando cambia `perfil`, `compras` o `sesion.cuenta` |
| `vuelto.corpus.v1` | `{ version: 1, promociones, marca, sincronizadoEn }` | Cuando cambia `corpus`. Si falla, la marca guardada no avanza |

- `vuelto.store.v1` **sigue en `version: 1`** (subirla borraría el perfil de todos). Un `corpus` dentro de
  ese valor se ignora. El validador completa `pendientes: []` y `duenoId: null` si faltan.
- `compras.lista` se guarda **filtrada al período**, pero las compras cuyo id está en `pendientes` se guardan
  **siempre**, aunque sean de fuera del período, hasta que se suban.
- Un guardado sin `vuelto.corpus.v1`, o inválido, se lee como "nunca sincronizó" (`marca: null`, corpus de ejemplo).
  Un `vuelto.corpus.v1` inválido de un usuario que ya tenía cuenta sincronizada deja el corpus vacío con `marca: null`.

## Repositorio de sincronización (interfaz inyectada en `Extra`)

```ts
type FilaPromocion = { /* columnas de public.promociones, snake_case */ };
type FilaCompra = { /* columnas de public.compras */ };

type Cursor = { actualizadaEn: string; id: string } | null;

interface RepositorioSincronizacion {
  /** `auth.uid()` de la sesión, o `null` si no hay. */
  usuarioId(): Promise<string | null>;
  /** Hasta `limite` promos, ordenadas por (actualizada_en, id), posteriores al cursor y a `desde`. Excluye `otra_provincia`. */
  promociones(f: { desde: string | null; vigenteDesde: string | null; cursor: Cursor; limite: number }): Promise<FilaPromocion[]>;
  /** Ids de las promos con `vigencia_hasta >= vigenteDesde`, excluida `otra_provincia`. */
  idsDePromociones(vigenteDesde: string): Promise<string[]>;
  /** Compras del usuario con `fecha >= desde`, por cursor (`creada_en`, `id`). */
  compras(f: { desde: string; cursor: Cursor; limite: number }): Promise<FilaCompra[]>;
}
```

- `desde` es `marca − 10 min` (texto ISO); `vigenteDesde` es el inicio del período (fecha). Con marca `null` se usa
  `vigenteDesde` y no `desde`; con marca no nula, `desde` y no `vigenteDesde` (FR-004).
- Implementaciones: `memoria` (tests) y `supabase` (`supabase-js`, sesión del usuario, `AbortSignal` de 15 s).

## Mapeo de filas (funciones puras)

| Campo de la fila | Campo del motor |
|---|---|
| `banco_id` | `bancoId` |
| `categoria_id` | `categoriaId` |
| `debito_redes`, `credito_redes` | `tarjetas: { debito, credito }` |
| `vigencia_desde`, `vigencia_hasta`, `dias` | `vigencia: { desde, hasta, dias }`; si `dada_de_baja_en`, `hasta = min(hasta, día anterior a la baja en Argentina)` |
| `tope_monto`, `tope_periodo`, `tope_alcance`, `grupo_tope_id` | `tope: { monto, periodo, alcance, grupoTopeId }` |
| `monto_minimo`, `jurisdiccion`, `canal`, `acumulable`, `comercio`, `porcentaje`, `titulo`, `fuente`, `id` | mismos nombres en camelCase |

- `numeric` llega como texto o número según PostgREST: se convierte con `Number` y se valida que sea finito.
- Una fila con un valor de `red`, `jurisdiccion`, `canal` o `dias` que el motor no conoce se descarta (FR-010).
- Las compras: `fecha`, `monto`, `comercio`, `categoria_id`, `medio_de_pago_id` (queda como UUID hasta #41),
  `promocion_id`, `descuento_obtenido`, `reintegro_esperado`, `fecha_acreditacion_estimada`, `origen`,
  `texto_extraido` → `Compra`.

## Contrato con #44 (escritura de compras)

La #44 es dueña de guardar una compra, la cola sin red y la subida. Esta spec define lo que la #44 puede dar por
hecho y lo que esta spec le exige:

1. **La #44 genera el `id` de la compra como un UUID en el cliente y lo manda en el insert.** Así el id local y el del
   servidor coinciden y la deduplicación al sincronizar es por `id` (hoy `guardarCompra` usa `n${n}`).
2. `compraAgregada` agrega el id a `compras.pendientes` (lo hace el reducer de esta spec). La #44 despacha
   `compraSubida(id)` cuando el servidor confirma; ese reducer saca el id de `pendientes`.
3. La sincronización nunca borra una compra de `pendientes`. Si el servidor la devuelve, queda la versión del servidor y
   el id sale de `pendientes` en el mismo reducer.
4. `compras.duenoId` lo fija la sincronización. La #44 no lo toca. Si la cuenta cambia, `pendientes` se vacía (no se
   suben compras de una cuenta con la sesión de otra).
5. Cualquier cambio de la #44 a la forma de `EstadoCompras` se anota acá y en su spec.

## Cambios en `Extra`, `sesion` y las acciones (plan)

```ts
type Extra = {
  almacenamiento: Almacenamiento;
  /** `null` si no hay cliente de Supabase (variables faltantes): no se sincroniza. */
  repositorio: RepositorioSincronizacion | null;
  /** El reloj real. La app: `() => new Date()`. Los tests lo controlan. */
  reloj: () => Date;
  /** Estado de coordinación no serializable (en vuelo, inicio del último intento). Vive acá, no en Redux. */
  coordinacion: { enVuelo: boolean; ultimoIntentoMs: number | null };
};

type EstadoSesion = { /* …lo de la spec 008… */ epoca: number /* sube con sesionCerrada; no se persiste */ };

type Rehidratado = { /* …lo de la spec 008… */ ahora: string | null /* real si el corpus guardado tiene marca */ };

// Nueva acción atendida por corpus, compras y sesion en el mismo tick.
type Sincronizado = { corpus: EstadoCorpus; compras: Compra[]; usuarioId: string; ahora: string };
// Nueva acción para #44.
type CompraSubida = string; // id
```

- `sesion.ahora` lo fija `Sincronizado.ahora` y `Rehidratado.ahora`, así el reloj cambia en la misma acción que la
  marca, sin un render con el reloj equivocado.
- `corpus` reduce `Sincronizado` a `payload.corpus`; `compras` aplica el merge (servidor ∪ pendientes no devueltas),
  la poda a la ventana y el chequeo de `duenoId`; `sesion` sube `ahora`.
