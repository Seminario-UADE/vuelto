/**
 * Las consultas de `contracts/postgrest.md` contra un Supabase LOCAL (Docker), con la sesión de un
 * usuario de prueba. Se salta sola si faltan las variables o si la URL no es localhost: con una URL
 * remota no hace ningún pedido. La clave de servicio (la de DEMO de `supabase status`, nunca una real)
 * solo siembra y limpia las promos de prueba, en lugar de la ingesta: el seed del repo no las trae y
 * la app no puede escribir en `promociones` (el propio test lo verifica con 42501). Excepción
 * acotada a esta prueba local (constitución §IV).
 *
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_LOCAL_SERVICE_ROLE_KEY=… npm run test:integracion -w @vuelto/mobile
 *   (los valores salen de `supabase status -o env`)
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Cursor, FilaCompra, FilaPromocion } from "./contratos";
import { leerTodo } from "./paginar";
import { repositorioSupabase } from "./repositorio-supabase";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICIO = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const hayEntorno = Boolean(URL && ANON && SERVICIO);
const esLocal = hayEntorno && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL!);

const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
const corrida = randomUUID().slice(0, 8);
const base = {
  fuente: "manual",
  banco_id: GALICIA,
  categoria_id: 1,
  porcentaje: 20,
  debito_redes: [],
  credito_redes: ["visa"],
  vigencia_desde: "2026-10-01",
};
const promo = (titulo: string, resto: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  ...base,
  titulo: `${corrida} ${titulo}`,
  vigencia_hasta: "2026-12-31",
  jurisdiccion: "nacional",
  ...resto,
});

describe.skipIf(!esLocal)("repositorioSupabase contra un Supabase local", () => {

  const admin = esLocal ? createClient(URL!, SERVICIO!, { auth: { persistSession: false } }) : null!;
  const usuario = esLocal ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null!;
  const otro = esLocal ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null!;
  /** Sin sesión: solo la clave pública (issue #112). */
  const anonimo = esLocal ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null!;
  const sembradas = {
    nula: promo("jurisdiccion nula", { jurisdiccion: null }),
    nacional: promo("nacional"),
    otra: promo("otra provincia", { jurisdiccion: "otra_provincia" }),
    vieja: promo("vencida", { vigencia_hasta: "2026-10-01" }),
    baja: promo("dada de baja", { dada_de_baja_en: "2026-11-02T15:00:00+00:00" }),
  };
  const ids: string[] = Object.values(sembradas).map((p) => p.id);
  let uid = "";

  beforeAll(async () => {
    
    // Siembra de a una, con una pausa mínima, para que `actualizada_en` (la fija el trigger) sea creciente.
    for (const p of Object.values(sembradas)) {
      const { error } = await admin.from("promociones").insert(p);
      if (error) throw error;
    }
    const email = `sync-${corrida}@test.local`;
    const password = `clave-${corrida}`;
    const reg = await usuario.auth.signUp({ email, password });
    if (reg.error) throw reg.error;
    uid = reg.data.user!.id;
    const reg2 = await otro.auth.signUp({ email: `otro-${corrida}@test.local`, password });
    if (reg2.error) throw reg2.error;
  });

  afterAll(async () => {
    
    await admin.from("compras").delete().eq("user_id", uid);
    await admin.from("promociones").delete().in("id", ids);
  });

  const propias = (filas: FilaPromocion[]) => filas.filter((f) => ids.includes(f.id));

  async function leerPromos(f: { desde: string | null; vigenteDesde: string | null }, tamano = 2, cliente = usuario) {
    const repo = repositorioSupabase(cliente);
    return leerTodo<FilaPromocion>(
      (cursor: Cursor) =>
        repo.promociones({ ...f, cursor, limite: tamano, signal: new AbortController().signal }),
      (fila) => ({ valor: fila.actualizada_en, id: fila.id }),
      tamano,
    );
  }

  it("la primera sincronización trae las vigentes, con jurisdicción nula y baja, y deja afuera otra_provincia y las vencidas", async () => {
    const filas = propias(await leerPromos({ desde: null, vigenteDesde: "2026-11-01" }));
    const titulos = filas.map((f) => f.titulo.replace(`${corrida} `, "")).sort();
    expect(titulos).toEqual(["dada de baja", "jurisdiccion nula", "nacional"]);
  });

  it("el cursor con páginas de 2 devuelve todas, en orden, sin repetir (el + del offset llega bien)", async () => {
    const filas = await leerPromos({ desde: null, vigenteDesde: "2026-11-01" }, 2);
    const todas = filas.map((f) => f.id);
    expect(new Set(todas).size).toBe(todas.length);
    const marcas = propias(filas).map((f) => f.actualizada_en);
    expect(marcas).toEqual([...marcas].sort((a, b) => Date.parse(a) - Date.parse(b)));
    expect(marcas.every((m) => /[+-]\d\d:\d\d$/.test(m))).toBe(true);
  });

  it("la incremental pide lo posterior a un piso y no filtra por vigencia: la vencida llega", async () => {
    const todas = propias(await leerPromos({ desde: "2000-01-01T00:00:00.000Z", vigenteDesde: null }));
    const titulos = todas.map((f) => f.titulo.replace(`${corrida} `, ""));
    expect(titulos).toContain("vencida");
    expect(titulos).not.toContain("otra provincia");
    // Un piso posterior a todas no trae nada.
    expect(propias(await leerPromos({ desde: "2999-01-01T00:00:00.000Z", vigenteDesde: null }))).toEqual([]);
  });

  it("los ids del período coinciden con los de la primera sincronización", async () => {
    const repo = repositorioSupabase(usuario);
    const delPeriodo = (await repo.idsDePromociones("2026-11-01", new AbortController().signal)).filter((i) => ids.includes(i));
    expect(delPeriodo.sort()).toEqual(
      propias(await leerPromos({ desde: null, vigenteDesde: "2026-11-01" })).map((f) => f.id).sort(),
    );
  });

  it("la app no puede escribir en promociones (42501)", async () => {
    const { error } = await usuario.from("promociones").insert(promo("x"));
    expect(error?.code).toBe("42501");
  });

  it("compras: solo las del dueño, desde la fecha, por cursor", async () => {
    const { data: medio, error: e1 } = await usuario
      .from("medios_de_pago")
      .insert({ banco_id: GALICIA, tipo: "credito", red: "visa" })
      .select("id")
      .single();
    if (e1) throw e1;
    const compra = (comercio: string, fecha: string) => ({ fecha, monto: 1000, comercio, medio_de_pago_id: medio!.id, origen: "manual" });
    const { error: e2 } = await usuario.from("compras").insert([
      compra("A", "2026-10-01"),
      compra("B", "2026-11-02"),
      compra("C", "2026-11-02"),
      compra("D", "2026-11-03"),
    ]);
    if (e2) throw e2;

    const repo = repositorioSupabase(usuario);
    const leer = (cliente: ReturnType<typeof repositorioSupabase>) =>
      leerTodo<FilaCompra>(
        (cursor: Cursor) => cliente.compras({ desde: "2026-11-01", cursor, limite: 2, signal: new AbortController().signal }),
        (f) => ({ valor: f.creada_en, id: f.id }),
        2,
      );
    const mias = await leer(repo);
    // Las 4 se insertaron en una sola sentencia: comparten `creada_en` (now()). El cursor desempata por id:
    // llegan las 3 de noviembre, una vez cada una, aunque el orden dentro del empate lo decida el id.
    expect(mias.map((c) => c.comercio).sort()).toEqual(["B", "C", "D"]);
    expect(new Set(mias.map((c) => c.id)).size).toBe(3);
    // RLS: otro usuario no ve ninguna.
    expect(await leer(repositorioSupabase(otro))).toEqual([]);
  });

  it("usuarioId sale de la sesión guardada", async () => {
    expect(await repositorioSupabase(usuario).usuarioId()).toBe(uid);
    expect(await repositorioSupabase(anonimo).usuarioId()).toBeNull();
  });

  const idsPropios = (filas: FilaPromocion[]) => propias(filas).map((f) => f.id).sort();

  it.each([
    ["la primera", { desde: null, vigenteDesde: "2026-11-01" }],
    ["la incremental", { desde: "2000-01-01T00:00:00.000Z", vigenteDesde: null }],
  ])("sin sesión, %s lectura trae las mismas promos que con cuenta (issue #112)", async (_n, f) => {
    expect(idsPropios(await leerPromos(f, 2, anonimo))).toEqual(idsPropios(await leerPromos(f)));
  });

  it("sin sesión, los ids del período son los mismos que con cuenta", async () => {
    const signal = new AbortController().signal;
    const deAnonimo = (await repositorioSupabase(anonimo).idsDePromociones("2026-11-01", signal)).filter((i) => ids.includes(i));
    const delUsuario = (await repositorioSupabase(usuario).idsDePromociones("2026-11-01", signal)).filter((i) => ids.includes(i));
    expect(deAnonimo.sort()).toEqual(delUsuario.sort());
  });

  it("sin sesión no se leen compras", async () => {
    const pedido = repositorioSupabase(anonimo).compras({ desde: "2026-11-01", cursor: null, limite: 2, signal: new AbortController().signal });
    await expect(pedido).rejects.toMatchObject({ code: "42501" });
  });

  it("sin sesión no se escribe en promociones (42501)", async () => {
    const { error } = await anonimo.from("promociones").insert(promo("y"));
    expect(error?.code).toBe("42501");
  });
});
