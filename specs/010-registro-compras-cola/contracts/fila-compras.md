# Contrato: `compraAFila`

Función pura, sin red ni reloj.

```ts
function compraAFila(
  compra: Compra,                       // del motor
  mapeo: { medioRemoto: string | null; promoRemota: string | null },
): { ok: true; fila: FilaCompra } | { ok: false; motivo: "medio" | "promo" | "invalida" };
```

## Reglas

1. `compra.id` no es un UUID, `monto <= 0`, `comercio` vacío tras recortar u `origen` fuera de la lista → `{ ok: false, motivo: "invalida" }`. Queda `rechazada`. Se evalúa primero: lo inválido nunca va a servir, no se espera un mapeo.
2. `mapeo.medioRemoto === null` → `{ ok: false, motivo: "medio" }`. La operación queda `bloqueada(medio)`.
3. `compra.promocionId !== null` y `mapeo.promoRemota === null` → `{ ok: false, motivo: "promo" }`. Queda `bloqueada(promo)`. **No** se sube sin promo (cambiaría los topes de otro dispositivo).
4. En cualquier otro caso → `{ ok: true, fila }`, donde `fila` es:

```ts
type FilaCompra = {
  id: string;
  fecha: string;
  monto: number;
  comercio: string;
  categoria_id: number | null;
  medio_de_pago_id: string;
  promocion_id: string | null;
  descuento_obtenido: number | null;
  reintegro_esperado: number | null;
  fecha_acreditacion_estimada: string | null;
  origen: "ticket" | "excepcion" | "manual";
  texto_extraido: string | null;
};
```

`user_id` no está: lo completa el default `auth.uid()` de la columna y la policy `compras_dueno` lo valida.

## Casos de prueba mínimos

Compra completa → fila; sin promo → `promocion_id: null`; sin mapeo de medio → `medio`; con promo y sin mapeo → `promo`; id `n3` → `invalida`; monto 0 → `invalida`; `texto_extraido` se conserva sin tocar; ningún campo de la fila contiene la imagen.
