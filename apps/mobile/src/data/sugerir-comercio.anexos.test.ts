import { describe, expect, it } from "vitest";
import type { Comercio } from "./contracts";
import { sugerirComercio } from "./sugerir-comercio";

/**
 * Medición de SC-001 y SC-002 con los anexos A y B de la spec 015, copiados tal cual. Este archivo
 * NO se usa para ajustar el umbral (research R2): si falla, se revisa la lógica o se documenta en
 * la spec, no se toca la lista.
 */

const NOMBRES = [
  "Coto", "Carrefour", "Jumbo", "Disco", "Vea", "Día", "Farmacity", "YPF", "Shell", "Axion",
  "Easy", "Frávega", "Musimundo", "Havanna", "Freddo", "Mostaza", "Café Martínez", "Grido", "Dexter", "Open 25",
];
const CATALOGO: Comercio[] = NOMBRES.map((nombre, i) => ({
  id: `prueba-${i}`,
  nombre,
  inicial: nombre.charAt(0),
  rubro: "otro",
  categoriaId: i + 1,
  frecuente: false,
}));

/** Anexo A: nombre leído o escrito, texto del ticket (además del nombre) y el comercio correcto. */
const ANEXO_A: [string, string | null, string][] = [
  ["COTO C.I.C.S.A.", null, "Coto"],
  ["Coto Suc. 112", null, "Coto"],
  ["COTO SA", null, "Coto"],
  ["INC S.A.", "CARREFOUR MARKET", "Carrefour"],
  ["Carrefur", null, "Carrefour"],
  ["JUMBO RETAIL ARGENTINA S.A.", null, "Jumbo"],
  ["Cencosud S.A.", "DISCO", "Disco"],
  ["Supermercados Vea", null, "Vea"],
  ["DIA ARGENTINA S.A.", null, "Día"],
  ["Farmacity Suc 45", null, "Farmacity"],
  ["FARMACITY S A", null, "Farmacity"],
  ["YPF Estacion 1234", null, "YPF"],
  ["Shel", null, "Shell"],
  ["AXION ENERGY", null, "Axion"],
  ["Easy Sucursal Palermo", null, "Easy"],
  ["Fravega SACIeI", null, "Frávega"],
  ["Musimundo S.R.L.", null, "Musimundo"],
  ["Havana", null, "Havanna"],
  ["Cafe Martinez", null, "Café Martínez"],
  ["Open25", null, "Open 25"],
];

/** Anexo B: comercios que no están en el catálogo de prueba. */
const ANEXO_B = [
  "Verdulería Don Pepe",
  "Perfumería Raffe",
  "Kiosco El Sol",
  "Ferretería Industrial Norte",
  "Panadería La Espiga",
  "Librería Rayuela",
  "Lavadero Burbujas",
  "Carnicería Los Hermanos",
  "Pinturería Arcoíris",
  "Bicicletería Pedal",
];

/** Los nombres propuestos: la línea de confirmación cuenta como primero; las sugerencias, en orden. */
function propuestos(nombre: string, texto: string | null): string[] {
  const textoTicket = texto === null ? null : `${nombre}\n${texto}`;
  const r = sugerirComercio({ nombre, textoTicket, catalogo: CATALOGO, categoriaConocida: null });
  if (r.tipo === "coincide") return [r.comercio.nombre];
  if (r.tipo === "elegir_rubro") return r.opciones.map((c) => c.nombre);
  if (r.tipo === "sugerencias") return r.sugerencias.map((s) => s.comercio.nombre);
  return [];
}

describe("anexo A: el comercio está en el catálogo (SC-001)", () => {
  const resultados = ANEXO_A.map(([nombre, texto, correcto]) => ({ nombre, correcto, lista: propuestos(nombre, texto) }));

  it("el correcto está entre las 3 sugerencias en al menos 18 de 20", () => {
    const fuera = resultados.filter((r) => !r.lista.includes(r.correcto));
    expect(20 - fuera.length).toBeGreaterThanOrEqual(18);
  });

  it("el correcto es el primero en al menos 15 de 20", () => {
    const primeros = resultados.filter((r) => r.lista[0] === r.correcto).length;
    expect(primeros).toBeGreaterThanOrEqual(15);
  });
});

describe("anexo B: el comercio no está en el catálogo (SC-002)", () => {
  it("no aparece ninguna sugerencia en al menos 9 de 10", () => {
    const sinSugerencias = ANEXO_B.filter((nombre) => propuestos(nombre, null).length === 0).length;
    expect(sinSugerencias).toBeGreaterThanOrEqual(9);
  });
});
