import { View } from "react-native";
import type { ColorValue } from "react-native";
import { colors, radius, size as tamanos } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Props = {
  /** Letra o dos letras. `null` con `icon` para "Vos" o un rubro. */
  letras?: string | null;
  icon?: IconName;
  /** neutral: iniciales de comercio/banco · activo: recomendado o seleccionado · decision: sobre la tarjeta oscura. */
  tone?: "neutral" | "activo" | "decision";
  size?: number;
  /** `cuadrado`: el ícono en un cuadrado redondeado, como las filas de las referencias (v7). */
  forma?: "circulo" | "cuadrado";
  /** Color del rubro (v8): fondo e ícono. Reemplaza al tono neutral. */
  rubro?: { fg: ColorValue; bg: ColorValue };
};

/**
 * Círculo con iniciales o ícono de rubro. Nunca colores de marca de bancos o comercios:
 * la identidad la da la letra (DESIGN.md §5).
 */
export function Avatar({ letras, icon, tone = "neutral", size = tamanos.avatar, forma = "circulo", rubro }: Props) {
  const fondo = rubro?.bg ?? { neutral: colors.surfaceStrong, activo: colors.accent, decision: colors.onDecisionAccent }[tone];
  const tinta = rubro?.fg ?? (tone === "activo" ? colors.onAccent : colors.ink);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: forma === "cuadrado" ? radius.row : radius.pill,
        borderCurve: "continuous",
        backgroundColor: fondo,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? (
        <Icon name={icon} size={size * 0.5} color={tinta} />
      ) : (
        <Text
          variant={size >= 64 ? "titleLg" : size >= 40 ? "bodyLg" : "label"}
          weight="bold"
          maxFontSizeMultiplier={1.3}
          style={{ color: tinta }}
        >
          {letras ?? ""}
        </Text>
      )}
    </View>
  );
}
