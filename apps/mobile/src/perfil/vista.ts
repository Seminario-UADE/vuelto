/**
 * Del medio guardado (slice `perfil`) a lo que usan el motor y las pantallas. Funciones puras.
 * El nombre visible sale del banco, la red y el tipo: no hay un catálogo aparte de medios.
 */
import type { MedioDePago as MedioMotor } from "@vuelto/motor";
import type { MedioDePago as MedioVista } from "../data/contracts";
import { ETIQUETAS_RED, ETIQUETAS_TIPO, type MedioDePago } from "./modelo";

/** «Banco Galicia» → «Galicia», «Banco de la Nación Argentina» → «Nación Argentina»: para «Usar Galicia». */
export function nombreCorto(nombreBanco: string): string {
  const corto = nombreBanco.replace(/^banco\s+(del?\s+)?(la\s+)?/i, "").trim();
  return corto === "" ? nombreBanco : corto;
}

export function medioVista(m: MedioDePago): MedioVista {
  const red = ETIQUETAS_RED[m.red];
  const tipo = ETIQUETAS_TIPO[m.tipo];
  // Sin nombre de banco (la fila vino sin el join) no se inventa uno: se nombra por la red.
  const corto = m.nombreBanco ? nombreCorto(m.nombreBanco) : red;
  const nombre = `${m.nombreBanco ? `${corto} ` : ""}${red} ${tipo.toLowerCase()}`;
  return {
    id: m.id,
    banco: m.nombreBanco ? corto : "Banco",
    nombre,
    nombreCorto: corto,
    detalle: m.nombreBanco ? `${tipo} · ${m.nombreBanco}` : tipo,
    inicial: corto.charAt(0).toUpperCase(),
    conCobertura: true,
  };
}

export function medioDelMotor(m: MedioDePago): MedioMotor {
  return { id: m.id, bancoId: m.bancoId, tipo: m.tipo, red: m.red };
}
