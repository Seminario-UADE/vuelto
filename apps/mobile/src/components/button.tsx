import { View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * `decision`: el botón «Usar [medio]» dentro de la tarjeta de decisión, en `onDecisionAccent`
 * con texto `ink` (DESIGN.md §2 y §5). Solo ahí.
 */
type Variant = "primary" | "secondary" | "text" | "destructive" | "decision";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Mientras guarda: deshabilitado y anunciado como ocupado (sin spinner, DESIGN.md §5). */
  loading?: boolean;
  icon?: IconName;
  /** Explica por qué está deshabilitado (se lee junto al botón). */
  hint?: string;
};

/**
 * Botón primario: píldora del acento, 56 pt de alto mínimo, una sola línea de texto que crece
 * en alto si el texto del sistema es grande (DESIGN.md §5). Uno solo por pantalla.
 */
export function Button({ label, onPress, variant = "primary", disabled, loading, icon, hint }: Props) {
  const relleno = variant === "primary" || variant === "destructive" || variant === "decision";
  const fondo = {
    primary: colors.accent,
    destructive: colors.error,
    decision: colors.onDecisionAccent,
    secondary: colors.transparent,
    text: colors.transparent,
  }[variant];
  const tinta = {
    primary: colors.onAccent,
    destructive: colors.onAccent,
    decision: colors.ink,
    secondary: colors.ink,
    text: colors.accent,
  }[variant];
  const inactivo = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      aria-disabled={Boolean(inactivo)}
      style={{
        minHeight: variant === "text" ? size.hit : size.primaryButton,
        borderRadius: radius.control,
        borderCurve: "continuous",
        backgroundColor: inactivo && relleno ? colors.surfaceStrong : fondo,
        borderWidth: variant === "secondary" ? 1.5 : 0,
        borderColor: colors.controlBorder,
        paddingHorizontal: space.xxl,
        paddingVertical: space.md,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: variant === "text" ? "center" : "stretch",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        {icon ? <Icon name={icon} size={20} color={inactivo && relleno ? colors.inkSecondary : tinta} /> : null}
        <Text
          variant="bodyLg"
          weight="semibold"
          align="center"
          maxFontSizeMultiplier={1.6}
          style={{ color: inactivo && relleno ? colors.inkSecondary : tinta }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
