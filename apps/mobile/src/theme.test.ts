/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { temas, type ColorToken } from "./theme";

function luminancia(hex: string): number {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) throw new Error(`no es un hex opaco: ${hex}`);
  const n = hex.replace("#", "");
  const canal = (i: number) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

type NombreTema = keyof typeof temas;
type Par = [nombre: string, frente: ColorToken, fondo: ColorToken];

/**
 * Pares de DESIGN.md §2 que llevan texto (WCAG 2.1 AA, ≥ 4,5:1), por tema. En el claro,
 * `inkSecondary` no va sobre `surfaceStrong` (4,3:1): ahí el texto va en `ink`.
 */
const textos: Record<NombreTema, Par[]> = {
  claro: [],
  oscuro: [["inkSecondary / surfaceStrong", "inkSecondary", "surfaceStrong"]],
};
const textosComunes: Par[] = [
  ["ink / canvas", "ink", "canvas"],
  ["ink / surface", "ink", "surface"],
  ["ink / surfaceStrong", "ink", "surfaceStrong"],
  ["inkSecondary / canvas", "inkSecondary", "canvas"],
  ["inkSecondary / surface", "inkSecondary", "surface"],
  ["accent / canvas (links)", "accent", "canvas"],
  ["accent / surface (links)", "accent", "surface"],
  ["onAccent / accent", "onAccent", "accent"],
  // Botón destructivo: texto `onAccent` sobre `error`.
  ["onAccent / error", "onAccent", "error"],
  ["warning / canvas", "warning", "canvas"],
  ["warning / warningBg", "warning", "warningBg"],
  ["warning / surface", "warning", "surface"],
  ["error / canvas", "error", "canvas"],
  ["error / surface", "error", "surface"],
  ["error / surfaceStrong", "error", "surfaceStrong"],
  ["ink / successBg", "ink", "successBg"],
  ["onDecision / decisionBg", "onDecision", "decisionBg"],
  ["onDecisionMuted / decisionBg", "onDecisionMuted", "decisionBg"],
  ["onDecisionAccent / decisionBg", "onDecisionAccent", "decisionBg"],
  // El botón «Usar [medio]» y la inicial del medio: texto `ink` sobre `onDecisionAccent`.
  ["ink / onDecisionAccent", "ink", "onDecisionAccent"],
  ["onScrim / scrim", "onScrim", "scrim"],
  ["onScrimMuted / scrim", "onScrimMuted", "scrim"],
];

/** Controles y bordes que tienen que verse (WCAG 1.4.11, ≥ 3:1). */
const controles: Par[] = [
  ["controlBorder / canvas", "controlBorder", "canvas"],
  ["controlBorder / surface", "controlBorder", "surface"],
  ["accent / canvas", "accent", "canvas"],
  ["accent / surface", "accent", "surface"],
  ["accent / surfaceStrong", "accent", "surfaceStrong"],
  ["onDecisionAccent / decisionBg (botón)", "onDecisionAccent", "decisionBg"],
];

describe.each(Object.keys(temas) as NombreTema[])("tema %s", (nombre) => {
  const t = temas[nombre];

  it.each([...textosComunes, ...textos[nombre]])("%s ≥ 4,5:1", (_n, frente, fondo) => {
    expect(contraste(t[frente], t[fondo])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(controles)("%s ≥ 3:1", (_n, frente, fondo) => {
    expect(contraste(t[frente], t[fondo])).toBeGreaterThanOrEqual(3);
  });

  it("sin negro ni blanco puros", () => {
    for (const valor of Object.values(t)) expect(valor).not.toMatch(/^#(000000|FFFFFF)$/i);
  });

  it("el oscuro tiene su escala de elevación: lo elevado es más claro", () => {
    const [c, s, f] = [t.canvas, t.surface, t.surfaceStrong].map(luminancia) as [number, number, number];
    if (nombre === "oscuro") expect(c < s && s < f).toBe(true);
    else expect(c > s && s > f).toBe(true);
  });
});

it("los dos temas definen los mismos roles", () => {
  expect(Object.keys(temas.oscuro).sort()).toEqual(Object.keys(temas.claro).sort());
});

describe("sin colores escritos a mano fuera del tema (SC-003)", () => {
  const raiz = dirname(fileURLToPath(import.meta.url));
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) && !p.endsWith("theme.ts")) archivos.push(p);
    }
  };
  recorrer(join(raiz, "app"));
  recorrer(join(raiz, "components"));

  it("hay pantallas y componentes para revisar", () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos.map((a) => [a.replace(raiz, "src")]))("%s", (rel) => {
    const texto = readFileSync(join(raiz, rel.replace(/^src/, "")), "utf8");
    expect(texto).not.toMatch(/["'`]#[0-9a-fA-F]{3,8}["'`]|rgba?\(/);
  });
});

describe("el cálculo vive en el motor, detrás de la capa de datos (ADR-010)", () => {
  const raiz = dirname(fileURLToPath(import.meta.url));
  const todos: string[] = [];
  const recorrer = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.ts$/.test(f)) todos.push(p);
    }
  };
  recorrer(raiz);

  it("ninguna pantalla ni componente importa el motor ni los fixtures", () => {
    const culpables = todos.filter(
      (p) => /\/(app|components)\//.test(p) && /from ["'](@vuelto\/motor|[^"']*\/fixtures)["']/.test(readFileSync(p, "utf8")),
    );
    expect(culpables).toEqual([]);
  });

  it("el servidor simulado ya no existe", () => {
    expect(todos.some((p) => p.endsWith("servidor-simulado.ts"))).toBe(false);
  });

  it("el cálculo no lee el reloj del sistema (FR-005)", () => {
    const culpables = todos.filter(
      (p) => /data\/(calculo|grupo-simulado)\.ts$|store\/selectores\.ts$/.test(p) &&
        /new Date\(\)|Date\.now\(/.test(readFileSync(p, "utf8")),
    );
    expect(culpables).toEqual([]);
  });

  it("la app depende del motor", () => {
    const pkg = readFileSync(join(raiz, "..", "package.json"), "utf8");
    expect(pkg).toContain("@vuelto/motor");
  });
});
