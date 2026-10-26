# Data model: estimar el tope restante

Tipos nuevos en `packages/motor/src/tipos.ts` (públicos). Sin `?:`.

```ts
export interface EstimacionTope {
  /** `null` si el saldo es propio de una promo. */
  grupoTopeId: string | null;
  /** `null` si los miembros vigentes son de bancos distintos. */
  bancoId: BancoId | null;
  /** Promos vigentes del saldo. */
  promocionIds: string[];
  /** Medios del usuario que sirven para alguna de ellas; vacía sin perfil. */
  mediosDePagoIds: string[];
  /** En pesos. */
  tope: number;
  consumido: number;
  restante: number;
  base: BaseEstimacion;
  periodo: { tipo: "mensual" | "semanal"; desde: FechaISO; hasta: FechaISO };
}

export type EstadoTope = "disponible" | "queda_poco" | "agotado" | "sin_compras";

export interface TextoEstimacion {
  estado: EstadoTope;
  /** "≈$6.500", "menos de $100" o `null` (agotado o sin compras). */
  cifra: string | null;
  /** "según 3 compras de octubre", "… · vuelve el 1/11" o el texto de sin compras. */
  base: string;
}
```

## Internos (`tope.ts`)

```ts
export type ClaseDeTope =
  | { tipo: "sin_tope" }
  | { tipo: "por_compra"; monto: number }                       // centavos
  | { tipo: "acumulable"; monto: number; periodo: PeriodoAcumulable; grupo: string | null };

export interface Saldo {
  grupoTopeId: string | null;   // nuevo
  tope: number;
  periodo: PeriodoAcumulable;
  consumido: number;
  restante: number;
  base: BaseEstimacion;
}
```

## Firmas

```ts
estimarTopes(promociones: Promocion[], comprasDelPeriodo: Compra[], perfil: Perfil | null, ahora: Date): EstimacionTope[]
formatearEstimacion(estimacion: EstimacionTope): TextoEstimacion
```
