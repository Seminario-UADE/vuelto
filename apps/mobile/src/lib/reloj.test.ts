import { describe, expect, it } from "vitest";
import { mediodia, msHastaLaMedianoche } from "./reloj";

describe("reloj de Argentina", () => {
  it("msHastaLaMedianoche cuenta en hora de Argentina", () => {
    expect(msHastaLaMedianoche(new Date("2026-10-14T23:30:00-03:00"))).toBe(30 * 60_000);
    expect(msHastaLaMedianoche(new Date("2026-10-14T00:00:00-03:00"))).toBe(86_400_000);
  });

  it("mediodia es las 15:00 UTC del mismo día", () => {
    expect(mediodia("2026-10-14").toISOString()).toBe("2026-10-14T15:00:00.000Z");
  });
});
