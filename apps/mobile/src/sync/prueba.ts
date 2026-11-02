/** Fábricas de filas para los tests de la sincronización. Solo se importa desde `*.test.ts`. */
import type { FilaCompra, FilaPromocion } from "./contratos";

export const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export function fila(n: number, resto: Partial<FilaPromocion> = {}): FilaPromocion {
  return {
    id: ID(n),
    fuente: "manual",
    titulo: `promo ${n}`,
    banco_id: "88d8705e-2dda-46f9-8411-bb4916af858e",
    categoria_id: 1,
    comercio: null,
    porcentaje: 20,
    debito_redes: [],
    credito_redes: ["visa"],
    vigencia_desde: "2026-10-01",
    vigencia_hasta: "2026-12-31",
    dias: null,
    tope_monto: null,
    tope_periodo: null,
    tope_alcance: null,
    grupo_tope_id: null,
    monto_minimo: null,
    jurisdiccion: "nacional",
    canal: null,
    acumulable: null,
    dada_de_baja_en: null,
    actualizada_en: `2026-11-02T12:00:00.${String(n).padStart(6, "0")}+00:00`,
    ...resto,
  };
}

export function filaCompra(n: number, resto: Partial<FilaCompra> = {}): FilaCompra {
  return {
    id: ID(1000 + n),
    fecha: "2026-11-02",
    monto: 10000,
    comercio: "Coto",
    categoria_id: 1,
    medio_de_pago_id: ID(9000),
    promocion_id: null,
    descuento_obtenido: null,
    reintegro_esperado: null,
    fecha_acreditacion_estimada: null,
    origen: "manual",
    texto_extraido: null,
    creada_en: `2026-11-02T13:00:00.${String(n).padStart(6, "0")}+00:00`,
    ...resto,
  };
}
