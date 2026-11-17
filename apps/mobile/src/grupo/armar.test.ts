import { describe, expect, it } from "vitest";
import { armarSinContactos, textoDelPie } from "./armar";

describe("armarSinContactos (#139, G-11)", () => {
  it("sin contactos vinculados es el estado vacío", () => {
    expect(armarSinContactos(0)).toBe(true);
  });

  it("con al menos un contacto vinculado no lo es", () => {
    expect(armarSinContactos(1)).toBe(false);
    expect(armarSinContactos(5)).toBe(false);
  });
});

describe("textoDelPie (#139, G-11)", () => {
  const base = { cantidad: 1, monto: 41000, vinculados: 0, maximo: 12 };

  it("sin contactos y solo vos, dice que hay que invitar a alguien", () => {
    expect(textoDelPie(base)).toBe("1 persona · invitá a alguien para armar el grupo");
  });

  it("con contactos pero nadie elegido, sigue pidiendo sumar a alguien", () => {
    expect(textoDelPie({ ...base, vinculados: 2 })).toBe("1 persona · sumá a alguien más");
  });

  it("sin monto, lo primero que falta es el monto", () => {
    expect(textoDelPie({ ...base, monto: null })).toBe("1 persona · falta el monto");
  });

  it("con dos o más personas no agrega nada", () => {
    expect(textoDelPie({ ...base, cantidad: 2 })).toBe("2 personas");
  });

  it("pasado el máximo, avisa cuánto es", () => {
    expect(textoDelPie({ ...base, cantidad: 13, vinculados: 12 })).toBe("13 personas · son más de 12");
  });
});
