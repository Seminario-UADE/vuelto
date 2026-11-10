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
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { TemaProvider, useTema } from "@/components/tema-provider";
import { Toast } from "@/components/toast";
import { iniciarAuth } from "@/data/auth";
import { useApariencia } from "@/hooks/use-apariencia";
import { usePerfilRemoto } from "@/hooks/use-perfil-remoto";
import { useReloj } from "@/hooks/use-reloj";
import { useSincronizacion } from "@/hooks/use-sincronizacion";
import { useSubidaDeCompras } from "@/hooks/use-subida-de-compras";
import { supabase } from "@/lib/supabase";
import { headerNativo } from "@/navigation/opciones";
import { crearDatosPerfil } from "@/perfil/datos";
import { crearStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rehidratar } from "@/store/persistencia";
import { iniciarPorConfirmar } from "@/store/por-confirmar";
import { iniciarCompras } from "@/store/thunks";
import { repositorioSupabase } from "@/sync/repositorio-supabase";

void SplashScreen.preventAutoHideAsync();

/**
 * Un solo store para toda la app (ADR-010). Lo guardado se lee una vez, al abrir. Sin variables de
 * Supabase no hay repositorio y la app no sincroniza (spec 009 FR-003) ni lee el perfil (#41).
 */
const store = crearStore({
  almacenamiento: AsyncStorage,
  estadoInicial: null,
  generarId: randomUUID,
  repositorio: supabase ? repositorioSupabase(supabase) : null,
  perfilRemoto: supabase ? crearDatosPerfil(supabase) : null,
  reloj: () => new Date(),
});
// Las compras por confirmar se leen después de las compras: la purga saca las ya confirmadas (spec 012).
void store
  .dispatch(rehidratar())
  .then(() => store.dispatch(iniciarCompras()))
  .then(() => store.dispatch(iniciarPorConfirmar()));

export const unstable_settings = { anchor: "(tabs)" };

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
  const aparienciaLista = useApariencia();
  useReloj();
  usePerfilRemoto();
  useSincronizacion();
  useSubidaDeCompras();

  // Lee la sesión guardada de Supabase y sigue sus cambios (issue #40).
  useEffect(() => dispatch(iniciarAuth()), [dispatch]);

  const listo = fuentes && hidratado && authLista && aparienciaLista;
  useEffect(() => {
    if (listo) void SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <Navegacion />
      </TemaProvider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const t = useTema();
  const header = headerNativo(t);
  const pageSheet = {
    presentation: "modal" as const,
    headerShown: false,
    contentStyle: { backgroundColor: t.canvas },
  };
  const sheet = {
    presentation: "formSheet" as const,
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: t.canvas },
  };
  return (
    <>
      <View style={{ flex: 1, backgroundColor: t.canvas }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.canvas },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
          {/* Flujo de compra del «+» (DESIGN.md v7 §5): pantalla completa, un paso por pantalla. */}
          <Stack.Screen name="comprar" options={{ presentation: "fullScreenModal", headerShown: false, contentStyle: { backgroundColor: t.canvas } }} />
          <Stack.Screen
            name="compra-guardada"
            options={{ presentation: "fullScreenModal", headerShown: false, contentStyle: { backgroundColor: t.canvas } }}
          />
          <Stack.Screen
            name="topes"
            options={{ ...header, title: "Tus topes" }}
          />
          <Stack.Screen
            name="tope/[clave]"
            options={{ ...header, title: "Compras del tope" }}
          />
          <Stack.Screen
            name="contactos/index"
            options={{ ...header, title: "Contactos" }}
          />
          <Stack.Screen
            name="contactos/invitar"
            options={{ ...header, title: "Invitar a alguien" }}
          />
          <Stack.Screen
            name="grupo/armar"
            options={{ ...header, title: "Pagan entre varios" }}
          />
          <Stack.Screen
            name="grupo/resultado"
            options={{ ...header, title: "Quién conviene que pague" }}
          />
          <Stack.Screen
            name="escanear"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
              contentStyle: { backgroundColor: t.scrim },
            }}
          />
          {/* Revisá tu compra y Guardar perfil tienen scroll: page sheet nativo (modal). El formSheet
                con detents no pinta un ScrollView en iOS 27 (verificado en el simulador). */}
          <Stack.Screen name="revisa" options={pageSheet} />
          <Stack.Screen
            name="contactos/quitar"
            options={{ ...sheet, sheetAllowedDetents: "fitToContents" }}
          />
          <Stack.Screen
            name="cerrar-sesion"
            options={{ ...sheet, sheetAllowedDetents: "fitToContents" }}
          />
          <Stack.Screen
            name="borrar-compra"
            options={{ ...sheet, sheetAllowedDetents: "fitToContents" }}
          />
          <Stack.Screen
            name="descartar-por-confirmar"
            options={{ ...sheet, sheetAllowedDetents: "fitToContents" }}
          />
          <Stack.Screen name="(auth)/login" options={pageSheet} />
          <Stack.Screen name="(auth)/registro" options={pageSheet} />
          <Stack.Screen
            name="i/[token]"
            options={{ ...header, title: "Invitación" }}
          />
        </Stack>
        <Toast />
      </View>
    </>
  );
}
