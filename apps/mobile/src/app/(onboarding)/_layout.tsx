import { Redirect, Stack, useSegments } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useTema } from "@/components/tema-provider";
import { headerNativo } from "@/navigation/opciones";

export const unstable_settings = { anchor: "bienvenida" };

/** Las pantallas que se ven sin cuenta (FR-031): la cuenta se pide al final, en «Guardá tu perfil». */
const PUBLICAS = new Set(["bienvenida", "medios", "primera-respuesta"]);

export default function OnboardingLayout() {
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const perfil = useAppSelector((s) => s.perfil);
  const segmentos: string[] = useSegments();
  const pantalla = segmentos[1];
  // Sin cuenta se puede probar todo el onboarding (spec 012, US5): lo elegido va al borrador.
  if (!usuario) return PUBLICAS.has(pantalla ?? "") ? <Onboarding /> : <Redirect href="/bienvenida" />;
  if (perfil.onboardingCompleto && perfil.medios.length > 0) return <Redirect href="/" />;
  return <Onboarding />;
}

function Onboarding() {
  const t = useTema();
  return (
    <Stack screenOptions={{ ...headerNativo(t), title: "" }}>
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="medios" />
      <Stack.Screen name="primera-respuesta" />
    </Stack>
  );
}
