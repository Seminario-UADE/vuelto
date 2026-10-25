# Data model: topes compartidos, períodos y acumulables

Cambios sobre `packages/motor/src/tipos.ts`. Sin `?:` (constitución §III).

## Tipos modificados (públicos)

```ts
/** Una promo dentro de una opción de pago. */
export interface PromocionAplicada {
  promocionId: string;
  /** En pesos. Puede ser 0 si otra promo de la opción agotó el saldo compartido (FR-010). */
  ahorroEstimado: number;
  /** `null` = la promo no informa tope o su tope es por compra. */
  topeRestanteTrasCompra: number | null;
  /** `null` en los mismos casos que `topeRestanteTrasCompra`. */
  base: BaseEstimacion | null;
}

export interface OpcionDePago {
  medioDePagoId: string;
  /** Suma de `promociones[].ahorroEstimado`. */
  ahorroEstimado: number;
  /** Al menos una. Orden: ahorro sin tope desc, luego id (research R5). */
  promociones: PromocionAplicada[];
  motivo: string;
}
```

| Tipo | Cambio |
|---|---|
| `OpcionDePago` | Sale `promocionId`, `topeRestanteTrasCompra` y `base`; entra `promociones` |
| `PromocionAplicada` | Nuevo |
| `Descarte` | Sin cambios de forma. `base` puede ser `null` con causa `tope_agotado` solo si el tope es por compra de $0 (FR-015) |

## Tipo interno (`tope.ts`)

```ts
export interface Saldo {
  tope: number | null;          // centavos; null = el grupo no tiene tope informado
  periodo: "mensual" | "semanal";
  consumido: number;            // centavos
  restante: number | null;      // centavos, ≥ 0; null si tope es null
  base: BaseEstimacion | null;  // null si tope es null
}
```

## Reglas (resumen; detalle en la spec)

| Concepto | Regla | Ref. |
|---|---|---|
| Miembro de grupo | `alcance === "compartido"`, `grupoTopeId !== null`, período ≠ `"por_compra"` | FR-001 |
| Monto del grupo | mínimo de los miembros vigentes con tope informado | FR-002 |
| Período del grupo | el más largo de los miembros vigentes (`null` = mensual) | FR-002 |
| Compras del saldo | `promocionId` de un miembro (vigente o no) o de la promo propia; `inicioDelPeriodo ≤ fecha ≤ hoy` | FR-003, FR-006 |
| Consumo por compra | descuento informado (≤ 0 → 0) o `min(monto × % de su promo, tope)` | FR-004 |
| Por compra | ahorro `min(monto × %, tope)`; restante y base `null`; sin saldo | FR-007 |
| Combinada | acumulables `=== true` del mismo medio, si son ≥ 2 | FR-008 |
| Reparto | orden ahorro sin tope desc, id; cada una toma `min(sin tope, restante del saldo)` | FR-010 |
