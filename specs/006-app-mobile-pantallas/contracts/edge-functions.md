# Contratos cliente ↔ servidor

> Actualizado el 27/10/2026: al traer `main`, `recomendar` ya tenía contrato real
> (`specs/004-recomendar-pantalla/contracts/recomendar.md`). La app lo consume tal cual y
> lo traduce a la vista; el resto sigue siendo previsto.

La app llama a estas funciones de `src/data/api.ts`. Hoy devuelven fixtures; cuando existan las Edge
Functions (#40, #43/#45, #56) cambia solo el cuerpo de cada función. Tipos en `../data-model.md`.
Todas usan el JWT del usuario (ADR-008 §4); ninguna usa la service role key.

| Función del cliente | Endpoint previsto | Request | Response |
|---|---|---|---|
| `recomendar(comercioId, monto)` | `POST /functions/v1/recomendar` (**ya existe**, #43) | `{ comercio, categoriaId, monto, canal }`; `monto: null` es la extensión pendiente | `RespuestaRecomendar` (forma del motor), traducida a la vista por `vista-recomendacion.ts` |
| `getComerciosFrecuentes()` | `GET` sobre `perfil_comercio` (RLS del dueño) | — | `Comercio[]` |
| `buscarComercios(q)` | `GET` sobre `comercio` | `{ q: string }` | `Comercio[]` |
| `getTopes()` | `POST /functions/v1/topes` | — | `ResumenTopes` |
| `getCompras(filtro)` | `GET` sobre `compra` (RLS del dueño) | `{ origen: Origen \| "todas" }` | `{ devolvieron: { monto; base }; compras: Compra[] }` |
| `leerTicket()` | `POST /functions/v1/leer-ticket` | imagen en el body, **no** se persiste | `LecturaTicket` |
| `guardarCompra(borrador)` | `POST` sobre `compra` | `BorradorCompra` completo | `Compra` |
| `getMediosDisponibles()` | `GET` catálogo | — | `MedioDePago[]` |
| `getContactos()` | `GET` sobre `contacto` | — | `Contacto[]` |
| `crearInvitacion()` | `POST /functions/v1/invitacion` | — | `Invitacion` |
| `verInvitacion(token)` | RPC `ver_invitacion(token)` (security definer) | `{ token }` | `VistaInvitacion` |
| `aceptarInvitacion(token)` | RPC `aceptar_invitacion(token)` | `{ token }` | `{ contacto: Contacto }` |
| `quitarContacto(id)` | `DELETE` sobre `contacto` | `{ id }` | `{ ok: true }` |
| `recomendarGrupo(input)` | `POST /functions/v1/recomendar-grupo` | `{ nombre: string \| null; monto: number; integrantes: IntegranteGrupo[] }` | `RecomendacionGrupo` |

Reglas del contrato:

- Toda cifra estimada viaja con su `Base`; el cliente no arma bases.
- Los textos de razón, motivo y detalle de integrantes son plantillas determinísticas del servidor
  (Principio II), no los arma la app ni un LLM.
- Ninguna respuesta de grupo o contacto trae topes, cantidad de compras, compras ni medios no
  recomendados de otra persona (ADR-008 §3).
- `leerTicket` es la única que recibe una imagen. En esta feature no se llama con imágenes reales
  (FR-015).
