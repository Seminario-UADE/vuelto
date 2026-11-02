import { View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Props = {
  label: string;
  tone?: "neutral" | "warning" | "error" | "success";
  icon?: IconName;
};

/** Badge solo cuando cambia una decisión ("Queda poco", "Tope agotado"). Mínimo 12 pt. */
export function Badge({ label, tone = "neutral", icon }: Props) {
  const estilo = {
    neutral: { bg: colors.surfaceStrong, fg: colors.inkSecondary },
    warning: { bg: colors.warningBg, fg: colors.warning },
    error: { bg: colors.surfaceStrong, fg: colors.error },
    success: { bg: colors.successBg, fg: colors.ink },
  }[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: space.xs,
        backgroundColor: estilo.bg,
        borderRadius: radius.badge,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
      }}
    >
      {icon ? <Icon name={icon} size={14} color={estilo.fg} /> : null}
      <Text variant="caption" style={{ color: estilo.fg, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}
