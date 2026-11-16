/**
 * Validación del body de `POST /recomendar-grupo` (`contracts/recomendar-grupo.md`). Vive en la
 * capa imperativa: el motor recibe datos ya validados (ADR-009). La existencia del rubro la
 * chequea el servicio (lee la base); que cada id sea contacto vinculado, la función de la base.
 */
import { MAXIMO_INTEGRANTES, type Canal, type CompraDeGrupo } from "@vuelto/motor";
import { validarCompraPropuesta } from "../_shared/validacion.ts";

export interface PedidoGrupo {
  compra: CompraDeGrupo;
  /** Ids en minúsculas, sin repetidos. */
  contactos: string[];
  sinCuenta: number;
}

export type ResultadoValidacionGrupo = { ok: true; pedido: PedidoGrupo } | { ok: false; campo: string };

const CAMPOS = ["compra", "contactos", "sinCuenta"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function invalido(campo: string): ResultadoValidacionGrupo {
  return { ok: false, campo };
}

export function validarPedidoGrupo(body: unknown, quienPide: string): ResultadoValidacionGrupo {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return invalido("body");
  const datos = body as Record<string, unknown>;
  const extra = Object.keys(datos).find((k) => !(CAMPOS as readonly string[]).includes(k));
  if (extra !== undefined) return invalido(extra);

  const compra = validarCompraPropuesta(datos.compra);
  if (!compra.ok) return invalido(`compra.${compra.campo}`);
  const monto = compra.compra.monto;
  // En el grupo, el monto es un entero (la app no deja cargar centavos) y siempre está (FR-026).
  if (monto === null || !Number.isInteger(monto)) return invalido("compra.monto");

  const { contactos, sinCuenta } = datos;
  if (!Array.isArray(contactos) || !contactos.every((c) => typeof c === "string")) return invalido("contactos");
  const ids = (contactos as string[]).map((c) => c.toLowerCase());
  if (!ids.every((id) => UUID.test(id))) return invalido("contactos");
  if (new Set(ids).size !== ids.length || ids.includes(quienPide.toLowerCase())) return invalido("contactos");

  if (typeof sinCuenta !== "number" || !Number.isInteger(sinCuenta) || sinCuenta < 0) return invalido("sinCuenta");

  const total = 1 + ids.length + sinCuenta;
  if (total < 2 || total > MAXIMO_INTEGRANTES) return invalido("grupo");

  return {
    ok: true,
    pedido: { compra: { ...compra.compra, monto, canal: compra.compra.canal as Canal }, contactos: ids, sinCuenta },
  };
}
