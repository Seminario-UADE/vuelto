import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/hanken-grotesk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toast } from "@/components/toast";
import { cargarPerfilLocal, usePerfilLocal } from "@/data/perfil-local";
import { headerNativo } from "@/navigation/opciones";
import { colors } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: "(tabs)" };

const sheet = {
  presentation: "formSheet" as const,
  headerShown: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: colors.canvas },
};

export default function RootLayout() {
  const [fuentes] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const { perfil, cargado } = usePerfilLocal();

  useEffect(() => {
    void cargarPerfilLocal();
  }, []);

  const listo = fuentes && cargado;
  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  const completo = perfil.onboardingCompleto;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Protected guard={!completo}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={completo}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="comercio/[id]" options={{ ...headerNativo, title: "" }} />
            <Stack.Screen name="mis-compras" options={{ ...headerNativo, title: "Mis compras" }} />
            <Stack.Screen name="contactos/index" options={{ ...headerNativo, title: "Contactos" }} />
            <Stack.Screen name="contactos/invitar" options={{ ...headerNativo, title: "Invitar a alguien" }} />
            <Stack.Screen name="grupo/armar" options={{ ...headerNativo, title: "Pagan entre varios" }} />
            <Stack.Screen name="grupo/resultado" options={{ ...headerNativo, title: "Quién conviene que pague" }} />
            <Stack.Screen
              name="escanear"
              options={{ presentation: "fullScreenModal", headerShown: false, contentStyle: { backgroundColor: colors.scrim } }}
            />
            <Stack.Screen name="revisa" options={{ ...sheet, sheetAllowedDetents: [1] }} />
            <Stack.Screen name="contactos/quitar" options={{ ...sheet, sheetAllowedDetents: "fitToContents" }} />
          </Stack.Protected>
          <Stack.Screen name="(auth)/login" options={{ ...sheet, sheetAllowedDetents: [0.86] }} />
          <Stack.Screen name="i/[token]" options={{ presentation: "modal", headerShown: false }} />
        </Stack>
        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
