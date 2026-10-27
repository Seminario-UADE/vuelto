# API / routes

Endpoints propios del backend: Edge Functions de Supabase en
`supabase/functions/`. El resto del acceso a datos (perfil, registrar compra,
historial, catálogos) lo hace la app directo con `supabase-js` y el RLS, sin
código propio (ADR-009).

## Endpoints

| Endpoint | Issue | Qué hace | Contrato |
|---|---|---|---|
| `POST /functions/v1/recomendar` | #43 | Recomienda con qué medio pagar una compra concreta: junta medios, promos del rubro vigentes, compras del período (mes o semana, lo que empiece antes) y las promos de esas compras, y llama a `recomendar()` del motor | `specs/004-recomendar-pantalla/contracts/recomendar.md` |
| `GET /functions/v1/topes` | #45 | Topes restantes del mes (pendiente) | — |
| Extracción de ticket | #48 | Gemini sobre la imagen, sin guardarla (pendiente) | — |

Estado de `recomendar`: handler, servicio, validación, autenticación y
contrato de errores implementados y testeados con repositorios en memoria.
Faltan los repositorios sobre Postgres, que dependen del esquema de la
issue #34.

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

La app llama a cada endpoint desde una función de `api.ts`. Hoy responde un mock
(`servidor-simulado.ts`) **con la misma forma** que el endpoint real; conectar un
endpoint es cambiar el cuerpo de esa función. Las pantallas no ven la forma del
servidor: `vista-recomendacion.ts` la traduce, nombrando los ids con los
catálogos y sin calcular reintegros ni topes (constitución §II).

| Función | Endpoint | Estado |
|---|---|---|
| `recomendar(comercioId, monto)` | `POST /functions/v1/recomendar` | Contrato real (`specs/004-recomendar-pantalla/contracts/recomendar.md`), con mock. **Extensión pendiente**: `monto: null` para responder en un toque (auditoría v5 P1 #1, constitución 2.0.1); hoy la Edge Function exige `monto > 0` |
| `getTopes()` | `GET /functions/v1/topes` (#45) | Mock con forma propia (`ResumenTopes`); se alinea a `EstimacionTope`/`TextoEstimacion` del motor cuando exista el endpoint |
| `leerTicket()` | Extracción de ticket (#48) | Mock; en esta versión no hay captura real |
| `recomendarGrupo(pedido)` | `POST /functions/v1/recomendar-grupo` (#56) | Mock; de los contactos solo viaja lo de ADR-008 §3 |
| `getCompras`, `guardarCompra`, `getPerfil`, `getContactos`, `quitarContacto`, catálogos | Supabase directo con RLS (ADR-009) | Mock |
| `crearInvitacion`, `verInvitacion`, `aceptarInvitacion` | Edge Function y RPC `security definer` (ADR-008 §4) | Mock |

Tipos: `apps/mobile/src/data/contracts.ts` (el bloque de `recomendar` es copia de
`packages/motor/src/tipos.ts`; la app no importa el motor).

