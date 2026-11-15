/**
 * REEMPLAZO LOCAL DE LA EDGE FUNCTION DE GRUPO (#54/#56). En producción el grupo cruza datos
 * de varios usuarios y se calcula en el servidor (constitución §II, ADR-008 §4); la app recibe
 * solo lo que ADR-008 §3 deja ver. Acá, como en el servidor, cada integrante se evalúa con
 * `recomendar()` del motor. «Vos» va con los datos de quien pide (sus medios, sus compras, el
 * corpus y el reloj del store, `selectEntradasMotor`: G-01); los contactos, con los de
 * `fixtures.ts` y el mismo corpus. Lo importa solo `api.ts`. Se borra, junto con
 * `datosDeContactos` de `fixtures.ts`, cuando la app llame a la Edge Function de grupo (#56): las
 * compras de un contacto no pueden quedar en el bundle de la app.
 */
import {
  fechaArgentina,
  nombreDelMes,
  type Compra as CompraMotor,
  type MedioDePago as MedioMotor,
  type Promocion,
} from "@vuelto/motor";
import type { Base, Comercio, FilaIntegrante, IntegranteGrupo, RecomendacionGrupo } from "./contracts";
import { catalogoMedios, contactos, datosDeContactos } from "./fixtures";
import { pedidoDeCompra, recomendarSeguro, textoDia, type EntradasMotor } from "./calculo";
import { razonDe } from "./vista-recomendacion";
import { aprox, fechaCorta } from "../lib/format";
import { mediodia } from "../lib/reloj";
import { RUBROS } from "../lib/rubros";
import { periodoDeVista, textoBase } from "../lib/textos";
import { medioVista } from "../perfil/vista";

type Opcion = {
  quien: { nombre: string; esVos: boolean; orden: number };
  medio: string;
  razon: string;
  reintegro: number;
  conBase: boolean;
  base: Base;
};

function evaluar(
  medios: readonly MedioMotor[],
  compras: readonly CompraMotor[],
  promociones: readonly Promocion[],
  comercio: Comercio,
  monto: number,
  fecha: string,
) {
  if (comercio.categoriaId === null) return null;
  return recomendarSeguro(pedidoDeCompra({ ...comercio, categoriaId: comercio.categoriaId }, monto), {
    perfil: { nombreParaMostrar: null, mediosDePago: [...medios], comerciosHabituales: [] },
    promociones: [...promociones],
    compras: [...compras],
    ahora: mediodia(fecha),
  });
}

/** "hoy miércoles" o "sábado 17/10". */
function cuandoTexto(fecha: string, hoy: string): string {
  if (fecha === hoy) return textoDia(fecha);
  return `${textoDia(fecha).replace(/^hoy /, "")} ${fechaCorta(fecha)}`;
}

/**
 * `vos`: las entradas del motor de quien pide, del store (`selectEntradasMotor`). Su `ahora` es
 * el reloj del store: de ahí sale «hoy» (ADR-010), nunca del reloj del sistema.
 */
export function recomendarGrupo(
  pedido: { nombre: string | null; comercio: Comercio; monto: number; fecha: string; integrantes: IntegranteGrupo[] },
  vos: EntradasMotor,
): RecomendacionGrupo {
  const { nombre, comercio, monto, fecha, integrantes } = pedido;
  const hoy = fechaArgentina(vos.ahora);
  const { promociones } = vos;
  const nombreDeTuMedio = (id: string): string | undefined => {
    const m = vos.medios.find((x) => x.id === id);
    return m ? medioVista(m).nombre : undefined;
  };
  const n = Math.max(1, integrantes.length);
  const rubro = RUBROS[comercio.rubro].enFrase;
  const mes = nombreDelMes(fecha);
  const opciones: Opcion[] = [];
  const filas: FilaIntegrante[] = [];

  integrantes.forEach((i, orden) => {
    if (i.tipo === "vos") {
      const r = evaluar(vos.perfil.mediosDePago, vos.compras, promociones, comercio, monto, fecha);
      const mejor = r?.mejor ?? null;
      const medio = mejor ? nombreDeTuMedio(mejor.medioDePagoId) : undefined;
      if (mejor && medio) {
        const principal = mejor.promociones[0];
        const periodo = periodoDeVista(principal?.periodo ?? null);
        const base = textoBase(principal?.base?.comprasRegistradas ?? 0, periodo, mes);
        opciones.push({
          quien: { nombre: "Vos", esVos: true, orden: -1 },
          medio: `tu ${medio}`,
          razon: razonDe(mejor),
          reintegro: mejor.ahorroEstimado,
          conBase: base.tipo === "compras",
          base,
        });
        filas.push({
          nombre: "Vos",
          iniciales: null,
          esVos: true,
          detalle:
            base.tipo === "compras"
              ? `Tu ${medio}: ${aprox(mejor.ahorroEstimado)} de reintegro, ${base.texto}`
              : `Tu ${medio}: ${razonDe(mejor)}, sin base ${periodo === "semana" ? "esta semana" : "este mes"}`,
        });
        return;
      }
      // Sin opción: se explica con la promo del rubro que no aplica ese día o está agotada.
      const descarte = r?.descartadas.find((d) => d.causa !== "categoria" && d.causa !== "medio_de_pago");
      const promo = promociones.find((p) => p.id === descarte?.promocionId);
      const delBanco = vos.perfil.mediosDePago.find((m) => m.bancoId === promo?.bancoId);
      const suyo = delBanco ? nombreDeTuMedio(delBanco.id) : undefined;
      filas.push({
        nombre: "Vos",
        iniciales: null,
        esVos: true,
        detalle:
          descarte && suyo
            ? `Tu ${suyo}: ${descarte.causa === "tope_agotado" ? "tope agotado" : descarte.motivo.replace(/^Hoy no aplica[:,] /, "")}`
            : `Tus medios no tienen promo en ${rubro} ese día`,
      });
      return;
    }
    if (i.tipo === "sin-cuenta") {
      filas.push({
        nombre: i.nombre,
        iniciales: i.nombre.trim().charAt(0).toUpperCase() || "?",
        esVos: false,
        detalle: "Sin cuenta: no conocemos su tope",
      });
      return;
    }
    const c = contactos.find((x) => x.id === i.contactoId);
    const datos = datosDeContactos[i.contactoId];
    const nombreC = c?.nombre ?? "Contacto";
    const tieneCompras = (datos?.compras.length ?? 0) > 0;
    const r = datos ? evaluar(datos.medios, datos.compras, promociones, comercio, monto, fecha) : null;
    const mejor = r?.mejor ?? null;
    const nombreMedio = mejor ? (catalogoMedios.find((m) => m.id === mejor.medioDePagoId)?.nombre ?? null) : null;
    const base: Base = tieneCompras
      ? { tipo: "contacto", texto: `según las compras que registró ${nombreC}` }
      : { tipo: "contacto", texto: `${nombreC} no tiene compras registradas: sin base` };
    if (mejor && nombreMedio) {
      opciones.push({
        quien: { nombre: nombreC, esVos: false, orden },
        medio: `su ${nombreMedio}`,
        razon: razonDe(mejor),
        reintegro: mejor.ahorroEstimado,
        conBase: tieneCompras && mejor.promociones[0]?.topeRestanteTrasCompra !== null,
        base,
      });
    }
    // ADR-008 §3: de un contacto no se nombra ningún medio salvo el que se recomienda usar.
    filas.push({
      nombre: nombreC,
      iniciales: c?.iniciales ?? null,
      esVos: false,
      detalle: mejor
        ? `${aprox(mejor.ahorroEstimado)} si paga ${nombreC} · ${base.texto}`
        : tieneCompras
          ? "Sin reintegro en esta compra"
          : `Sin reintegro en esta compra · ${base.texto}`,
    });
  });

  // Mayor reintegro; a igual reintegro, el estimado con base; después quien pide (ADR-008 §5)
  // y el orden de los integrantes. El desempate definitivo es de #56.
  opciones.sort(
    (a, b) => b.reintegro - a.reintegro || Number(b.conBase) - Number(a.conBase) || a.quien.orden - b.quien.orden,
  );
  const elegida = opciones[0];
  if (elegida) {
    const fila = filas.find((f) => f.nombre === elegida.quien.nombre);
    if (fila) fila.detalle = `Paga con ${elegida.medio}`;
  }

  return {
    nombre,
    comercio,
    cuando: cuandoTexto(fecha, hoy),
    monto,
    quienPaga: elegida ? { nombre: elegida.quien.nombre, esVos: elegida.quien.esVos } : null,
    medio: elegida?.medio ?? null,
    razon: elegida?.razon ?? null,
    reintegro: elegida?.reintegro ?? null,
    base: elegida?.base ?? null,
    partePorPersona: Math.round((monto - (elegida?.reintegro ?? 0)) / n),
    integrantes: filas,
  };
}
