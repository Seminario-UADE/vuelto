# Contrato: `recomendar()` (actualización de la issue #37)

La firma no cambia (ver `specs/002-motor-recomendar/contracts/recomendar.md`). Cambian la forma de
`OpcionDePago` (ver `../data-model.md`) y estas pre y postcondiciones.

## Precondiciones nuevas (las garantiza la capa externa)

- `promociones` incluye, además de las que se quieren evaluar, las promociones referenciadas por
  `comprasDelPeriodo` aunque ya no estén vigentes.
- `comprasDelPeriodo` incluye las compras desde el lunes de la semana de `ahora` o desde el día 1
  del mes, lo que sea anterior.

## Postcondiciones que cambian

- Cada `promocion.id` aparece en al menos una `opcion.promociones[]` o en exactamente un
  `Descarte`, nunca en los dos lados (FR-003 de la issue #36, ahora mirando dentro de cada opción).
- `opcion.ahorroEstimado` es la suma de `opcion.promociones[].ahorroEstimado`.
- Para cada saldo, la suma de los ahorros de las promos de una misma opción que lo usan no
  supera su restante antes de la compra.
- `base` es `null` en una `PromocionAplicada` si y solo si la promo no informa tope o su tope es
  por compra. En un `Descarte`, si y solo si la causa no es `tope_agotado` o el tope es por compra
  de $0.

## Ejemplo de salida (US2-1)

```json
{
  "mejor": {
    "medioDePagoId": "galicia-credito-visa",
    "ahorroEstimado": 3000,
    "promociones": [
      { "promocionId": "A", "ahorroEstimado": 2000, "topeRestanteTrasCompra": null, "base": null },
      { "promocionId": "B", "ahorroEstimado": 1000, "topeRestanteTrasCompra": null, "base": null }
    ],
    "motivo": "20% en supermercados · la promo no informa tope + 10% en supermercados · la promo no informa tope"
  },
  "alternativas": [],
  "descartadas": []
}
```
