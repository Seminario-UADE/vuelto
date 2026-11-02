/**
 * Lo derivado del estado (ADR-010, spec 007 FR-004): la recomendación, los topes y las vistas
 * se calculan con `@vuelto/motor` en selectores memoizados. Ninguno lee el reloj del sistema:
 * la hora es `sesion.ahora` (FR-005).
 */
import { createSelector } from "@reduxjs/toolkit";
import { fechaArgentina } from "@vuelto/motor";
import { comprasVista, perfilDelMotor, recomendacionVista, topesVista, type EntradasMotor } from "../data/calculo";
import type { Comercio, MedioDePago, Perfil } from "../data/contracts";
import { catalogoComercios, catalogoMedios } from "../data/fixtures";
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
    promociones,
    compras,
    ahora,
  }),
);

export const selectComercioSimulado = createSelector(
  [(s: RootState) => s.simulacion.comercioId],
  (id): Comercio | null => catalogoComercios.find((c) => c.id === id) ?? null,
);

/** «¿Con qué pago?»: se recalcula con cada cambio del monto, sin red (US2). */
export const selectRecomendacion = createSelector(
  [selectEntradasMotor, selectComercioSimulado, (s: RootState) => s.simulacion.monto],
  (e, comercio, monto) => (comercio ? recomendacionVista(e, comercio, monto) : null),
);

export const selectTopes = createSelector([selectEntradasMotor], topesVista);

export const selectResumenCompras = createSelector([(s: RootState) => s.compras.lista, selectAhora], comprasVista);

export const selectMediosDelUsuario = createSelector([(s: RootState) => s.perfil.medios], (ids): MedioDePago[] =>
  catalogoMedios.filter((m) => ids.includes(m.id)),
);

/** Los comercios que eligió el usuario; si saltó ese paso, los frecuentes de ejemplo. */
export const selectComerciosFrecuentes = createSelector([(s: RootState) => s.perfil.comercios], (ids): Comercio[] => {
  const elegidos = catalogoComercios.filter((c) => ids.includes(c.id));
  return elegidos.length > 0 ? elegidos : catalogoComercios.filter((c) => c.frecuente);
});

export const selectPerfilVista = createSelector(
  [(s: RootState) => s.perfil.nombre, selectMediosDelUsuario, selectComerciosFrecuentes],
  (nombre, medios, comercios): Perfil => ({ nombre: nombre ?? "", medios, comercios }),
);
