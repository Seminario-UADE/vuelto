/**
 * Caso de uso de `POST /recomendar-grupo` (spec 013, ADR-009): junta la foto del grupo y llama
 * al motor. No duplica ninguna regla: quién paga, el redondeo y la división son de
 * `recomendarGrupo()`. Lo de quien pide se lee con su sesión (RLS); lo de los contactos, con la
 * función de la base que verifica el vínculo y exige la clave de servidor (D8).
 */
import {
  fechaArgentina,
  inicioDelPeriodo,
  recomendarGrupo,
  type ConsumoDeTope,
  type IntegranteDeGrupo,
} from "@vuelto/motor";
import { CategoriaInexistenteError, ContactoNoVinculadoError } from "../_shared/errores.ts";
import type {
  DatosDeContacto,
  RepositorioCategorias,
  RepositorioCompras,
  RepositorioContactos,
  RepositorioMediosDePago,
  RepositorioPromociones,
  UsuarioId,
} from "../_shared/repositorios.ts";
import { armarRespuesta, type RespuestaGrupo } from "./respuesta.ts";
import type { PedidoGrupo } from "./validacion.ts";

export class ServicioGrupo {
  constructor(
    private readonly medios: RepositorioMediosDePago,
    private readonly promociones: RepositorioPromociones,
    private readonly compras: RepositorioCompras,
    private readonly categorias: RepositorioCategorias,
    private readonly contactos: RepositorioContactos,
  ) {}

  /** Lanza `CategoriaInexistenteError`, `ContactoNoVinculadoError` o `GrupoInvalidoError` del motor. */
  async recomendar(quienPide: UsuarioId, pedido: PedidoGrupo, ahora: Date): Promise<RespuestaGrupo> {
    // El rubro, antes de leer nada ajeno.
    if (!(await this.categorias.existe(pedido.compra.categoriaId))) throw new CategoriaInexistenteError();

    // Hoy sale del mismo `ahora` que recibe el motor, en hora de Argentina (FR-025). Las compras,
    // desde el inicio del mes o de la semana, lo que sea anterior (FR-002).
    const hoy = fechaArgentina(ahora);
    const inicioMes = inicioDelPeriodo("mensual", hoy);
    const inicioSemana = inicioDelPeriodo("semanal", hoy);
    const desde = inicioSemana < inicioMes ? inicioSemana : inicioMes;

    const [mediosPropios, comprasPropias, delRubro, contactos] = await Promise.all([
      this.medios.deUsuario(quienPide),
      this.compras.delUsuarioEntre(quienPide, desde, hoy),
      this.promociones.publicadasVigentes(pedido.compra.categoriaId, hoy),
      pedido.contactos.length > 0 ? this.contactos.datosDe(pedido.contactos, desde, hoy) : Promise.resolve([]),
    ]);

    const integrantesContactos = pedido.contactos.map((id): IntegranteDeGrupo & { tipo: "cuenta" } => {
      const datos = contactos.find((c) => c.id === id);
      if (!datos) throw new ContactoNoVinculadoError();
      return {
        tipo: "cuenta",
        id,
        pide: false,
        mediosDePago: datos.medios.map((m) => ({ id: m.id, bancoId: m.bancoId, tipo: m.tipo, red: m.red })),
        consumos: conIdsOpacos(datos),
      };
    });

    // Las promos que referencian los consumos de todos y no vinieron con el rubro (vencidas o de
    // otro rubro): el motor las necesita para descontar los topes compartidos (M9).
    const yaEstan = new Set(delRubro.map((p) => p.id));
    const referenciadas = new Set<string>();
    for (const c of [...comprasPropias, ...integrantesContactos.flatMap((i) => i.consumos)]) {
      if (c.promocionId !== null && !yaEstan.has(c.promocionId)) referenciadas.add(c.promocionId);
    }
    const extra = referenciadas.size > 0 ? await this.promociones.porIds([...referenciadas]) : [];

    const integrantes: IntegranteDeGrupo[] = [
      { tipo: "cuenta", id: quienPide, pide: true, mediosDePago: mediosPropios, consumos: comprasPropias },
      ...integrantesContactos,
      ...Array.from({ length: pedido.sinCuenta }, (_, posicion): IntegranteDeGrupo => ({ tipo: "sin_cuenta", posicion })),
    ];
    const r = recomendarGrupo(pedido.compra, integrantes, [...delRubro, ...extra], ahora);
    return armarRespuesta(hoy, r, quienPide, mediosPropios, contactos);
  }
}

/** Los consumos de un contacto con ids opacos (`c1`, `c2`…): el motor los necesita, la base no los da. */
function conIdsOpacos(datos: DatosDeContacto): ConsumoDeTope[] {
  return datos.consumos.map((c, k) => ({ ...c, id: `c${k + 1}` }));
}
