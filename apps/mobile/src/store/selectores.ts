/**
 * Lo derivado del estado (ADR-010, spec 008 FR-004): la recomendación, los topes y las vistas
 * se calculan con `@vuelto/motor` en selectores memoizados. Ninguno lee el reloj del sistema:
 * la hora es `sesion.ahora` (FR-005).
 */
import { createSelector } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import { textoFrescura } from "../lib/frescura";
import {
  comercioPorNombre,
  comprasDeTopeVista,
  comprasVista,
  perfilDelMotor,
  recomendacionVista,
  topesVista,
  type EntradasMotor,
} from "../data/calculo";
import { contarPendientes } from "../data/compras/operaciones";
import type { Comercio, MedioDePago, Perfil } from "../data/contracts";
import { catalogoComercios } from "../data/fixtures";
import { medioVista } from "../perfil/vista";
import type { RootState } from "./index";

export const selectAhora = createSelector([(s: RootState) => s.sesion.ahora], (iso) => new Date(iso));

/** "2026-10-14": el día en Argentina según el reloj del store. */
export const selectHoy = createSelector([selectAhora], fechaArgentina);

/**
 * Lo que el motor necesita, con su forma. Cambiar el monto o el comercio de la simulación no
 * lo reconstruye: el motor recibe las mismas referencias.
 */
export const selectEntradasMotor = createSelector(
  [
    (s: RootState) => s.perfil.medios,
    (s: RootState) => s.corpus.promociones,
    (s: RootState) => s.compras.lista,
    selectAhora,
  ],
  (medios, promociones, compras, ahora): EntradasMotor => ({
    perfil: perfilDelMotor(medios, null),
    medios,
    promociones,
    compras,
    ahora,
  }),
);

/** Los comercios que eligió el usuario; si saltó ese paso, los frecuentes de ejemplo. */
export const selectComerciosFrecuentes = createSelector([(s: RootState) => s.perfil.comercios], (habituales): Comercio[] => {
  // Del catálogo si lo conoce (con su rubro); si no, el comercio por su nombre, sin rubro inventado.
  const elegidos = habituales.map((c) => comercioPorNombre(c.nombre));
  return elegidos.length > 0 ? elegidos : catalogoComercios.filter((c) => c.frecuente);
});

/** El comercio que tocó: del catálogo o uno de sus habituales escritos a mano (sin rubro). */
export const selectComercioSimulado = createSelector(
  [(s: RootState) => s.simulacion.comercioId, selectComerciosFrecuentes],
  (id, frecuentes): Comercio | null =>
    catalogoComercios.find((c) => c.id === id) ?? frecuentes.find((c) => c.id === id) ?? null,
);

/** «¿Con qué pago?»: se recalcula con cada cambio del monto, sin red (US2). */
export const selectRecomendacion = createSelector(
  [selectEntradasMotor, selectComercioSimulado, (s: RootState) => s.simulacion.monto],
  (e, comercio, monto) => (comercio ? recomendacionVista(e, comercio, monto) : null),
);

const MAX_CONVIENE_HOY = 6;

/**
 * «Hoy te conviene» de la pestaña Comercios (v7): la recomendación sin monto para tus comercios
 * y, hasta completar seis, los más usados del catálogo; el mismo motor que el «+». La
 * recomendación es `null` si el comercio no tiene rubro conocido.
 */
export const selectConvieneHoy = createSelector([selectEntradasMotor, selectComerciosFrecuentes], (e, tuyos) => {
  const nombres = new Set(tuyos.map((c) => c.nombre.toLowerCase()));
  const masUsados = catalogoComercios.filter((c) => c.frecuente && !nombres.has(c.nombre.toLowerCase()));
  return [...tuyos, ...masUsados]
    .slice(0, Math.max(tuyos.length, MAX_CONVIENE_HOY))
    .map((comercio) => ({ comercio, recomendacion: recomendacionVista(e, comercio, null) }));
});

export const selectTopes = createSelector([selectEntradasMotor], topesVista);

/**
 * Las compras que consumieron un tope (issue #45), por su `clave`. Sale de `selectTopes`: la
 * misma llamada a `estimarTopes` que pinta la tarjeta, así guardar o borrar una compra cambia
 * las dos a la vez, sin red.
 */
export const selectComprasDeTope = createSelector(
  [
    selectTopes,
    (s: RootState) => s.compras.lista,
    (s: RootState) => s.perfil.medios,
    (_s: RootState, clave: string) => clave,
  ],
  comprasDeTopeVista,
);

/** "Promos actualizadas hace 2 horas", o `null` con los datos de ejemplo (spec 009 FR-019). */
export const selectFrescura = createSelector(
  [selectAhora, (s: RootState) => s.corpus.sincronizadoEn],
  textoFrescura,
);

export const selectResumenCompras = createSelector(
  [(s: RootState) => s.compras.lista, selectAhora, (s: RootState) => s.perfil.medios],
  comprasVista,
);

/** Los medios del perfil con el nombre que muestran las pantallas. */
export const selectMediosDelUsuario = createSelector([(s: RootState) => s.perfil.medios], (medios): MedioDePago[] =>
  medios.map(medioVista),
);

export const selectPerfilVista = createSelector(
  [(s: RootState) => s.perfil.nombre, selectMediosDelUsuario, selectComerciosFrecuentes],
  (nombre, medios, comercios): Perfil => ({ nombre: nombre ?? "", medios, comercios }),
);

export type MarcaDeSubida = "sin-subir" | "no-se-pudo" | "solo-celular";

/**
 * Qué compras todavía no están en la cuenta y por qué (spec 010, FR-014). Con la subida
 * desconectada no hay marcas ni recuentos: no hay nada que prometerle al usuario (FR-020).
 */
export const selectMarcasDeSubida = createSelector(
  [(s: RootState) => s.cola.operaciones, (s: RootState) => s.cola.subidaConectada],
  (operaciones, conectada) => {
    const marcas: Record<string, MarcaDeSubida> = {};
    const total = { sinSubir: 0, noSePudo: 0, soloCelular: 0 };
    if (!conectada) return { marcas, ...total };
    for (const o of operaciones) {
      if (o.tipo !== "guardar") continue;
      const e = o.estado.tipo;
      const marca: MarcaDeSubida = e === "rechazada" ? "no-se-pudo" : e === "bloqueada" ? "solo-celular" : "sin-subir";
      marcas[o.compra.id] = marca;
      if (marca === "sin-subir") total.sinSubir += 1;
      else if (marca === "no-se-pudo") total.noSePudo += 1;
      else total.soloCelular += 1;
    }
    return { marcas, ...total };
  },
);

/** Lo que se pierde al cerrar sesión: guardados y borrados que el servidor todavía no tiene (FR-016). */
export const selectPendientesAlCerrarSesion = createSelector(
  [(s: RootState) => s.cola.operaciones, (s: RootState) => s.cola.subidaConectada],
  (operaciones, conectada) => (conectada ? contarPendientes(operaciones) : { guardados: 0, borrados: 0 }),
);
