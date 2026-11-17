/**
 * De la respuesta de `recomendar-grupo` a lo que muestra Gasto en grupo (spec 016 US3). Función
 * pura: los textos se arman acá, en el teléfono, y del servidor no llega ningún texto sobre un
 * contacto. De un contacto se dice como mucho el medio que conviene (si paga), qué da la promo, el
 * reintegro y la base en palabras; nunca su tope ni cuántas compras tiene (FR-021). Toda cifra
 * lleva «≈» (constitución §V). Los nombres de los sin cuenta salen del pedido, en el teléfono.
 */
import { nombreDelMes } from "@vuelto/motor";
import { textoDia } from "../data/calculo";
import type { FilaIntegrante, PedidoGrupo, RecomendacionGrupo } from "../data/contracts";
import { aprox, fechaCorta, iniciales } from "../lib/format";
import { periodoDeVista, textoBase } from "../lib/textos";
import type { MedioDePago } from "../perfil/modelo";
import { medioVista } from "../perfil/vista";
import type {
  BaseDeContactoRemota,
  BaseDeVosRemota,
  OpcionDeContactoRemota,
  OpcionDeVosRemota,
  RespuestaGrupo,
} from "./repositorio";

/** Las pantallas no importan el motor (ADR-010): el tope del grupo llega por acá. */
export { MAXIMO_INTEGRANTES } from "@vuelto/motor";

/** "hoy sábado" o, si el servidor evaluó otro día (pasada la medianoche), "domingo 16/11" (US3-8). */
function cuando(fecha: string, hoy: string): string {
  if (fecha === hoy) return textoDia(fecha);
  return `${textoDia(fecha).replace(/^hoy /, "")} ${fechaCorta(fecha)}`;
}

/** Las iniciales de un avatar; "?" si el nombre no tiene letras. */
function inicialesDe(nombre: string): string {
  return iniciales(nombre) || "?";
}

/** El nombre visible de un medio propio: el del perfil, por id (lo tiene el teléfono). */
function nombreDeMedioPropio(m: OpcionDeVosRemota["medio"], propios: readonly MedioDePago[]): string {
  const propio = propios.find((p) => p.id === m.id);
  return medioVista(propio ?? { id: m.id, bancoId: "", nombreBanco: null, tipo: m.tipo, red: m.red as MedioDePago["red"] }).nombre;
}

/** El nombre visible del medio de un contacto que paga (banco, red y tipo; sin id). */
function nombreDeMedioDeContacto(m: NonNullable<OpcionDeContactoRemota["medio"]>): string {
  return medioVista({ id: "", bancoId: "", nombreBanco: m.bancoNombre, tipo: m.tipo, red: m.red as MedioDePago["red"] }).nombre;
}

/**
 * La base en palabras (constitución §V). De un contacto, sin números (ADR-008 §3, D10); de quien
 * pide, como en la compra individual, con la cantidad y el período (son sus datos).
 */
function base(b: BaseDeVosRemota | BaseDeContactoRemota, quien: { nombre: string } | { fecha: string }): string {
  if (b.tipo === "sin_tope_informado") return "la promo no informa tope";
  if (b.tipo === "tope_por_compra") return "tope por compra";
  if ("nombre" in quien) {
    return b.tipo === "con_compras"
      ? `según las compras que registró ${quien.nombre}`
      : `${quien.nombre} no tiene compras registradas con esta promo: sin base`;
  }
  const propia = b as Extract<BaseDeVosRemota, { periodo: unknown }>;
  const periodo = periodoDeVista(propia.periodo);
  return propia.tipo === "con_compras"
    ? textoBase(propia.comprasRegistradas, periodo, nombreDelMes(quien.fecha)).texto
    : `sin base ${periodo === "semana" ? "esta semana" : "este mes"}`;
}

/** Sin contactos vinculados, la gente sin cuenta no aporta tope: solo se pudo evaluar a «Vos» (#139, G-11). */
const AVISO_SOLO_VOS =
  "Solo pudimos evaluar tus medios: nadie más del grupo tiene cuenta con Vuelto. Invitá a alguien para que Vuelto decida con sus topes.";

type Pagador = {
  quienPaga: NonNullable<RecomendacionGrupo["quienPaga"]>;
  medio: string;
  medioPropioId: string | null;
  razon: string;
  base: string;
};

export function vistaDeGrupo(
  r: RespuestaGrupo,
  pedido: PedidoGrupo,
  opciones: { hoy: string; mediosPropios: readonly MedioDePago[]; nombresDeContactos: Record<string, string> },
): RecomendacionGrupo {
  const filas: FilaIntegrante[] = [];
  let pagador: Pagador | null = null;

  // Vos.
  const vos = r.vos.opcion;
  if (vos) {
    const medio = nombreDeMedioPropio(vos.medio, opciones.mediosPropios);
    const baseVos = base(vos.base, { fecha: r.fecha });
    const paga = r.quienPaga?.tipo === "vos";
    if (paga) pagador = { quienPaga: { clave: "vos", nombre: "Vos", esVos: true, iniciales: null }, medio: `tu ${medio}`, medioPropioId: vos.medio.id, razon: vos.queDa, base: baseVos };
    filas.push({
      clave: "vos",
      nombre: "Vos",
      iniciales: null,
      esVos: true,
      // US3-4: tu medio con su estado y su base, como en la compra individual.
      detalle: paga ? `Paga con tu ${medio} · ${baseVos}` : `Tu ${medio}: ${aprox(vos.reintegro)} de reintegro, ${baseVos}`,
      pone: r.vos.parte,
    });
  } else {
    filas.push({
      clave: "vos",
      nombre: "Vos",
      iniciales: null,
      esVos: true,
      detalle: r.vos.sinOpcion ?? "Tus medios no tienen promo en esta compra",
      pone: r.vos.parte,
    });
  }

  // Contactos, en el orden del servidor (el del desempate).
  for (const c of r.contactos) {
    const nombre = c.nombre ?? opciones.nombresDeContactos[c.id] ?? "Contacto";
    const o = c.opcion;
    const paga = r.quienPaga?.tipo === "contacto" && r.quienPaga.id === c.id;
    let detalle = "Sin reintegro en esta compra";
    if (o) {
      const baseContacto = base(o.base, { nombre });
      if (paga && o.medio) {
        const medio = nombreDeMedioDeContacto(o.medio);
        pagador = { quienPaga: { clave: c.id, nombre, esVos: false, iniciales: inicialesDe(nombre) }, medio: `su ${medio}`, medioPropioId: null, razon: o.queDa ?? "", base: baseContacto };
        detalle = `Paga con su ${medio}`;
      } else {
        detalle = `${aprox(o.reintegro)} si paga ${nombre} · ${baseContacto}`;
      }
    }
    filas.push({ clave: c.id, nombre, iniciales: inicialesDe(nombre), esVos: false, detalle, pone: c.parte });
  }

  // Los sin cuenta, con su nombre del teléfono.
  for (const s of [...r.sinCuenta].sort((a, b) => a.posicion - b.posicion)) {
    const nombre = pedido.sinCuenta.find((x) => x.posicion === s.posicion)?.nombre ?? "Sin cuenta";
    filas.push({
      clave: `sin-${s.posicion}`,
      nombre,
      iniciales: inicialesDe(nombre),
      esVos: false,
      detalle: "Sin cuenta: no conocemos su tope",
      pone: s.parte,
    });
  }

  const p: Pagador | null = pagador;
  return {
    titulo: p ? (p.quienPaga.esVos ? "Te conviene pagar vos" : `Te conviene que pague ${p.quienPaga.nombre}`) : "Nadie del grupo tiene reintegro en esta compra",
    comercio: pedido.comercio,
    cuando: cuando(r.fecha, opciones.hoy),
    monto: pedido.monto,
    quienPaga: p?.quienPaga ?? null,
    medio: p?.medio ?? null,
    medioPropioId: p?.medioPropioId ?? null,
    razon: p?.razon || null,
    reintegro: p ? r.reintegro : null,
    base: p?.base ?? null,
    aviso: r.contactos.length === 0 ? AVISO_SOLO_VOS : null,
    integrantes: filas,
  };
}
