# Data model: Flujo directo (spec 012)

Todo es estado del cliente (Redux, ADR-010), salvo dos migraciones chicas en Supabase: el largo del nombre y, para US5, la lectura de `anon` sobre los catálogos y las promociones. No se crea ninguna tabla.

## CompraPorConfirmar (nuevo, slice `porConfirmar`)

```ts
type CompraPorConfirmar = {
  id: string;            // generarId() (UUID); la compra confirmada usa el MISMO id (FR-016)
  usuarioId: string;     // dueño (FR-014)
  comercioId: string;    // del catálogo; una por comercio (FR-012)
  comercioNombre: string;
  medioId: string;       // el medio recomendado que eligió con «Usar»
  monto: number | null;  // el de la simulación, si lo cargó
  creadaEn: string;      // ISO, de sesion.ahora (nunca new Date())
};

type EstadoPorConfirmar = { lista: CompraPorConfirmar[] };
```

**Reglas**

- `monto` es `null` o un número finito mayor a 0, con la misma validación que `montoCambiado`.
- Hay como máximo una por `comercioId`: `porConfirmarCreada` reemplaza la existente y avisa que hubo reemplazo (FR-012).
- Está **vigente** si `ahora − creadaEn < VENCIMIENTO_POR_CONFIRMAR_MS` (48 h, en un único módulo). Los selectores solo exponen las vigentes del usuario de la sesión.
- La **fecha propuesta** al confirmar es `fechaArgentina(creadaEn)` (FR-017).
- Nunca entra a `compras` ni a `selectEntradasMotor`, así que no afecta topes ni recomendaciones (FR-003).

**Transiciones**

```
               «Usar»                      «Guardar compra» (compraAgregada con id = la del registro)
(nada) ──────────────────► vigente ──────────────────────────────────────────► (sale) + Compra (mismo id)
                             │  │
               «Descartar»   │  │  ahora − creadaEn ≥ 48 h
             (sale) ◄────────┘  └────────► vencida: no se muestra; se purga al rehidratar
```

Además salen de la lista: las de otro usuario, al rehidratar; todas, con `sesionCerrada`; y cualquiera cuyo id ya esté en `compras`, al rehidratar (por si la app se cerró entre las dos escrituras).

**Acciones**:

- `porConfirmarCreada(CompraPorConfirmar)`
- `porConfirmarDescartada(id)`
- `porConfirmarPurgadas({ ahora, usuarioId, idsConfirmados })`
- `compraAgregada` (existente): el slice la escucha y saca el id
- `rehidratadoPorConfirmar(lista)`: lectura de su propia clave

**Persistencia**: clave `vuelto.por-confirmar.v1`, `{ version: 1, lista }`. Una entrada inválida se descarta sola y no tira abajo la lista.

## Compra (existente, sin cambios de forma)

Se guarda con `guardarCompra(borrador, intento, id?)`. El parámetro nuevo `id` es opcional: si viene y ya existe una compra con ese id, devuelve la existente sin duplicar. Origen cuando viene de una compra por confirmar:

| Camino | Medio y comercio al guardar | `origen` |
|---|---|---|
| «Ya pagué» | iguales a los de la compra por confirmar | `excepcion` |
| «Ya pagué» | cualquiera distinto | `manual` |
| «Escanear ticket» (desde la tarjeta o aceptando el cruce) | cualquiera | `ticket` |

## Funciones puras nuevas

```ts
borradorDesdePorConfirmar(c: CompraPorConfirmar, ticket: TicketLeido | null, hoy: string): {
  borrador: BorradorCompra;      // ticket primero; medioId = null si el ticket no trae medio
  medioSugerido: string | null;  // el de la simulación, solo si el ticket no trae medio
  fechasPosibles: string[];      // [día de la simulación] o [ese día, hoy] (FR-017)
  avisos: ("monto-distinto" | "medio-distinto")[];  // monto-distinto solo si c.monto !== null
};

origenAlConfirmar(c: CompraPorConfirmar, b: BorradorCompra, vinoDelTicket: boolean): OrigenCompra;

ticketCoincide(c: CompraPorConfirmar, ticket: { comercio: string; fecha: string }): boolean; // FR-013

normalizarComercio(nombre: string): string; // minúsculas, sin tildes ni puntuación, espacios colapsados
```

## EstadoPerfil (existente, cambios)

- `nombre: string | null`: el valor inicial pasa a `null` (antes «Martín» de los fixtures). Se lee y se escribe en `perfiles.nombre_para_mostrar`. El escenario de demo carga «Martín» a propósito.
- **Nuevo** (US5): `borrador: { medios: MedioNuevo[]; comercios: string[]; nombre: string | null; creadoEn: string } | null`. Se persiste con el perfil y se descarta al rehidratar si tiene más de 30 días.

## Servidor

- **Migración `…_perfiles_nombre_largo.sql`**: `alter table perfiles add constraint perfiles_nombre_largo check (nombre_para_mostrar is null or char_length(btrim(nombre_para_mostrar)) between 1 and 40)`. Su test pgTAP prueba que se rechaza un nombre de 41 caracteres.
- **Migración `…_catalogos_lectura_anon.sql`** (US5): `grant select` a `anon` sobre `bancos`, `categorias` y `promociones`, con policies `*_select_anon` de solo lectura (para `promociones`, la misma condición de vigencia que la de `authenticated`). Su test pgTAP prueba que `anon` lee esas tres y no puede escribir en ninguna tabla ni leer `perfiles`, `medios_de_pago`, `comercios_habituales` ni `compras`.
