# Quickstart: validar el flujo directo (spec 012)

## Requisitos

- Node ≥ 22.13 (`.nvmrc`) y `npm ci` desde la raíz.
- Para US5 y las migraciones: Docker con Supabase local (`supabase start`, `supabase db reset`).
- Simulador de iOS y un emulador de Android (con gestos y con tres botones) para SC-007.

## Tests automáticos

Desde la raíz:

```bash
npm run test -w @vuelto/mobile
```

```bash
npm run typecheck && npm run lint
```

```bash
supabase test db
```

Lo que tiene que pasar:

- `store/por-confirmar.test.ts`:
  - los seis casos de SC-003 (creada con monto, creada sin monto, reemplazada, vencida, descartada, Revisá cerrada) dejan `selectTopes`, `selectResumenCompras` y `selectRecomendacion` iguales;
  - reemplazo por comercio;
  - purga por dueño, por vencimiento y por id ya confirmado;
  - persistencia de `vuelto.por-confirmar.v1`.
- `data/por-confirmar.test.ts`:
  - `origenAlConfirmar`, la tabla de data-model;
  - `ticketCoincide`: «COTO C.I.C.S.A.» coincide con Coto, «Cotolengo» no, y no coincide con fecha anterior;
  - `borradorDesdePorConfirmar`: medio `null` y sugerido cuando el ticket no trae medio; sin aviso de monto si no se simuló con monto; fechas posibles cuando cambió el día.
- `store/thunks.compras.test.ts`: confirmar dos veces la misma compra deja una sola (SC-008).
- pgTAP: un nombre de 41 caracteres se rechaza; `anon` lee `bancos`, `categorias` y las promos vigentes, y no lee ni escribe tablas de usuarios (US5).

## Recorrido manual

Con `npx expo start` en `apps/mobile`.

1. **US1**:
   - Iniciar sesión, tocar Coto en Inicio y después «Usar [medio]».
   - Ver el toast y la tarjeta «por confirmar», y que Topes no cambió.
   - «Ya pagué» → cargar el monto → «Guardar compra».
   - Ver la compra en Compras como «Recomendación» y que los topes bajaron.
2. **US1 sin red**: lo mismo en modo avión. La compra queda «Sin subir».
3. **US2**:
   - Crear una compra por confirmar en Coto y tocar «Escanear ticket».
   - Revisá arranca sin medio y con la sugerencia; «Guardar» está deshabilitado hasta tocar un medio.
   - Al guardar, el origen es «Ticket».
4. **US2, cruce desde Compras**: con una compra por confirmar en Coto, escanear desde Compras. Aparece la pregunta «¿Es tu compra por confirmar en Coto?».
5. **US3**:
   - Las tabs están en el orden Compras · Inicio · Topes, con el foco en el color del acento, en los dos temas.
   - El avatar abre Perfil, y Comprar ya no existe.
   - Capturas de antes y después en los tres dispositivos (SC-007).
6. **US4**:
   - Cuenta nueva con nombre, medios sin promo en Coto y tocar un comercio con promo: la respuesta es real.
   - Inicio saluda con el nombre y Perfil lista los comercios marcados.
7. **US5**: desinstalar, «Empezar», medios, primera respuesta, «Guardá tu perfil». En Supabase Studio, los medios, los habituales y el nombre están en la cuenta.
