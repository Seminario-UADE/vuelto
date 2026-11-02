import { Redirect, Stack } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { headerNativo } from "@/navigation/opciones";

export const unstable_settings = { anchor: "bienvenida" };

export default function OnboardingLayout() {
  const onboardingCompleto = useAppSelector((s) => s.perfil.onboardingCompleto);
  if (onboardingCompleto) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ ...headerNativo, title: "" }}>
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="medios" />
      <Stack.Screen name="comercios" />
      <Stack.Screen name="primera-respuesta" />
    </Stack>
  );
}
