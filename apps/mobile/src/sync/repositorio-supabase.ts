/**
 * El repositorio real: `supabase-js` con la sesión del usuario (RLS). Nunca la service role key
 * (constitución §IV). Las consultas son las de `specs/009-sincronizar-corpus/contracts/postgrest.md`,
 * verificadas contra un Supabase local: cursor `(columna, id)`, la jurisdicción `null` incluida y
 * páginas más chicas que `max_rows` (1000), que PostgREST recorta sin avisar.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilaCompra, FilaPromocion, FiltroCompras, FiltroPromociones, RepositorioSincronizacion } from "./contratos";
import { TAMANO_PAGINA } from "./paginar";

const COLUMNAS_PROMOCION = [
  "id",
  "fuente",
  "titulo",
  "banco_id",
  "categoria_id",
  "comercio",
  "porcentaje",
  "debito_redes",
  "credito_redes",
  "vigencia_desde",
  "vigencia_hasta",
  "dias",
  "tope_monto",
  "tope_periodo",
  "tope_alcance",
  "grupo_tope_id",
  "monto_minimo",
  "jurisdiccion",
  "canal",
  "acumulable",
  "dada_de_baja_en",
  "actualizada_en",
].join(",");

const COLUMNAS_COMPRA = [
  "id",
  "fecha",
  "monto",
  "comercio",
  "categoria_id",
  "medio_de_pago_id",
  "promocion_id",
  "descuento_obtenido",
  "reintegro_esperado",
  "fecha_acreditacion_estimada",
  "origen",
  "texto_extraido",
  "creada_en",
].join(",");

/** Las filas con jurisdicción `null` también valen: `neq` solo las excluiría (verificado). */
const SIN_OTRA_PROVINCIA = "jurisdiccion.is.null,jurisdiccion.neq.otra_provincia";

export function repositorioSupabase(cliente: SupabaseClient): RepositorioSincronizacion {
  return {
    async usuarioId() {
      // `getSession` lee la sesión guardada: no necesita red.
      const { data } = await cliente.auth.getSession();
      return data.session?.user.id ?? null;
    },

    async promociones(f: FiltroPromociones) {
      // `supabase-js` no tiene `.and()`: dos `.or()` repetidos llegan como dos parámetros `or=`, que
      // PostgREST combina con AND (verificado contra un Supabase local, research R1).
      let consulta = cliente.from("promociones").select(COLUMNAS_PROMOCION).or(SIN_OTRA_PROVINCIA);
      if (f.vigenteDesde !== null) consulta = consulta.gte("vigencia_hasta", f.vigenteDesde);
      if (f.cursor !== null) {
        const { valor, id } = f.cursor;
        consulta = consulta.or(`actualizada_en.gt.${valor},and(actualizada_en.eq.${valor},id.gt.${id})`);
      } else if (f.desde !== null) {
        consulta = consulta.gt("actualizada_en", f.desde);
      }
      const { data, error } = await consulta
        .order("actualizada_en", { ascending: true })
        .order("id", { ascending: true })
        .limit(f.limite)
        .abortSignal(f.signal);
      if (error) throw error;
      return (data ?? []) as unknown as FilaPromocion[];
    },

    async idsDePromociones(vigenteDesde: string, signal: AbortSignal) {
      const ids: string[] = [];
      let ultimo: string | null = null;
      for (;;) {
        let consulta = cliente
          .from("promociones")
          .select("id")
          .or(SIN_OTRA_PROVINCIA)
          .gte("vigencia_hasta", vigenteDesde);
        if (ultimo !== null) consulta = consulta.gt("id", ultimo);
        const { data, error } = await consulta
          .order("id", { ascending: true })
          .limit(TAMANO_PAGINA)
          .abortSignal(signal);
        if (error) throw error;
        const pagina = (data ?? []) as unknown as { id: string }[];
        ids.push(...pagina.map((p) => p.id));
        const siguiente = pagina[pagina.length - 1]?.id;
        if (pagina.length < TAMANO_PAGINA || siguiente === undefined) return ids;
        ultimo = siguiente;
      }
    },

    async compras(f: FiltroCompras) {
      let consulta = cliente.from("compras").select(COLUMNAS_COMPRA).gte("fecha", f.desde);
      if (f.cursor !== null) {
        const { valor, id } = f.cursor;
        consulta = consulta.or(`creada_en.gt.${valor},and(creada_en.eq.${valor},id.gt.${id})`);
      }
      const { data, error } = await consulta
        .order("creada_en", { ascending: true })
        .order("id", { ascending: true })
        .limit(f.limite)
        .abortSignal(f.signal);
      if (error) throw error;
      return (data ?? []) as unknown as FilaCompra[];
    },
  };
}
