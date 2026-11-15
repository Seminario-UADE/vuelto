/**
 * El repositorio de contactos de la app, sobre el cliente de Supabase. `null` sin variables de
 * Supabase: sin cuenta no hay contactos (spec 006 FR-028).
 */
import { supabase } from "../lib/supabase";
import { repositorioContactosSupabase, type RepositorioContactos } from "./repositorio";

export const contactosRemoto: RepositorioContactos | null = supabase ? repositorioContactosSupabase(supabase) : null;

/** Para las pantallas que llaman sin pasar por el store (crear y ver una invitación). */
export function exigirContactosRemoto(): RepositorioContactos {
  if (!contactosRemoto) throw new Error("Necesitás conexión con tu cuenta para esto.");
  return contactosRemoto;
}
