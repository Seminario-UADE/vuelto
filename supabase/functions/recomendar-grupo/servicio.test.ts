import { describe, expect, it } from "vitest";
import { recomendarGrupo } from "@vuelto/motor";
import { CategoriaInexistenteError, ContactoNoVinculadoError } from "../_shared/errores.ts";
import {
  CategoriasEnMemoria,
  ComprasEnMemoria,
  ContactosEnMemoria,
  MediosDePagoEnMemoria,
  PromocionesEnMemoria,
} from "../_shared/memoria/repositorios.ts";
import type { DatosDeContacto } from "../_shared/repositorios.ts";
import { GASTRONOMIA, compraPropuesta, medio, promo } from "../_shared/test/fabricas.ts";
import { armarRespuesta } from "./respuesta.ts";
import { ServicioGrupo } from "./servicio.ts";
import type { PedidoGrupo } from "./validacion.ts";

const YO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUCIA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
/** Domingo 1/11/2026, 12:00 en Argentina: la semana arrancó el lunes 26/10, en el mes anterior. */
const DOMINGO = new Date("2026-11-01T15:00:00Z");

const semanal = promo({
  id: "promo-semanal",
  vigencia: { desde: "2026-10-01", hasta: "2026-11-30", dias: null },
  tope: { monto: 3000, periodo: "semanal", alcance: null, grupoTopeId: null },
});
/** Vencida, de otro rubro: la referencia una compra de Lucía (el motor la necesita para los topes). */
const vieja = promo({ id: "promo-vieja", categoriaId: 1, vigencia: { desde: "2026-09-01", hasta: "2026-10-28", dias: null } });

const lucia: DatosDeContacto = {
  id: LUCIA,
  nombre: "Lucía",
  medios: [{ ...medio({ id: "l1" }), bancoNombre: "Banco Galicia" }],
  consumos: [
    { promocionId: "promo-semanal", fecha: "2026-10-27", monto: 5000, descuentoObtenido: 1000 },
    { promocionId: "promo-vieja", fecha: "2026-10-28", monto: 5000, descuentoObtenido: 500 },
    { promocionId: "promo-semanal", fecha: "2026-09-15", monto: 5000, descuentoObtenido: 1000 },
  ],
};

function armar(datos: DatosDeContacto[] = [lucia], categorias = [GASTRONOMIA]) {
  const repos = {
    medios: new MediosDePagoEnMemoria([{ usuarioId: YO, dato: medio({ id: "mio", bancoId: "otro-banco" }) }]),
    promociones: new PromocionesEnMemoria([semanal, vieja]),
    compras: new ComprasEnMemoria([]),
    categorias: new CategoriasEnMemoria(categorias),
    contactos: new ContactosEnMemoria(datos),
  };
  const servicio = new ServicioGrupo(repos.medios, repos.promociones, repos.compras, repos.categorias, repos.contactos);
  return { servicio, repos };
}

const pedido: PedidoGrupo = { compra: { ...compraPropuesta(), monto: 10000 }, contactos: [LUCIA], sinCuenta: 1 };

describe("ServicioGrupo (research R8)", () => {
  it("pide los datos de quien pide y de los contactos desde el inicio de la semana que cruzó de mes", async () => {
    const { servicio, repos } = armar();
    await servicio.recomendar(YO, pedido, DOMINGO);
    expect(repos.medios.llamadas).toEqual([{ usuarioId: YO }]);
    expect(repos.compras.llamadas).toEqual([{ usuarioId: YO, desde: "2026-10-26", hasta: "2026-11-01" }]);
    expect(repos.contactos.llamadas).toEqual([{ ids: [LUCIA], desde: "2026-10-26", hasta: "2026-11-01" }]);
    expect(repos.promociones.llamadas).toEqual([{ categoriaId: GASTRONOMIA, hoy: "2026-11-01" }]);
  });

  it("pide por id las promos que referencian los consumos y no vinieron con el rubro", async () => {
    const { servicio, repos } = armar();
    await servicio.recomendar(YO, pedido, DOMINGO);
    expect(repos.promociones.llamadasPorIds).toEqual([{ ids: ["promo-vieja"] }]);
  });

  it("da lo mismo que el motor con la misma foto, con ids opacos para los consumos del contacto", async () => {
    const { servicio } = armar();
    const r = await servicio.recomendar(YO, pedido, DOMINGO);
    const esperado = recomendarGrupo(
      pedido.compra,
      [
        { tipo: "cuenta", id: YO, pide: true, mediosDePago: [medio({ id: "mio", bancoId: "otro-banco" })], consumos: [] },
        {
          tipo: "cuenta",
          id: LUCIA,
          pide: false,
          mediosDePago: [medio({ id: "l1" })],
          consumos: lucia.consumos.slice(0, 2).map((c, k) => ({ ...c, id: `c${k + 1}` })),
        },
        { tipo: "sin_cuenta", posicion: 0 },
      ],
      [semanal, vieja],
      DOMINGO,
    );
    expect(r).toEqual(armarRespuesta("2026-11-01", esperado, YO, [medio({ id: "mio", bancoId: "otro-banco" })], [lucia]));
    // Le quedan $2.000 de los $3.000 semanales: el 20% de $10.000 entra justo.
    expect(r.quienPaga).toEqual({ tipo: "contacto", id: LUCIA });
    expect(r.reintegro).toBe(2000);
  });

  it("sin contactos no consulta datos ajenos", async () => {
    const { servicio, repos } = armar();
    await servicio.recomendar(YO, { ...pedido, contactos: [], sinCuenta: 2 }, DOMINGO);
    expect(repos.contactos.llamadas).toEqual([]);
  });

  it("un contacto no vinculado rechaza el pedido entero", async () => {
    const { servicio } = armar([]);
    await expect(servicio.recomendar(YO, pedido, DOMINGO)).rejects.toBeInstanceOf(ContactoNoVinculadoError);
  });

  it("un rubro que no existe se rechaza antes de leer datos ajenos", async () => {
    const { servicio, repos } = armar([lucia], []);
    await expect(servicio.recomendar(YO, pedido, DOMINGO)).rejects.toBeInstanceOf(CategoriaInexistenteError);
    expect(repos.contactos.llamadas).toEqual([]);
  });
});
