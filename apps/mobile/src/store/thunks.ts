/** Capa imperativa del store (ADR-009): lo que arma datos y despacha. */
import { fechaArgentina, type Compra } from "@vuelto/motor";
import { compraParaGuardar } from "../data/calculo";
import { esDeEjemplo, esUuid } from "../data/compras/ejemplo";
import { compraAFila } from "../data/compras/fila";
import { descartarViejas, reconciliar, siguienteLote, type Operacion } from "../data/compras/operaciones";
import { PLAZO_DE_ENVIO_MS, type ResultadoEnvio, type Subida } from "../data/compras/repositorio";
import type { BorradorCompra } from "../data/contracts";
import { origenAlConfirmar, type CompraPorConfirmar } from "../data/por-confirmar";
import {
  CLAVE_COLA,
  borradoEncolado,
  colaCargada,
  colaCompactada,
  colaReconciliada,
  enviosInterrumpidos,
  envioResuelto,
  guardadoEncolado,
  leerCola,
  operacionBloqueada,
  operacionEnviando,
  operacionReintentada,
  operacionesAdoptadas,
  operacionesDescartadas,
  operacionesDeclinadas,
  subidaConectada,
  vaciadoIniciado,
  vaciadoPedido,
  vaciadoTerminado,
} from "./cola";
import { compraAgregada, compraEliminada, comprasReconciliadas } from "./compras";
import type { AppDispatch, AppThunk, RootState } from "./index";
import { porConfirmarCreada, porConfirmarDescartada, selectPorConfirmarVigentes } from "./por-confirmar";
import { selectCatalogoParaCompras, selectEntradasMotor, selectRecomendacion } from "./selectores";
import { comercioElegido } from "./simulacion";

/** El usuario de la sesión de Supabase, o `null` si no hay (o la subida no está conectada). */
const duenoDe = (subida: Subida | null): string | null => subida?.contexto().userId ?? null;

/**
 * Guarda una compra (FR-008): el motor la evalúa con el estado de hoy y queda en `compras`,
 * así Topes, Mis compras y la próxima recomendación la cuentan. Falla con el mismo mensaje
 * que antes si falta el monto o el medio. Registra la operación en la cola **antes** de
 * agregar la compra (spec 010, R2) y pide subirla.
 *
 * `intento` identifica la apertura de la hoja: un segundo toque con el mismo intento no
 * duplica la compra (FR-005). `id`, si viene, es el de la compra (spec 012, FR-016): si ya
 * existe una compra con ese id, se devuelve esa y no se registra otra.
 */
export function guardarCompra(b: BorradorCompra, intento: string | null = null, id?: string): AppThunk<Compra> {
  return (dispatch, getState, { generarId, subida }) => {
    if (id !== undefined) {
      const existente = getState().compras.lista.find((c) => c.id === id);
      if (existente) return existente;
    }
    const previa = intento === null ? undefined : getState().cola.intentos[intento];
    if (previa !== undefined) {
      const existente = getState().compras.lista.find((c) => c.id === previa);
      if (existente) return existente;
    }
    const estado = getState();
    const compra = compraParaGuardar(selectEntradasMotor(estado), b, id ?? generarId(), selectCatalogoParaCompras(estado));
    dispatch(
      guardadoEncolado({ idOp: generarId(), compra, dueno: duenoDe(subida), ahora: estado.sesion.ahora, intento }),
    );
    dispatch(compraAgregada(compra));
    void dispatch(vaciarCola());
    return compra;
  };
}

/**
 * «Usar [medio]» desde Inicio o desde el detalle del comercio (spec 012, FR-002): deja una
 * compra por confirmar con lo que se está simulando y limpia la simulación. No crea ninguna
 * compra, así que no toca topes (FR-003). Devuelve si reemplazó la del mismo comercio
 * (FR-012), o `null` si no hay un medio recomendado o no hay usuario.
 */
export function usarRecomendacion(): AppThunk<{ porConfirmar: CompraPorConfirmar; medioNombre: string; reemplazo: boolean } | null> {
  return (dispatch, getState, { generarId }) => {
    const estado = getState();
    const r = selectRecomendacion(estado);
    const usuarioId = estado.sesion.usuario?.id ?? null;
    if (r === null || r.medio === null || usuarioId === null) return null;
    const porConfirmar: CompraPorConfirmar = {
      id: generarId(),
      usuarioId,
      comercioId: r.comercio.id,
      comercioNombre: r.comercio.nombre,
      medioId: r.medio.id,
      monto: estado.simulacion.monto,
      creadaEn: estado.sesion.ahora,
      canal: estado.simulacion.canal,
      categoriaId: r.comercio.categoriaId,
    };
    const reemplazo = selectPorConfirmarVigentes(estado).some((c) => c.comercioId === porConfirmar.comercioId);
    dispatch(porConfirmarCreada(porConfirmar));
    dispatch(comercioElegido(null));
    return { porConfirmar, medioNombre: r.medio.nombre, reemplazo };
  };
}

/**
 * «Guardar compra» en Revisá abierta desde una compra por confirmar (spec 012, FR-006, FR-016).
 * La compra usa el id de la compra por confirmar, y `compraAgregada` la saca de la lista en la
 * misma acción. Si la compra ya existe (doble toque, o la app se cerró entre las dos
 * escrituras), devuelve esa y solo saca la por confirmar. Falla como `guardarCompra` si falta
 * el monto o el medio, y entonces la compra por confirmar queda.
 */
export function confirmarPorConfirmar(id: string, b: BorradorCompra, intento: string | null = null): AppThunk<Compra> {
  return (dispatch, getState) => {
    const existente = getState().compras.lista.find((c) => c.id === id);
    if (existente) {
      dispatch(porConfirmarDescartada(id));
      return existente;
    }
    const pc = getState().porConfirmar.lista.find((c) => c.id === id);
    // Vencida con la hoja abierta igual se guarda (Edge Cases); si ya no está, con el modo del borrador.
    const modo = pc ? origenAlConfirmar(pc, b, b.modo === "ticket", selectCatalogoParaCompras(getState())) : b.modo;
    return dispatch(guardarCompra({ ...b, modo }, intento, id));
  };
}

/** «Descartar» (FR-010): la saca sin otro efecto. Devuelve la descartada, o `null` si no estaba. */
export function descartarPorConfirmar(id: string): AppThunk<CompraPorConfirmar | null> {
  return (dispatch, getState) => {
    const pc = getState().porConfirmar.lista.find((c) => c.id === id) ?? null;
    if (pc !== null) dispatch(porConfirmarDescartada(id));
    return pc;
  };
}

/**
 * Borra una compra (spec 010, FR-002): sale de `compras` y los topes y totales se recalculan
 * solos. Si todavía no subió, su guardado se anula sin llamar al servidor; si ya subió, se
 * encola el borrado. Las compras de ejemplo solo salen de la lista. Devuelve la compra
 * borrada, o `null` si no existía.
 */
export function eliminarCompra(id: string): AppThunk<Compra | null> {
  return (dispatch, getState, { generarId, subida }) => {
    const estado = getState();
    const compra = estado.compras.lista.find((c) => c.id === id) ?? null;
    if (compra === null) return null;
    if (esUuid(compra.id) && !esDeEjemplo(compra.id)) {
      dispatch(
        borradoEncolado({
          idOp: generarId(),
          compraId: compra.id,
          fecha: compra.fecha,
          dueno: duenoDe(subida),
          ahora: estado.sesion.ahora,
        }),
      );
    }
    dispatch(compraEliminada(id));
    // Después de sacar la compra: el guardado que nunca subió se anula con su borrado.
    dispatch(colaCompactada());
    void dispatch(vaciarCola());
    return compra;
  };
}

/** Un envío con plazo: lo que no contesta a tiempo es transitorio y se reintenta (FR-012). */
async function enviar(plazoMs: number, f: (signal: AbortSignal) => Promise<ResultadoEnvio>): Promise<ResultadoEnvio> {
  const control = new AbortController();
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<ResultadoEnvio>((resolver) => {
    reloj = setTimeout(() => {
      control.abort();
      resolver({ tipo: "transitorio" });
    }, plazoMs);
  });
  try {
    return await Promise.race([f(control.signal), vencido]);
  } catch {
    return { tipo: "transitorio" };
  } finally {
    clearTimeout(reloj);
  }
}

/** Una pasada por la cola: cada operación elegible una vez, las que dependen de otra después. */
async function pasada(dispatch: AppDispatch, getState: () => RootState, subida: Subida): Promise<void> {
  const contexto = subida.contexto();
  dispatch(subidaConectada(contexto.userId !== null));
  if (contexto.userId === null) return;
  const plazo = subida.plazoMs ?? PLAZO_DE_ENVIO_MS;
  const intentadas = new Set<string>();

  const procesar = async (op: Operacion): Promise<void> => {
    if (op.tipo === "borrar") {
      dispatch(operacionEnviando(op.id));
      const r = await enviar(plazo, (signal) => subida.repositorio.borrar(op.compraId, { signal }));
      dispatch(envioResuelto({ id: op.id, resultado: r }));
      return;
    }
    const fila = compraAFila(op.compra, {
      medioRemoto: contexto.medioRemoto(op.compra.medioDePagoId),
      promoRemota: op.compra.promocionId === null ? null : contexto.promoRemota(op.compra.promocionId),
    });
    if (!fila.ok) {
      if (fila.motivo === "invalida") {
        dispatch(envioResuelto({ id: op.id, resultado: { tipo: "rechazada", causa: "invalida" } }));
      } else if (!(op.estado.tipo === "bloqueada" && op.estado.motivo === fila.motivo)) {
        dispatch(operacionBloqueada({ id: op.id, motivo: fila.motivo }));
      }
      return;
    }
    dispatch(operacionEnviando(op.id));
    const r = await enviar(plazo, (signal) => subida.repositorio.guardar(fila.fila, { signal }));
    dispatch(envioResuelto({ id: op.id, resultado: r }));
  };

  for (;;) {
    const lote = siguienteLote(getState().cola.operaciones, contexto.userId).filter((o) => !intentadas.has(o.id));
    if (lote.length === 0) return;
    for (const op of lote) {
      intentadas.add(op.id);
      await procesar(op);
    }
  }
}

/**
 * Sube lo pendiente (spec 010, FR-005 a FR-012). Un solo vaciado a la vez: si llega otro
 * pedido mientras corre, se hace otra pasada al terminar. Con la subida desconectada
 * (FR-020) no hace nada y la cola solo acumula.
 */
export function vaciarCola(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { subida }) => {
    if (!getState().cola.hidratada) return;
    // El techo de 90 días también rige en una sesión larga, no solo al abrir (FR-019).
    const vigentes = descartarViejas(
      getState().cola.operaciones,
      fechaArgentina(new Date(getState().sesion.ahora)),
    );
    if (vigentes.length !== getState().cola.operaciones.length) dispatch(operacionesDescartadas(vigentes));
    if (subida === null) return;
    if (getState().cola.vaciando) {
      dispatch(vaciadoPedido());
      return;
    }
    dispatch(vaciadoIniciado());
    try {
      for (;;) {
        await pasada(dispatch, getState, subida);
        if (!getState().cola.volver) break;
        dispatch(vaciadoIniciado());
      }
    } finally {
      dispatch(vaciadoTerminado());
    }
  };
}

/**
 * Al abrir la app, después de `rehidratar()`: lee la cola, deja compras y cola consistentes
 * (FR-013), migra las compras con id `nN` (FR-007), descarta lo de más de 90 días (FR-019) y
 * pide subir. No toca `persistencia.ts`: la cola se persiste con su propio listener.
 */
export function iniciarCompras(): AppThunk<Promise<void>> {
  return async (dispatch, getState, { almacenamiento, generarId, subida }) => {
    let guardadas: Operacion[] = [];
    try {
      guardadas = leerCola(await almacenamiento.getItem(CLAVE_COLA)) ?? [];
    } catch {
      // Sin almacenamiento la app funciona en memoria.
    }
    dispatch(colaCargada(guardadas));

    const estado = getState();
    const r = reconciliar(estado.compras.lista, estado.cola.operaciones, {
      generarId,
      dueno: duenoDe(subida),
      ahora: estado.sesion.ahora,
      hoy: fechaArgentina(new Date(estado.sesion.ahora)),
    });
    // Primero la cola, después las compras: el orden de las escrituras importa (R2).
    const colaCambio =
      r.operaciones.length !== estado.cola.operaciones.length ||
      r.operaciones.some((o, i) => o !== estado.cola.operaciones[i]);
    if (colaCambio) dispatch(colaReconciliada(r.operaciones));
    const listaCambio = r.lista.length !== estado.compras.lista.length || r.lista.some((c, i) => c !== estado.compras.lista[i]);
    if (listaCambio) dispatch(comprasReconciliadas(r.lista));

    // Recién ahora: un guardado en vuelo con su borrado detrás no se anula (compactar lo respeta).
    dispatch(enviosInterrumpidos());

    dispatch(subidaConectada(duenoDe(subida) !== null));
    void dispatch(vaciarCola());
  };
}

/**
 * La primera cuenta del dispositivo adopta lo guardado sin cuenta, o el usuario decide que
 * se quede solo en el teléfono. La confirmación la pide la pantalla antes (spec 010, R5).
 */
export function adoptarOperaciones(userId: string, aceptar: boolean): AppThunk {
  return (dispatch) => {
    dispatch(aceptar ? operacionesAdoptadas(userId) : operacionesDeclinadas());
    void dispatch(vaciarCola());
  };
}

/** «Reintentar» una compra que el servidor rechazó (FR-012). */
export function reintentarOperacion(id: string): AppThunk<Promise<void>> {
  return async (dispatch) => {
    dispatch(operacionReintentada(id));
    await dispatch(vaciarCola());
  };
}

/** «Reintentar» todas las compras que el servidor rechazó. */
export function reintentarRechazadas(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    for (const o of getState().cola.operaciones) {
      if (o.estado.tipo === "rechazada") dispatch(operacionReintentada(o.id));
    }
    await dispatch(vaciarCola());
  };
}
