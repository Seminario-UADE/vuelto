/**
 * Cliente de Supabase de la app. Lee SOLO las variables públicas `EXPO_PUBLIC_*`, que
 * terminan en el bundle: la URL del proyecto y la anon key (protegida por RLS).
 * Nunca la service role key ni la API key de Gemini (RNF-04, RNF-05).
 *
 * Auth sigue la guía de Supabase para Expo: la sesión se guarda en AsyncStorage y el
 * refresco del token corre solo con la app en primer plano. Las consultas a la base todavía
 * no pasan por acá: las pantallas leen de `src/data/api.ts`, que hoy devuelve datos de
 * ejemplo. Si las variables faltan, `supabase` es `null` (sin cuentas, la app no deja entrar).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// En segundo plano el timer de refresco no corre; al volver se retoma (y se refresca si venció).
if (supabase) {
  AppState.addEventListener("change", (estado) => {
    if (estado === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
