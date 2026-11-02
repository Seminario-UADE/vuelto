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

// EstadoCompras NO cambia: { lista: Compra[] } (la cola de pendientes es de #44, un slice aparte `cola`).
```

- `corpus.marca === null` ⇔ la app usa los datos y el reloj de ejemplo (FR-016).
- `cargadoEn` desaparece: con los datos de ejemplo era el instante del reloj fijo y no significa nada.
- `sesionCerrada`: `compras` vuelve a las de ejemplo (ya lo hace). El `corpus` no se toca (es público).

## Persistencia

| Clave | Contenido | Se escribe |
|---|---|---|
| `vuelto.store.v1` | `{ version: 1, perfil, compras: { lista } }` | Cuando cambia `perfil` o `compras` (la sesión no se guarda acá: la guarda el cliente de Supabase, #40) |
| `vuelto.corpus.v1` | `{ version: 1, promociones, marca, sincronizadoEn }` | Cuando cambia `corpus`. Si falla, la marca guardada no avanza |

- `vuelto.store.v1` **sigue en `version: 1`** (subirla borraría el perfil de todos). Un `corpus` dentro de
  ese valor se ignora.
- `compras.lista` se guarda **filtrada al período** (como hoy). Las pendientes de subir viven en la cola de #44
  (`vuelto.cola.v1`), que las persiste completas aparte.
- Un guardado sin `vuelto.corpus.v1`, o inválido, se lee como "nunca sincronizó" (`marca: null`, corpus de ejemplo).
  Un `vuelto.corpus.v1` inválido de un usuario que ya tenía cuenta sincronizada deja el corpus vacío con `marca: null`.

## Repositorio de sincronización (interfaz inyectada en `Extra`)

```ts
type FilaPromocion = { /* columnas de public.promociones, snake_case */ };
type FilaCompra = { /* columnas de public.compras */ };

/** `valor` = el texto exacto de la columna de orden (`actualizada_en` o `creada_en`) de la última fila. */
type Cursor = { valor: string; id: string } | null;

interface RepositorioSincronizacion {
  /** `auth.uid()` de la sesión, o `null` si no hay. */
  usuarioId(): Promise<string | null>;
  /** Hasta `limite` promos, ordenadas por (actualizada_en, id), posteriores al cursor y a `desde`. Excluye `otra_provincia`. */
  promociones(f: { desde: string | null; vigenteDesde: string | null; cursor: Cursor; limite: number; signal: AbortSignal }): Promise<FilaPromocion[]>;
  /** Ids de las promos con `vigencia_hasta >= vigenteDesde`, excluida `otra_provincia`. */
  idsDePromociones(vigenteDesde: string, signal: AbortSignal): Promise<string[]>;
  /** Compras del usuario con `fecha >= desde`, por cursor (`creada_en`, `id`). */
  compras(f: { desde: string; cursor: Cursor; limite: number; signal: AbortSignal }): Promise<FilaCompra[]>;
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

Acordado el 02/11/2026 con la sesión de #44 (spec 010, rama `claude/elegant-hermann-7c2dcf`), que ya tiene su código:

1. **`EstadoCompras` sigue siendo `{ lista }`.** No hay `pendientes`, `duenoId` ni `compraSubida`: la cola de #44 (slice
   `cola`, clave `vuelto.cola.v1`) dice qué falta subir, de quién es y en qué estado está, y se escribe antes que `compras`.
2. **UUID del cliente**: `guardarCompra` usa `Extra.generarId` y manda el id en el insert (ya está en #44). Así el id local
   y el del servidor coinciden y la reconciliación deduplica por `id`.
3. **La costura**: la sincronización mezcla con una sola función, `reconciliarCompras(servidor, actuales, desde)` en
   `apps/mobile/src/sync/compras.ts`. Hoy: `servidor ∪ compras locales que no son de ejemplo y que el servidor no
   devolvió`. Cuando #44 llegue a `main`, el cuerpo pasa a `aplicarPendientes(servidor, getState().cola.operaciones,
   usuarioId)` (función pura de #44: una guardada pendiente que el servidor no tiene se agrega una vez; si ya llegó, gana la
   copia local; un borrado pendiente oculta la fila del servidor; las operaciones de otro dueño se ignoran).
4. El thunk llama a la costura **sincrónicamente justo antes de despachar `sincronizado`**, con el estado de ese momento:
   una compra guardada mientras volaba el pedido no se pierde.
5. **Se relee el período completo en cada sincronización** (la tabla `compras` no tiene `actualizada_en` ni borrado lógico:
   un borrado hecho en otro dispositivo solo se ve así).
6. `sincronizado` lleva la lista ya reconciliada y el reducer de `compras` hace `lista = payload.compras`.
7. Archivos compartidos, de forma aditiva: `store/index.ts` (`Extra` suma `repositorio`, `reloj` y `coordinacion`),
   `store/compras.ts` (solo el caso `sincronizado`) y `store/prueba.ts` (tercer parámetro `extra`). Si #44 también suma
   parámetros a `crearStore` o `storeDePrueba`, el conflicto es de una línea: se suman los dos.
8. Limitaciones **hasta que #44 esté en `main`** (las cierra `aplicarPendientes`): la costura no distingue dueños y una
   compra local de fuera del período no sobrevive a un reinicio.

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

// Nueva acción atendida por corpus, compras y sesion en el mismo tick. `compras` ya viene reconciliada.
type Sincronizado = { corpus: EstadoCorpus; compras: Compra[]; ahora: string };
```

- `sesion.ahora` lo fija `Sincronizado.ahora` y `Rehidratado.ahora`, así el reloj cambia en la misma acción que la
  marca, sin un render con el reloj equivocado.
- `corpus` reduce `Sincronizado` a `payload.corpus`; `compras` hace `lista = payload.compras`; `sesion` sube `ahora`.
- **Implementado así** (spec 009, rama `claude/magical-knuth-39fc08`): `apps/mobile/src/store/acciones.ts`
  (`Sincronizado`, `Rehidratado.ahora`), `store/{corpus,compras,sesion}.ts`, `store/index.ts` (`Extra`) y
  `store/persistencia.ts` (dos claves). `Extra.coordinacion` guarda `enVuelo` y `ultimoIntentoMs` fuera de Redux.
