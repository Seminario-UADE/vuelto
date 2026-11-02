import { Redirect, Stack, useSegments } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { headerNativo } from "@/navigation/opciones";

export const unstable_settings = { anchor: "bienvenida" };

export default function OnboardingLayout() {
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const perfil = useAppSelector((s) => s.perfil);
  const segmentos: string[] = useSegments();
  const pantalla = segmentos[1];
  // Solo Bienvenida es pública; el resto del onboarding es de quien ya tiene cuenta.
  if (!usuario) return pantalla === "bienvenida" ? <Onboarding /> : <Redirect href="/bienvenida" />;
  if (perfil.onboardingCompleto && perfil.medios.length > 0) return <Redirect href="/" />;
  return <Onboarding />;
}

function Onboarding() {
  return (
    <Stack screenOptions={{ ...headerNativo, title: "" }}>
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="medios" />
      <Stack.Screen name="comercios" />
      <Stack.Screen name="primera-respuesta" />
    </Stack>
  );
}
