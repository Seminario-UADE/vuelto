# Data Model: App — motor en el dispositivo y store de Redux

Todos los tipos son datos planos y serializables (Redux los exige). Lo ausente es `null`, sin
campos opcionales (Principio III). Los tipos del motor se importan de `@vuelto/motor`.

## Estado (`RootState`)

```ts
type EstadoSesion = {
  cuenta: { email: string | null; proveedor: "email" | "apple" } | null; // persistido
  ahora: string;          // ISO 8601 con zona, p. ej. "2026-10-14T12:00:00-03:00". No persistido
  aviso: string | null;   // toast pendiente. No persistido
  escenario: "normal" | "mes-vacio" | "ticket-ilegible"; // desarrollo. No persistido
  hidratado: boolean;     // ya se leyó el almacenamiento. No persistido
};

type EstadoPerfil = {     // persistido
  onboardingCompleto: boolean;
  medios: string[];       // ids del catálogo de medios de la app
  comercios: string[];    // ids del catálogo de comercios
  invitacionPendiente: string | null;
};

type EstadoCorpus = {     // persistido
  promociones: Promocion[];          // forma del motor
  cargadoEn: string | null;          // ISO; con los datos de ejemplo, el instante del reloj fijo
};

type CompraRegistrada = Compra;      // forma del motor (incluye origen y textoExtraido)
type EstadoCompras = { lista: CompraRegistrada[] }; // persistido, más nueva primero

type EstadoSimulacion = { comercioId: string | null; monto: number | null }; // no persistido

type EstadoContactos = {             // no persistido
  lista: Contacto[];                 // vista de contracts.ts
  grupo: PedidoGrupo | null;         // grupo en armado
};
```

Nada de esto es derivado. La recomendación, los topes, el resumen de compras y el perfil de vista
salen de selectores (`contracts/store.md`).

## Persistencia (`vuelto.store.v1`)

```ts
type Persistido = {
  version: 1;
  perfil: EstadoPerfil;
  corpus: EstadoCorpus;
  compras: EstadoCompras;
  cuenta: EstadoSesion["cuenta"];
};
```

- Se escribe después de cada acción que cambia `perfil`, `corpus`, `compras` o `sesion.cuenta`
  (listener de RTK, solo si cambió alguna de esas referencias).
- Al rehidratar, cada parte se valida por separado (forma mínima: tipos de los campos). Una parte
  inválida o una `version` distinta deja esa parte en su estado inicial.
- No contiene nada derivado (FR-010): un test lo verifica serializando lo que se escribe.
- `perfil-local.ts` usaba `vuelto.perfil.v1`. Al rehidratar, si no existe `vuelto.store.v1` y sí
  la clave vieja, se toman de ella `onboardingCompleto`, `medios`, `comercios`,
  `invitacionPendiente` y `cuenta`, y se borra (quien ya hizo el onboarding no lo repite).

## Datos de ejemplo con la forma del motor (`fixtures.ts`)

Reloj: `2026-10-14T12:00:00-03:00` (miércoles). Canal de la compra propuesta: `presencial`.

### Medios → `MedioDePago`

| Id (app) | `bancoId` | `tipo` | `red` | ¿Entra al perfil del motor? |
|---|---|---|---|---|
| `galicia-visa-credito` | `galicia` | `credito` | `visa` | sí |
| `santander-mastercard-credito` | `santander` | `credito` | `master` | sí |
| `provincia-visa-debito` | `provincia` | `debito` | `visa` | sí |
| `macro-visa-debito` | `macro` | `debito` | `visa` | sí |
| `bbva-visa-credito` | `bbva` | `credito` | `visa` | sí (no hay promos de BBVA) |
| `mercado-pago` | — | — | — | no: billetera sin banco ni red; inventarlos violaría el Principio III |

Los `bancoId` de ejemplo son slugs, no los UUID de MODO: no hay base todavía (#34).

### Promociones → `Promocion`

Comunes a las cuatro: `fuente: "manual"`, `comercio: null`, vigencia del 2026-10-01 al
2026-12-31, `montoMinimo: null`, `jurisdiccion: "nacional"`, `canal: "ambos"`,
`acumulable: false`, `tope.alcance: "exclusivo"`, `tope.grupoTopeId: null`.

| Id | `bancoId` | `categoriaId` | `%` | `tarjetas` | `dias` | `tope` |
|---|---|---|---|---|---|---|
| `promo-galicia-super-mie` | `galicia` | 1 | 20 | crédito `visa` | `["mie"]` | $10.000 mensual |
| `promo-santander-nafta-jue` | `santander` | 5 | 15 | crédito `master` | `["jue"]` | $8.000 mensual |
| `promo-provincia-gastro-sab` | `provincia` | 2 | 25 | débito `visa` | `["sab"]` | $5.000 semanal |
| `promo-macro-farmacias` | `macro` | 4 | 15 | débito `visa` | `null` | $6.000 mensual |

`PromoFixture` (la forma vieja, con `consumido` escrito a mano) se borra: el consumo sale de las
compras.

### Compras de octubre → `Compra`

Mismos ids, fechas, montos y medios que hoy. `comercio` es el nombre y `categoriaId` el del rubro del
comercio. `descuentoObtenido` es el reintegro que hoy tiene cada compra (lo informó el banco), y
`reintegroEsperado` y `fechaAcreditacionEstimada` son `null`.

| Compra | `promocionId` | `descuentoObtenido` |
|---|---|---|
| c1, c2, c8, c9 (Santander, combustible) | `promo-santander-nafta-jue` | 900, 1.200, 600, 3.000 |
| c3, c10 (Macro, Farmacity) | `promo-macro-farmacias` | 3.600, 2.400 |
| c5, c6, c7 (Galicia, súper) | `promo-galicia-super-mie` | 700, 1.000, 1.800 |
| c4 (Provincia, Coto) | `null` | `null` |

Consumo resultante el 14/10: Galicia 3.500 (3 compras) · Santander 5.700 (4) · Macro 6.000 (2) ·
Provincia 0 (sin compras esta semana).

### Integrantes del grupo (stand-in de la Edge Function)

| Integrante | Medios | Compras del período |
|---|---|---|
| Vos (Martín) | los cuatro medios con promos de la tabla de medios | las de octubre de arriba |
| Lucía | `galicia-visa-credito` | ninguna |
| Mateo | `provincia-visa-debito` | una: 2026-10-12, Coto, $8.000, sin promo |

El stand-in lee los datos "del servidor" (estos), no el store: en producción la Edge Function lee
la base. Se evalúa con el reloj en el mediodía de la fecha del grupo (`2026-10-17T12:00:00-03:00`
para la cena del sábado).

## Vista de topes (`TopeMedio`, `contracts.ts`)

Se arma con `estimarTopes()` + `formatearEstimacion()`. Cambia el contrato de vista:

- `+ cifra: string | null` — la cifra del motor ("≈$6.500", "menos de $100" o `null`). La tarjeta
  la muestra en vez de redondear por su cuenta.
- `estado`: `disponible`→`disponible`, `queda_poco`→`queda-poco`, `agotado`→`agotado`,
  `sin_compras`→`sin-base`.
- `disponible`: `restante` del motor; `null` si el estado es `sin_compras`.
- `base`: `{ tipo: "compras", cantidad, periodo, texto }` con el texto del motor, o
  `{ tipo: "sin-compras", texto }`.
- `reinicio`: "vuelve el D/M" si está agotado, "se reinicia el D/M" o "se reinicia el lunes" (semanal),
  con el día siguiente al fin del período.
- `promo`: "20% en supermercados · los miércoles", con el día de la vigencia.
- `consejo`: plantilla, solo para el tope disponible de una promo que aplica hoy:
  "Hoy es miércoles: en supermercados, con Galicia te quedan ≈$6.500 de tope." Uno como máximo.
