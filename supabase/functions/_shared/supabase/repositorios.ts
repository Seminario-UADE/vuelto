/**
 * Repositorios reales sobre Supabase (ADR-009, spec 016 research R8). El cliente se crea por
 * pedido con el `Authorization` del usuario: todo lo propio se lee con su sesión y el RLS aplica.
 * Los datos de los contactos pasan por `datos_de_contactos`, que verifica el vínculo y exige la
 * clave de servidor (D8). Solo los chequea `deno check` (los importa `recomendar-grupo/index.ts`):
 * no corren en Node y se prueban desplegados o con `supabase functions serve`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoriaId, Compra, FechaISO, MedioDePago, Promocion } from "@vuelto/motor";
import { ContactoNoVinculadoError } from "../errores.ts";
import {
  COLUMNAS_PROMOCION,
  filaACompra,
  filaAConsumo,
  filaAMedio,
  filaAPromocion,
  type FilaCompra,
  type FilaConsumo,
  type FilaMedio,
  type FilaPromocion,
} from "../filas.ts";
import type {
  DatosDeContacto,
  RepositorioCategorias,
  RepositorioCompras,
  RepositorioContactos,
  RepositorioMediosDePago,
  RepositorioPromociones,
  UsuarioId,
} from "../repositorios.ts";

/** Falla de la base. Lleva solo el código: el mensaje puede traer datos de filas (FR-034). */
export class ErrorDeBase extends Error {
  constructor(codigo: string | undefined) {
    super(`Error de la base ${codigo ?? "desconocido"}`);
    this.name = "ErrorDeBase";
  }
}

type ErrorPostgrest = { code?: string; message?: string; hint?: string } | null;

function siFallo(error: ErrorPostgrest): void {
  if (error) throw new ErrorDeBase(error.code);
}

function soloValidos<F, T>(filas: F[] | null, mapear: (f: F) => T | null): T[] {
  return (filas ?? []).flatMap((f) => {
    const x = mapear(f);
    return x === null ? [] : [x];
  });
}

export class MediosDePagoSupabase implements RepositorioMediosDePago {
  constructor(private readonly cliente: SupabaseClient) {}

  async deUsuario(usuarioId: UsuarioId): Promise<MedioDePago[]> {
    const { data, error } = await this.cliente.from("medios_de_pago").select("id, banco_id, tipo, red").eq("user_id", usuarioId);
    siFallo(error);
    return soloValidos(data as FilaMedio[] | null, filaAMedio);
  }
}

export class PromocionesSupabase implements RepositorioPromociones {
  constructor(private readonly cliente: SupabaseClient) {}

  async publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]> {
    const { data, error } = await this.cliente
      .from("promociones")
      .select(COLUMNAS_PROMOCION)
      .eq("categoria_id", categoriaId)
      .lte("vigencia_desde", hoy)
      .gte("vigencia_hasta", hoy);
    siFallo(error);
    return soloValidos(data as FilaPromocion[] | null, filaAPromocion);
  }

  async porIds(ids: string[]): Promise<Promocion[]> {
    const { data, error } = await this.cliente.from("promociones").select(COLUMNAS_PROMOCION).in("id", ids);
    siFallo(error);
    return soloValidos(data as FilaPromocion[] | null, filaAPromocion);
  }
}

export class ComprasSupabase implements RepositorioCompras {
  constructor(private readonly cliente: SupabaseClient) {}

  async delUsuarioEntre(usuarioId: UsuarioId, desde: FechaISO, hasta: FechaISO): Promise<Compra[]> {
    const { data, error } = await this.cliente
      .from("compras")
      .select(
        "id, fecha, monto, comercio, categoria_id, medio_de_pago_id, promocion_id, descuento_obtenido, " +
          "reintegro_esperado, fecha_acreditacion_estimada, origen, texto_extraido",
      )
      .eq("user_id", usuarioId)
      .gte("fecha", desde)
      .lte("fecha", hasta);
    siFallo(error);
    return soloValidos(data as FilaCompra[] | null, filaACompra);
  }
}

export class CategoriasSupabase implements RepositorioCategorias {
  constructor(private readonly cliente: SupabaseClient) {}

  async existe(categoriaId: CategoriaId): Promise<boolean> {
    const { data, error } = await this.cliente.from("categorias").select("id").eq("id", categoriaId).maybeSingle();
    siFallo(error);
    return data !== null;
  }
}

type FilaDatosDeContacto = { id: string; nombre: string | null; medios: FilaMedio[]; consumos: FilaConsumo[] };

export class ContactosSupabase implements RepositorioContactos {
  constructor(
    private readonly cliente: SupabaseClient,
    /** La clave de servidor: nunca sale de la Edge Function (D8). */
    private readonly clave: string,
  ) {}

  async datosDe(ids: UsuarioId[], desde: FechaISO, hasta: FechaISO): Promise<DatosDeContacto[]> {
    const { data, error } = await this.cliente.rpc("datos_de_contactos", {
      p_contactos: ids,
      p_clave: this.clave,
      p_desde: desde,
      p_hasta: hasta,
    });
    if (error && (error.hint === "no_vinculado" || error.message === "no_vinculado")) throw new ContactoNoVinculadoError();
    siFallo(error);
    return ((data ?? []) as FilaDatosDeContacto[]).map((f) => ({
      id: f.id,
      nombre: f.nombre,
      medios: f.medios.flatMap((m) => {
        const medio = filaAMedio(m);
        return medio ? [{ ...medio, bancoNombre: m.banco_nombre ?? null }] : [];
      }),
      // Sin id: el servicio les pone uno opaco (research R6).
      consumos: soloValidos(f.consumos, filaAConsumo),
    }));
  }
}
