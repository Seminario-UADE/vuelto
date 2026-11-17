import { describe, expect, it } from "vitest";
import type { PedidoGrupo, RecomendacionGrupo } from "../data/contracts";
import { avisoDeConfirmar, etiquetaDeConfirmar, porConfirmarDeGrupo } from "./confirmar";

// Issue #138 (G-09), decisión del PO del 17/11/2026: pagás vos → compra por confirmar; paga otro → aviso.

const pedido: PedidoGrupo = {
  comercio: { id: "la-parolaccia", nombre: "La Parolaccia", inicial: "L", rubro: "gastronomia", categoriaId: 2, frecuente: false },
  canal: "online",
  monto: 41000,
  contactos: ["u-lucia"],
  sinCuenta: [],
};
const contexto = { id: "pc-1", usuarioId: "u1", ahora: "2026-11-17T15:00:00.000Z" };

const vos: Pick<RecomendacionGrupo, "quienPaga" | "medioPropioId" | "medio" | "comercio"> = {
  quienPaga: { clave: "vos", nombre: "Vos", esVos: true, iniciales: null },
  medioPropioId: "m-prov",
  medio: "tu Provincia Visa débito",
  comercio: pedido.comercio,
};
const lucia: typeof vos = {
  quienPaga: { clave: "u-lucia", nombre: "Lucía", esVos: false, iniciales: "L" },
  medioPropioId: null,
  medio: "su Galicia Visa crédito",
  comercio: pedido.comercio,
};
const nadie: typeof vos = { quienPaga: null, medioPropioId: null, medio: null, comercio: pedido.comercio };

describe("porConfirmarDeGrupo", () => {
  it("si pagás vos, es la compra entera con tu medio, el canal y el rubro del pedido, y el reloj del store", () => {
    expect(porConfirmarDeGrupo(vos, pedido, contexto)).toEqual({
      id: "pc-1",
      usuarioId: "u1",
      comercioId: "la-parolaccia",
      comercioNombre: "La Parolaccia",
      medioId: "m-prov",
      monto: 41000,
      creadaEn: "2026-11-17T15:00:00.000Z",
      canal: "online",
      categoriaId: 2,
    });
  });

  it("si paga otro no crea nada: cada uno registra lo suyo (ADR-008 §6)", () => {
    expect(porConfirmarDeGrupo(lucia, pedido, contexto)).toBeNull();
  });

  it("si nadie paga, o falta el medio, no crea nada", () => {
    expect(porConfirmarDeGrupo(nadie, pedido, contexto)).toBeNull();
    expect(porConfirmarDeGrupo({ ...vos, medioPropioId: null }, pedido, contexto)).toBeNull();
  });
});

describe("etiquetaDeConfirmar", () => {
  it("promete algo solo cuando pagás vos", () => {
    expect(etiquetaDeConfirmar(vos)).toBe("Voy a pagar yo");
    expect(etiquetaDeConfirmar(lucia)).toBe("Listo");
    expect(etiquetaDeConfirmar(nadie)).toBe("Listo");
  });
});

describe("avisoDeConfirmar", () => {
  it("pagás vos: dice qué quedó y dónde", () => {
    expect(avisoDeConfirmar(vos, { creada: true, reemplazo: false })).toBe(
      "Quedó por confirmar en Inicio: pagás vos con tu Provincia Visa débito.",
    );
  });

  it("pagás vos y reemplazó otra del mismo comercio: el mismo aviso que la compra individual (FR-012)", () => {
    expect(avisoDeConfirmar(vos, { creada: true, reemplazo: true })).toBe("Actualizamos tu compra en La Parolaccia.");
  });

  it("pagás vos pero no se pudo crear: no dice que quedó", () => {
    expect(avisoDeConfirmar(vos, { creada: false, reemplazo: false })).toBeNull();
  });

  it("paga otro: aclara que cada uno registra lo suyo y que Vuelto no anota nada", () => {
    expect(avisoDeConfirmar(lucia, { creada: false, reemplazo: false })).toBe(
      "Paga Lucía con su Galicia Visa crédito. Cada uno registra lo suyo: Vuelto no anota nada por vos.",
    );
  });

  it("nadie paga: sin aviso", () => {
    expect(avisoDeConfirmar(nadie, { creada: false, reemplazo: false })).toBeNull();
  });
});
