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
