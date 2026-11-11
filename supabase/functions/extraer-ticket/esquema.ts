/**
 * El esquema que recibe el proveedor y su validación en el servidor (spec 013
 * FR-007, research R2 y R8). Todos los campos son requeridos y aceptan `null`
 * (constitución §III). El proveedor devuelve cada dato tal como está impreso;
 * la conversión es de `normalizar.ts`.
 */
import type { LecturaCruda, MedioImpreso } from "./extractor.ts";

const TEXTO_O_NULL = ["string", "null"] as const;

function campo(description: string) {
  return { type: TEXTO_O_NULL, description };
}

const MEDIO = {
  type: "object",
  properties: {
    bancoImpreso: campo("Nombre del banco tal como está impreso. null si no aparece."),
    tipoImpreso: campo('Las palabras impresas que dicen si es débito o crédito (ej. "DEBITO"). null si no aparece.'),
    redImpresa: campo('El nombre de la red tal como está impreso (ej. "VISA", "MASTERCARD"). null si no aparece. No deducirla por los dígitos.'),
    ultimos4Impresos: campo("Los últimos 4 dígitos de la tarjeta, tal como están impresos. null si no aparecen."),
  },
  required: ["bancoImpreso", "tipoImpreso", "redImpresa", "ultimos4Impresos"],
  additionalProperties: false,
} as const;

export const ESQUEMA_LECTURA = {
  type: "object",
  properties: {
    montoImpreso: campo('El total pagado, copiado tal como está impreso (ej. "$ 24.500,00"). null si no aparece.'),
    comercio: campo("El nombre del comercio tal como está impreso. null si no aparece."),
    fechaImpresa: campo('La fecha de la compra tal como está impresa (ej. "14/10/26"). null si no aparece.'),
    medio: MEDIO,
    texto: campo(
      "Transcripción completa del ticket, renglón por renglón, reemplazando nombres de personas, DNI y números de tarjeta (salvo los últimos 4 dígitos) por [DATO PERSONAL].",
    ),
  },
  required: ["montoImpreso", "comercio", "fechaImpresa", "medio", "texto"],
  additionalProperties: false,
} as const;

/** Un error de esquema dice dónde y qué regla falló, nunca el valor (FR-013). */
export type ResultadoEsquema =
  | { ok: true; lectura: LecturaCruda }
  | { ok: false; camino: string; regla: "requerido" | "adicional" | "tipo" };

type Falla = Extract<ResultadoEsquema, { ok: false }>;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Revisa que `objeto` tenga exactamente las claves `requeridas`; los tipos los revisa quien llama. */
function revisarClaves(objeto: Record<string, unknown>, requeridas: readonly string[], prefijo: string): Falla | null {
  for (const clave of requeridas) {
    if (!(clave in objeto)) return { ok: false, camino: prefijo + clave, regla: "requerido" };
  }
  for (const clave of Object.keys(objeto)) {
    if (!requeridas.includes(clave)) return { ok: false, camino: prefijo + clave, regla: "adicional" };
  }
  return null;
}

function revisarTextos(objeto: Record<string, unknown>, claves: readonly string[], prefijo: string): Falla | null {
  for (const clave of claves) {
    const valor = objeto[clave];
    if (valor !== null && typeof valor !== "string") return { ok: false, camino: prefijo + clave, regla: "tipo" };
  }
  return null;
}

export function validarLecturaCruda(valor: unknown): ResultadoEsquema {
  if (!esObjeto(valor)) return { ok: false, camino: "", regla: "tipo" };
  const falla = revisarClaves(valor, ESQUEMA_LECTURA.required, "");
  if (falla) return falla;

  const medio = valor["medio"];
  if (!esObjeto(medio)) return { ok: false, camino: "medio", regla: "tipo" };
  const fallaMedio = revisarClaves(medio, MEDIO.required, "medio.") ?? revisarTextos(medio, MEDIO.required, "medio.");
  if (fallaMedio) return fallaMedio;

  const textos = ESQUEMA_LECTURA.required.filter((clave) => clave !== "medio");
  const fallaTexto = revisarTextos(valor, textos, "");
  if (fallaTexto) return fallaTexto;

  return { ok: true, lectura: { ...(valor as Omit<LecturaCruda, "medio">), medio: medio as unknown as MedioImpreso } };
}
