/**
 * La llamada al servicio que lee el ticket (spec 013) y la traducción de su respuesta (spec 014,
 * research R3). Recibe el cliente de Supabase por parámetro, como `perfil/datos.ts`: el pedido
 * va con la sesión del usuario y la app nunca tiene la key del proveedor.
 */

import { FunctionsFetchError, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import type { LecturaApp } from "../data/contracts";
import { ETIQUETAS_RED, ETIQUETAS_TIPO } from "../perfil/modelo";
import { resultadoDeCodigo, type ResultadoLectura } from "./resultados";
import type { MedioLeido } from "./sugerencia";

export type ClienteFunciones = { functions: Pick<SupabaseClient["functions"], "invoke"> };

/** Cuánto se espera la respuesta (FR-011: «Tardó demasiado»). */
export const LIMITE_LECTURA_MS = 30_000;

const fallo = (resultado: ResultadoLectura): LecturaApp => ({ ok: false, resultado });

function textoONull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function medioDelContrato(v: unknown): MedioLeido | null {
  if (typeof v !== "object" || v === null) return null;
  const { banco, tipo, red, ultimos4 } = v as Record<string, unknown>;
  if (!textoONull(banco) || !textoONull(ultimos4)) return null;
  if (tipo !== null && !(typeof tipo === "string" && Object.hasOwn(ETIQUETAS_TIPO, tipo))) return null;
  if (red !== null && !(typeof red === "string" && Object.hasOwn(ETIQUETAS_RED, red))) return null;
  return { banco, ultimos4, tipo, red } as MedioLeido;
}

/** La respuesta 200 del contrato; cualquier otra forma es `interno`. */
function lecturaDelContrato(data: unknown): LecturaApp {
  if (typeof data !== "object" || data === null) return fallo("interno");
  const { monto, comercio, fecha, medio, textoExtraido } = data as Record<string, unknown>;
  const medioLeido = medioDelContrato(medio);
  if (
    medioLeido === null ||
    typeof textoExtraido !== "string" ||
    !textoONull(comercio) ||
    !textoONull(fecha) ||
    !(monto === null || (typeof monto === "number" && Number.isFinite(monto)))
  ) {
    return fallo("interno");
  }
  return { ok: true, monto, comercio, fecha, medio: medioLeido, textoExtraido };
}

async function resultadoDeError(error: unknown): Promise<ResultadoLectura> {
  if (error instanceof FunctionsFetchError) return "sin_conexion";
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo: unknown = await (error.context as Response).json();
      return resultadoDeCodigo(typeof cuerpo === "object" && cuerpo !== null ? (cuerpo as { error?: unknown }).error : null);
    } catch {
      return "interno";
    }
  }
  return "interno";
}

/** Manda la foto (JPEG en base64) y devuelve la lectura o el resultado de FR-011. Nunca tira. */
export async function pedirLectura(
  cliente: ClienteFunciones,
  base64: string,
  { limiteMs }: { limiteMs: number },
): Promise<LecturaApp> {
  const corte = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<LecturaApp>((resolver) => {
    temporizador = setTimeout(() => {
      corte.abort();
      resolver(fallo("tardo_demasiado"));
    }, limiteMs);
  });
  const pedido = (async (): Promise<LecturaApp> => {
    try {
      const { data, error } = await cliente.functions.invoke("extraer-ticket", {
        body: { imagen: base64, tipo: "image/jpeg" },
        signal: corte.signal,
      });
      return error ? fallo(await resultadoDeError(error)) : lecturaDelContrato(data);
    } catch {
      // `invoke` no debería tirar, pero si el pedido se cae en el camino es falta de conexión.
      return fallo("sin_conexion");
    }
  })();
  try {
    return await Promise.race([pedido, vencido]);
  } finally {
    clearTimeout(temporizador);
  }
}
