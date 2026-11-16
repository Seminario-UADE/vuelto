/**
 * Contactos, invitaciones y gasto en grupo contra Supabase (spec 016, research R10).
 * Las invitaciones y la lista van por RPC (`contracts/rpc-contactos.md`); la recomendación de
 * grupo, por la Edge Function `recomendar-grupo` (`contracts/recomendar-grupo.md`). El token de
 * una invitación viaja siempre en el cuerpo del pedido, nunca en la dirección (FR-011).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Canal } from "@vuelto/motor";

export type ContactoRemoto = { id: string; nombre: string | null; vinculadoDesde: string };

export type InvitacionCreada = { token: string; venceEn: string };

export type EstadoVistaInvitacion = "valida" | "vencida" | "usada" | "propia" | "ya-contacto" | "inexistente";

export type VistaInvitacionRemota = {
  estado: EstadoVistaInvitacion;
  quienInvita: string | null;
  venceEn: string | null;
};

export type ResultadoAceptar =
  | { estado: "aceptada"; contacto: { id: string; nombre: string | null } }
  | { estado: Exclude<EstadoVistaInvitacion, "valida"> | "sin-nombre"; contacto: null };

// ─── Gasto en grupo: pedido y respuesta de la Edge Function ───────────────────

export type PedidoRecomendarGrupo = {
  compra: { comercio: string | null; categoriaId: number; canal: Canal; monto: number };
  contactos: string[];
  sinCuenta: number;
};

export type BaseRemota =
  | { tipo: "con_compras"; comprasRegistradas?: number; periodo?: "mensual" | "semanal" }
  | { tipo: "sin_compras"; periodo?: "mensual" | "semanal" }
  | { tipo: "sin_tope_informado" }
  | { tipo: "tope_por_compra" };

export type MedioRemoto = { id?: string; bancoNombre: string | null; tipo: "debito" | "credito"; red: string };

export type OpcionRemota = {
  medio: MedioRemoto | null;
  queDa: string | null;
  reintegro: number;
  base: BaseRemota;
};

export type RespuestaGrupo = {
  fecha: string;
  quienPaga: { tipo: "vos" } | { tipo: "contacto"; id: string } | null;
  reintegro: number | null;
  total: number;
  vos: { opcion: OpcionRemota | null; sinOpcion: string | null; parte: number };
  contactos: { id: string; nombre: string | null; opcion: OpcionRemota | null; parte: number }[];
  sinCuenta: { posicion: number; parte: number }[];
};

/** Por qué no se pudo calcular el grupo (FR-027): cada uno tiene su acción en pantalla. */
export type FallaGrupo = "invalido" | "contacto-no-vinculado" | "sin-sesion" | "servidor";

export class FallaGrupoError extends Error {
  readonly falla: FallaGrupo;
  constructor(falla: FallaGrupo) {
    super(falla);
    this.name = "FallaGrupoError";
    this.falla = falla;
  }
}

/** La cuenta no tiene nombre para mostrar: no puede invitar (US2-3). */
export class SinNombreError extends Error {
  constructor() {
    super("Elegí tu nombre en Perfil para invitar: el otro lo va a ver.");
    this.name = "SinNombreError";
  }
}

export interface RepositorioContactos {
  listar(): Promise<ContactoRemoto[]>;
  crearInvitacion(): Promise<InvitacionCreada>;
  verInvitacion(token: string): Promise<VistaInvitacionRemota>;
  aceptarInvitacion(token: string): Promise<ResultadoAceptar>;
  quitar(contactoId: string): Promise<void>;
  recomendarGrupo(pedido: PedidoRecomendarGrupo): Promise<RespuestaGrupo>;
}

/** Corte del pedido de grupo (SC-009): pasado este tiempo, «No pudimos calcularlo». */
export const TIMEOUT_GRUPO_MS = 15_000;

/** La base devuelve los estados con guion bajo; la app los usa con guion. */
function estadoDeLaBase(e: string): string {
  return e.replace(/_/g, "-");
}

const ESTADOS_VISTA: readonly string[] = ["valida", "vencida", "usada", "propia", "ya-contacto", "inexistente"];

function error(e: { message: string } | null, contexto: string): Error {
  return new Error(e?.message ? `${contexto}: ${e.message}` : contexto);
}

export function repositorioContactosSupabase(cliente: SupabaseClient): RepositorioContactos {
  return {
    async listar() {
      const { data, error: e } = await cliente.rpc("mis_contactos");
      if (e) throw error(e, "No pudimos traer tus contactos");
      return ((data ?? []) as { id: string; nombre: string | null; vinculado_desde: string }[]).map((f) => ({
        id: f.id,
        nombre: f.nombre,
        vinculadoDesde: f.vinculado_desde,
      }));
    },

    async crearInvitacion() {
      const { data, error: e } = await cliente.rpc("crear_invitacion");
      if (e?.message === "sin_nombre" || e?.hint === "sin_nombre") throw new SinNombreError();
      if (e || !data) throw error(e, "No pudimos crear la invitación");
      const d = data as { token: string; vence_en: string };
      return { token: d.token, venceEn: d.vence_en };
    },

    async verInvitacion(token) {
      const { data, error: e } = await cliente.rpc("ver_invitacion", { p_token: token });
      if (e || !data) throw error(e, "No pudimos abrir la invitación");
      const d = data as { estado: string; quien_invita: string | null; vence_en: string | null };
      const estado = estadoDeLaBase(d.estado);
      if (!ESTADOS_VISTA.includes(estado)) throw new Error("La invitación vino con un estado desconocido");
      return { estado: estado as EstadoVistaInvitacion, quienInvita: d.quien_invita, venceEn: d.vence_en };
    },

    async aceptarInvitacion(token) {
      const { data, error: e } = await cliente.rpc("aceptar_invitacion", { p_token: token });
      if (e || !data) throw error(e, "No pudimos aceptar la invitación");
      const d = data as { estado: string; contacto: { id: string; nombre: string | null } | null };
      if (d.estado === "aceptada" && d.contacto) return { estado: "aceptada", contacto: d.contacto };
      return { estado: estadoDeLaBase(d.estado) as Exclude<ResultadoAceptar["estado"], "aceptada">, contacto: null };
    },

    async quitar(contactoId) {
      const { error: e } = await cliente.rpc("quitar_contacto", { p_contacto: contactoId });
      if (e) throw error(e, "No pudimos quitar el contacto");
    },

    async recomendarGrupo(pedido) {
      const { data, error: e, response } = await cliente.functions.invoke<RespuestaGrupo>("recomendar-grupo", {
        body: pedido,
        timeout: TIMEOUT_GRUPO_MS,
      });
      if (!e && data) return data;
      const status = response?.status ?? 0;
      if (status === 400) throw new FallaGrupoError("invalido");
      if (status === 401) throw new FallaGrupoError("sin-sesion");
      if (status === 409) throw new FallaGrupoError("contacto-no-vinculado");
      // 500, sin red o el corte de 15 s.
      throw new FallaGrupoError("servidor");
    },
  };
}
