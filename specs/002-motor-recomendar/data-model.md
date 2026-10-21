# Data model: Motor — recomendar

Cambios sobre `packages/motor/src/tipos.ts` (contrato de la issue #33). Todo lo demás se usa sin
cambios. Sin `?:` (constitución §III).

## Tipos nuevos

```ts
/** Una por regla de elegibilidad (FR-014). Orden de evaluación: FR-015. */
export type CausaDescarte =
  | "categoria"
  | "comercio"
  | "vigencia"
  | "dia"
  | "canal"
  | "jurisdiccion"
  | "monto_minimo"
  | "medio_de_pago"
  | "tope_agotado";

/** En qué se apoya un tope estimado (constitución §V). La reutiliza la issue #38. */
export interface BaseEstimacion {
  /** Compras con esta promo en el período, hasta la fecha de `ahora`. */
  comprasRegistradas: number;
  /** De esas, cuántas no informan `descuentoObtenido` (consumo calculado). */
  comprasSinDescuentoInformado: number;
}
```

## Tipos modificados

| Tipo | Cambio | Por qué |
|---|---|---|
| `Jurisdiccion` | `+ "otra_provincia"` | FR-012: expresar promos fuera de CABA/AMBA |
| `OpcionDePago` | `+ base: BaseEstimacion \| null` | FR-020. `null` solo si `tope.monto` es `null` |
| `OpcionDePago` | comentario de `topeRestanteTrasCompra` | Ya no dice "la suma la issue #36": apunta a `base` |
| `Descarte` | `+ causa: CausaDescarte` | FR-014 |
| `Descarte` | `+ base: BaseEstimacion \| null` | FR-020: con causa `tope_agotado` lleva base; con otra causa, `null` |

## Error nuevo

`PerfilSinMediosError extends Error` (`errores.ts`), lanzado si `perfil.mediosDePago` está vacío
(FR-004). No es un dato del dominio: no viaja como JSON (research R7).

## Constante nueva

`JURISDICCIONES_VALIDAS: readonly Jurisdiccion[] = ["nacional", "caba", "pba"]` (FR-012).

## Reglas de cálculo (resumen; detalle en la spec)

| Concepto | Regla | Ref. |
|---|---|---|
| Compras que cuentan | `promocionId` igual, mismo mes que `ahora`, fecha ≤ fecha de `ahora` | FR-016 |
| Consumo por compra | `descuentoObtenido` (≤0 → 0) o `min(monto × %, tope)` si es `null` | FR-017 |
| Consumo total | `min(Σ consumos, tope)` | FR-017 |
| Restante | `tope − consumo total` (≥ 0) | FR-017 |
| Ahorro | `min(monto × %, restante)`; sin tope: `monto × %` | FR-018 |
| Restante tras compra | `restante − ahorro`; sin tope: `null` | FR-019 |
| Agotado | `tope.monto` informado y restante = 0 | FR-013 |

Enteros: montos en centavos, porcentaje en centésimos de punto, productos redondeados hacia
abajo (research R3).
