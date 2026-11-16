/**
 * Entrada de la Edge Function `extraer-ticket` en Deno (composition root,
 * ADR-009). Sin lógica: arma las piezas y las conecta. No la chequea `tsc` en
 * Node (usa el global `Deno`): la chequea `deno check` en el CI. Todo lo que se
 * testea vive en `handler.ts`, `servicio.ts` y los módulos que usan.
 *
 * Deploy: `supabase functions deploy extraer-ticket --use-api` (importa el motor
 * desde `packages/motor`, ver `deno.json`). Necesita el secret `GROQ_API_KEY`
 * (issue #85, ADR-012).
 */
import { createClient } from "@supabase/supabase-js";
import { AutenticadorSupabase } from "../_shared/autenticar.ts";
import { ExtractorGroq } from "./extractor-groq.ts";
import { crearHandlerExtraerTicket } from "./handler.ts";
import { ServicioLecturaTicket } from "./servicio.ts";

// Supabase inyecta las dos primeras; la key de Groq es un secret. Si falta algo,
// que falle al arrancar y no en cada pedido.
const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const groqKey = Deno.env.get("GROQ_API_KEY");
if (url === undefined || anonKey === undefined) throw new Error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY");
if (groqKey === undefined) throw new Error("Falta el secret GROQ_API_KEY");
const key: string = groqKey;

// Solo para Supabase Auth: valida el token del pedido (la anon key sola no alcanza). Nunca la service role key.
const autenticador = new AutenticadorSupabase(createClient(url, anonKey));

// Un extractor por pedido: guarda el uso del último pedido y no se comparte entre pedidos.
function crearServicio(): ServicioLecturaTicket {
  const extractor = new ExtractorGroq({
    key,
    // La prueba con fotos reales pasó en modo estricto (spec 013, T009).
    modo: "estricto",
    fetch,
    limiteMs: 20_000,
    esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
    ahora: () => Date.now(),
  });
  return new ServicioLecturaTicket(extractor, () => new Date());
}

Deno.serve(crearHandlerExtraerTicket({ autenticador, crearServicio, ahora: () => Date.now(), limiteMs: 24_000 }));
