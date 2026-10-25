# Data Model: Pantalla «¿Con qué pago?» y Edge Function `recomendar`

No se agregan tipos al contrato del dominio (`packages/motor/src/tipos.ts`). Esta feature usa
los existentes y define tipos propios de la capa del servidor.

## Entrada: `CompraPropuesta` (contrato #33, sin cambios)

| Campo | Tipo | Validación del servidor (FR-019) |
|---|---|---|
| `comercio` | `string \| null` | `null`, o texto de 1 a 100 caracteres después de `trim()`. Se pasa al motor ya recortado. No se verifica contra el corpus |
| `categoriaId` | `number` | Entero; debe existir en `categorias` (`RepositorioCategorias.existe`) |
| `monto` | `number` | Finito, `> 0`, `≤ 100.000.000`, a lo sumo 2 decimales (`Math.round(m * 100) === m * 100` con tolerancia de redondeo binario) |
| `canal` | `"presencial" \| "online"` | Uno de esos dos valores |
| *(otros)* | — | Cualquier campo extra → inválido, `campo` = nombre del primero |

Orden de validación (el primero que falla es el `campo` informado): body es objeto JSON →
campos extra → `categoriaId` → `monto` → `canal` → `comercio`. Si el body no es JSON o no es un
objeto, `campo` = `"body"`.

## Salida: `Recomendacion` (contrato #33, sin cambios)

La devuelve el motor y el servidor la serializa tal cual. Ver `specs/002-motor-recomendar/`.

## Tipos de la capa del servidor (`supabase/functions/_shared/`)

```ts
type UsuarioId = string; // auth.users.id

interface Autenticador {
  /** `null` si no hay usuario logueado (sin header, token inválido o anon key). */
  usuarioDe(req: Request): Promise<UsuarioId | null>;
}

interface RepositorioMediosDePago { deUsuario(usuarioId: UsuarioId): Promise<MedioDePago[]>; }
interface RepositorioPromociones { publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]>; }
interface RepositorioCompras { delUsuarioEntre(usuarioId: UsuarioId, desde: FechaISO, hasta: FechaISO): Promise<Compra[]>; }
interface RepositorioCategorias { existe(categoriaId: CategoriaId): Promise<boolean>; }

type ResultadoValidacion =
  | { ok: true; compra: CompraPropuesta }
  | { ok: false; campo: string };

type CodigoError = "invalido" | "no_autenticado" | "perfil_sin_medios" | "metodo_no_permitido" | "interno";
```

## Derivación de fechas (FR-020, research R6)

| Valor | Cómo se obtiene |
|---|---|
| `ahora` | `reloj()` del handler, una sola vez por pedido |
| `hoy` | `fechaArgentina(ahora)` del motor |
| `inicioDeMes` | `hoy.slice(0, 8) + "01"` |
| Promociones | `publicadasVigentes(compra.categoriaId, hoy)`: `vigencia.desde ≤ hoy ≤ vigencia.hasta`, sin mirar `dias` |
| Compras | `delUsuarioEntre(usuarioId, inicioDeMes, hoy)`, ambos incluidos |
| `Perfil` | `{ nombreParaMostrar: null, mediosDePago, comerciosHabituales: [] }` (el motor no usa los otros dos campos) |

## Mapeo a tablas (para cuando cierre la #34, provisorio)

Los nombres de columna los fija la #34; esto es lo que cada repositorio necesita leer.

| Repositorio | Tabla | Filtro | Mapea a |
|---|---|---|---|
| Medios de pago | `medios_de_pago` | `usuario_id = :usuarioId` | `MedioDePago` (`id`, `bancoId`, `tipo`, `red`) |
| Promociones | `promociones` | `categoria_id = :c and vigencia_desde <= :hoy and vigencia_hasta >= :hoy` (solo publicadas: la tabla ya es la base validada) | `Promocion` completa |
| Compras | `compras` | `usuario_id = :u and fecha between :desde and :hasta` | `Compra` |
| Categorías | `categorias` | `id = :c` | `boolean` |
| Comercios (vista, R10) | `comercios_corpus` | lectura directa desde la app | `{ comercio, categoriaId }` |
