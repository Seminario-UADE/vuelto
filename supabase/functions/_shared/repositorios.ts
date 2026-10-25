/**
 * Acceso a datos de las Edge Functions, detrás de interfaces (ADR-009).
 * Los services dependen de estas interfaces, no del cliente de Supabase: así
 * se testean con implementaciones en memoria (`memoria/repositorios.ts`).
 *
 * Los filtros por usuario son explícitos aunque el RLS ya los garantice:
 * es defensa en profundidad y hace verificable en los tests que se piden los
 * datos del usuario autenticado (spec 003, FR-025).
 */
import type { CategoriaId, Compra, FechaISO, MedioDePago, Promocion } from "@vuelto/motor";

/** `id` de `auth.users`. */
export type UsuarioId = string;

export interface RepositorioMediosDePago {
  deUsuario(usuarioId: UsuarioId): Promise<MedioDePago[]>;
}

export interface RepositorioPromociones {
  /**
   * Promociones publicadas del rubro cuya vigencia incluye `hoy`
   * (`desde ≤ hoy ≤ hasta`). No filtra por día de la semana ni por ningún
   * otro campo: esas reglas las aplica el motor (spec 003, FR-020).
   */
  publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]>;
}

export interface RepositorioCompras {
  /** Compras del usuario con `desde ≤ fecha ≤ hasta`, ambos incluidos. */
  delUsuarioEntre(usuarioId: UsuarioId, desde: FechaISO, hasta: FechaISO): Promise<Compra[]>;
}

export interface RepositorioCategorias {
  existe(categoriaId: CategoriaId): Promise<boolean>;
}
