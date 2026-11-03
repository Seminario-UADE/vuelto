import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ejecutarComoScript, esEntrada, hoyEnArgentina, parsearArgumentos } from "./args.ts";

describe("parsearArgumentos", () => {
  it("separa banderas con valor, banderas sueltas y posicionales", () => {
    const a = parsearArgumentos(["--categorias", "1,4", "--aplicar", "slug-a", "slug-b"], ["aplicar"]);
    expect(a.valores).toEqual({ categorias: "1,4" });
    expect(a.banderas).toEqual(["aplicar"]);
    expect(a.posicionales).toEqual(["slug-a", "slug-b"]);
  });

  it("sin declararla como suelta, una bandera se come el valor que le sigue", () => {
    expect(parsearArgumentos(["--aplicar", "slug-a"]).valores).toEqual({ aplicar: "slug-a" });
  });

  it("acepta la forma --clave=valor", () => {
    const a = parsearArgumentos(["--pausa-ms=1500", "--verificar"]);
    expect(a.valores).toEqual({ "pausa-ms": "1500" });
    expect(a.banderas).toEqual(["verificar"]);
  });

  it("una bandera al final es suelta", () => {
    expect(parsearArgumentos(["--aplicar"]).banderas).toEqual(["aplicar"]);
  });

  it("sin argumentos no devuelve nada", () => {
    expect(parsearArgumentos([])).toEqual({ valores: {}, banderas: [], posicionales: [] });
  });
});

describe("esEntrada", () => {
  it("es verdadero solo para el módulo que se ejecutó", () => {
    const original = process.argv[1];
    try {
      process.argv[1] = fileURLToPath(new URL("./ingestar.ts", import.meta.url));
      expect(esEntrada(new URL("./ingestar.ts", import.meta.url).href)).toBe(true);
      expect(esEntrada(new URL("./publicar.ts", import.meta.url).href)).toBe(false);
    } finally {
      process.argv[1] = original!;
    }
  });
});

describe("hoyEnArgentina", () => {
  it("devuelve una fecha ISO", () => {
    expect(hoyEnArgentina()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("usa la hora de Argentina: a las 01:00 UTC todavía es el día anterior", () => {
    expect(hoyEnArgentina(new Date("2026-11-03T01:00:00Z"))).toBe("2026-11-02");
    expect(hoyEnArgentina(new Date("2026-11-03T04:00:00Z"))).toBe("2026-11-03");
  });
});

describe("ejecutarComoScript", () => {
  it("no hace nada si el módulo no es el que se ejecutó", () => {
    let corrio = false;
    ejecutarComoScript(new URL("./ingestar.ts", import.meta.url).href, () => {
      corrio = true;
    });
    expect(corrio).toBe(false);
  });

  it("corre la función si es el módulo ejecutado, y un error deja el código de salida en 1", async () => {
    const original = process.argv[1];
    const codigo = process.exitCode;
    const consola = console.error;
    const mensajes: unknown[] = [];
    console.error = (...a: unknown[]) => void mensajes.push(...a);
    try {
      process.argv[1] = fileURLToPath(new URL("./ingestar.ts", import.meta.url));
      ejecutarComoScript(new URL("./ingestar.ts", import.meta.url).href, () => {
        throw new Error("falló");
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(process.exitCode).toBe(1);
      expect(mensajes).toEqual(["falló"]);
    } finally {
      console.error = consola;
      process.argv[1] = original!;
      process.exitCode = codigo;
    }
  });

  it("también atrapa el error de una función asíncrona", async () => {
    const original = process.argv[1];
    const codigo = process.exitCode;
    const consola = console.error;
    console.error = () => {};
    try {
      process.argv[1] = fileURLToPath(new URL("./ingestar.ts", import.meta.url));
      ejecutarComoScript(new URL("./ingestar.ts", import.meta.url).href, async () => {
        throw new Error("async");
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(process.exitCode).toBe(1);
    } finally {
      console.error = consola;
      process.argv[1] = original!;
      process.exitCode = codigo;
    }
  });
});
