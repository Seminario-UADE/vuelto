import { useEffect } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setSesion, useSesion } from "@/data/sesion";
import { colors, floatingShadow, radius, space } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * Aviso de confirmación ("Compra guardada · la ves en Mis compras"). Se anuncia al lector
 * de pantalla y se va solo a los 3 s. Una sola capa flotante (DESIGN.md §6).
 */
export function Toast() {
  const aviso = useSesion((s) => s.aviso);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setSesion({ aviso: null }), 3000);
    return () => clearTimeout(t);
  }, [aviso]);
  if (!aviso) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + space.sm, left: space.gutter, right: space.gutter }}>
      <Animated.View
        // En web las animaciones de layout dependen de requestAnimationFrame; el aviso no
        // puede quedar invisible si la pestaña no pinta frames.
        entering={process.env.EXPO_OS === "web" ? undefined : FadeInUp.duration(200)}
        exiting={process.env.EXPO_OS === "web" ? undefined : FadeOutUp.duration(150)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          padding: space.lg,
          borderRadius: radius.row,
          backgroundColor: colors.successBg,
          boxShadow: floatingShadow,
        }}
      >
        <Icon name="checkCirculo" size={22} color={colors.accent} />
        <Text variant="bodyMd" weight="semibold" style={{ flex: 1 }}>
          {aviso}
        </Text>
      </Animated.View>
    </View>
  );
}
