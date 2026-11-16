/**
 * Repositorios en memoria para los tests. Filtran igual que las consultas
 * reales (`specs/004-recomendar-pantalla/data-model.md`) y registran con qué
 * argumentos los llamaron, para verificar qué datos pide el servicio (FR-025).
 */
import type { CategoriaId, Compra, FechaISO, MedioDePago, Promocion } from "@vuelto/motor";
import { ContactoNoVinculadoError } from "../errores.ts";
import type {
  DatosDeContacto,
  RepositorioCategorias,
  RepositorioContactos,
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
  readonly llamadasPorIds: { ids: string[] }[] = [];
  constructor(private readonly promociones: Promocion[]) {}

  async publicadasVigentes(categoriaId: CategoriaId, hoy: FechaISO): Promise<Promocion[]> {
    this.llamadas.push({ categoriaId, hoy });
    // Fechas ISO `YYYY-MM-DD`: comparar como texto es comparar como fecha.
    return this.promociones.filter(
      (p) => p.categoriaId === categoriaId && p.vigencia.desde <= hoy && hoy <= p.vigencia.hasta,
    );
  }

  async porIds(ids: string[]): Promise<Promocion[]> {
    this.llamadasPorIds.push({ ids });
    return this.promociones.filter((p) => ids.includes(p.id));
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

/**
 * Contactos en memoria: `vinculados` son los ids vinculados con `quienPide`. Como la función de la
 * base, rechaza el pedido entero si algún id no está vinculado, y filtra las compras por fecha.
 */
export class ContactosEnMemoria implements RepositorioContactos {
  readonly llamadas: { ids: UsuarioId[]; desde: FechaISO; hasta: FechaISO }[] = [];
  constructor(private readonly datos: DatosDeContacto[]) {}

  async datosDe(ids: UsuarioId[], desde: FechaISO, hasta: FechaISO): Promise<DatosDeContacto[]> {
    this.llamadas.push({ ids, desde, hasta });
    const encontrados = ids.map((id) => this.datos.find((d) => d.id === id));
    if (encontrados.some((d) => d === undefined)) throw new ContactoNoVinculadoError();
    return (encontrados as DatosDeContacto[]).map((d) => ({
      ...d,
      consumos: d.consumos.filter((c) => desde <= c.fecha && c.fecha <= hasta),
    }));
  }
}

