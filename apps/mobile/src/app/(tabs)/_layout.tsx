import { Redirect, Tabs } from "expo-router";
import { EmptyState } from "@/components/empty-state";
import { Text, View } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { leerMedios } from "@/store/perfil-remoto";
import { useTema } from "@/components/tema-provider";
import { colors, floatingShadow, fonts } from "@/theme";

const tab = (title: string, icon: IconName) => ({
  title,
  // Como la tab bar del sistema: la etiqueta casi no escala (se cortaría con texto grande).
  tabBarLabel: ({ focused }: { focused: boolean }) => (
    <Text
      maxFontSizeMultiplier={1.15}
      style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: focused ? colors.ink : colors.inkSecondary }}
    >
      {title}
    </Text>
  ),
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <Icon name={icon} activo={focused} color={focused ? colors.ink : colors.inkSecondary} />
  ),
});

/**
 * Inicio · Comprar · Topes · Perfil (DESIGN.md §5). Tabs JS con el estilo de DESIGN.md:
 * fondo `canvas` con sombra flotante, activo en `ink` (research R2). La tab bar nativa va en #103.
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.inkSecondary,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopWidth: 0,
          boxShadow: floatingShadow,
        },
        sceneStyle: { backgroundColor: t.canvas },
      }}
    >
      <Tabs.Screen name="index" options={tab("Inicio", "inicio")} />
      <Tabs.Screen name="comprar" options={tab("Comprar", "comprar")} />
      <Tabs.Screen name="topes" options={tab("Topes", "topes")} />
      <Tabs.Screen name="perfil" options={tab("Perfil", "perfil")} />
    </Tabs>
  );
}
