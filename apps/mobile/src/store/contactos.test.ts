import { describe, expect, it } from "vitest";
import { repositorioContactosMemoria } from "../grupo/repositorio-memoria";
import { sesionCerrada } from "./acciones";
import {
  aceptarInvitacion,
  aContacto,
  cargarContactos,
  CLAVE_CONTACTOS,
  crearInvitacion,
  iniciarContactos,
  leerContactos,
  quitarContacto,
  verInvitacion,
} from "./contactos";
import { esperar, memoria, storeDePrueba } from "./prueba";
import { usuarioCambio } from "./sesion";

const ana = { id: "u-ana", nombre: "Ana", vinculadoDesde: "2026-11-01T10:00:00.000Z" };
const beto = { id: "u-beto", nombre: "Beto Gómez", vinculadoDesde: "2026-11-02T10:00:00.000Z" };
const reloj = () => new Date("2026-11-15T15:00:00.000Z");

function conCuenta(repo = repositorioContactosMemoria({ contactos: [ana, beto] }), disco = memoria()) {
  const s = storeDePrueba(null, disco, { contactosRemoto: repo, reloj });
  s.dispatch(usuarioCambio({ id: "u1", email: "yo@mail.com" }));
  return { s, repo, disco };
}

describe("contactos: lista desde el servidor (spec 016 US2)", () => {
  it("US2-12: una cuenta nueva arranca sin contactos (G-02)", () => {
    const s = storeDePrueba();
    expect(s.getState().contactos.lista).toEqual([]);
  });

  it("cargarContactos trae la lista del servidor y la asocia a la cuenta", async () => {
    const { s } = conCuenta();
    await s.dispatch(cargarContactos());
    expect(s.getState().contactos).toMatchObject({
      cuentaId: "u1",
      estado: "listo",
      lista: [
        { id: "u-ana", nombre: "Ana", iniciales: "A", vinculadoDesde: "2026-11-01" },
        { id: "u-beto", nombre: "Beto Gómez", iniciales: "BG", vinculadoDesde: "2026-11-02" },
      ],
    });
  });

  it("sin cuenta no pide nada", async () => {
    const repo = repositorioContactosMemoria({ contactos: [ana] });
    const s = storeDePrueba(null, memoria(), { contactosRemoto: repo });
    await s.dispatch(cargarContactos());
    expect(s.getState().contactos.estado).toBe("inicial");
  });

  it("si el servidor falla, la lista queda como estaba y el estado es error", async () => {
    const { s, repo } = conCuenta();
    await s.dispatch(cargarContactos());
    repo.fallarLaProxima();
    await s.dispatch(cargarContactos());
    expect(s.getState().contactos.estado).toBe("error");
    expect(s.getState().contactos.lista).toHaveLength(2);
  });

  it("la fecha del vínculo es la de Argentina, no la de UTC", () => {
    // 01:57 UTC del 16/11 son las 22:57 del 15/11 en Argentina.
    expect(aContacto({ id: "x", nombre: "Beto", vinculadoDesde: "2026-11-16T01:57:00.000Z" }).vinculadoDesde).toBe("2026-11-15");
  });

  it("un contacto sin nombre para mostrar se llama «Contacto»", () => {
    expect(aContacto({ id: "x", nombre: null, vinculadoDesde: "2026-11-01T15:00:00Z" })).toEqual({
      id: "x",
      nombre: "Contacto",
      iniciales: "C",
      vinculadoDesde: "2026-11-01",
    });
  });
});

describe("contactos: quitar y aceptar (US2-7, US2-14, US2-15)", () => {
  it("quitar saca al contacto solo cuando el servidor confirma", async () => {
    const { s, repo } = conCuenta();
    await s.dispatch(cargarContactos());
    await s.dispatch(quitarContacto("u-ana"));
    expect(s.getState().contactos.lista.map((c) => c.id)).toEqual(["u-beto"]);
    expect(repo.contactos.map((c) => c.id)).toEqual(["u-beto"]);
  });

  it("si quitar falla, lanza y la lista local no cambia", async () => {
    const { s, repo } = conCuenta();
    await s.dispatch(cargarContactos());
    repo.fallarLaProxima();
    await expect(s.dispatch(quitarContacto("u-ana"))).rejects.toThrow();
    expect(s.getState().contactos.lista).toHaveLength(2);
  });

  it("aceptar una invitación válida suma al contacto", async () => {
    const repo = repositorioContactosMemoria({
      invitaciones: {
        tok: { estado: "valida", quienInvita: "Tomás", venceEn: "2026-11-16T00:00:00Z", emisor: { id: "u-tomas", nombre: "Tomás" } },
      },
    });
    const { s } = conCuenta(repo);
    const r = await s.dispatch(aceptarInvitacion("tok"));
    expect(r.estado).toBe("aceptada");
    expect(s.getState().contactos.lista).toEqual([{ id: "u-tomas", nombre: "Tomás", iniciales: "T", vinculadoDesde: "2026-11-15" }]);
  });

  it("aceptar una invitación que ya no sirve no suma a nadie", async () => {
    const repo = repositorioContactosMemoria({ invitaciones: { tok: { estado: "usada", quienInvita: "Tomás", venceEn: null } } });
    const { s } = conCuenta(repo);
    const r = await s.dispatch(aceptarInvitacion("tok"));
    expect(r.estado).toBe("usada");
    expect(s.getState().contactos.lista).toEqual([]);
  });

  it("sin Supabase, quitar y aceptar avisan en vez de hacer como que anduvo", async () => {
    const s = storeDePrueba();
    await expect(s.dispatch(quitarContacto("u-ana"))).rejects.toThrow();
    await expect(s.dispatch(aceptarInvitacion("tok"))).rejects.toThrow();
  });
});

describe("contactos: cuentas y persistencia (FR-019, US2-16)", () => {
  it("cerrar sesión vacía la lista", async () => {
    const { s } = conCuenta();
    await s.dispatch(cargarContactos());
    s.dispatch(sesionCerrada());
    expect(s.getState().contactos.lista).toEqual([]);
  });

  it("entrar con otra cuenta no muestra los contactos de la anterior", async () => {
    const { s } = conCuenta();
    await s.dispatch(cargarContactos());
    s.dispatch(usuarioCambio({ id: "u2", email: "otra@mail.com" }));
    expect(s.getState().contactos.lista).toEqual([]);
    expect(s.getState().contactos.cuentaId).toBe("u2");
  });

  it("la lista se guarda con su cuenta y se vuelve a leer al abrir (G-03)", async () => {
    const disco = memoria();
    const { s } = conCuenta(undefined, disco);
    await s.dispatch(iniciarContactos());
    await s.dispatch(cargarContactos());
    await esperar();
    expect(leerContactos(disco.datos.get(CLAVE_CONTACTOS) ?? null)?.cuentaId).toBe("u1");

    const otra = storeDePrueba(null, disco);
    await otra.dispatch(iniciarContactos());
    otra.dispatch(usuarioCambio({ id: "u1", email: "yo@mail.com" }));
    expect(otra.getState().contactos.lista.map((c) => c.id)).toEqual(["u-ana", "u-beto"]);
  });

  it("al abrir con otra cuenta, la lista guardada se descarta", async () => {
    const disco = memoria();
    const { s } = conCuenta(undefined, disco);
    await s.dispatch(iniciarContactos());
    await s.dispatch(cargarContactos());
    await esperar();

    const otra = storeDePrueba(null, disco);
    otra.dispatch(usuarioCambio({ id: "u2", email: "otra@mail.com" }));
    await otra.dispatch(iniciarContactos());
    expect(otra.getState().contactos.lista).toEqual([]);
  });

  it("sin cuenta, lo guardado se borra del teléfono", async () => {
    const disco = memoria();
    const { s } = conCuenta(undefined, disco);
    await s.dispatch(iniciarContactos());
    await s.dispatch(cargarContactos());
    await esperar();
    s.dispatch(sesionCerrada());
    await esperar();
    expect(disco.datos.has(CLAVE_CONTACTOS)).toBe(false);
  });

  it("una lista guardada rota no tira abajo la app", () => {
    expect(leerContactos("no es json")).toBeNull();
    expect(leerContactos(JSON.stringify({ version: 2, cuentaId: "u1", lista: [] }))).toBeNull();
    expect(leerContactos(JSON.stringify({ version: 1, cuentaId: "u1", lista: [{ id: 1 }, aContacto(ana)] }))?.lista).toHaveLength(1);
  });
});

describe("contactos: invitaciones (US2-2, US2-6)", () => {
  it("abrir Invitar otra vez muestra la misma invitación; «Generar otro link» crea una nueva", async () => {
    const { s } = conCuenta();
    const primera = await s.dispatch(crearInvitacion());
    expect(await s.dispatch(crearInvitacion())).toEqual(primera);
    const otra = await s.dispatch(crearInvitacion(true));
    expect(otra.token).not.toBe(primera.token);
    expect(await s.dispatch(crearInvitacion())).toEqual(otra);
  });

  it("una invitación vencida no se reusa", async () => {
    const repo = repositorioContactosMemoria();
    const s = storeDePrueba(null, memoria(), { contactosRemoto: repo, reloj: () => new Date("2026-11-17T15:00:00.000Z") });
    s.dispatch(usuarioCambio({ id: "u1", email: "yo@mail.com" }));
    const primera = await s.dispatch(crearInvitacion());
    // La de memoria vence el 16/11: a las 15 del 17/11 ya venció.
    expect((await s.dispatch(crearInvitacion())).token).not.toBe(primera.token);
  });

  it("la invitación no se guarda en el teléfono y otra cuenta no la ve", async () => {
    const disco = memoria();
    const { s } = conCuenta(undefined, disco);
    await s.dispatch(iniciarContactos());
    const inv = await s.dispatch(crearInvitacion());
    await esperar();
    expect([...disco.datos.values()].some((v) => v.includes(inv.token))).toBe(false);
    s.dispatch(usuarioCambio({ id: "u2", email: "otra@mail.com" }));
    expect(s.getState().contactos.invitacion).toBeNull();
  });

  it("ver una invitación arma lo que dice la pantalla de aceptación", async () => {
    const repo = repositorioContactosMemoria({
      invitaciones: { tok: { estado: "valida", quienInvita: "Tomás", venceEn: "2026-11-16T00:00:00Z" } },
    });
    const { s } = conCuenta(repo);
    const v = await s.dispatch(verInvitacion("tok"));
    expect(v).toMatchObject({ estado: "valida", quienInvita: "Tomás" });
    expect(v.sePuedeDeducir).toMatch(/repite consultas/);
    expect((await s.dispatch(verInvitacion("otro"))).estado).toBe("inexistente");
  });
});

