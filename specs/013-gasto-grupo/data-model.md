# Data Model: Gasto en grupo (spec 013)

## Base (migración `20261115000001_contactos.sql`)

Todo en una sola migración, con su RLS (constitución §IV, RNF-07).

### `public.invitaciones`

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `emisor` | `uuid` not null | FK `auth.users(id) on delete cascade` |
| `token_hash` | `bytea` not null, unique | `sha256` del token; nunca el token |
| `creada_en` | `timestamptz` not null | `default now()` |
| `vence_en` | `timestamptz` not null | `default now() + interval '24 hours'`; `check (vence_en > creada_en)` |
| `usada_en` | `timestamptz` null | `null` = sin usar |

- Índice único parcial `invitaciones_una_vigente (emisor) where usada_en is null`: como mucho una sin usar por cuenta (FR-011). `crear_invitacion` borra las anteriores sin usar antes de insertar.
- RLS: policy `select` `emisor = auth.uid()`. Sin policies de escritura. Grants: `select` a `authenticated`; nada a `anon`; `all` a `service_role`.

### `public.contactos`

| Columna | Tipo | Regla |
|---|---|---|
| `usuario_a` | `uuid` not null | FK `auth.users(id) on delete cascade` |
| `usuario_b` | `uuid` not null | FK `auth.users(id) on delete cascade` |
| `creado_en` | `timestamptz` not null | `default now()` |

- PK `(usuario_a, usuario_b)`; `check (usuario_a < usuario_b)`: simétrico, único por par, sin auto-vínculo (FR-015). Índice en `usuario_b`.
- RLS: policies `select` y `delete` con `auth.uid() in (usuario_a, usuario_b)`. Sin `insert` ni `update` (solo `aceptar_invitacion`). Grants: `select, delete` a `authenticated`; nada a `anon`; `all` a `service_role`.

### Schema `contactos_privado`

`usage` a `authenticated`; revocado a `public` y `anon`. Funciones `security definer`, `set search_path = ''`, dueño `postgres`, `execute` solo a `authenticated` (contrato completo en `contracts/rpc-contactos.md`):

| Función | Devuelve |
|---|---|
| `crear_invitacion()` | `jsonb {token, vence_en}` |
| `ver_invitacion(p_token text)` | `jsonb {estado, quien_invita, vence_en}` |
| `aceptar_invitacion(p_token text)` | `jsonb {estado, contacto}` |
| `mis_contactos()` | `table (id uuid, nombre text, vinculado_desde timestamptz)` |
| `datos_de_contactos(p_contactos uuid[], p_clave text, p_desde date, p_hasta date)` | `table (id uuid, nombre text, medios jsonb, consumos jsonb)` |

En `public`: un envoltorio `security invoker` (`language sql`) por cada una, con la misma firma, más `quitar_contacto(p_contacto uuid) returns void` (`security invoker`, borra por RLS).

### Estados de una invitación

```
            crear_invitacion
                  │
                  ▼
   ┌──────── vigente (usada_en null, now() < vence_en) ────────┐
   │ aceptar (otra cuenta, con nombre, no contacto)            │ now() ≥ vence_en
   ▼                                                           ▼
 usada (usada_en = now())                                   vencida
   │                                      crear_invitacion de nuevo
   └── no vuelve a servir         vigente ──────────────────► borrada
```

Orden de resolución en `ver` y `aceptar`: `inexistente` → `vencida` → `usada` → `propia` → `sin_nombre` (solo en aceptar, por quien acepta) → `ya_contacto` → `valida`.

## Motor (`packages/motor/src/tipos.ts`)

```ts
/** Lo que el motor necesita de una compra para los topes (FR-002, FR-003). `Compra` lo cumple. */
interface ConsumoDeTope {
  id: string;                    // opaco para los contactos (R6)
  promocionId: string | null;
  fecha: FechaISO;
  monto: number;
  descuentoObtenido: number | null;
}

interface CompraDeGrupo extends CompraPropuesta { monto: number }  // entero > 0

type IntegranteDeGrupo =
  | { tipo: "cuenta"; id: string; pide: boolean; mediosDePago: MedioDePago[]; consumos: ConsumoDeTope[] }
  | { tipo: "sin_cuenta"; posicion: number };  // posición de carga, entero ≥ 0

type BaseDeGrupo =
  | { tipo: "con_compras"; comprasRegistradas: number; periodo: PeriodoAcumulable }
  | { tipo: "sin_compras"; periodo: PeriodoAcumulable }
  | { tipo: "sin_tope_informado" }
  | { tipo: "tope_por_compra" };

interface OpcionDeGrupo {
  medioDePagoId: string;
  promocionId: string;           // la principal
  queDa: string;                 // textoPromo sin tope ni variante sin saldo
  reintegroMostrado: number;     // ≥ 1, pesos enteros (escalón $100 si no es quien pide)
  base: BaseDeGrupo;
}

type ResultadoDeIntegrante =
  | { tipo: "cuenta"; id: string; pide: boolean; opcion: OpcionDeGrupo | null; parte: number;
      /** Solo de quien pide: su opción completa y el motivo de descarte principal. */
      propia: { opcion: OpcionDePago | null; descarte: Descarte | null } | null }
  | { tipo: "sin_cuenta"; posicion: number; parte: number };

interface RecomendacionDeGrupo {
  quienPaga: string | null;      // id del integrante con cuenta, o null
  reintegro: number | null;      // reintegro mostrado de quien paga
  total: number;                 // max(0, monto − reintegro)
  integrantes: ResultadoDeIntegrante[];  // en el orden del desempate
}
```

- `recomendarGrupo(compra: CompraDeGrupo, integrantes: IntegranteDeGrupo[], promociones: Promocion[], ahora: Date): RecomendacionDeGrupo`.
- `dividir(total: number, n: number): number[]`: las partes en el orden recibido; las primeras `total % n` llevan +1.
- `GrupoInvalidoError` (`motivo`: `"pocos_integrantes" | "sin_quien_pide" | "varios_piden" | "repetidos" | "demasiados" | "monto"`).
- Orden del desempate (y de `integrantes` en la salida): quien pide; los demás con cuenta por `compararIds(id.toLowerCase())`; los sin cuenta por `posicion`.

## Edge Function: datos internos

- `DatosDeContacto { id, nombre, medios: (MedioDePago & { bancoNombre: string | null })[], consumos: ConsumoDeTope[] }`: lo que devuelve `RepositorioContactos.datosDe`. No sale de la Edge Function.
- La respuesta al teléfono está en `contracts/recomendar-grupo.md`.

## App (`apps/mobile`)

- `Contacto` (sin cambios de forma): `{ id, nombre, iniciales, vinculadoDesde }`.
- Slice `contactos`: `{ cuentaId: string | null; lista: Contacto[]; estado: "inicial" | "cargando" | "listo" | "error" }`. Persistido: `{ cuentaId, lista }`.
- Slice `grupo` (no persistido): el `PedidoGrupo` en armado, con los sin cuenta como `{ posicion, nombre }`. El nombre nunca entra al pedido HTTP.
- `PedidoGrupo` pierde `fecha` y `nombre` del grupo de ejemplo; suma `canal` y `comercio` resuelto (`Comercio` con `categoriaId` no nulo).
- `RecomendacionGrupo` (vista): se arma en `grupo/vista.ts` con la respuesta del servidor más los nombres de los sin cuenta del teléfono.
- `EstadoInvitacion`: suma `"inexistente"` y `"sin-nombre"`.
