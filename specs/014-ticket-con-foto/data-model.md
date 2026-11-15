# Data Model: Registrar una compra con la foto del ticket

Nada de esto se guarda: son las formas que pasan entre la cámara, la lectura y «Revisá tu compra». Lo ausente es `null`, nunca `campo?:` (constitución §III). La foto nunca forma parte de estas formas: solo sus rutas temporales, para borrarlas.

## FotoPreparada (adaptador → lectura)

| Campo | Tipo | Reglas |
|---|---|---|
| `base64` | `string` | JPEG; decodificado, hasta 2.500.000 bytes |
| `temporales` | `string[]` | Rutas de las copias que hay que borrar (selector y manipulador); vacío en web |

## MedioLeido (servicio → app)

El `medio` de la respuesta del servicio (spec 013), tal cual.

| Campo | Tipo |
|---|---|
| `banco` | `string \| null` |
| `tipo` | `"debito" \| "credito" \| null` |
| `red` | `Red \| null` (las del motor) |
| `ultimos4` | `string \| null` |

## ResultadoLectura

Los resultados que no son éxito, una fila de la tabla de FR-011 cada uno:
`"no_autenticado" | "foto_no_valida" | "imagen_demasiado_grande" | "ticket_ilegible" | "no_disponible" | "tardo_demasiado" | "sin_conexion" | "interno"`.

`foto_no_valida` agrupa `invalido`, `formato_no_soportado` e `imagen_danada` (mismo mensaje). `interno` incluye `metodo_no_permitido` y cualquier respuesta fuera del contrato.

## LecturaApp (reemplaza a `LecturaTicket` en `data/contracts.ts`)

```ts
type LecturaApp =
  | { ok: true; comercio: string | null; fecha: string | null; monto: number | null;
      medio: MedioLeido; textoExtraido: string }
  | { ok: false; resultado: ResultadoLectura };
```

La devuelven `ticket/leer.ts` (cámara y servicio) y `api.leerTicket` (escenarios de desarrollo).

## Salida de un resultado (`ticket/resultados.ts`)

| Campo | Tipo |
|---|---|
| `mensaje` | `string` (el de FR-011) |
| `salidas` | `("probar_de_nuevo" \| "iniciar_sesion" \| "cargar_a_mano")[]`, en el orden en que se muestran |

## Sugerencia (`ticket/sugerencia.ts`)

```ts
type Sugerencia =
  | { tipo: "sugerida"; medioId: string }            // nota «El que dice el ticket»
  | { tipo: "sin_coincidencia"; leido: string }      // «El ticket dice ‹leido›, pero no sabemos cuál de tus tarjetas es»
  | { tipo: "sin_medio" };                           // «El ticket no dice el medio de pago»
```

`leido` es la red y el tipo con su nombre para mostrar («Visa débito», «Visa», «crédito»).

**Regla**: candidatas = tarjetas del perfil con la misma red (si el ticket la trae), el mismo tipo (si lo trae) y el mismo banco (si el ticket y la tarjeta lo traen: nombres sin «banco», «bco» ni «bco.», sin mayúsculas, tildes ni puntuación, el de la tarjeta como palabra dentro del del ticket). Sin red ni tipo → `sin_medio`. Exactamente una candidata → `sugerida`. Ninguna o varias → `sin_coincidencia`.

## Parámetros de «Revisá tu compra» (cambian)

| Antes | Ahora | Por qué |
|---|---|---|
| `medio` (id de tarjeta, con `modo: "ticket"`) | `medioRed`, `medioTipo`, `medioBanco` (texto o vacío) | El ticket no dice qué tarjeta del perfil es (R6) |

Con `modo: "excepcion"` (recomendación), `medio` sigue siendo el id elegido por el usuario.

## TicketParaConfirmar (`data/por-confirmar.ts`, cambia)

| Antes | Ahora |
|---|---|
| `medioId: string \| null` (el del ticket, se marcaba) | `medioSugeridoTicket: string \| null` (la sugerencia; nunca se marca) |

`borradorDesdePorConfirmar` devuelve el borrador con `medioId: null` en modo `ticket`, el aviso `medio-distinto` cuando la sugerencia del ticket difiere del medio simulado, y `diasPosibles` (el rango de FR-010) en lugar de `fechasPosibles`.
