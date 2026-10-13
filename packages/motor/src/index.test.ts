import { describe, expect, it } from "vitest";
import { VERSION_MOTOR } from "./index";

describe("@vuelto/motor", () => {
  it("expone su versión", () => {
    expect(VERSION_MOTOR).toBe("0.0.0");
  });
});
