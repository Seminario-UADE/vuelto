/**
 * Perfil guardado en el dispositivo: si el onboarding terminó, qué medios y comercios
 * declaró el usuario y si guardó el perfil con una cuenta. Nada sensible.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export type PerfilLocal = {
  onboardingCompleto: boolean;
  medios: string[];
  comercios: string[];
  cuenta: { email: string | null; proveedor: "email" | "apple" } | null;
  /** Invitación abierta antes de terminar el onboarding (ADR-008 §1). */
  invitacionPendiente: string | null;
};

const CLAVE = "vuelto.perfil.v1";

const vacio: PerfilLocal = {
  onboardingCompleto: false,
  medios: [],
  comercios: [],
  cuenta: null,
  invitacionPendiente: null,
};

let actual: PerfilLocal = vacio;
let cargado = false;
const oyentes = new Set<() => void>();

function emitir() {
  oyentes.forEach((o) => o());
}

export async function cargarPerfilLocal(): Promise<PerfilLocal> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    actual = raw ? { ...vacio, ...(JSON.parse(raw) as Partial<PerfilLocal>) } : vacio;
  } catch {
    actual = vacio;
  }
  cargado = true;
  emitir();
  return actual;
}

export async function guardarPerfilLocal(cambio: Partial<PerfilLocal>): Promise<void> {
  actual = { ...actual, ...cambio };
  emitir();
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(actual));
  } catch {
    // Sin almacenamiento la app sigue funcionando; solo repite el onboarding al reabrir.
  }
}

export async function borrarPerfilLocal(): Promise<void> {
  actual = vacio;
  emitir();
  await AsyncStorage.removeItem(CLAVE).catch(() => undefined);
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

export function usePerfilLocal(): { perfil: PerfilLocal; cargado: boolean } {
  const perfil = useSyncExternalStore(suscribir, () => actual, () => actual);
  const listo = useSyncExternalStore(suscribir, () => cargado, () => cargado);
  return { perfil, cargado: listo };
}
