import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Props = {
  titulo: string;
  detalle?: string | null;
  /** Valor corto a la derecha («2», «≈$13.800»). */
  valor?: string | null;
  /** Ícono de la izquierda en un cuadrado redondeado, o un nodo propio (inicial del medio). */
  leading?: IconName | ReactNode;
  /** Ícono de la derecha: `chevron` por defecto. */
  icon?: IconName;
  onPress: () => void;
  /** Para filas que despliegan contenido debajo. */
  expandido?: boolean;
};

/**
 * Fila tocable dentro de una lista agrupada (DESIGN.md v7 §5): alto mínimo de 56 pt, título,
 * detalle opcional y un valor o chevron a la derecha. Va dentro de una `Card` con `divisor()`.
 */
export function FilaAccion({ titulo, detalle, valor, leading, icon = "chevron", onPress, expandido }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[titulo, detalle, valor].filter(Boolean).join(". ")}
      accessibilityState={expandido === undefined ? undefined : { expanded: expandido }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: 56,
        paddingVertical: space.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {typeof leading === "string" ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.row,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={leading as IconName} size={20} />
        </View>
      ) : (
        (leading ?? null)
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLg" weight="medium">
          {titulo}
        </Text>
        {detalle ? (
          <Text variant="label" tone="inkSecondary">
            {detalle}
          </Text>
        ) : null}
      </View>
      {valor ? (
        <Text variant="bodyMd" tone="inkSecondary" tabular>
          {valor}
        </Text>
      ) : null}
      <Icon name={icon} size={18} color={colors.inkSecondary} />
    </Pressable>
  );
}
