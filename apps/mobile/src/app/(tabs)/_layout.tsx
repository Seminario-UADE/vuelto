import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { usePerfilLocal } from "@/data/perfil-local";
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
 * fondo Blanco Hueso con sombra flotante, activo en Verde Bosque (research R2).
 */
export default function TabsLayout() {
  const { perfil } = usePerfilLocal();
  // Sin onboarding completo, la app arranca en Bienvenida (FR-002).
  if (!perfil.onboardingCompleto) return <Redirect href="/bienvenida" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSecondary,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 0,
          boxShadow: floatingShadow,
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={tab("Inicio", "inicio")} />
      <Tabs.Screen name="comprar" options={tab("Comprar", "comprar")} />
      <Tabs.Screen name="topes" options={tab("Topes", "topes")} />
      <Tabs.Screen name="perfil" options={tab("Perfil", "perfil")} />
    </Tabs>
  );
}
