import { afterEach, describe, expect, it, vi } from "vitest";
import { mediosDeEjemplo } from "../data/fixtures";
import * as motor from "@vuelto/motor";
import { catalogoComercios, mediosDeclarados, mediosDelMotor } from "../data/fixtures";
import { mediosConfirmados } from "./perfil";
import { sincronizado } from "./acciones";
import { selectConvieneHoy, selectEntradasMotor, selectFrescura, selectRecomendacion, selectTopes } from "./selectores";
import { ahoraCambio } from "./sesion";
import { comercioElegido, montoCambiado } from "./simulacion";
import { guardarCompra } from "./thunks";
import { storeDePrueba } from "./prueba";

vi.mock("@vuelto/motor", { spy: true });

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(motor.recomendar).mockClear();
});

function conMartin() {
  const s = storeDePrueba();
  s.dispatch(mediosConfirmados(mediosDeEjemplo(mediosDeclarados.map((m) => m.id))));
  return s;
}

describe("selectConvieneHoy (Comercios, v7)", () => {
  it("sin comercios propios: los más usados del catálogo, cada uno con la recomendación sin monto del motor", () => {
    const s = conMartin();
    const filas = selectConvieneHoy(s.getState());
    const nombres = filas.map((f) => f.comercio.nombre);
    expect(nombres).toEqual(catalogoComercios.filter((c) => c.frecuente).map((c) => c.nombre));
    expect(new Set(nombres).size).toBe(nombres.length);
    const coto = filas.find((f) => f.comercio.id === "coto");
    expect(coto?.recomendacion).toMatchObject({ medio: { id: "galicia-visa-credito" }, monto: null });
  });
});

describe("selectRecomendacion (US1, US2)", () => {
  it("SC-001 sobre el store: Coto con $10.000 → Galicia, $2.000, ≈$4.500 después", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(10000));
    const r = selectRecomendacion(s.getState());
    expect(r).toMatchObject({
      medio: { id: "galicia-visa-credito" },
      reintegro: 2000,
      teSale: 8000,
      topeDespues: { disponible: 4500 },
    });
  });

  it.each([10000, 2500, null])(
    "mismo estado y monto (%s) → lo mismo que llamar recomendar() directo con esos argumentos (#43)",
    (monto) => {
      const s = conMartin();
      s.dispatch(comercioElegido("coto"));
      s.dispatch(montoCambiado(monto));
      vi.mocked(motor.recomendar).mockClear();
      const r = selectRecomendacion(s.getState());

      // Los argumentos se arman acá, sin pasar por calculo.ts, desde el mismo estado.
      const estado = s.getState();
      const coto = catalogoComercios.find((c) => c.id === "coto");
      if (!coto || coto.categoriaId === null) throw new Error("coto");
      const args: Parameters<typeof motor.recomendar> = [
        { comercio: coto.nombre, categoriaId: coto.categoriaId, monto, canal: "presencial" },
        {
          nombreParaMostrar: null,
          mediosDePago: estado.perfil.medios.flatMap(({ id }) => {
            const m = mediosDelMotor[id];
            return m ? [m] : [];
          }),
          comerciosHabituales: [],
        },
        estado.corpus.promociones,
        estado.compras.lista,
        new Date(estado.sesion.ahora),
      ];
      const directo = motor.recomendar(...args);

      expect(motor.recomendar).toHaveBeenNthCalledWith(1, ...args);
      expect(vi.mocked(motor.recomendar).mock.results[0]?.value).toEqual(directo);
      expect(r?.medio?.id ?? null).toBe(directo.mejor?.medioDePagoId ?? null);
      expect(r?.reintegro).toBe(monto === null ? null : (directo.mejor?.ahorroEstimado ?? null));
    },
  );

  it("sin comercio elegido no hay recomendación", () => {
    expect(selectRecomendacion(conMartin().getState())).toBeNull();
  });

  it("cambiar solo el monto: mismas entradas del motor y cambia solo lo que depende del monto", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(montoCambiado(1000));
    const entradas = selectEntradasMotor(s.getState());
    const antes = selectRecomendacion(s.getState());
    s.dispatch(montoCambiado(10000));
    const despues = selectRecomendacion(s.getState());
    expect(selectEntradasMotor(s.getState())).toBe(entradas);
    expect(antes?.reintegro).toBe(200);
    expect(despues?.reintegro).toBe(2000);
    const fijo = (r: typeof antes) => ({
      medio: r?.medio,
      razon: r?.razon,
      alternativas: r?.alternativas,
      base: r?.base,
    });
    expect(fijo(despues)).toEqual(fijo(antes));
  });

  it("estado idéntico: mismo objeto y el motor corre una sola vez (SC-003)", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    vi.mocked(motor.recomendar).mockClear();
    const a = selectRecomendacion(s.getState());
    const b = selectRecomendacion(s.getState());
    s.dispatch(montoCambiado(null)); // no cambia nada: ya era null
    const c = selectRecomendacion(s.getState());
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(motor.recomendar).toHaveBeenCalledTimes(1);
  });

  it("el reloj del store manda: el jueves la promo de los miércoles no aplica", () => {
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    s.dispatch(ahoraCambio("2026-10-15T15:00:00.000Z"));
    expect(selectRecomendacion(s.getState())?.resultado).toBe("sin-promo");
  });

  it("ningún selector lee el reloj del sistema (FR-005)", () => {
    vi.useFakeTimers({ now: new Date("2027-03-01T12:00:00Z") });
    const s = conMartin();
    s.dispatch(comercioElegido("coto"));
    expect(selectRecomendacion(s.getState())?.dia).toBe("hoy miércoles");
    expect(selectTopes(s.getState()).mes).toBe("octubre");
  });
});

describe("guardarCompra (US3)", () => {
  it("una compra guardada cambia los topes y la próxima recomendación", () => {
    const s = conMartin();
    s.dispatch(
      guardarCompra({
        modo: "excepcion",
        comercio: "Coto",
        fecha: "2026-10-14",
        monto: 5000,
        medioId: "galicia-visa-credito",
        textoExtraido: null,
        usarPromo: true,
      }),
    );
    const galicia = selectTopes(s.getState()).medios.find((m) => m.medio.id === "galicia-visa-credito");
    expect(galicia).toMatchObject({ cifra: "≈$5.500", base: { texto: "según 4 compras de octubre" } });
    s.dispatch(comercioElegido("coto"));
    expect(selectRecomendacion(s.getState())?.topeDisponible).toBe(5500);
    expect(s.getState().compras.lista[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      reintegroEsperado: 1000,
      descuentoObtenido: null,
    });
  });

  it("sin medio falla y no guarda nada", () => {
    const s = conMartin();
    expect(() =>
      s.dispatch(
        guardarCompra({
          modo: "manual",
          comercio: "Coto",
          fecha: "2026-10-14",
          monto: 5000,
          medioId: null,
          textoExtraido: null,
          usarPromo: true,
        }),
      ),
    ).toThrow("Falta el monto o el medio de pago");
    expect(s.getState().compras.lista).toHaveLength(10);
  });
});

describe("selectFrescura (spec 009 FR-019)", () => {
  it("con los datos de ejemplo no hay leyenda", () => {
    expect(selectFrescura(storeDePrueba().getState())).toBeNull();
  });

  it("con un corpus sincronizado dice hace cuánto, con el reloj del store", () => {
    const s = storeDePrueba();
    s.dispatch(
      sincronizado({
        corpus: { promociones: [], marca: "2026-11-02T12:00:00+00:00", sincronizadoEn: "2026-11-02T12:00:00.000Z", descartadas: 0 },
        compras: [],
        ahora: "2026-11-02T12:00:00.000Z",
      }),
    );
    expect(selectFrescura(s.getState())).toBe("Promos actualizadas hace unos minutos");
    s.dispatch(ahoraCambio("2026-11-02T17:30:00.000Z"));
    expect(selectFrescura(s.getState())).toBe("Promos actualizadas hace 5 horas");
  });
});
