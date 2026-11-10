import { View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Opcion<T extends string> = { valor: T; label: string };

type Props<T extends string> = {
  opciones: readonly Opcion<T>[];
  /** `null` = todavía no se eligió ninguna. */
  valor: T | null;
  onChange: (valor: T) => void;
  accessibilityLabel: string;
};

/**
 * Elegir una opción entre dos o tres, todas a la vista (DESIGN.md v8 §5): un rectángulo redondeado
 * partido en segmentos, no una fila de píldoras. El segmento activo toma el acento.
 */
export function Segmentado<T extends string>({ opciones, valor, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        padding: 3,
        gap: 3,
        borderRadius: radius.control,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceStrong,
      }}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <PressableScale
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            aria-checked={activa}
            style={{
              flex: 1,
              minHeight: size.chip,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: space.sm,
              borderRadius: radius.row,
              borderCurve: "continuous",
              backgroundColor: activa ? colors.accent : colors.transparent,
            }}
          >
            <Text variant="bodyMd" weight={activa ? "semibold" : "medium"} style={{ color: activa ? colors.onAccent : colors.ink }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
