/**
 * De la respuesta de `recomendar-grupo` a lo que muestra Gasto en grupo (spec 013 US3). Función
 * pura: los textos se arman acá, en el teléfono, y del servidor no llega ningún texto sobre un
 * contacto. De un contacto se dice como mucho el medio que conviene (si paga), qué da la promo, el
 * reintegro y la base en palabras; nunca su tope ni cuántas compras tiene (FR-021). Toda cifra
 * lleva «≈» (constitución §V). Los nombres de los sin cuenta salen del pedido, en el teléfono.
 */
import { nombreDelMes } from "@vuelto/motor";

/** Las pantallas no importan el motor (ADR-010): el tope del grupo llega por acá. */
export { MAXIMO_INTEGRANTES } from "@vuelto/motor";
import { textoDia } from "../data/calculo";
import type { FilaIntegrante, PedidoGrupo, RecomendacionGrupo } from "../data/contracts";
import { aprox, fechaCorta, iniciales } from "../lib/format";
import { periodoDeVista, textoBase } from "../lib/textos";
import type { MedioDePago } from "../perfil/modelo";
import { medioVista } from "../perfil/vista";
import type { BaseRemota, MedioRemoto, OpcionRemota, RespuestaGrupo } from "./repositorio";

/** "hoy sábado" o, si el servidor evaluó otro día (pasada la medianoche), "domingo 16/11" (US3-8). */
function cuando(fecha: string, hoy: string): string {
  if (fecha === hoy) return textoDia(fecha);
  return `${textoDia(fecha).replace(/^hoy /, "")} ${fechaCorta(fecha)}`;
}

/** El nombre visible de un medio que llegó del servidor (banco, red y tipo; sin id para un contacto). */
function nombreDeMedio(m: MedioRemoto, propios: readonly MedioDePago[]): string {
  const propio = m.id ? propios.find((p) => p.id === m.id) : undefined;
  if (propio) return medioVista(propio).nombre;
  return medioVista({ id: m.id ?? "", bancoId: "", nombreBanco: m.bancoNombre, tipo: m.tipo, red: m.red as MedioDePago["red"] }).nombre;
}

/** La base de un contacto en palabras, sin números (ADR-008 §3, D10). */
function baseDeContacto(base: BaseRemota, nombre: string): string {
  switch (base.tipo) {
    case "con_compras":
      return `según las compras que registró ${nombre}`;
    case "sin_compras":
      return `${nombre} no tiene compras registradas con esta promo: sin base`;
    case "sin_tope_informado":
      return "la promo no informa tope";
    case "tope_por_compra":
      return "tope por compra";
  }
}

/** La base de quien pide: como en la compra individual, con la cantidad (son sus datos). */
function baseDeVos(base: BaseRemota, fecha: string): string {
  if (base.tipo === "sin_tope_informado") return "la promo no informa tope";
  if (base.tipo === "tope_por_compra") return "tope por compra";
  const periodo = periodoDeVista(base.periodo ?? "mensual");
  const cantidad = base.tipo === "con_compras" ? (base.comprasRegistradas ?? 0) : 0;
  return cantidad > 0 ? textoBase(cantidad, periodo, nombreDelMes(fecha)).texto : `sin base ${periodo === "semana" ? "esta semana" : "este mes"}`;
}

export function vistaDeGrupo(
  r: RespuestaGrupo,
  pedido: PedidoGrupo,
  opciones: { hoy: string; mediosPropios: readonly MedioDePago[]; nombresDeContactos: Record<string, string> },
): RecomendacionGrupo {
  const nombreDe = (id: string, delServidor: string | null) => delServidor ?? opciones.nombresDeContactos[id] ?? "Contacto";
  const filas: FilaIntegrante[] = [];

  const pagaVos = r.quienPaga?.tipo === "vos";
  const vos = r.vos.opcion;
  filas.push({
    clave: "vos",
    nombre: "Vos",
    iniciales: null,
    esVos: true,
    detalle:
      vos && pagaVos
        ? `Paga con tu ${nombreDeMedio(vos.medio as MedioRemoto, opciones.mediosPropios)}`
        : vos
          ? `Tu ${nombreDeMedio(vos.medio as MedioRemoto, opciones.mediosPropios)}: ${aprox(vos.reintegro)} de reintegro, ${baseDeVos(vos.base, r.fecha)}`
          : (r.vos.sinOpcion ?? "Tus medios no tienen promo en esta compra"),
    pone: r.vos.parte,
  });

  for (const c of r.contactos) {
    const nombre = nombreDe(c.id, c.nombre);
    const paga = r.quienPaga?.tipo === "contacto" && r.quienPaga.id === c.id;
    const o = c.opcion;
    filas.push({
      clave: c.id,
      nombre,
      iniciales: iniciales(nombre) || "?",
      esVos: false,
      detalle:
        o && paga && o.medio
          ? `Paga con su ${nombreDeMedio(o.medio, [])}`
          : o
            ? `${aprox(o.reintegro)} si paga ${nombre} · ${baseDeContacto(o.base, nombre)}`
            : "Sin reintegro en esta compra",
      pone: c.parte,
    });
  }

  for (const s of [...r.sinCuenta].sort((a, b) => a.posicion - b.posicion)) {
    const nombre = pedido.sinCuenta.find((x) => x.posicion === s.posicion)?.nombre ?? "Sin cuenta";
    filas.push({
      clave: `sin-${s.posicion}`,
      nombre,
      iniciales: iniciales(nombre) || "?",
      esVos: false,
      detalle: "Sin cuenta: no conocemos su tope",
      pone: s.parte,
    });
  }

  // Quién paga, con qué medio, qué da la promo y la base.
  let quienPaga: RecomendacionGrupo["quienPaga"] = null;
  let medio: string | null = null;
  let base: string | null = null;
  let opcionQuePaga: OpcionRemota | null = null;
  if (r.quienPaga?.tipo === "vos" && vos) {
    quienPaga = { clave: "vos", nombre: "Vos", esVos: true, iniciales: null };
    medio = `tu ${nombreDeMedio(vos.medio as MedioRemoto, opciones.mediosPropios)}`;
    opcionQuePaga = vos;
    base = baseDeVos(vos.base, r.fecha);
  } else if (r.quienPaga?.tipo === "contacto") {
    const id = r.quienPaga.id;
    const c = r.contactos.find((x) => x.id === id);
    if (c?.opcion) {
      const nombre = nombreDe(c.id, c.nombre);
      quienPaga = { clave: c.id, nombre, esVos: false, iniciales: iniciales(nombre) || "?" };
      medio = c.opcion.medio ? `su ${nombreDeMedio(c.opcion.medio, [])}` : null;
      opcionQuePaga = c.opcion;
      base = baseDeContacto(c.opcion.base, nombre);
    }
  }
  const razon = opcionQuePaga?.queDa ?? null;

  return {
    titulo: quienPaga
      ? quienPaga.esVos
        ? "Te conviene pagar vos"
        : `Te conviene que pague ${quienPaga.nombre}`
      : "Nadie del grupo tiene reintegro en esta compra",
    comercio: pedido.comercio,
    cuando: cuando(r.fecha, opciones.hoy),
    monto: pedido.monto,
    quienPaga,
    medio,
    razon,
    reintegro: quienPaga ? r.reintegro : null,
    base,
    integrantes: filas,
  };
}
