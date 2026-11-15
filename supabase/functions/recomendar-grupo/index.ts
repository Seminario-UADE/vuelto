/**
 * Entrada de la Edge Function `recomendar-grupo` en Deno (composition root, ADR-009). Sin
 * lógica: arma las piezas y las conecta. La chequea `deno check` en el CI; lo que se testea vive
 * en `handler.ts`, `servicio.ts`, `respuesta.ts` y `validacion.ts`.
 *
 * Deploy: `supabase functions deploy recomendar-grupo --use-api`. Necesita el secreto
 * `GRUPO_CLAVE_SERVIDOR`, igual al de Vault (`specs/013-gasto-grupo/quickstart.md`).
 */
import { createClient } from "@supabase/supabase-js";
import { AutenticadorSupabase } from "../_shared/autenticar.ts";
import {
  CategoriasSupabase,
  ComprasSupabase,
  ContactosSupabase,
  MediosDePagoSupabase,
  PromocionesSupabase,
} from "../_shared/supabase/repositorios.ts";
import { crearHandlerRecomendarGrupo } from "./handler.ts";
import { ServicioGrupo } from "./servicio.ts";

// Supabase inyecta las dos primeras; la clave se carga como secreto. Si falta algo, que falle al
// arrancar y no en cada pedido. Nunca la service role key (RNF-05).
const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const clave = Deno.env.get("GRUPO_CLAVE_SERVIDOR");
if (url === undefined || anonKey === undefined || clave === undefined || clave === "") {
  throw new Error("Faltan SUPABASE_URL, SUPABASE_ANON_KEY o GRUPO_CLAVE_SERVIDOR");
}

const autenticador = new AutenticadorSupabase(createClient(url, anonKey));

/** Un cliente por pedido, con la sesión del usuario: el RLS aplica a todo lo propio (ADR-009). */
function crearServicio(req: Request): ServicioGrupo {
  const cliente = createClient(url as string, anonKey as string, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new ServicioGrupo(
    new MediosDePagoSupabase(cliente),
    new PromocionesSupabase(cliente),
    new ComprasSupabase(cliente),
    new CategoriasSupabase(cliente),
    new ContactosSupabase(cliente, clave as string),
  );
}

Deno.serve(crearHandlerRecomendarGrupo({ autenticador, crearServicio, reloj: () => new Date() }));
