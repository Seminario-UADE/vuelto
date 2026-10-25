/**
 * Entrada de la Edge Function `recomendar` en Deno (composition root, ADR-009).
 * Sin lógica: arma las piezas y las conecta. No la chequea `tsc` en Node
 * (usa el global `Deno`); todo lo que se testea vive en `handler.ts` y
 * `servicio.ts`.
 *
 * Deploy: `supabase functions deploy recomendar --use-api` (importa el motor
 * desde `packages/motor`, ver `deno.json` y research R1 de la spec 003).
 */
import { createClient } from "@supabase/supabase-js";
import { AutenticadorSupabase } from "../_shared/autenticar.ts";
import { crearHandlerRecomendar } from "./handler.ts";
import type { ServicioRecomendacion } from "./servicio.ts";

// Supabase las inyecta en toda Edge Function. Si faltan, que falle al arrancar y no en cada pedido.
const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
if (url === undefined || anonKey === undefined) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY");
}

// Solo para Supabase Auth: valida el token del pedido. Nunca la service role key.
const autenticador = new AutenticadorSupabase(createClient(url, anonKey));

function crearServicio(_req: Request): ServicioRecomendacion {
  // TODO(#34): crear el cliente con la sesión del pedido para que aplique el RLS
  // (`createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization")! } } })`)
  // y armar `new ServicioRecomendacion(...)` con los repositorios de
  // `_shared/supabase/`, que dependen de las tablas de la issue #34.
  // Hasta entonces el handler responde 500 "interno".
  throw new Error("Repositorios de Supabase pendientes de la issue #34");
}

Deno.serve(crearHandlerRecomendar({ autenticador, crearServicio, reloj: () => new Date() }));
