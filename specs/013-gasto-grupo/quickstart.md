# Quickstart: validar el gasto en grupo (spec 013)

Guía para comprobar que la feature anda, de punta a punta. Los contratos están en `contracts/`; el modelo, en `data-model.md`.

## Requisitos

- Node ≥ 22.13 (`.nvmrc`), `npm ci` en la raíz.
- Docker corriendo y la CLI de Supabase (pgTAP y base local).
- Deno 2 (`deno check` de la Edge Function).
- **Aviso:** la base local la comparten todos los worktrees (`project_id = "vuelto"`). `supabase db reset` la deja con las migraciones de esta rama para cualquier otra sesión que la use.

## 1. Motor (sin red ni base)

```bash
npm run test -w @vuelto/motor
```

Esperado: pasan los tests de `grupo.test.ts` y `division.test.ts` (los 18 escenarios de US1 y las 100 permutaciones de SC-001) y la suite existente sin cambios.

## 2. Base: tablas, permisos y funciones

```bash
supabase db reset
```

```bash
supabase test db
```

Esperado: pasa `supabase/tests/database/contactos.test.sql` (RLS, `anon` sin permisos, los estados de invitación, la carrera, la clave de servidor, no vinculado igual que inexistente, quitar), y `estructura.test.sql` pasa **sin cambios**.

## 3. Edge Function

```bash
npm run test -w @vuelto/supabase
```

```bash
deno check --no-lock --config supabase/functions/recomendar-grupo/deno.json supabase/functions/recomendar-grupo/index.ts
```

Esperado: tests del handler, del servicio y de `respuesta.ts` (incluida la búsqueda de SC-008 en todo el JSON), y `deno check` sin errores.

Prueba manual con la base local (opcional):

1. Copiar `supabase/functions/.env.example` a `supabase/functions/.env` y poner una clave de prueba en `GRUPO_CLAVE_SERVIDOR`.
2. Cargar la misma clave en Vault de la base local: `select vault.create_secret('<clave>', 'recomendar_grupo_clave');` desde el SQL editor de Studio.
3. `supabase functions serve recomendar-grupo --env-file supabase/functions/.env`.
4. Con dos usuarios de prueba vinculados (registrarse en la app, invitar y aceptar), llamar con el JWT de uno: `POST /functions/v1/recomendar-grupo` con el body del contrato. Esperado: 200 con la forma del contrato; con un uuid que no es contacto, 409 `contacto_no_vinculado`.
5. Desde la app o con un curl, llamar `rpc/datos_de_contactos` con el JWT de un usuario vinculado y sin la clave: error `42501` (SC-005).

## 4. App

```bash
npm run test -w @vuelto/mobile
```

```bash
npm run test:integracion -w @vuelto/mobile
```

Esperado: tests de `tokenDeInvitacion`, la vista de grupo, el slice y los thunks de contactos, y la persistencia por cuenta. La integración prueba las RPC contra la base local.

Recorrido manual (Expo Go o build de desarrollo, con la base local o la alojada):

1. **Cuenta nueva** → Perfil → Contactos: «Todavía no tenés contactos» (US2-12).
2. **Invitar**: el QR y el link `vuelto://i/…` (en Expo Go, `exp://…/--/i/…`), con el vencimiento real. «Generar otro link» invalida el anterior.
3. **Aceptar con QR**: desde un segundo teléfono con otra cuenta, escanear el QR con la cámara del sistema → Aceptar invitación (a confirmar en dispositivo real, US2-4).
4. **Aceptar pegando**: copiar el link, Contactos → «Tengo una invitación» → Pegar → Aceptar. Pegar texto que no es una invitación → aviso sin red.
5. **Estados**: abrir otra vez la misma invitación → «ya se usó»; la propia → «Es tu propia invitación»; un token inventado → «no es válida».
6. **Grupo**: paso de compra con un comercio con rubro → «¿Pagan entre varios?» → marcar al contacto, sumar a alguien sin cuenta → resultado. Comprobar: el nombre de quien paga, «≈», la base en palabras, «pone», la suma de las partes, el día evaluado y que del contacto no se ve ningún otro medio ni su tope.
7. **Comercio escrito a mano** (sin rubro): no aparece «¿Pagan entre varios?» (US3-9).
8. **Quitar**: quitar al contacto desde un teléfono; en el otro, volver a primer plano: desaparece. Reiniciar la app: sigue sin estar.
9. **Sin red**: con el modo avión, el resultado muestra «No pudimos calcularlo» y «Reintentar» antes de 15 s.
10. **Cerrar sesión** y entrar con otra cuenta: no aparecen los contactos de la anterior.

## 5. Chequeos del PR

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run test
```

Más `deno check` de la función, `supabase test db`, `test-runner`, `rules-guardian` y `/code-review`.

## Configuración del proyecto alojado (una vez, a mano)

1. Generar una clave larga al azar.
2. En el SQL editor del proyecto: `select vault.create_secret('<clave>', 'recomendar_grupo_clave');`.
3. `supabase secrets set GRUPO_CLAVE_SERVIDOR=<clave>`.
4. `supabase functions deploy recomendar-grupo --use-api`.

Sin los pasos 2 y 3, la función responde 500 `interno` (nunca datos).
