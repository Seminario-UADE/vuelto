import { describe, expect, it } from "vitest";
import { PerfilSinMediosError, recomendar, type Compra, type MedioDePago, type Promocion } from "@vuelto/motor";
import { CategoriaInexistenteError } from "../_shared/errores.ts";
import {
  CategoriasEnMemoria,
  ComprasEnMemoria,
  MediosDePagoEnMemoria,
  PromocionesEnMemoria,
  type DeUsuario,
} from "../_shared/memoria/repositorios.ts";
import {
  AHORA,
  compraPropuesta,
  compraRegistrada,
  GASTRONOMIA,
  medio,
  promo,
  SANTANDER,
} from "../_shared/test/fabricas.ts";
import { ServicioRecomendacion } from "./servicio.ts";

const galicia = medio();
const santander = medio({ id: "santander-debito-master", bancoId: SANTANDER, tipo: "debito", red: "master" });

function armar(datos: {
  medios?: DeUsuario<MedioDePago>[];
  promociones?: Promocion[];
  compras?: DeUsuario<Compra>[];
  categorias?: number[];
}) {
  const repos = {
    medios: new MediosDePagoEnMemoria(datos.medios ?? [{ usuarioId: "u1", dato: galicia }]),
    promociones: new PromocionesEnMemoria(datos.promociones ?? [promo()]),
    compras: new ComprasEnMemoria(datos.compras ?? []),
    categorias: new CategoriasEnMemoria(datos.categorias ?? [1, GASTRONOMIA]),
  };
  const servicio = new ServicioRecomendacion(repos.medios, repos.promociones, repos.compras, repos.categorias);
  return { servicio, ...repos };
}

describe("ServicioRecomendacion: US1", () => {
  it("FR-024: da lo mismo que llamar a recomendar() directo con los mismos datos", async () => {
    const promos = [
      promo({ tope: { monto: 12000, periodo: "mensual", alcance: "exclusivo", grupoTopeId: null } }),
      promo({ id: "promo-santander", bancoId: SANTANDER, porcentaje: 10, tarjetas: { debito: ["master"], credito: [] } }),
    ];
    const compras = [compraRegistrada({ descuentoObtenido: 1000 })];
    const { servicio } = armar({
      medios: [
        { usuarioId: "u1", dato: galicia },
        { usuarioId: "u1", dato: santander },
      ],
      promociones: promos,
      compras: compras.map((dato) => ({ usuarioId: "u1", dato })),
    });

    const directo = recomendar(
      compraPropuesta(),
      { nombreParaMostrar: null, mediosDePago: [galicia, santander], comerciosHabituales: [] },
      promos,
      compras,
      AHORA,
    );
    expect(await servicio.recomendar("u1", compraPropuesta(), AHORA)).toEqual(directo);
  });

  it("US1-1: ahorro, tope restante y base con 2 compras registradas", async () => {
    const { servicio } = armar({
      promociones: [promo({ tope: { monto: 12000, periodo: "mensual", alcance: "exclusivo", grupoTopeId: null } })],
      compras: [
        { usuarioId: "u1", dato: compraRegistrada({ id: "c1", fecha: "2026-10-05", descuentoObtenido: 1000 }) },
        { usuarioId: "u1", dato: compraRegistrada({ id: "c2", fecha: "2026-10-12", descuentoObtenido: 1000 }) },
      ],
    });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(r.mejor?.medioDePagoId).toBe("galicia-credito-visa");
    expect(r.mejor?.ahorroEstimado).toBe(3000);
    expect(r.mejor?.topeRestanteTrasCompra).toBe(7000);
    expect(r.mejor?.base).toEqual({ comprasRegistradas: 2, comprasSinDescuentoInformado: 0 });
  });

  it("FR-025: pide los datos del usuario, del rubro, de hoy y del mes en Argentina", async () => {
    const { servicio, medios, promociones, compras, categorias } = armar({});

    await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(categorias.llamadas).toEqual([{ categoriaId: GASTRONOMIA }]);
    expect(medios.llamadas).toEqual([{ usuarioId: "u1" }]);
    expect(promociones.llamadas).toEqual([{ categoriaId: GASTRONOMIA, hoy: "2026-10-24" }]);
    expect(compras.llamadas).toEqual([{ usuarioId: "u1", desde: "2026-10-01", hasta: "2026-10-24" }]);
  });

  it("FR-025: a las 22:00 del último día del mes en Argentina (ya 1/11 en UTC) usa el 31/10 y octubre", async () => {
    const { servicio, promociones, compras } = armar({});
    const ahora = new Date("2026-11-01T01:00:00Z");

    await servicio.recomendar("u1", compraPropuesta(), ahora);

    expect(promociones.llamadas).toEqual([{ categoriaId: GASTRONOMIA, hoy: "2026-10-31" }]);
    expect(compras.llamadas).toEqual([{ usuarioId: "u1", desde: "2026-10-01", hasta: "2026-10-31" }]);
  });

  it("FR-025: no mezcla datos de otro usuario", async () => {
    const { servicio } = armar({
      medios: [
        { usuarioId: "u1", dato: galicia },
        { usuarioId: "u2", dato: santander },
      ],
      promociones: [
        promo({ tope: { monto: 5000, periodo: "mensual", alcance: "exclusivo", grupoTopeId: null } }),
        promo({ id: "promo-santander", bancoId: SANTANDER, tarjetas: { debito: ["master"], credito: [] } }),
      ],
      // u2 ya agotó el tope de la promo de Galicia: a u1 no le afecta.
      compras: [{ usuarioId: "u2", dato: compraRegistrada({ descuentoObtenido: 5000 }) }],
    });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(r.mejor?.medioDePagoId).toBe("galicia-credito-visa");
    expect(r.mejor?.base).toEqual({ comprasRegistradas: 0, comprasSinDescuentoInformado: 0 });
    expect(r.alternativas).toEqual([]);
    expect(r.descartadas.map((d) => [d.promocionId, d.causa])).toEqual([["promo-santander", "medio_de_pago"]]);
  });

  it("propaga PerfilSinMediosError del motor si el usuario no tiene medios", async () => {
    const { servicio } = armar({ medios: [{ usuarioId: "u2", dato: galicia }] });
    await expect(servicio.recomendar("u1", compraPropuesta(), AHORA)).rejects.toBeInstanceOf(PerfilSinMediosError);
  });

  it("rubro inexistente: lanza CategoriaInexistenteError sin pedir más datos", async () => {
    const { servicio, medios, promociones, compras } = armar({ categorias: [1] });

    await expect(servicio.recomendar("u1", compraPropuesta(), AHORA)).rejects.toBeInstanceOf(
      CategoriaInexistenteError,
    );
    expect(medios.llamadas).toEqual([]);
    expect(promociones.llamadas).toEqual([]);
    expect(compras.llamadas).toEqual([]);
  });
});

describe("ServicioRecomendacion: US2", () => {
  const promoSantander = promo({
    id: "promo-santander",
    bancoId: SANTANDER,
    porcentaje: 10,
    tarjetas: { debito: ["master"], credito: [] },
  });

  it("una promo del rubro de otro día llega al motor y sale descartada por día (el filtro previo no usa días)", async () => {
    // AHORA es sábado: la promo vale solo los viernes.
    const { servicio } = armar({
      promociones: [promo(), promo({ id: "promo-viernes", vigencia: { desde: "2026-10-01", hasta: "2026-10-31", dias: ["vie"] } })],
    });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(r.descartadas.map((d) => [d.promocionId, d.causa])).toEqual([["promo-viernes", "dia"]]);
  });

  it("las promos de otro rubro o fuera de vigencia no aparecen en ningún lado", async () => {
    const { servicio } = armar({
      promociones: [
        promo(),
        promo({ id: "promo-super", categoriaId: 1 }),
        promo({ id: "promo-vencida", vigencia: { desde: "2026-09-01", hasta: "2026-09-30", dias: null } }),
        promo({ id: "promo-futura", vigencia: { desde: "2026-11-01", hasta: "2026-11-30", dias: null } }),
      ],
    });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    const ids = [r.mejor, ...r.alternativas].map((o) => o?.promocionId).concat(r.descartadas.map((d) => d.promocionId));
    expect(ids).toEqual(["promo-galicia"]);
  });

  it("devuelve las alternativas en el mismo orden que el motor", async () => {
    const medios = [
      { usuarioId: "u1", dato: santander },
      { usuarioId: "u1", dato: galicia },
    ];
    const { servicio } = armar({ medios, promociones: [promoSantander, promo()] });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(r.mejor?.promocionId).toBe("promo-galicia");
    expect(r.alternativas.map((o) => o.promocionId)).toEqual(["promo-santander"]);
  });

  it("si ninguna aplica: mejor null y sin alternativas, con las descartadas", async () => {
    const { servicio } = armar({ promociones: [promoSantander] });

    const r = await servicio.recomendar("u1", compraPropuesta(), AHORA);

    expect(r.mejor).toBeNull();
    expect(r.alternativas).toEqual([]);
    expect(r.descartadas.map((d) => d.causa)).toEqual(["medio_de_pago"]);
  });
});
