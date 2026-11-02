# Data model: Registrar una compra — borrar, promo aplicada y subida

Tipos de la app (TypeScript strict, sin clases, `T | null` en lugar de opcionales). Ubicación: `apps/mobile/src/data/compras/`.

## Operación

```ts
type OperacionBase = {
  /** Id de la operación; sirve de clave de lista y de orden de creación. */
  id: string;
  /** Usuario de la sesión de Supabase al encolar; null si todavía no había cuenta. */
  dueno: string | null;
  /** Fecha de la compra (YYYY-MM-DD): el techo de 90 días se mide contra esta. */
  fecha: string;
  /** Instante en que se encoló (ISO, del reloj del store). Solo desempata el orden. */
  encoladaEn: string;
  estado: EstadoOperacion;
};

type EstadoOperacion =
  | { tipo: "pendiente" }
  | { tipo: "enviando" }
  | { tipo: "rechazada"; causa: string }          // texto corto, sin datos del usuario
  | { tipo: "bloqueada"; motivo: "medio" | "promo" | "decision" };

type OperacionGuardar = OperacionBase & { tipo: "guardar"; compra: Compra };   // Compra del motor
type OperacionBorrar  = OperacionBase & { tipo: "borrar";  compraId: string };
type Operacion = OperacionGuardar | OperacionBorrar;
```

### Estado de la cola (slice `cola`)

```ts
type EstadoCola = {
  operaciones: Operacion[];        // persistido (vuelto.cola.v1)
  hidratada: boolean;              // no persistido: antes de leer, no se escribe
  vaciando: boolean;               // no persistido: exclusión mutua del vaciado
  volver: boolean;                 // no persistido: se pidió vaciar durante un vaciado
  subidaConectada: boolean;        // no persistido: hay repositorio, sesión y mapeos
};
```

`sesionCerrada` lo devuelve a `[]` y `hidratada` queda como está.

### Persistido

```ts
type ColaPersistida = { version: 1; operaciones: Operacion[] };
```

Validación por parte al leer (como `persistencia.ts`): una cola inválida se descarta entera y se reconstruye vacía; las operaciones `enviando` se leen como `pendiente` (el envío no sobrevive a un cierre).

## Transiciones

```text
guardar:  pendiente ──envío──▶ enviando ──éxito──▶ (se quita)
                         ▲          │ transitorio
                         └──────────┘
                         │          └─ inválido ──▶ rechazada ──Reintentar──▶ pendiente
                         └─ sin medio/promo del servidor ──▶ bloqueada(medio|promo) ──llega el mapeo──▶ pendiente
          (usuario no adopta las de dueno=null) ──▶ bloqueada(decision)   [no se reevalúa]

guardar pendiente + borrar de la misma compra ─▶ ambas se quitan, sin servidor
guardar enviando + borrar                    ─▶ el borrar queda detrás; se envía tras el guardar
borrar:   pendiente ─▶ enviando ─▶ éxito (cero filas incluido) ─▶ se quita
```

## Fila de la cuenta (`public.compras`)

Ver [contracts/fila-compras.md](contracts/fila-compras.md). Resumen de la conversión `Compra → fila`:

| Compra (motor) | Columna | Regla |
|---|---|---|
| `id` | `id` (uuid) | tal cual; debe ser un UUID |
| (sesión) | `user_id` | no se envía: lo completa `auth.uid()` |
| `fecha` | `fecha` | tal cual |
| `monto` | `monto` | `> 0` |
| `comercio` | `comercio` | no vacío tras recortar |
| `categoriaId` | `categoria_id` | tal cual o `null` |
| `medioDePagoId` (app) | `medio_de_pago_id` | **uuid de `medios_de_pago` del usuario** (entrada del mapeo, #41); sin mapeo → bloqueada(medio) |
| `promocionId` (app) | `promocion_id` | **uuid de `promociones` del corpus del servidor** (mapeo, #42); sin mapeo → bloqueada(promo); `null` si no hay promo |
| `descuentoObtenido` | `descuento_obtenido` | tal cual |
| `reintegroEsperado` | `reintegro_esperado` | tal cual |
| `fechaAcreditacionEstimada` | `fecha_acreditacion_estimada` | tal cual |
| `origen` | `origen` | `ticket \| excepcion \| manual` |
| `textoExtraido` | `texto_extraido` | tal cual; nunca una imagen |

## Borrador de compra (cambio)

```ts
type BorradorCompra = {
  modo: OrigenCompra;
  comercio: string | null;
  fecha: string;
  monto: number | null;
  medioId: string | null;
  textoExtraido: string | null;
  /** false = el usuario quitó la promo propuesta. Por defecto true. */
  usarPromo: boolean;
};
```

## Promo propuesta

```ts
type PromoPropuesta = {
  medioId: string;
  fecha: string;
  /** Todas las acumulables de la opción; vacío si no hay ninguna. */
  promociones: { promocionId: string; nombre: string }[];
  /** Estimado del motor para esta compra; null sin monto o sin promo. */
  reintegro: number | null;
  /** Texto de la base del estimado («según N compras registradas»). */
  base: string | null;
};
```

## Contexto de subida (entrada del vaciado)

```ts
type ContextoSubida = {
  userId: string | null;
  medioRemoto(medioAppId: string): string | null;     // #41
  promoRemota(promoAppId: string): string | null;     // #42
};
```

Con `userId = null` no se intenta ningún envío.
