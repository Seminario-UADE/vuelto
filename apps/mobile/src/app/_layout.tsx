import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/hanken-grotesk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { Toast } from "@/components/toast";
import { iniciarAuth } from "@/data/auth";
import { useReloj } from "@/hooks/use-reloj";
import { useSincronizacion } from "@/hooks/use-sincronizacion";
import { useSubidaDeCompras } from "@/hooks/use-subida-de-compras";
import { supabase } from "@/lib/supabase";
import { headerNativo } from "@/navigation/opciones";
import { crearStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rehidratar } from "@/store/persistencia";
import { iniciarCompras } from "@/store/thunks";
import { repositorioSupabase } from "@/sync/repositorio-supabase";
import { colors } from "@/theme";

void SplashScreen.preventAutoHideAsync();

/**
 * Un solo store para toda la app (ADR-010). Lo guardado se lee una vez, al abrir. Sin variables de
 * Supabase no hay repositorio y la app no sincroniza (spec 009 FR-003).
 */
const store = crearStore({
  almacenamiento: AsyncStorage,
  estadoInicial: null,
  generarId: randomUUID,
  repositorio: supabase ? repositorioSupabase(supabase) : null,
  reloj: () => new Date(),
});
void store.dispatch(rehidratar()).then(() => store.dispatch(iniciarCompras()));

export const unstable_settings = { anchor: "(tabs)" };

const pageSheet = {
  presentation: "modal" as const,
  headerShown: false,
  contentStyle: { backgroundColor: colors.canvas },
};

const sheet = {
  presentation: "formSheet" as const,
  headerShown: false,
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: colors.canvas },
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Raiz />
    </Provider>
  );
}

function Raiz() {
  const [fuentes] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const dispatch = useAppDispatch();
  const hidratado = useAppSelector((s) => s.sesion.hidratado);
  const authLista = useAppSelector((s) => s.sesion.authLista);
  useReloj();
  useSincronizacion();
  useSubidaDeCompras();

  // Lee la sesión guardada de Supabase y sigue sus cambios (issue #40).
  useEffect(() => dispatch(iniciarAuth()), [dispatch]);

  const listo = fuentes && hidratado && authLista;
  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="comercio/[id]" options={{ ...headerNativo, title: "" }} />
          <Stack.Screen name="mis-compras" options={{ ...headerNativo, title: "Mis compras" }} />
          <Stack.Screen name="tope/[clave]" options={{ ...headerNativo, title: "Compras del tope" }} />
          <Stack.Screen name="contactos/index" options={{ ...headerNativo, title: "Contactos" }} />
          <Stack.Screen name="contactos/invitar" options={{ ...headerNativo, title: "Invitar a alguien" }} />
          <Stack.Screen name="grupo/armar" options={{ ...headerNativo, title: "Pagan entre varios" }} />
          <Stack.Screen name="grupo/resultado" options={{ ...headerNativo, title: "Quién conviene que pague" }} />
          <Stack.Screen
            name="escanear"
            options={{ presentation: "fullScreenModal", headerShown: false, contentStyle: { backgroundColor: colors.scrim } }}
          />
          {/* Revisá tu compra y Guardar perfil tienen scroll: page sheet nativo (modal). El formSheet
              con detents no pinta un ScrollView en iOS 27 (verificado en el simulador). */}
          <Stack.Screen name="revisa" options={pageSheet} />
          <Stack.Screen name="contactos/quitar" options={{ ...sheet, sheetAllowedDetents: "fitToContents" }} />
          <Stack.Screen name="cerrar-sesion" options={{ ...sheet, sheetAllowedDetents: "fitToContents" }} />
          <Stack.Screen name="borrar-compra" options={{ ...sheet, sheetAllowedDetents: "fitToContents" }} />
          <Stack.Screen name="(auth)/login" options={pageSheet} />
          <Stack.Screen name="(auth)/registro" options={pageSheet} />
          <Stack.Screen name="i/[token]" options={{ ...headerNativo, title: "Invitación" }} />
        </Stack>
        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
