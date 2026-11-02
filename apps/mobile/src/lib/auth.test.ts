import { describe, expect, it, vi } from "vitest";
import { CLAVE_MINIMA, entrar, errorEnEspanol, registrar, salir, validarClave, validarEmail, type ClienteAuth } from "./auth";

// Los mensajes son parte del producto (issue #40): se fijan acá, en español y con cómo seguir.

const usuario = { id: "u1", email: "ana@mail.com", identities: [{ id: "i1" }] };
const sesion = { access_token: "t" };

const cliente = (parcial: Record<string, unknown>) => parcial as unknown as ClienteAuth;
const error = (code: string, name = "AuthApiError", status = 400) => ({ code, name, status });

describe("validación", () => {
  it("el email necesita algo antes y después de la @", () => {
    expect(validarEmail("ana@mail.com")).toBeNull();
    expect(validarEmail("  ana@mail.com  ")).toBeNull();
    for (const malo of ["", "ana", "ana@", "@mail.com", "ana@mail", "a na@mail.com"]) {
      expect(validarEmail(malo)).toEqual({ campo: "email", mensaje: expect.stringContaining("Revisá el email") });
    }
  });

  it(`la contraseña pide al menos ${CLAVE_MINIMA} caracteres`, () => {
    expect(validarClave("a".repeat(CLAVE_MINIMA))).toBeNull();
    expect(validarClave("a".repeat(CLAVE_MINIMA - 1))?.mensaje).toBe(
      `La contraseña es muy corta: usá al menos ${CLAVE_MINIMA} caracteres.`,
    );
    expect(validarClave("")?.mensaje).toBe("Poné una contraseña.");
  });
});

describe("errorEnEspanol", () => {
  it.each([
    ["invalid_credentials", null, "El email o la contraseña no coinciden. Revisalos e intentá de nuevo."],
    ["user_already_exists", "email", "Ya hay una cuenta con ese email. Entrá con tu contraseña."],
    ["email_exists", "email", "Ya hay una cuenta con ese email. Entrá con tu contraseña."],
    ["weak_password", "clave", "La contraseña es muy débil. Probá con una más larga, mezclando letras y números."],
    ["email_not_confirmed", null, "Todavía no confirmaste tu email. Abrí el link que te mandamos y volvé a entrar."],
    ["over_request_rate_limit", null, "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo."],
    ["signup_disabled", null, "Por ahora no se pueden crear cuentas nuevas."],
  ])("%s", (code, campo, mensaje) => {
    expect(errorEnEspanol(error(code))).toEqual({ campo, mensaje });
  });

  it("sin conexión", () => {
    const esperado = { campo: null, mensaje: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo." };
    expect(errorEnEspanol({ name: "AuthRetryableFetchError", status: 0 })).toEqual(esperado);
  });

  it("un error desconocido no muestra el texto en inglés del servidor", () => {
    const r = errorEnEspanol({ ...error("algo_nuevo"), message: "Database error" } as never);
    expect(r.mensaje).toBe("Algo salió mal de nuestro lado. Probá de nuevo en un rato.");
  });
});

describe("registrar", () => {
  it("crea la cuenta y devuelve el usuario", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: usuario, session: sesion }, error: null });
    const r = await registrar(cliente({ signUp }), " ana@mail.com ", "una-clave-larga");
    expect(r).toEqual({ ok: true, cuenta: { id: "u1", email: "ana@mail.com" } });
    expect(signUp).toHaveBeenCalledWith({ email: "ana@mail.com", password: "una-clave-larga" });
  });

  it("valida antes de llamar al servidor", async () => {
    const signUp = vi.fn();
    expect(await registrar(cliente({ signUp }), "ana@mail.com", "corta")).toMatchObject({ ok: false, campo: "clave" });
    expect(await registrar(cliente({ signUp }), "ana", "una-clave-larga")).toMatchObject({ ok: false, campo: "email" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("email ya registrado", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: error("user_already_exists", "AuthApiError", 422) });
    expect(await registrar(cliente({ signUp }), "ana@mail.com", "una-clave-larga")).toMatchObject({
      ok: false,
      campo: "email",
      mensaje: "Ya hay una cuenta con ese email. Entrá con tu contraseña.",
    });
  });

  it("con confirmación de email activa, un email existente vuelve como usuario sin identidades", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { ...usuario, identities: [] }, session: null }, error: null });
    expect(await registrar(cliente({ signUp }), "ana@mail.com", "una-clave-larga")).toMatchObject({ ok: false, campo: "email" });
  });

  it("con confirmación de email activa, la cuenta nueva queda sin sesión", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: usuario, session: null }, error: null });
    expect(await registrar(cliente({ signUp }), "ana@mail.com", "una-clave-larga")).toEqual({
      ok: true,
      cuenta: null,
      confirmarEmail: true,
    });
  });

  it("si la red falla (el cliente tira), avisa sin romper", async () => {
    const signUp = vi.fn().mockRejectedValue(new TypeError("Network request failed"));
    expect(await registrar(cliente({ signUp }), "ana@mail.com", "una-clave-larga")).toMatchObject({
      ok: false,
      mensaje: expect.stringContaining("No pudimos conectarnos"),
    });
  });
});

describe("entrar", () => {
  it("devuelve el usuario", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: usuario, session: sesion }, error: null });
    expect(await entrar(cliente({ signInWithPassword }), "ana@mail.com", "una-clave-larga")).toEqual({
      ok: true,
      cuenta: { id: "u1", email: "ana@mail.com" },
    });
  });

  it("credenciales inválidas", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: error("invalid_credentials") });
    expect(await entrar(cliente({ signInWithPassword }), "ana@mail.com", "mala-clave-ok")).toEqual({
      ok: false,
      campo: null,
      mensaje: "El email o la contraseña no coinciden. Revisalos e intentá de nuevo.",
    });
  });

  it("no exige el largo mínimo al entrar (cuentas creadas con otra regla)", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: usuario, session: sesion }, error: null });
    expect(await entrar(cliente({ signInWithPassword }), "ana@mail.com", "corta")).toMatchObject({ ok: true });
    expect(await entrar(cliente({ signInWithPassword }), "ana@mail.com", "")).toMatchObject({ ok: false, campo: "clave" });
  });
});

describe("salir", () => {
  it("cierra solo la sesión de este dispositivo", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    expect(await salir(cliente({ signOut }))).toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("devuelve el error si no pudo", async () => {
    const signOut = vi.fn().mockRejectedValue(new Error("x"));
    expect(await salir(cliente({ signOut }))).toMatchObject({ mensaje: expect.stringContaining("No pudimos conectarnos") });
  });
});
