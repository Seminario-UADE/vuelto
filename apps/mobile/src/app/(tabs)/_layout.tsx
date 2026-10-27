import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/icon";
import { colors, floatingShadow, fonts } from "@/theme";

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <Icon name={icon} activo={focused} color={focused ? colors.ink : colors.inkSecondary} />
  ),
});

/**
 * Inicio · Comprar · Topes · Perfil (DESIGN.md §5). Tabs JS con el estilo de DESIGN.md:
 * fondo Blanco Hueso con sombra flotante, activo en Verde Bosque (research R2).
 */
export default function TabsLayout() {
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
