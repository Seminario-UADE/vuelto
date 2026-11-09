import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { RUTA_COMPRAR, TabBar } from "@/components/tab-bar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { leerMedios } from "@/store/perfil-remoto";
import { useTema } from "@/components/tema-provider";
import { colors } from "@/theme";

/**
 * Inicio · Topes · ( + ) · Comercios · Perfil (DESIGN.md v7 §5, spec 012 FR-018). La barra es
 * propia (`TabBar`): la nativa no admite un botón central destacado. El «+» no es una pestaña:
 * su ruta ficticia abre el flujo de compra.
 */
export default function TabsLayout() {
  const t = useTema();
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const perfil = useAppSelector((s) => s.perfil);
  const dispatch = useAppDispatch();
  // Toda la app está detrás de la sesión: sin usuario, a Bienvenida (crear cuenta o entrar).
  if (!usuario) return <Redirect href="/bienvenida" />;
  const sinMedios = !perfil.onboardingCompleto || perfil.medios.length === 0;
  // Entra en un celular sin nada guardado: hasta saber si ya tiene medios en Supabase no se decide
  // (si los tiene, no repite el onboarding).
  if (sinMedios && (perfil.carga === "sin-leer" || perfil.carga === "leyendo")) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }
  // No se pudo leer y no hay nada guardado: no se sabe si tiene medios en Supabase, así que no se lo
  // manda a repetir el onboarding (FR-010: ni carga infinita ni redirección a ciegas).
  if (sinMedios && (perfil.carga === "sin-conexion" || perfil.carga === "error")) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: "center" }}>
        <EmptyState
          title="No pudimos cargar tu perfil"
          body="Necesitamos conexión para leer tus medios de pago."
          action={{ label: "Reintentar", onPress: () => void dispatch(leerMedios()) }}
        />
      </View>
    );
  }
  // Sin medios en el perfil: al onboarding, sin salida hasta confirmar (issue #41, T009).
  if (sinMedios) return <Redirect href="/medios" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.canvas } }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="topes" options={{ title: "Topes" }} />
      <Tabs.Screen
        name={RUTA_COMPRAR}
        options={{ title: "Comprar" }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen name="comercios" options={{ title: "Comercios" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
