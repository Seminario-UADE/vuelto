import { describe, expect, it } from "vitest";
import { linkDeInvitacion, tokenDeInvitacion } from "./token";

const T = "q3Zk_-a9Bc1De2Fg3Hi4Jk5L";

describe("tokenDeInvitacion (spec 013, FR-012)", () => {
  it("acepta el link de la app, el de Expo Go y el token solo", () => {
    expect(tokenDeInvitacion(`vuelto://i/${T}`)).toBe(T);
    expect(tokenDeInvitacion(`exp://192.168.0.5:8081/--/i/${T}`)).toBe(T);
    expect(tokenDeInvitacion(T)).toBe(T);
    expect(tokenDeInvitacion(`   vuelto://i/${T}\n`)).toBe(T);
    expect(tokenDeInvitacion(`vuelto://i/${T}/`)).toBe(T);
  });

  it("rechaza lo que no es una invitación", () => {
    expect(tokenDeInvitacion("")).toBeNull();
    expect(tokenDeInvitacion("hola, te mando la invitación")).toBeNull();
    expect(tokenDeInvitacion(`vuelto://comprar/${T}`)).toBeNull();
    expect(tokenDeInvitacion(`https://vuelto.app/i/${T}`)).toBeNull();
    expect(tokenDeInvitacion(T.slice(1))).toBeNull();
    expect(tokenDeInvitacion(`${T}x`)).toBeNull();
    expect(tokenDeInvitacion(`vuelto://i/${T.slice(0, 23)}$`)).toBeNull();
    expect(tokenDeInvitacion(`vuelto://i/${T}?x=1`)).toBeNull();
  });
});

describe("linkDeInvitacion", () => {
  it("arma el camino i/<token> con la función de Expo", () => {
    expect(linkDeInvitacion(T, (c) => `vuelto://${c}`)).toBe(`vuelto://i/${T}`);
  });
});
