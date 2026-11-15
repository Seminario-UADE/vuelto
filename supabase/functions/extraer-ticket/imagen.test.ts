import { describe, expect, it } from "vitest";
import { MAXIMO_BYTES_IMAGEN, validarPedidoImagen } from "./imagen.ts";

/** Bytes con la "firma" de cada formato al principio, y relleno. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);

/** En trozos: con una imagen grande, `String.fromCharCode(...bytes)` desborda la pila. */
function base64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

describe("validarPedidoImagen", () => {
  it.each([
    ["image/jpeg", JPEG],
    ["image/png", PNG],
    ["image/webp", WEBP],
  ] as const)("%s válido → los bytes y el tipo", (tipo, bytes) => {
    expect(validarPedidoImagen({ imagen: base64(bytes), tipo })).toEqual({ ok: true, bytes, tipo });
  });

  it.each([
    [null, "body"],
    ["texto", "body"],
    [[], "body"],
    [{ tipo: "image/jpeg" }, "imagen"],
    [{ imagen: 123, tipo: "image/jpeg" }, "imagen"],
    [{ imagen: base64(JPEG) }, "tipo"],
    [{ imagen: base64(JPEG), tipo: 5 }, "tipo"],
  ])("cuerpo sin imagen o tipo: invalido (%j)", (cuerpo, campo) => {
    expect(validarPedidoImagen(cuerpo)).toEqual({ ok: false, codigo: "invalido", campo });
  });

  it.each(["image/heic", "image/gif", "application/pdf"])("tipo %s: formato_no_soportado", (tipo) => {
    expect(validarPedidoImagen({ imagen: base64(JPEG), tipo })).toEqual({
      ok: false,
      codigo: "formato_no_soportado",
      campo: null,
    });
  });

  it("una imagen de más de 2.500.000 bytes: imagen_demasiado_grande, sin decodificarla", () => {
    // Base64 más largo que el de 2.500.000 bytes; con caracteres inválidos, para probar que no se decodifica.
    const largo = Math.ceil(MAXIMO_BYTES_IMAGEN / 3) * 4 + 4;
    expect(validarPedidoImagen({ imagen: "!".repeat(largo), tipo: "image/jpeg" })).toEqual({
      ok: false,
      codigo: "imagen_demasiado_grande",
      campo: null,
    });
  });

  it("el límite cuenta los bytes de la imagen, no los caracteres del texto", () => {
    const justa = new Uint8Array(MAXIMO_BYTES_IMAGEN);
    justa.set(JPEG);
    const r = validarPedidoImagen({ imagen: base64(justa), tipo: "image/jpeg" });
    expect(r.ok).toBe(true);
  });

  it.each([
    ["no es base64", "%%%%"],
    ["vacía", ""],
    ["largo que no es múltiplo de 4", "abcde"],
  ])("base64 inválido (%s): imagen_danada", (_, imagen) => {
    expect(validarPedidoImagen({ imagen, tipo: "image/jpeg" })).toEqual({
      ok: false,
      codigo: "imagen_danada",
      campo: null,
    });
  });

  it.each([
    ["PNG declarado como JPEG", PNG, "image/jpeg"],
    ["JPEG declarado como WebP", JPEG, "image/webp"],
    ["bytes que no son de ninguna imagen", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "image/png"],
  ] as const)("%s: imagen_danada", (_, bytes, tipo) => {
    expect(validarPedidoImagen({ imagen: base64(bytes), tipo })).toEqual({
      ok: false,
      codigo: "imagen_danada",
      campo: null,
    });
  });
});
