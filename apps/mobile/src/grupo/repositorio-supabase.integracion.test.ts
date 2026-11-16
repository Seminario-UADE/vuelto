/**
 * El repositorio de contactos (spec 013 US2) contra un Supabase LOCAL (Docker), con dos usuarios de
 * prueba que se registran en la corrida. Se salta sola si faltan las variables o si la URL no es
 * localhost: con una URL remota no hace ningún pedido. La clave de servicio (la de DEMO de
 * `supabase status`, nunca una real) solo borra los usuarios de prueba al final.
 *
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_LOCAL_SERVICE_ROLE_KEY=… npm run test:integracion -w @vuelto/mobile
 *   (los valores salen de `supabase status -o env`)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { repositorioContactosSupabase, SinNombreError } from "./repositorio";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICIO = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const hayEntorno = Boolean(URL && ANON && SERVICIO);
const esLocal = hayEntorno && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL!);
const corrida = randomUUID().slice(0, 8);

describe.skipIf(!esLocal)("repositorio de contactos contra un Supabase local (spec 013 US2)", () => {
  const nuevo = () => createClient(URL!, ANON!, { auth: { persistSession: false } });
  const admin = esLocal ? createClient(URL!, SERVICIO!, { auth: { persistSession: false } }) : null!;
  const ana = esLocal ? nuevo() : null!;
  const beto = esLocal ? nuevo() : null!;
  const sinNombre = esLocal ? nuevo() : null!;
  const ids: string[] = [];

  async function registrar(cliente: SupabaseClient, alias: string, nombre: string | null): Promise<string> {
    const { data, error } = await cliente.auth.signUp({ email: `${alias}-${corrida}@test.local`, password: `clave-${corrida}` });
    if (error) throw error;
    const id = data.user!.id;
    ids.push(id);
    const perfil = await cliente.from("perfiles").insert({ id, nombre_para_mostrar: nombre });
    if (perfil.error) throw perfil.error;
    return id;
  }

  let idAna = "";
  let idBeto = "";

  beforeAll(async () => {
    idAna = await registrar(ana, "ana", `Ana ${corrida}`);
    idBeto = await registrar(beto, "beto", `Beto ${corrida}`);
    await registrar(sinNombre, "sin-nombre", null);
  });

  afterAll(async () => {
    // Borrar la cuenta borra en cascada perfiles, invitaciones y vínculos.
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  });

  it("crear → ver → aceptar → listar → quitar entre dos cuentas", async () => {
    const repoAna = repositorioContactosSupabase(ana);
    const repoBeto = repositorioContactosSupabase(beto);

    const inv = await repoAna.crearInvitacion();
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(Date.parse(inv.venceEn)).toBeGreaterThan(Date.now());

    expect(await repoAna.verInvitacion(inv.token)).toMatchObject({ estado: "propia" });
    expect(await repoBeto.verInvitacion(inv.token)).toMatchObject({ estado: "valida", quienInvita: `Ana ${corrida}` });

    expect(await repoBeto.aceptarInvitacion(inv.token)).toEqual({
      estado: "aceptada",
      contacto: { id: idAna, nombre: `Ana ${corrida}` },
    });
    expect(await repoBeto.aceptarInvitacion(inv.token)).toEqual({ estado: "usada", contacto: null });

    expect((await repoAna.listar()).map((c) => [c.id, c.nombre])).toEqual([[idBeto, `Beto ${corrida}`]]);
    expect((await repoBeto.listar()).map((c) => c.id)).toEqual([idAna]);

    await repoBeto.quitar(idAna);
    expect(await repoAna.listar()).toEqual([]);
    await expect(repoBeto.quitar(idAna)).resolves.toBeUndefined();
  });

  it("los datos de un contacto no se pueden leer desde la app sin la clave de servidor (SC-005)", async () => {
    const repoAna = repositorioContactosSupabase(ana);
    const inv = await repoAna.crearInvitacion();
    await repositorioContactosSupabase(beto).aceptarInvitacion(inv.token);

    const { data, error } = await beto.rpc("datos_de_contactos", {
      p_contactos: [idAna],
      p_clave: null,
      p_desde: "2026-11-01",
      p_hasta: "2026-11-30",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("un token que no existe es inexistente, y sin nombre no se puede invitar", async () => {
    expect(await repositorioContactosSupabase(beto).verInvitacion("noExisteNoExisteNoExiste")).toEqual({
      estado: "inexistente",
      quienInvita: null,
      venceEn: null,
    });
    await expect(repositorioContactosSupabase(sinNombre).crearInvitacion()).rejects.toBeInstanceOf(SinNombreError);
  });

  it("sin sesión no se llega a ninguna función de contactos", async () => {
    const anonimo = nuevo();
    const { error } = await anonimo.rpc("mis_contactos");
    expect(error).not.toBeNull();
  });
});
