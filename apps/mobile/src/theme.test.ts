/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { colors } from "./theme";

function luminancia(hex: string): number {
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

describe("tema", () => {
  // Pares de texto declarados en DESIGN.md §2 (WCAG 2.1 AA ≥ 4,5:1).
  const pares: [string, string, string][] = [
    ["ink / canvas", colors.ink, colors.canvas],
    ["ink / surfaceStrong", colors.ink, colors.surfaceStrong],
    ["inkSecondary / canvas", colors.inkSecondary, colors.canvas],
    ["inkSecondary / surface", colors.inkSecondary, colors.surface],
    ["inkSecondary / surfaceStrong", colors.inkSecondary, colors.surfaceStrong],
    ["onAccent / accent", colors.onAccent, colors.accent],
    ["warning / warningBg", colors.warning, colors.warningBg],
    ["warning / surface", colors.warning, colors.surface],
    ["error / surfaceStrong", colors.error, colors.surfaceStrong],
    ["error / surface", colors.error, colors.surface],
    ["ink / successBg", colors.ink, colors.successBg],
    ["onDecision / decisionBg", colors.onDecision, colors.decisionBg],
    ["onDecisionAccent / decisionBg", colors.onDecisionAccent, colors.decisionBg],
  ];

  it.each(pares)("%s cumple AA", (_n, texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it("borde de control ≥3:1 sobre fondos claros", () => {
    for (const fondo of [colors.canvas, colors.surface]) {
      expect(contraste(colors.controlBorder, fondo)).toBeGreaterThanOrEqual(3);
    }
  });
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
