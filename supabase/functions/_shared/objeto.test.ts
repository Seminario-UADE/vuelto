import { describe, expect, it } from "vitest";
import { esObjeto } from "./objeto.ts";

describe("esObjeto", () => {
  it("solo un objeto JSON lo es", () => {
    expect(esObjeto({})).toBe(true);
    expect(esObjeto({ a: 1 })).toBe(true);
    expect(esObjeto(null)).toBe(false);
    expect(esObjeto([])).toBe(false);
    expect(esObjeto("texto")).toBe(false);
    expect(esObjeto(3)).toBe(false);
  });
});
