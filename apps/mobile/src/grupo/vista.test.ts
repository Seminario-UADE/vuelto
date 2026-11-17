import { describe, expect, it } from "vitest";
import type { PedidoGrupo } from "../data/contracts";
import type { MedioDePago } from "../perfil/modelo";
import type { RespuestaGrupo } from "./repositorio";
import { vistaDeGrupo } from "./vista";

const LUCIA = "u-lucia";
const OTRA_ANA = "u-ana-2";
const ANA = "u-ana-1";

const pedido: PedidoGrupo = {
  comercio: { id: "la-parolaccia", nombre: "La Parolaccia", inicial: "L", rubro: "gastronomia", categoriaId: 2, frecuente: false },
  canal: "presencial",
  monto: 41000,
  contactos: [LUCIA],
  sinCuenta: [{ posicion: 0, nombre: "Sofía" }],
};

const mioProvincia: MedioDePago = { id: "m-prov", bancoId: "b-prov", nombreBanco: "Banco Provincia", tipo: "debito", red: "visa" };

const base = (datos: Partial<RespuestaGrupo> = {}): RespuestaGrupo => ({
  fecha: "2026-11-14",
  quienPaga: { tipo: "contacto", id: LUCIA },
  reintegro: 5000,
  total: 36000,
  vos: { opcion: null, sinOpcion: null, parte: 12000 },
  contactos: [
    {
      id: LUCIA,
      nombre: "Lucía",
      opcion: { medio: { bancoNombre: "Banco Galicia", tipo: "credito", red: "visa" }, queDa: "20% en gastronomía", reintegro: 5000, base: { tipo: "con_compras" } },
      parte: 12000,
    },
  ],
  sinCuenta: [{ posicion: 0, parte: 12000 }],
  ...datos,
});

const opciones = { hoy: "2026-11-14", mediosPropios: [mioProvincia], nombresDeContactos: {} };

describe("vistaDeGrupo (spec 016 US3)", () => {
  it("US3-2: paga un contacto: nombre, su medio, qué da, ≈ y la base en palabras", () => {
    const v = vistaDeGrupo(base(), pedido, opciones);
    expect(v.titulo).toBe("Te conviene que pague Lucía");
    expect(v.medio).toBe("su Galicia Visa crédito");
    expect(v.razon).toBe("20% en gastronomía");
    expect(v.reintegro).toBe(5000);
    expect(v.base).toBe("según las compras que registró Lucía");
    expect(v.cuando).toBe("hoy sábado");
  });

  it("US3-5 y US3-6: cada fila dice cuánto pone; los sin cuenta, que no se conoce su tope, con su nombre del teléfono", () => {
    const v = vistaDeGrupo(base(), pedido, opciones);
    expect(v.integrantes.map((f) => [f.clave, f.nombre, f.pone])).toEqual([
      ["vos", "Vos", 12000],
      [LUCIA, "Lucía", 12000],
      ["sin-0", "Sofía", 12000],
    ]);
    expect(v.integrantes[1]?.detalle).toBe("Paga con su Galicia Visa crédito");
    expect(v.integrantes[2]?.detalle).toBe("Sin cuenta: no conocemos su tope");
    expect(v.integrantes[0]?.detalle).toBe("Tus medios no tienen promo en esta compra");
  });

  it("las cuatro bases de un contacto que no paga, sin números", () => {
    const conBase = (b: RespuestaGrupo["contactos"][number]["opcion"]) =>
      vistaDeGrupo(base({ quienPaga: null, reintegro: null, contactos: [{ id: LUCIA, nombre: "Lucía", opcion: b, parte: 12000 }] }), pedido, opciones)
        .integrantes[1]?.detalle;
    const o = { medio: null, queDa: null, reintegro: 3000 };
    expect(conBase({ ...o, base: { tipo: "con_compras" } })).toBe("≈$3.000 si paga Lucía · según las compras que registró Lucía");
    expect(conBase({ ...o, base: { tipo: "sin_compras" } })).toBe("≈$3.000 si paga Lucía · Lucía no tiene compras registradas con esta promo: sin base");
    expect(conBase({ ...o, base: { tipo: "sin_tope_informado" } })).toBe("≈$3.000 si paga Lucía · la promo no informa tope");
    expect(conBase({ ...o, base: { tipo: "tope_por_compra" } })).toBe("≈$3.000 si paga Lucía · tope por compra");
    expect(conBase(null)).toBe("Sin reintegro en esta compra");
  });

  it("paga quien pide: su medio por id, con la base con la cantidad de compras", () => {
    const v = vistaDeGrupo(
      base({
        quienPaga: { tipo: "vos" },
        reintegro: 4000,
        vos: {
          opcion: {
            medio: { id: "m-prov", bancoNombre: null, tipo: "debito", red: "visa" },
            queDa: "25% los sábados",
            reintegro: 4000,
            base: { tipo: "con_compras", comprasRegistradas: 3, periodo: "mensual" },
          },
          sinOpcion: null,
          parte: 12334,
        },
      }),
      pedido,
      opciones,
    );
    expect(v.titulo).toBe("Te conviene pagar vos");
    expect(v.medio).toBe("tu Provincia Visa débito");
    expect(v.base).toBe("según 3 compras de noviembre");
    expect(v.integrantes[0]?.detalle).toBe("Paga con tu Provincia Visa débito · según 3 compras de noviembre");
    expect(v.integrantes[1]?.detalle).toBe("≈$5.000 si paga Lucía · según las compras que registró Lucía");
  });

  it("nadie tiene reintegro: título propio y sin medio ni cifra", () => {
    const v = vistaDeGrupo(base({ quienPaga: null, reintegro: null }), pedido, opciones);
    expect(v.titulo).toBe("Nadie del grupo tiene reintegro en esta compra");
    expect(v.medio).toBeNull();
    expect(v.reintegro).toBeNull();
  });

  it("#139: con un contacto vinculado no hay aviso, aunque no tenga reintegro", () => {
    expect(vistaDeGrupo(base(), pedido, opciones).aviso).toBeNull();
    const sinPromo = base({ quienPaga: null, reintegro: null, contactos: [{ id: LUCIA, nombre: "Lucía", opcion: null, parte: 12000 }] });
    expect(vistaDeGrupo(sinPromo, pedido, opciones).aviso).toBeNull();
  });

  it("#139: si solo hay gente sin cuenta, el resultado avisa que solo se evaluó a Vos, pague quien pague", () => {
    const soloSinCuenta = (datos: Partial<RespuestaGrupo> = {}) =>
      base({ contactos: [], sinCuenta: [{ posicion: 0, parte: 20500 }, { posicion: 1, parte: 20500 }], ...datos });
    const pedidoSin: PedidoGrupo = { ...pedido, contactos: [], sinCuenta: [{ posicion: 0, nombre: "Sofía" }, { posicion: 1, nombre: "Juan" }] };

    const nadie = vistaDeGrupo(soloSinCuenta({ quienPaga: null, reintegro: null }), pedidoSin, opciones);
    expect(nadie.aviso).toContain("Solo pudimos evaluar tus medios");
    expect(nadie.aviso).toContain("Invitá a alguien");

    const pagasVos = vistaDeGrupo(
      soloSinCuenta({
        quienPaga: { tipo: "vos" },
        reintegro: 4000,
        vos: { opcion: { medio: { id: "m-prov", bancoNombre: null, tipo: "debito", red: "visa" }, queDa: "10% en gastronomía", reintegro: 4000, base: { tipo: "sin_tope_informado" } }, sinOpcion: null, parte: 20500 },
      }),
      pedidoSin,
      opciones,
    );
    expect(pagasVos.aviso).toContain("Solo pudimos evaluar tus medios");
  });

  it("US3-7: dos contactos con el mismo nombre quedan en su fila, identificados por id", () => {
    const r = base({
      quienPaga: { tipo: "contacto", id: OTRA_ANA },
      contactos: [
        { id: ANA, nombre: "Ana", opcion: null, parte: 9000 },
        { id: OTRA_ANA, nombre: "Ana", opcion: { medio: { bancoNombre: "Banco Galicia", tipo: "credito", red: "visa" }, queDa: "20%", reintegro: 5000, base: { tipo: "sin_compras" } }, parte: 9000 },
      ],
    });
    const v = vistaDeGrupo(r, { ...pedido, contactos: [ANA, OTRA_ANA] }, opciones);
    expect(v.quienPaga?.clave).toBe(OTRA_ANA);
    expect(v.integrantes.find((f) => f.clave === ANA)?.detalle).toBe("Sin reintegro en esta compra");
    expect(v.integrantes.find((f) => f.clave === OTRA_ANA)?.detalle).toBe("Paga con su Galicia Visa crédito");
  });

  it("US3-8: si el servidor evaluó otro día, lo dice con la fecha", () => {
    expect(vistaDeGrupo(base({ fecha: "2026-11-15" }), pedido, opciones).cuando).toBe("domingo 15/11");
  });

  it("si quien pide no tiene opción, usa el motivo que mandó el servidor", () => {
    const v = vistaDeGrupo(base({ vos: { opcion: null, sinOpcion: "Tope agotado este mes", parte: 12000 } }), pedido, opciones);
    expect(v.integrantes[0]?.detalle).toBe("Tope agotado este mes");
  });
});
