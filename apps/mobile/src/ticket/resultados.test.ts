import { describe, expect, it } from "vitest";
import { resultadoDeCodigo, salidaDe, type ResultadoLectura } from "./resultados";

describe("salidaDe: la tabla de FR-011 (SC-004)", () => {
  const casos: [ResultadoLectura, string, string[]][] = [
    ["no_autenticado", "Tu sesión venció. Iniciá sesión para leer el ticket.", ["iniciar_sesion", "cargar_a_mano"]],
    ["foto_no_valida", "No pudimos abrir la foto. Sacala de nuevo.", ["probar_de_nuevo", "cargar_a_mano"]],
    ["imagen_demasiado_grande", "La foto es muy pesada para leerla.", ["cargar_a_mano"]],
    [
      "ticket_ilegible",
      "No pudimos leer el ticket. Probá con más luz o cargá la compra a mano.",
      ["probar_de_nuevo", "cargar_a_mano"],
    ],
    [
      "no_disponible",
      "El lector no está disponible ahora. Probá en un rato o cargá la compra a mano.",
      ["probar_de_nuevo", "cargar_a_mano"],
    ],
    ["tardo_demasiado", "Tardó demasiado. Probá de nuevo.", ["probar_de_nuevo", "cargar_a_mano"]],
    [
      "sin_conexion",
      "Sin conexión no podemos leer el ticket. Probá de nuevo cuando tengas internet o cargá la compra a mano.",
      ["probar_de_nuevo", "cargar_a_mano"],
    ],
    ["interno", "Algo falló. Probá de nuevo o cargá la compra a mano.", ["probar_de_nuevo", "cargar_a_mano"]],
  ];

  it.each(casos)("%s", (resultado, mensaje, salidas) => {
    expect(salidaDe(resultado)).toEqual({ mensaje, salidas });
  });
});

describe("resultadoDeCodigo: los códigos del contrato de la spec 013", () => {
  it.each([
    ["no_autenticado", "no_autenticado"],
    ["invalido", "foto_no_valida"],
    ["formato_no_soportado", "foto_no_valida"],
    ["imagen_danada", "foto_no_valida"],
    ["imagen_demasiado_grande", "imagen_demasiado_grande"],
    ["ticket_ilegible", "ticket_ilegible"],
    ["no_disponible", "no_disponible"],
    ["tardo_demasiado", "tardo_demasiado"],
    ["interno", "interno"],
    ["metodo_no_permitido", "interno"],
  ])("%s → %s", (codigo, resultado) => {
    expect(resultadoDeCodigo(codigo)).toBe(resultado);
  });

  it.each([null, undefined, "otra_cosa", 42])("lo que no está en el contrato (%j) → interno", (codigo) => {
    expect(resultadoDeCodigo(codigo)).toBe("interno");
  });
});
