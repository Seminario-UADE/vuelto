# Contrato: `recomendar()`

Interfaz pública que `@vuelto/motor` agrega en esta issue. La consume solo el service de la Edge
Function de recomendación (issue #43, ADR-009); la app no importa el motor.

```ts
import { recomendar, PerfilSinMediosError, JURISDICCIONES_VALIDAS } from "@vuelto/motor";

recomendar(
  compra: CompraPropuesta,
  perfil: Perfil,
  promociones: Promocion[],
  comprasDelPeriodo: Compra[],
  ahora: Date,
): Recomendacion
```

## Precondiciones (las garantiza la capa externa)

- `compra.monto > 0`; cada `promocion.porcentaje` en (0, 100]; `vigencia.desde ≤ vigencia.hasta`.
- `comprasDelPeriodo` son del usuario y están confirmadas. Pueden incluir otros meses: el motor
  filtra.
- Ids únicos dentro de cada lista.

## Postcondiciones

- Pura y determinística: mismos argumentos ⇒ resultado igual en profundidad, sin importar el
  orden de `promociones`, `perfil.mediosDePago` y `comprasDelPeriodo`.
- No muta sus argumentos.
- Cada `promocion.id` aparece en al menos una opción (`mejor` o `alternativas`) o en exactamente
  un `Descarte`, nunca en los dos lados (FR-003).
- `mejor` es la opción de mayor ahorro o `null`; `alternativas` sigue el orden de FR-021;
  `descartadas` se ordena por `promocionId` (FR-023).
- Todos los importes son pesos con a lo sumo dos decimales exactos.
- `base` es `null` si y solo si la promoción no informa tope o el descarte no es por tope.

## Errores

| Condición | Resultado |
|---|---|
| `perfil.mediosDePago.length === 0` | lanza `PerfilSinMediosError` |
| Ninguna promoción aplica | **no** es error: `{ mejor: null, alternativas: [], descartadas: [...] }` |

## Uso esperado en la Edge Function (referencia, issue #43)

```ts
try {
  return json(200, servicio.recomendar(...));
} catch (e) {
  if (e instanceof PerfilSinMediosError) return json(422, { error: "perfil_sin_medios" });
  throw e;
}
```
