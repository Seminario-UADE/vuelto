# API / routes

Todavía no hay Edge Functions implementadas. Este documento fija el **contrato que la app ya
consume** a través de `apps/mobile/src/data/api.ts` (hoy con datos de ejemplo), para que el backend
(#40, #43/#45, #56) lo implemente sin tocar las pantallas. Tipos completos:
`apps/mobile/src/data/contracts.ts` y `specs/002-app-mobile-pantallas/data-model.md`.

Todas las llamadas usan el JWT del usuario (ADR-008 §4). Ninguna usa la service role key, que queda
solo para la ingesta (RNF-05).

| Función del cliente | Endpoint previsto | Request | Response |
|---|---|---|---|
| `recomendar(comercioId, monto)` | `POST /functions/v1/recomendar` | `{ comercioId, monto: number \| null }` | `Recomendacion` |
| `getTopes()` | `POST /functions/v1/topes` | — | `ResumenTopes` (sin total agregado) |
| `getCompras(origen)` | `select` sobre `compra` (RLS del dueño) | `origen: "ticket" \| "excepcion" \| "manual" \| "todas"` | `ResumenCompras` |
| `guardarCompra(borrador)` | `insert` sobre `compra` | `BorradorCompra` con medio y monto | `Compra` |
| `leerTicket()` | `POST /functions/v1/leer-ticket` | imagen en el body; **no se persiste** | `LecturaTicket` (`medio: null` si el ticket no lo dice) |
| `getPerfil()` | `select` sobre `perfil` (RLS) | — | `Perfil` |
| `getMediosDisponibles()` | `select` sobre el catálogo de medios | — | `MedioDePago[]` |
| `getComerciosFrecuentes()` / `buscarComercios(q)` / `getComercio(id)` | `select` sobre `comercio` | `q` | `Comercio[]` / `Comercio` |
| `getContactos()` | `select` sobre `contacto` (RLS) | — | `Contacto[]` (nombre e iniciales, nunca topes ni compras) |
| `crearInvitacion()` | `POST /functions/v1/invitacion` | — | `Invitacion` (un uso, 24 h; se guarda solo el hash del token) |
| `verInvitacion(token)` | RPC `ver_invitacion(token)` (`security definer`) | `token` | `VistaInvitacion` |
| `aceptarInvitacion(token)` | RPC `aceptar_invitacion(token)` (`security definer`) | `token` | `{ contacto }` |
| `quitarContacto(id)` | `delete` sobre `contacto` (rompe el vínculo para los dos) | `id` | `{ ok: true }` |
| `recomendarGrupo(pedido)` | `POST /functions/v1/recomendar-grupo` | `PedidoGrupo` | `RecomendacionGrupo` |

Reglas del contrato:

- Toda cifra estimada viaja con su `Base` (Principio V); el cliente no arma bases ni calcula cifras.
- Los textos de razón, motivo y detalle de cada integrante son plantillas determinísticas del
  servidor (Principio II). Ni la app ni un LLM los generan.
- El estado del tope (`disponible`, `queda-poco` con ≤30% del nominal, `agotado`, `sin-base`) lo
  decide el servidor.
- Ninguna respuesta de grupo o contacto trae el tope, la cantidad de compras, las compras ni los
  medios no recomendados de otra persona (ADR-008 §3).
- `leerTicket` es la única llamada que recibe una imagen. La Edge Function la manda a Gemini y la
  descarta; solo se guarda el texto extraído (Principio IV).
