import type { ReactNode } from "react";
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { colors, fonts, maxFontScale, type ColorToken, type FontWeight, type TypeVariant, type as escala } from "@/theme";

type Props = Omit<TextProps, "style"> & {
  variant?: TypeVariant;
  weight?: FontWeight;
  tone?: ColorToken;
  /** Cifras tabulares: obligatorias en montos (DESIGN.md §3). */
  tabular?: boolean;
  align?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

/**
 * Texto con la escala de DESIGN.md §3 y Hanken Grotesk. Escala con el tamaño de texto del
 * sistema (no se bloquea `allowFontScaling`).
 */
export function Text({ variant = "bodyLg", weight, tone = "ink", tabular, align, style, ...rest }: Props) {
  const v = escala[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontScale[variant]}
      {...rest}
      style={[
        {
          fontFamily: fonts[weight ?? v.weight],
          fontSize: v.fontSize,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          color: colors[tone],
          textAlign: align,
        },
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}
