# Research: Pantalla «¿Con qué pago?» y Edge Function `recomendar`

Decisiones técnicas del plan (`plan.md`). Cada una con lo que se eligió, por qué y qué se descartó.

## R1. Cómo importa la Edge Function (Deno) al motor

- **Decision**: cada función tiene su propio `deno.json` con un import map que resuelve
  `@vuelto/motor` al código fuente del paquete:
  `"@vuelto/motor": "../../../packages/motor/src/index.ts"`. El deploy se hace con
  `supabase functions deploy recomendar --use-api`, que empaqueta en el servidor de Supabase y
  permite importar archivos de fuera de `supabase/`.
- **Rationale**: el motor ya usa imports con extensión `.ts` (PR #70, "para que el compilado
  cargue en Node y Deno"), así que Deno lo carga sin compilar. La documentación de Supabase
  recomienda un `deno.json` por función, no uno global. Así no hay una copia del motor que se
  pueda desincronizar.
- **Alternatives considered**:
  - Copiar `dist/` del motor dentro de `supabase/functions/_shared/` en cada build: duplica el
    código y se desincroniza si alguien olvida el paso.
  - Publicar el motor en npm o JSR: es privado y agrega un paso de release por cada cambio.
  - Deploy con Docker (sin `--use-api`): el bundler con Docker solo ve `supabase/` y no encuentra
    `packages/motor`.
- **Riesgo**: `--use-api` figuraba como experimental en el changelog de Supabase (CLI 2.13.3,
  feb/2025). Antes del primer deploy hay que verificar que siga disponible
  (`supabase functions deploy --help`). Si no está, la alternativa es la copia de `dist/` en un
  script de deploy.
- **Fuentes**: <https://supabase.com/docs/guides/functions/dependencies>,
  <https://supabase.com/changelog/33613-deploy-edge-functions-from-cli-without-needing-docker-import-files-outside-of-supabase-directory>.

## R2. Dónde corren los tests de la capa del servidor

- **Decision**: Vitest en Node, dentro del workspace `supabase` (`@vuelto/supabase`), con los
  mismos scripts `lint`, `typecheck` y `test` que corre el CI. Vitest y `tsc` resuelven
  `@vuelto/motor` al mismo `src/index.ts` que Deno (alias en `vitest.config.ts` y `paths` en
  `tsconfig.json`), así que no hace falta compilar el motor antes de testear.
- **Rationale**: el CI ya corre `npm run test` en todos los workspaces con Node; sumar Deno al CI
  es otro runtime que mantener. El código testeado usa solo APIs web estándar (`Request`,
  `Response`, `URL`, `JSON`), que existen igual en Node 22 y en Deno.
- **Alternatives considered**: `deno test` (exige instalar Deno en el CI y en cada máquina del
  equipo; ninguna lo tiene hoy).
- **Consecuencia**: el archivo de entrada de cada función (`index.ts`, que usa `Deno.serve` y
  `Deno.env`) no lo puede chequear `tsc` en Node. Se lo deja mínimo (solo arma las piezas y
  llama a `Deno.serve`) y se lo excluye del `typecheck`, del `lint` con reglas de tipos y de la
  suite. Toda la lógica vive en archivos que sí se chequean.

## R3. Forma del handler (rol de controller, ADR-009)

- **Decision**: una fábrica `crearHandlerRecomendar(dependencias)` que devuelve
  `(req: Request) => Promise<Response>`. Recibe un `Autenticador`, una función que crea el
  servicio para el usuario autenticado y una función `reloj()` que devuelve `ahora`. El
  `index.ts` es el composition root: crea el cliente de Supabase con el token del pedido, los
  repositorios, el servicio y llama a `Deno.serve(handler)`.
- **Rationale**: el handler se testea entero (códigos HTTP, cuerpo, errores) con un `Request`
  armado a mano y dependencias falsas. `reloj()` inyectado permite el test de las 22:00 del
  último día del mes (FR-025) sin tocar el reloj real.
- **Desvío del texto de ADR-009**: el ADR ubica el handler en `index.ts`. Acá el handler vive en
  `handler.ts` y `index.ts` queda solo como composition root, porque `index.ts` usa el global
  `Deno` y no se puede testear ni chequear en Node. Registrado en ADR-009 §Actualización
  (revisado en el PR #71).
- **Alternatives considered**: clase controller (ADR-009 la descarta: un endpoint por función).

## R4. Autenticación (FR-018)

- **Decision**: interfaz `Autenticador { usuarioDe(req: Request): Promise<string | null> }`.
  La implementación real llama a `supabase.auth.getUser(token)` con el token del header
  `Authorization: Bearer <jwt>` y devuelve el `id` del usuario o `null`. Si no hay header, el
  token no es válido o no corresponde a un usuario (la anon key no trae `sub` de usuario),
  responde `null` y el handler devuelve 401 sin crear el servicio.
- **Rationale**: el gateway de Supabase verifica la firma del JWT, pero la anon key es un JWT
  válido sin usuario; `getUser()` es lo que garantiza que hay un usuario logueado.
- **Auth caído**: si `getUser` lanza o devuelve un error que no es 4xx (red, 5xx, sin status), el
  autenticador lanza `AutenticacionNoDisponibleError` y el handler responde 500, no 401: pedirle
  al usuario que vuelva a iniciar sesión no arreglaría nada (hallazgo de `/code-review`).
- **Desvío del texto de ADR-009**: el ADR dice "función compartida `autenticar(req)`". Se usa una
  interfaz con una clase para poder inyectar un autenticador falso en los tests del handler; el
  propósito del ADR (que ninguna función se saltee la autenticación) no cambia. Registrado en
  ADR-009 §Actualización (revisado en el PR #71).
- **Alternatives considered**: confiar solo en el gateway (deja pasar la anon key); decodificar
  el JWT a mano (duplica lo que ya hace Supabase Auth).

## R5. Validación del body (FR-019)

- **Decision**: validador propio, sin dependencias, en `_shared/validacion.ts`. Devuelve
  `{ ok: true, compra }` o `{ ok: false, campo }`. Chequea forma y rangos (monto, canal, largo
  del comercio, campos extra). La existencia del rubro la chequea el servicio contra el catálogo
  (`RepositorioCategorias`) porque requiere leer la base; si no existe, el servicio lanza
  `CategoriaInexistenteError` y el handler responde 400 con `campo: "categoriaId"`.
- **Rationale**: son 4 campos; una librería de esquemas (zod, valibot) suma una dependencia en
  Deno y en Node para poco. El comercio se normaliza solo quitando espacios de los extremos: la
  normalización completa la hace el motor.
- **Alternatives considered**: zod (dependencia nueva); validar el rubro contra
  `CATEGORIAS_MODO` del motor (es dato inicial del seed, no la fuente de verdad, ver
  `categorias.ts`).

## R6. Fecha de hoy y mes calendario (FR-020, FR-025)

- **Decision**: exportar `fechaArgentina` e `inicioDelPeriodo` desde `packages/motor/src/index.ts`
  (antes eran internas). El servicio calcula `hoy = fechaArgentina(ahora)` y pide las compras
  desde el anterior entre `inicioDelPeriodo("mensual", hoy)` e `inicioDelPeriodo("semanal", hoy)`
  (precondición del motor de la issue #37: si no, el tope semanal falla en las semanas que cruzan
  de mes). Nunca usa `current_date` de Postgres.
- **Rationale**: el motor y el servidor usan exactamente la misma conversión a hora de Argentina,
  sin duplicarla. El cambio en el motor es un export, sin tocar ninguna regla ni test existente.
- **Alternatives considered**: reimplementar el desfase UTC−3 en el servidor (duplica lógica y
  se puede desincronizar); `current_date` en SQL (UTC: falla entre las 21:00 y las 24:00).

## R7. Repositorios (ADR-009)

- **Decision**: cuatro interfaces en `_shared/repositorios.ts`:

  | Interfaz | Método | Devuelve |
  |---|---|---|
  | `RepositorioMediosDePago` | `deUsuario(usuarioId)` | `MedioDePago[]` |
  | `RepositorioPromociones` | `publicadasVigentes(categoriaId, hoy)` | `Promocion[]` |
  | `RepositorioCompras` | `delUsuarioEntre(usuarioId, desde, hasta)` | `Compra[]` |
  | `RepositorioCategorias` | `existe(categoriaId)` | `boolean` |

  Cada una tiene una implementación en memoria (`_shared/memoria/`) que además registra con qué
  argumentos la llamaron (para FR-025). Las implementaciones sobre Supabase quedan para cuando
  la issue #34 fije tablas y columnas.
- **Rationale**: el filtro por `usuarioId` es explícito aunque el RLS ya lo garantice: es
  defensa en profundidad y hace verificable FR-025 sin base. Las mismas interfaces las reusan
  las issues #45 (topes) y #54 (grupo).
- **Alternatives considered**: un único repositorio "datos del usuario" (mezcla datos públicos
  y privados, y no se puede reusar por partes).

## R8. Registros del servidor (FR-023)

- **Decision**: ante un error 500 se registra solo `error.name` (por ejemplo
  `"PostgrestError"`), nunca el mensaje, el body ni los datos del usuario.
- **Rationale**: `docs/product/privacidad.md`; los mensajes de Postgres pueden incluir valores
  de filas.

## R9. Pantalla Expo (bloqueada)

- **Decision**: la pantalla se implementa cuando existan la app base (#39), el login (#40) y el
  perfil (#41). Usa `supabase.functions.invoke("recomendar", { body })` del cliente de la #39,
  con un timeout de 15 s (`AbortController`), y descarta respuestas viejas con un contador de
  pedido. Formatea importes con una función propia sin `Intl` para mostrar lo mismo en iOS y
  Android.
- **Rationale**: no tiene sentido escribir la pantalla sin navegación, tema ni sesión: se
  rehace cuando lleguen. Lo que sí se fija ahora es el contrato que va a consumir
  (`contracts/recomendar.md`).

## R10. Comercios del corpus (FR-030)

- **Decision**: una vista SQL `comercios_corpus` (`security_invoker = true`, para que aplique el
  RLS de `promociones`) con `select distinct comercio, categoria_id` de las promociones
  publicadas con `comercio is not null` y `vigencia_hasta >= hoy`. Se crea en una migración
  después de la de la #34.
- **Rationale**: la app la lee directo con `supabase-js` (ADR-009: lectura de datos públicos sin
  código propio). La fecha de hoy de la vista sí usa la zona de Argentina
  (`(now() at time zone 'America/Argentina/Buenos_Aires')::date`), porque es un filtro de
  conveniencia para el buscador, no una regla del motor.
