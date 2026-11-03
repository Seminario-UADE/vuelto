/**
 * El repositorio de compras sobre Supabase, con la sesión del usuario (anon key + JWT; nunca
 * la service role). **Todavía no se instancia en ninguna parte**: falta la sesión (#40), la
 * correspondencia de medios (#41) y el corpus del servidor (#42) (spec 010, FR-020).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { clasificarError } from "./errores";
import type { RepositorioCompras, ResultadoEnvio } from "./repositorio";

type RespuestaPostgrest = { error: { code?: string } | null; status: number };

function resultado(r: RespuestaPostgrest, signal: AbortSignal): ResultadoEnvio {
  if (r.error === null && r.status < 400) return { tipo: "exito" };
  return clasificarError({
    codigo: r.error?.code || null,
    estado: r.status,
    red: r.status === 0,
    aborto: signal.aborted,
  });
}

export function repositorioSupabase(cliente: SupabaseClient): RepositorioCompras {
  return {
    async guardar(fila, { signal }) {
      try {
        // Un id que ya existe no es error: el reintento de un envío que sí llegó (FR-006).
        const r = await cliente
          .from("compras")
          .upsert(fila, { onConflict: "id", ignoreDuplicates: true })
          .abortSignal(signal);
        return resultado(r, signal);
      } catch {
        return { tipo: "transitorio" };
      }
    },
    async borrar(id, { signal }) {
      try {
        // Borrar algo que no existe tampoco es error.
        const r = await cliente.from("compras").delete().eq("id", id).abortSignal(signal);
        return resultado(r, signal);
      } catch {
        return { tipo: "transitorio" };
      }
    },
  };
}
