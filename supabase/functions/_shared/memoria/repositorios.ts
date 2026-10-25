/**
 * Repositorios en memoria para los tests. Filtran igual que las consultas
 * reales (`specs/003-recomendar-pantalla/data-model.md`) y registran con qué
 * argumentos los llamaron, para verificar qué datos pide el servicio (FR-025).
 */
import type { CategoriaId, Compra, FechaISO, MedioDePago, Promocion } from "@vuelto/motor";
import type {
  RepositorioCategorias,
  RepositorioCompras,
  RepositorioMediosDePago,
  RepositorioPromociones,
  UsuarioId,
} from "../repositorios.ts";

/** Fila de una tabla con dueño: el dato del dominio más el usuario al que pertenece. */
export interface DeUsuario<T> {
  usuarioId: UsuarioId;
  dato: T;
}

export class MediosDePagoEnMemoria implements RepositorioMediosDePago {
  readonly llamadas: { usuarioId: UsuarioId }[] = [];
  constructor(private readonly filas: DeUsuario<MedioDePago>[]) {}

  async deUsuario(usuarioId: UsuarioId): Promise<MedioDePago[]> {
    this.llamadas.push({ usuarioId });
    return this.filas.filter((f) => f.usuarioId === usuarioId).map((f) => f.dato);
  }
}

export class PromocionesEnMemoria implements RepositorioPromociones {
  readonly llamadas: { categoriaId: CategoriaId; hoy: FechaISO }[] = [];
  constructor(private readonly promociones: Promocion[]) {}

  async publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]> {
    this.llamadas.push({ categoriaId, hoy });
    // Fechas ISO `YYYY-MM-DD`: comparar como texto es comparar como fecha.
    return this.promociones.filter(
      (p) => p.categoriaId === categoriaId && p.vigencia.desde <= hoy && hoy <= p.vigencia.hasta,
    );
  }
}

export class ComprasEnMemoria implements RepositorioCompras {
  readonly llamadas: { usuarioId: UsuarioId; desde: FechaISO; hasta: FechaISO }[] = [];
  constructor(private readonly filas: DeUsuario<Compra>[]) {}

  async delUsuarioEntre(usuarioId: UsuarioId, desde: FechaISO, hasta: FechaISO): Promise<Compra[]> {
    this.llamadas.push({ usuarioId, desde, hasta });
    return this.filas
      .filter((f) => f.usuarioId === usuarioId && desde <= f.dato.fecha && f.dato.fecha <= hasta)
      .map((f) => f.dato);
  }
}

export class CategoriasEnMemoria implements RepositorioCategorias {
  readonly llamadas: { categoriaId: CategoriaId }[] = [];
  constructor(private readonly ids: CategoriaId[]) {}

  async existe(categoriaId: CategoriaId): Promise<boolean> {
    this.llamadas.push({ categoriaId });
    return this.ids.includes(categoriaId);
  }
}
