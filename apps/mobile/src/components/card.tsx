import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space } from "@/theme";

type Props = {
  children: ReactNode;
  tone?: "surface" | "strong" | "success" | "warning";
  padding?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

/** Tarjeta clara (Lino). Se separa del fondo por color, no por sombra (DESIGN.md §4). */
export function Card({ children, tone = "surface", padding = space.lg, gap = space.md, style }: Props) {
  const fondo = {
    surface: colors.surface,
    strong: colors.surfaceStrong,
    success: colors.successBg,
    warning: colors.warningBg,
  }[tone];
  return (
    <View
      style={[
        { backgroundColor: fondo, borderRadius: radius.card, borderCurve: "continuous", padding, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}
