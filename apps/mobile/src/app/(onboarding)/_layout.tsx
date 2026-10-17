import { Stack } from "expo-router";
import { headerNativo } from "@/navigation/opciones";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ ...headerNativo, title: "" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="medios" />
      <Stack.Screen name="comercios" />
      <Stack.Screen name="primera-respuesta" />
    </Stack>
  );
}
