/**
 * Cliente de Supabase de la app. Lee SOLO las variables públicas `EXPO_PUBLIC_*`, que
 * terminan en el bundle: la URL del proyecto y la anon key (protegida por RLS).
 * Nunca la service role key ni la API key de Gemini (RNF-04, RNF-05).
 *
 * Todavía no hace consultas: las pantallas leen de `src/data/api.ts`, que hoy devuelve
 * datos de ejemplo. Si las variables faltan, `supabase` es `null` y la app abre igual.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
