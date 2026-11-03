# API / routes

Endpoints propios del backend: Edge Functions de Supabase en
`supabase/functions/`, **solo donde hay un secreto o datos de otros usuarios**
(ADR-010). El resto del acceso a datos (perfil, registrar compra, historial,
catálogos, corpus de promociones) lo hace la app directo con `supabase-js` y el
RLS, sin código propio (ADR-009). La recomendación y los topes **no son
endpoints**: los calcula la app con el motor (ADR-010, constitución §II).

## Endpoints

| Endpoint | Issue | Qué hace | Contrato |
|---|---|---|---|
| Extracción de ticket | #48 | Gemini sobre la imagen, sin guardarla (pendiente) | — |
| `POST /functions/v1/recomendar-grupo` | #54 | Gasto en grupo: lee datos de contactos vinculados (ADR-008 §4) y llama al motor (pendiente) | — |
| Invitaciones | — | Edge Function y RPC `security definer` (ADR-008 §4) | — |
| `POST /functions/v1/recomendar` | #43 | **Fuera del camino de la app (ADR-010 §5).** Implementada y testeada con repositorios en memoria (PR #71); no se sigue invirtiendo en ella y se borra o se reutiliza para el grupo | `specs/004-recomendar-pantalla/contracts/recomendar.md` |
| `GET /functions/v1/topes` | #45 | **Descartado:** los topes los estima la app con el motor (`estimar…`) | — |

## Estructura de una Edge Function (ADR-009)

```text
supabase/functions/
├── _shared/                 # código común de todas las funciones
│   ├── autenticar.ts        # Autenticador: usuario logueado vía Supabase Auth (getUser)
│   ├── http.ts              # respuestas JSON y contrato de errores
│   ├── repositorios.ts      # interfaces de acceso a datos
│   ├── validacion.ts        # validación de bodies
│   ├── errores.ts
│   ├── memoria/             # repositorios en memoria (tests)
│   └── supabase/            # repositorios sobre Postgres (issue #34)
└── <funcion>/
    ├── deno.json            # import map: @vuelto/motor → packages/motor/src
    ├── index.ts             # composition root + Deno.serve, sin lógica
    ├── handler.ts           # rol de controller: HTTP, sesión, validación, códigos
    └── servicio.ts          # caso de uso: junta datos y llama al motor
```

- **Contrato de errores** común: 400 `{error:"invalido", campo}`, 401
  `no_autenticado`, 405 `metodo_no_permitido`, 422 (de negocio, por ejemplo
  `perfil_sin_medios`), 500 `interno` sin detalles. Los registros solo
  incluyen el tipo de error, nunca datos del usuario (`privacidad.md`).
- **Sesión**: el cliente de Supabase se crea por pedido con el JWT del
  usuario para que aplique el RLS. Nunca la service role key.
- **Fechas**: "hoy" y el mes se calculan con `fechaArgentina` del motor a
  partir del mismo `ahora` que recibe el motor, nunca con `current_date` de
  Postgres (UTC).
- **Tests**: Vitest en Node (`npm run test -w @vuelto/supabase`), con
  repositorios en memoria. `index.ts` queda fuera de `tsc` y del lint porque
  usa el global `Deno`.
- **Deploy**: `supabase functions deploy <funcion> --use-api` (permite
  importar `packages/motor`, fuera de `supabase/`).

## Qué consume la app (`apps/mobile/src/data/api.ts`)

> **ADR-010, implementado en la issue #81.** La recomendación, los topes, el
> perfil y las compras ya no son llamadas: los calcula el motor en la app, en
> selectores del store de Redux (`docs/architecture/03-frontend.md` §Estado).
> `api.ts` queda para lo que sí sale a la red.

La app llama a cada endpoint desde una función de `api.ts`. Hoy responde con
fixtures **con la misma forma** que el endpoint real; conectar un endpoint es
cambiar el cuerpo de esa función.

| Función | Endpoint | Estado |
|---|---|---|
| `leerTicket({ ilegible })` | Extracción de ticket (#48) | Mock; en esta versión no hay captura real. `ilegible` es el escenario de desarrollo |
| `recomendarGrupo(pedido)` | `POST /functions/v1/recomendar-grupo` (#56) | Reemplazo local (`grupo-simulado.ts`) que evalúa a cada integrante con el motor; de los contactos solo viaja lo de ADR-008 §3 |
| `verInvitacion`, `aceptarInvitacion`, `quitarContacto`, `crearInvitacion` | Edge Function y RPC `security definer` (ADR-008 §4) | Mock |
| Escribir y borrar compras (`public.compras`) | Supabase directo con RLS (ADR-009), desde la cola de subida (spec 010) | Repositorio escrito y probado contra Supabase local; **sin conectar** hasta #40, #41 y #42 |
| Catálogos (`getCatalogoComercios`, `buscarComercios`, `getComercio`) | Supabase directo con RLS (ADR-009) | Fixtures |
| Medios de pago y bancos (`perfil/datos.ts`, thunks de `store/perfil-remoto.ts`) | Supabase directo con RLS (ADR-009) | Implementado (issue #41) |
| `recomendar`, `getTopes`, `getCompras`, `guardarCompra`, `getPerfil` | — | **Salieron de `api.ts`**: selectores y el thunk `guardarCompra` del store. La Edge Function `recomendar` queda fuera del camino de la app (ADR-010 §5); la sincronización de compras y corpus es #42 |
| `crearInvitacion`, `verInvitacion`, `aceptarInvitacion` | Edge Function y RPC `security definer` (ADR-008 §4) | Mock |

Tipos: `apps/mobile/src/data/contracts.ts` (la respuesta de `recomendar()` se
importa de `@vuelto/motor`; el resto son tipos de vista).

