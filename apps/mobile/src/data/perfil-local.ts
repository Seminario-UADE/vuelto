/**
 * Perfil guardado en el dispositivo: si el onboarding terminó y qué medios y comercios
 * declaró el usuario. Nada sensible. Quién es el usuario vive en `sesion.ts`.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { setPreferencias } from "./api";

export type PerfilLocal = {
  onboardingCompleto: boolean;
  medios: string[];
  comercios: string[];
  /** Invitación abierta antes de terminar el onboarding (ADR-008 §1). */
  invitacionPendiente: string | null;
};

const CLAVE = "vuelto.perfil.v1";

const vacio: PerfilLocal = {
  onboardingCompleto: false,
  medios: [],
  comercios: [],
  invitacionPendiente: null,
};

let actual: PerfilLocal = vacio;
let cargado = false;
const oyentes = new Set<() => void>();

function emitir() {
  setPreferencias({ medios: actual.medios, comercios: actual.comercios });
  oyentes.forEach((o) => o());
}

export async function cargarPerfilLocal(): Promise<PerfilLocal> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    // Un `cuenta` guardado por el esquema anterior al login se ignora: el usuario vive en `sesion.ts`.
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
