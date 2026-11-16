/**
 * Caso de uso de `POST /recomendar` (issue #43, ADR-009): junta los datos del
 * usuario y llama al motor. No duplica ninguna regla: elegibilidad, ahorro,
 * topes y ranking son de `recomendar()`.
 */
import { fechaArgentina, recomendar, type CompraPropuesta, type Recomendacion } from "@vuelto/motor";
import { CategoriaInexistenteError } from "../_shared/errores.ts";
import { inicioDeConsumos, promosReferenciadasQueFaltan } from "../_shared/periodo.ts";
import type {
  RepositorioCategorias,
  RepositorioCompras,
  RepositorioMediosDePago,
  RepositorioPromociones,
  UsuarioId,
} from "../_shared/repositorios.ts";

export class ServicioRecomendacion {
  constructor(
    private readonly medios: RepositorioMediosDePago,
    private readonly promociones: RepositorioPromociones,
    private readonly compras: RepositorioCompras,
    private readonly categorias: RepositorioCategorias,
  ) {}

  /** Lanza `CategoriaInexistenteError` o, si el usuario no tiene medios, `PerfilSinMediosError` del motor. */
  async recomendar(usuarioId: UsuarioId, compra: CompraPropuesta, ahora: Date): Promise<Recomendacion> {
    if (!(await this.categorias.existe(compra.categoriaId))) throw new CategoriaInexistenteError();

    // Hoy sale del mismo `ahora` que recibe el motor, en hora de Argentina;
    // nunca de `current_date` de la base, que está en UTC (FR-020).
    const hoy = fechaArgentina(ahora);
    const desde = inicioDeConsumos(hoy);

    const [mediosDePago, delRubro, comprasDelPeriodo] = await Promise.all([
      this.medios.deUsuario(usuarioId),
      this.promociones.publicadasVigentes(compra.categoriaId, hoy),
      this.compras.delUsuarioEntre(usuarioId, desde, hoy),
    ]);

    const faltantes = promosReferenciadasQueFaltan(comprasDelPeriodo, delRubro);
    const referenciadas = faltantes.length > 0 ? await this.promociones.porIds(faltantes) : [];

    // El motor no usa el nombre ni los comercios habituales del perfil.
    const perfil = { nombreParaMostrar: null, mediosDePago, comerciosHabituales: [] };
    return recomendar(compra, perfil, [...delRubro, ...referenciadas], comprasDelPeriodo, ahora);
  }
}
