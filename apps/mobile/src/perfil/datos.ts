/**
 * Lectura y escritura del perfil en Supabase, directo con `supabase-js` y el RLS
 * (ADR-009, ADR-010). Recibe el cliente por parámetro: se testea con uno falso.
 *
 * No guarda nada en el dispositivo: el resultado lo guarda el slice `perfil` de
 * Redux, que persiste la #81 (decisión 6 del plan). Nunca manda `user_id`: lo pone
 * la base con `auth.uid()` y el RLS no deja tocar medios de otro usuario.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { clasificarError, type Banco, type CasoDeError, type MedioDePago, type MedioNuevo, type Red, type TipoTarjeta } from "./modelo";

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: CasoDeError };

/** Columnas de `medios_de_pago` (#34), con el nombre del banco por la FK. */
const COLUMNAS_MEDIO = "id, banco_id, tipo, red, bancos(nombre)";

type FilaMedio = {
  id: string;
  banco_id: string;
  tipo: TipoTarjeta;
  red: Red;
  bancos: { nombre: string } | null;
};

type FilaBanco = { id: string; nombre: string };

type Respuesta = {
  data: unknown;
  error: { code?: string | null } | null;
  status: number;
};

function aMedio(f: FilaMedio): MedioDePago {
  return { id: f.id, bancoId: f.banco_id, nombreBanco: f.bancos?.nombre ?? null, tipo: f.tipo, red: f.red };
}

function aFila(m: MedioNuevo) {
  return { banco_id: m.bancoId, tipo: m.tipo, red: m.red };
}

/** Corre el pedido sin lanzar: un error de la base o de red vuelve clasificado. */
async function ejecutar<T>(pedido: PromiseLike<Respuesta>, mapear: (data: unknown) => T): Promise<Resultado<T>> {
  let r: Respuesta;
  try {
    r = await pedido;
  } catch {
    // El fetch no llegó: supabase-js lanza o devuelve status 0 según el caso.
    return { ok: false, error: "sin_conexion" };
  }
  if (r.error) return { ok: false, error: clasificarError({ status: r.status, code: r.error.code ?? null }) };
  // Fuera del try: un fallo del mapeo es un bug nuestro y no puede pasar por «sin conexión».
  return { ok: true, datos: mapear(r.data) };
}

export function crearDatosPerfil(cliente: SupabaseClient) {
  const medios = () => cliente.from("medios_de_pago");
  return {
    /** Sin `on_hub_list` hasta que la tabla lo tenga (decisión 9): queda `null`. */
    leerBancos: (): Promise<Resultado<Banco[]>> =>
      ejecutar(cliente.from("bancos").select("id, nombre"), (data) =>
        (data as FilaBanco[]).map((b) => ({ id: b.id, nombre: b.nombre, onHubList: null })),
      ),

    leerMisMedios: (): Promise<Resultado<MedioDePago[]>> =>
      ejecutar(medios().select(COLUMNAS_MEDIO).order("creado_en"), (data) => (data as FilaMedio[]).map(aMedio)),

    /** Un solo pedido: entran todos o ninguno (FR-011). Llamar solo si `puedeConfirmar`. */
    confirmarOnboarding: (nuevos: readonly MedioNuevo[]): Promise<Resultado<MedioDePago[]>> =>
      ejecutar(medios().insert(nuevos.map(aFila)).select(COLUMNAS_MEDIO), (data) => (data as FilaMedio[]).map(aMedio)),

    agregarMedio: (nuevo: MedioNuevo): Promise<Resultado<MedioDePago>> =>
      ejecutar(medios().insert(aFila(nuevo)).select(COLUMNAS_MEDIO).single(), (data) => aMedio(data as FilaMedio)),

    /** Llamar solo si `puedeSacar` (FR-009). */
    sacarMedio: async (id: string): Promise<Resultado<null>> => {
      const r = await ejecutar(medios().delete().eq("id", id).select("id"), (data) => (data as unknown[]).length);
      if (!r.ok) return r;
      // El RLS no avisa si no tocó ninguna fila: sin fila borrada no se da por sacado.
      return r.datos > 0 ? { ok: true, datos: null } : { ok: false, error: "otro" };
    },
  };
}

export type DatosPerfil = ReturnType<typeof crearDatosPerfil>;
