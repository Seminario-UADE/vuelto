import { View } from "react-native";
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
};

/**
 * Círculo con iniciales o ícono de rubro. Nunca colores de marca de bancos o comercios:
 * la identidad la da la letra (DESIGN.md §5).
 */
export function Avatar({ letras, icon, tone = "neutral", size = tamanos.avatar }: Props) {
  const fondo = { neutral: colors.surfaceStrong, activo: colors.accent, decision: colors.onDecisionAccent }[tone];
  const tinta = tone === "activo" ? colors.onAccent : colors.ink;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: fondo,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? (
        <Icon name={icon} size={size * 0.5} color={tinta} />
      ) : (
        <Text
          variant={size >= 40 ? "bodyLg" : "label"}
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
