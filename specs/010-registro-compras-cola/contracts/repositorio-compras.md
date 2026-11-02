# Contrato: `RepositorioCompras` y clasificación de errores

Interfaz inyectada (ADR-009). Dos implementaciones: `repositorio.memoria.ts` (tests) y `repositorio.supabase.ts` (desconectado hasta #40, #41 y #42).

```ts
type ResultadoEnvio =
  | { tipo: "exito" }
  | { tipo: "transitorio" }                 // volver a intentar en el próximo disparador
  | { tipo: "rechazada"; causa: string };   // no se reintenta sola

interface RepositorioCompras {
  /** Idempotente por `fila.id`. */
  guardar(fila: FilaCompra, opciones: { signal: AbortSignal }): Promise<ResultadoEnvio>;
  /** Idempotente: borrar algo que no existe es éxito. */
  borrar(id: string, opciones: { signal: AbortSignal }): Promise<ResultadoEnvio>;
}
```

El vaciado crea un `AbortController` por envío y lo aborta a los **10 s**; un aborto es `transitorio`.

## Implementación sobre Supabase

- **guardar**: `from("compras").upsert(fila, { onConflict: "id", ignoreDuplicates: true }).abortSignal(signal)`. Un `id` que ya existe no produce error.
- **borrar**: `from("compras").delete().eq("id", id).abortSignal(signal)`. Cero filas afectadas no es error.
- Siempre con el cliente de la app (anon key + sesión del usuario). Nunca la service role.

## Tabla de clasificación (`clasificarError`)

| Señal | Resultado |
|---|---|
| Respuesta sin error | `exito` |
| `fetch` falla, sin red, aborto por plazo | `transitorio` |
| HTTP 5xx, 429, 408 | `transitorio` |
| HTTP 401 / JWT vencido (la sesión se refresca sola) | `transitorio` |
| `22P02` (uuid o texto inválido) | `rechazada` |
| `23514` (check: monto, origen, descuento) | `rechazada` |
| `23503` (medio o promo inexistentes, o de otro usuario) | `rechazada` |
| `23502` (null en columna obligatoria) | `rechazada` |
| `42501` (RLS: otra cuenta) | `rechazada` |
| cualquier otro código desconocido | `transitorio` (se reintenta; si persiste, se ve en el recuento «Sin subir») |

`causa` es el código de Postgres o el estado HTTP, nunca el cuerpo de la compra ni datos del usuario (`privacidad.md`).

## Qué prueba cada capa

| Qué | Dónde |
|---|---|
| `clasificarError` con cada fila de la tabla | Vitest, función pura |
| Cola contra un repositorio en memoria que falla, se cuelga o responde | Vitest |
| Que el esquema acepta lo que `guardar` y `borrar` asumen | pgTAP (`compras_cliente.test.sql`) |
