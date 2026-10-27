# Data model (cliente): App mobile base y las 18 pantallas

Tipos que la app recibe de la capa de datos (`apps/mobile/src/data/contracts.ts`). Son la
**vista del cliente**: lo que la Edge Function devuelve, nunca el input del motor (ADR-008 §4).
Todos los campos son requeridos; lo ausente es `null` explícito (Principio III), nunca `?:`.

Dinero: enteros en pesos (`number`, sin centavos). Fechas: ISO `YYYY-MM-DD`.

## Estimado (Principio V)

```ts
type Base =
  | { tipo: "compras"; cantidad: number; periodo: "mes" | "semana"; texto: string } // "según 3 compras de octubre"
  | { tipo: "sin-compras"; texto: string }                                         // "Sin compras registradas esta semana: …"
  | { tipo: "contacto"; texto: string };                                           // "según las compras que registró Mateo"

type EstadoTope = "disponible" | "queda-poco" | "agotado" | "sin-base";
```

Reglas: `EstadoTope` lo decide el servidor (umbral ≤30% para `queda-poco`, FR-022). `sin-base` implica
`disponible === null`.

## MedioDePago

| Campo | Tipo | Notas |
|---|---|---|
| id | string | `galicia-visa-credito` |
| banco | string | "Galicia" |
| nombre | string | "Galicia Visa crédito" |
| nombreCorto | string | "Galicia" (botón "Usar Galicia") |
| inicial | string | "G" |
| conCobertura | boolean | `false` → Mercado Pago: sin topes ni reintegros |

## Comercio

`{ id, nombre, inicial, rubro: Rubro, frecuente: boolean }` con
`Rubro = "supermercado" | "combustible" | "gastronomia" | "farmacia" | …` (13 de MODO; los íconos se
mapean por rubro).

## Recomendacion (respuesta de `recomendar`)

| Campo | Tipo | Notas |
|---|---|---|
| comercio | Comercio | |
| dia | string | "hoy miércoles" |
| resultado | `"recomendado" \| "sin-promo"` | |
| medio | MedioDePago \| null | `null` si `sin-promo` |
| razon | string \| null | "20% en supermercados los miércoles" |
| porcentaje | number \| null | 20 |
| topeDisponible | number \| null | ≈ antes de la compra |
| base | Base \| null | |
| monto | number \| null | eco del monto pedido |
| reintegro | number \| null | solo con monto |
| teSale | number \| null | solo con monto |
| topeDespues | `{ disponible: number; estado: EstadoTope } \| null` | solo con monto |
| alternativas | Alternativa[] | |
| proximaPromo | string \| null | para `sin-promo`: "Santander Mastercard: 15% los jueves" |

`Alternativa = { medio: MedioDePago; motivo: string; estado: "no-aplica" | "agotado" | "sin-promo" }`.

## TopeMedio y ResumenTopes (`getTopes`)

`TopeMedio = { medio, rubro, promo: string, nominal: number, periodo: "mes" | "semana", disponible: number | null, estado: EstadoTope, base: Base, reinicio: string, consejo: string | null }`

`ResumenTopes = { mes: string; devolvieron: { monto: number; base: Base }; mediosConTope: number; reinicioMensualEnDias: number; medios: TopeMedio[] }`

Sin campo de "total de topes" (FR-019).

## Compra

`{ id, comercio: Comercio, fecha: string, monto: number, medio: MedioDePago, reintegro: number | null, origen: "ticket" | "excepcion" | "manual" }`

El origen se alinea con `01-data-models.md` (`excepción` sin tilde en código). Etiquetas: Ticket ·
Recomendación · Carga manual.

## LecturaTicket (`leerTicket`)

`{ ok: true; comercio: string | null; fecha: string | null; monto: number | null; medio: MedioDePago | null; textoExtraido: string } | { ok: false; error: string }`

Nunca contiene la imagen. `medio` es `null` en el fixture (RF-10).

## BorradorCompra (sheet Revisá tu compra)

`{ modo: "ticket" | "excepcion" | "manual"; comercio: string | null; fecha: string; monto: number | null; medioId: string | null }`

Transiciones: `medioId === null` o `monto === null` → "Guardar compra" deshabilitado. En modo `excepcion`,
`medioId` arranca con el medio de "Usar <banco>"; en `ticket` y `manual`, `null`.

## Contacto e Invitacion

`Contacto = { id: string; nombre: string; iniciales: string }` — **sin** tope, compras ni medios
(FR-023; test que lo verifica).

`Invitacion = { link: string; venceEn: string; usoUnico: true }` (Invitar).

`VistaInvitacion = { estado: "valida" | "vencida" | "usada" | "propia" | "ya-contacto"; quienInvita: string | null; comparte: string[]; noComparte: string[]; sePuedeDeducir: string }` (Aceptar).

## Grupo

`IntegranteGrupo = { tipo: "vos" } | { tipo: "contacto"; contactoId: string } | { tipo: "sin-cuenta"; nombre: string }`

`RecomendacionGrupo`:

| Campo | Tipo | Notas |
|---|---|---|
| nombre | string \| null | "Cena del sábado" |
| monto | number | 41000 |
| quienPaga | `{ nombre: string; esVos: boolean }` | "Mateo" |
| medio | string | "su Provincia Visa débito" (solo el de quien paga) |
| reintegro | number | ≈5000 |
| base | Base | tipo `contacto` |
| partePorPersona | number | ≈9000 |
| integrantes | FilaIntegrante[] | |

`FilaIntegrante = { nombre: string; iniciales: string | null; esVos: boolean; detalle: string }` —
`detalle` es texto ya armado por el servidor ("sin reintegro en esta compra · Lucía no tiene compras registradas:
sin base", "Sin cuenta: no conocemos su tope"). Para Vos puede nombrar el medio propio.

## PerfilLocal (dispositivo)

`{ onboardingCompleto: boolean; medios: string[]; comercios: string[]; cuenta: { email: string | null; proveedor: "email" | "apple" } | null }` en AsyncStorage. Sin datos sensibles.
