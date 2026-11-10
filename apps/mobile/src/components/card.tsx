import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, sombras, space } from "@/theme";
import { useEsquema } from "./tema-provider";

type Props = {
  children: ReactNode;
  tone?: "surface" | "strong" | "success" | "warning";
  padding?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Tarjeta `surface` de radio 20. En el claro se despega del fondo con una sombra suave; en el oscuro
 * la separa el tono, sin sombra (DESIGN.md v8 §4). Solo la `surface` lleva sombra: las demás son tonos.
 */
export function Card({ children, tone = "surface", padding = space.lg, gap = space.md, style }: Props) {
  const sombra = sombras[useEsquema()].tarjeta;
  const fondo = {
    surface: colors.surface,
    strong: colors.surfaceStrong,
    success: colors.successBg,
    warning: colors.warningBg,
  }[tone];
  return (
    <View
      style={[
        {
          backgroundColor: fondo,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding,
          gap,
          boxShadow: tone === "surface" ? sombra : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
