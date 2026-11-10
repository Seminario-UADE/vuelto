/**
 * Capa imperativa de la sincronización (spec 009, ADR-009): lee del repositorio, arma lo que el
 * núcleo funcional necesita y despacha UNA acción con el resultado. Nunca lanza hacia la UI: un
 * fallo (sin red, página caída, timeout) deja el store como estaba y la leyenda sigue mostrando la
 * última sincronización exitosa (FR-003, FR-005).
 *
 * Sin sesión también baja el corpus (spec 012 FR-032, issue #112): la base deja leer todas las
 * promociones sin cuenta, así la primera respuesta del onboarding sale de promos reales. Las compras
 * son de la cuenta: sin sesión no se piden y quedan solo las pendientes sin dueño de la cola.
 */
import type { AppThunk } from "../store";
import { sincronizado } from "../store/acciones";
import type { Cursor, FilaCompra, FilaPromocion } from "./contratos";
import { reconciliarCompras } from "./compras";
import { aplicarPromociones } from "./corpus";
import { filaACompra } from "./mapeo";
import { leerTodo, TAMANO_PAGINA } from "./paginar";
import { ventanaDeCompras } from "./ventana";

export type Motivo = "apertura" | "primer-plano";

/** Entre dos sincronizaciones al volver a primer plano (FR-002). La de apertura no espera. */
export const ESPERA_MS = 5 * 60_000;
/** Cada pedido (FR-002). Vencido cuenta como falla. */
export const TIMEOUT_MS = 15_000;
/**
 * Margen de relectura (FR-007): `actualizada_en` es la hora de la escritura, no la del commit, así
 * que una transacción larga puede confirmar con una hora anterior a la marca. Releer es idempotente.
 * Contrato con la ingesta y la siembra: cada lote se confirma en menos de 5 minutos.
 */
export const MARGEN_MS = 10 * 60_000;

/** Un pedido con timeout: lo aborta (cancela la red) y lo cuenta como falla. */
function conTimeout<T>(pedir: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const control = new AbortController();
  return new Promise<T>((resolver, rechazar) => {
    const timer = setTimeout(() => {
      control.abort(new Error("timeout"));
      rechazar(new Error("timeout"));
    }, TIMEOUT_MS);
    pedir(control.signal).then(
      (v) => {
        clearTimeout(timer);
        resolver(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        rechazar(e);
      },
    );
  });
}

export function sincronizar(motivo: Motivo): AppThunk<Promise<void>> {
  return async (dispatch, getState, { repositorio, reloj, coordinacion }) => {
    if (repositorio === null || coordinacion.enVuelo) return;
    const inicio = reloj().getTime();
    if (
      motivo === "primer-plano" &&
      coordinacion.ultimoIntentoMs !== null &&
      inicio - coordinacion.ultimoIntentoMs < ESPERA_MS
    ) {
      return;
    }
    coordinacion.enVuelo = true;
    coordinacion.ultimoIntentoMs = inicio;
    try {
      const epoca = getState().sesion.epoca;
      const usuario = await conTimeout(() => repositorio.usuarioId());

      // Los parámetros salen del reloj real, nunca de `sesion.ahora` (FR-016): con los datos de
      // ejemplo ese reloj está fijo en el 14/10.
      const { hoy, desde } = ventanaDeCompras(reloj());
      const marca = getState().corpus.marca;
      const piso = marca === null ? null : pisoDeRelectura(marca);

      const compras =
        usuario === null
          ? []
          : await leerTodo<FilaCompra>(
              (cursor: Cursor) => conTimeout((signal) => repositorio.compras({ desde, cursor, limite: TAMANO_PAGINA, signal })),
              (f) => ({ valor: f.creada_en, id: f.id }),
            );
      const promociones = await leerTodo<FilaPromocion>(
        (cursor: Cursor) =>
          conTimeout((signal) =>
            repositorio.promociones({
              desde: piso,
              vigenteDesde: marca === null ? desde : null,
              cursor,
              limite: TAMANO_PAGINA,
              signal,
            }),
          ),
        (f) => ({ valor: f.actualizada_en, id: f.id }),
      );
      const ids = await conTimeout((signal) => repositorio.idsDePromociones(desde, signal));

      const ahora = reloj().toISOString();
      const corpus = aplicarPromociones(getState().corpus, promociones, {
        inicioPeriodo: desde,
        idsDelServidor: new Set(ids),
        ahora,
      });
      // La primera sincronización sin promos no cambia nada: ni el corpus de ejemplo, ni las compras, ni el reloj.
      if (corpus === null) return;

      // La ventana es [inicio del período, hoy] (FR-014): una compra con fecha futura no es del período.
      const delServidor = compras.flatMap((f) => {
        const c = filaACompra(f);
        return c === null || c.fecha > hoy ? [] : [c];
      });

      // El chequeo, la reconciliación y el dispatch son sincrónicos entre sí: no hay hueco para otra
      // acción (R3), y una compra guardada mientras volaba el pedido entra en la reconciliación (FR-015).
      const usuarioAhora = await conTimeout(() => repositorio.usuarioId());
      const estado = getState();
      if (estado.sesion.epoca !== epoca || usuarioAhora !== usuario || estado.corpus.marca !== marca) return;

      dispatch(
        sincronizado({
          corpus,
          compras: reconciliarCompras(delServidor, estado.cola.operaciones, usuario, desde),
          ahora,
        }),
      );
    } catch {
      // Sin red, página caída o timeout: el store queda como estaba.
    } finally {
      coordinacion.enVuelo = false;
    }
  };
}

/** `marca − 10 minutos`, en un formato que PostgREST acepta. La marca viaja como texto; el margen puede perder sub-milisegundos. */
function pisoDeRelectura(marca: string): string | null {
  const t = Date.parse(marca);
  return Number.isNaN(t) ? null : new Date(t - MARGEN_MS).toISOString();
}
