/**
 * Acceso a datos de las Edge Functions, detrás de interfaces (ADR-009).
 * Los services dependen de estas interfaces, no del cliente de Supabase: así
 * se testean con implementaciones en memoria (`memoria/repositorios.ts`).
 *
 * Los filtros por usuario son explícitos aunque el RLS ya los garantice:
 * es defensa en profundidad y hace verificable en los tests que se piden los
 * datos del usuario autenticado (spec 004, FR-025).
 */
import type { CategoriaId, Compra, ConsumoDeTope, FechaISO, MedioDePago, Promocion } from "@vuelto/motor";

/** `id` de `auth.users`. */
export type UsuarioId = string;

export interface RepositorioMediosDePago {
  deUsuario(usuarioId: UsuarioId): Promise<MedioDePago[]>;
}

export interface RepositorioPromociones {
  /**
   * Promociones publicadas del rubro cuya vigencia incluye `hoy`
   * (`desde ≤ hoy ≤ hasta`). No filtra por día de la semana ni por ningún
   * otro campo: esas reglas las aplica el motor (spec 004, FR-020).
   */
  publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]>;
  /**
   * Promociones con esos ids, sin filtrar por rubro ni vigencia. Son las que
   * referencian las compras registradas: el motor las necesita aunque hayan
   * vencido, para descontar los topes compartidos (contrato de la issue #37).
   */
  porIds(ids: string[]): Promise<Promocion[]>;
}

export interface RepositorioCompras {
  /** Compras del usuario con `desde ≤ fecha ≤ hasta`, ambos incluidos. */
  delUsuarioEntre(usuarioId: UsuarioId, desde: FechaISO, hasta: FechaISO): Promise<Compra[]>;
}

export interface RepositorioCategorias {
  existe(categoriaId: CategoriaId): Promise<boolean>;
}

/** Un medio de un contacto, con el nombre del banco para nombrarlo si es el que conviene. */
export interface MedioDeContacto extends MedioDePago {
  bancoNombre: string | null;
}

/**
 * Lo que la Edge Function de grupo sabe de un contacto (spec 013, D4): nombre, medios y compras
 * del período reducidas. Nunca sale de la Edge Function; al teléfono va solo lo de FR-021.
 */
export interface DatosDeContacto {
  id: UsuarioId;
  nombre: string | null;
  medios: MedioDeContacto[];
  /** Sin id: el servicio les pone uno opaco (research R6). */
  consumos: Omit<ConsumoDeTope, "id">[];
}

export interface RepositorioContactos {
  /**
   * Datos de los contactos de quien pide, con compras de `desde` a `hasta` (ambos incluidos).
   * Lanza `ContactoNoVinculadoError` si alguno no es contacto vinculado o no existe.
   */
  datosDe(ids: UsuarioId[], desde: FechaISO, hasta: FechaISO): Promise<DatosDeContacto[]>;
}

