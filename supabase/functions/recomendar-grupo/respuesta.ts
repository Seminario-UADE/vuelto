/**
 * La respuesta de `POST /recomendar-grupo` al teléfono (`contracts/recomendar-grupo.md`). Es la
 * lista blanca de FR-021: de un contacto solo sale su nombre, el medio recomendado y qué da esa
 * promo (si es quien paga), el reintegro de esta compra en escalones de $100 y el tipo de base.
 * Nunca su tope, lo que le queda, la cantidad de compras, sus compras ni sus otros medios. Los
 * textos los arma la app; de acá no sale ningún texto del motor sobre un contacto.
 */
import type { BaseDeGrupo, FechaISO, MedioDePago, RecomendacionDeGrupo, TipoTarjeta } from "@vuelto/motor";
import type { DatosDeContacto, UsuarioId } from "../_shared/repositorios.ts";

type BaseDeContacto = { tipo: BaseDeGrupo["tipo"] };

export interface OpcionDeVos {
  medio: { id: string; bancoNombre: null; tipo: TipoTarjeta; red: string };
  queDa: string;
  reintegro: number;
  base: BaseDeGrupo;
}

export interface OpcionDeContacto {
  medio: { bancoNombre: string | null; tipo: TipoTarjeta; red: string } | null;
  queDa: string | null;
  reintegro: number;
  base: BaseDeContacto;
}

export interface RespuestaGrupo {
  fecha: FechaISO;
  quienPaga: { tipo: "vos" } | { tipo: "contacto"; id: UsuarioId } | null;
  reintegro: number | null;
  total: number;
  vos: { opcion: OpcionDeVos | null; sinOpcion: string | null; parte: number };
  contactos: { id: UsuarioId; nombre: string | null; opcion: OpcionDeContacto | null; parte: number }[];
  sinCuenta: { posicion: number; parte: number }[];
}

/** Por qué quien pide no tiene opción: el descarte del motor o, si tenía una, que no llega a $1. */
function motivoSinOpcion(d: { opcion: unknown; descarte: { motivo: string } | null } | null): string | null {
  if (d?.descarte) return d.descarte.motivo;
  return d?.opcion ? "El reintegro de tus medios en esta compra no llega a $1" : null;
}

export function armarRespuesta(
  fecha: FechaISO,
  r: RecomendacionDeGrupo,
  quienPide: UsuarioId,
  mediosPropios: MedioDePago[],
  contactos: DatosDeContacto[],
): RespuestaGrupo {
  const respuesta: RespuestaGrupo = {
    fecha,
    quienPaga: r.quienPaga === null ? null : r.quienPaga === quienPide ? { tipo: "vos" } : { tipo: "contacto", id: r.quienPaga },
    reintegro: r.reintegro,
    total: r.total,
    vos: { opcion: null, sinOpcion: null, parte: 0 },
    contactos: [],
    sinCuenta: [],
  };

  for (const i of r.integrantes) {
    if (i.tipo === "sin_cuenta") {
      respuesta.sinCuenta.push({ posicion: i.posicion, parte: i.parte });
      continue;
    }
    if (i.pide) {
      const medio = i.opcion ? mediosPropios.find((m) => m.id === i.opcion?.medioDePagoId) : undefined;
      respuesta.vos = {
        opcion:
          i.opcion && medio
            ? {
                medio: { id: medio.id, bancoNombre: null, tipo: medio.tipo, red: medio.red },
                queDa: i.opcion.queDa,
                reintegro: i.opcion.reintegroMostrado,
                base: i.opcion.base,
              }
            : null,
        sinOpcion: i.opcion ? null : motivoSinOpcion(i.deQuienPide),
        parte: i.parte,
      };
      continue;
    }
    const datos = contactos.find((c) => c.id === i.id);
    const paga = r.quienPaga === i.id;
    const medio = paga && i.opcion ? datos?.medios.find((m) => m.id === i.opcion?.medioDePagoId) : undefined;
    respuesta.contactos.push({
      id: i.id,
      nombre: datos?.nombre ?? null,
      opcion: i.opcion
        ? {
            // Solo se nombra el medio del contacto que paga, y sin su id (ADR-008 §3).
            medio: medio ? { bancoNombre: medio.bancoNombre, tipo: medio.tipo, red: medio.red } : null,
            queDa: paga ? i.opcion.queDa : null,
            reintegro: i.opcion.reintegroMostrado,
            // Sin cantidad de compras ni período: la base de un contacto se dice en palabras.
            base: { tipo: i.opcion.base.tipo },
          }
        : null,
      parte: i.parte,
    });
  }
  return respuesta;
}
