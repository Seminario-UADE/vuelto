# Data Model: Sugerir el comercio del catálogo

Nada de esto se guarda: son formas que viven mientras está abierta «Revisá tu compra». Lo ausente es `null`, nunca `campo?:` (constitución §III).

## SugerenciaComercio (`data/sugerir-comercio.ts`)

| Campo | Tipo | Reglas |
|---|---|---|
| `comercio` | `Comercio` | Del catálogo; nunca un rubro sin comercio (FR-013) |
| `origen` | `"texto_del_ticket" \| "contenido" \| "parecido"` | Por qué se sugiere (FR-002) |

## ResultadoSugerencia

```ts
type ResultadoSugerencia =
  | { tipo: "coincide"; comercio: Comercio }               // un solo rubro: la línea de confirmación
  | { tipo: "elegir_rubro"; opciones: Comercio[] }         // mismo nombre en 2+ rubros y el rubro no se sabe
  | { tipo: "sugerencias"; titulo: "no_encontrado" | "es_alguno"; sugerencias: SugerenciaComercio[] } // 0 a 3
  | { tipo: "nada" };                                      // comercio vacío y el texto no nombra a ninguno
```

`sugerirComercio({ nombre, textoTicket, catalogo, categoriaConocida })` devuelve uno de estos. `sugerenciaEnPantalla(...)` decide cuándo llamarla según el estado de la pantalla (después de la revisión de código: así esa regla también tiene tests). Con `categoriaConocida` y nombre que coincide en ese rubro → `coincide`. `sugerencias` con lista vacía = el recuadro con solo «Buscar otro comercio» y «No está en la lista».

## Elección en «Revisá tu compra» (estado de la pantalla)

| Estado | Tipo | Se borra cuando |
|---|---|---|
| `categoriaElegida` | `number \| null` (el rubro de la sugerencia tocada; el nombre ya queda en el campo) | El usuario cambia el texto del campo |
| `noEstaEnLaLista` | `boolean` | El usuario cambia el texto del campo |
| `buscadoEn` | `string \| null` | — (el texto en el que se buscó por última vez: al abrir con ticket o en `onBlur`) |

## buscarEnCatalogo (buscador, FR-007)

`buscarEnCatalogo(catalogo, texto, limite)`: primero los que contienen lo escrito en su nombre (`buscarComercios`, hoy), después los parecidos (R1) que no estén ya; sin rubros (FR-013).
