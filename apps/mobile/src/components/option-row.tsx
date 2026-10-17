import type { ReactNode } from "react";
import { View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Props = {
  title: string;
  detail?: string | null;
  /** Texto de advertencia u observación bajo el detalle (en Ocre). */
  note?: string | null;
  leading?: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** `radio`: una opción · `check`: varias. */
  kind?: "radio" | "check";
  disabled?: boolean;
};

/**
 * Fila de medio de pago u opción (DESIGN.md §5). Seleccionada: Gris Cálido con borde
 * Salvia de 2 pt. El control no seleccionado usa el borde de control, nunca el divisor.
 */
export function OptionRow({ title, detail, note, leading, selected, onPress, kind = "radio", disabled }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={kind === "radio" ? "radio" : "checkbox"}
      accessibilityState={kind === "radio" ? { selected, disabled } : { checked: selected, disabled }}
      accessibilityLabel={[title, detail, note].filter(Boolean).join(", ")}
      style={{
        minHeight: size.rowMin,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderRadius: radius.row,
        borderCurve: "continuous",
        backgroundColor: selected ? colors.surfaceStrong : colors.surface,
        borderWidth: 2,
        borderColor: selected ? colors.accent : colors.transparent,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLg" weight="semibold">
          {title}
        </Text>
        {detail ? (
          <Text variant="label" tone="inkSecondary">
            {detail}
          </Text>
        ) : null}
        {note ? (
          <Text variant="label" tone="warning">
            {note}
          </Text>
        ) : null}
      </View>
      <Control selected={selected} kind={kind} />
    </PressableScale>
  );
}

function Control({ selected, kind }: { selected: boolean; kind: "radio" | "check" }) {
  const forma = kind === "radio" ? radius.pill : 6;
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: forma,
        borderWidth: 2,
        borderColor: selected ? colors.accent : colors.controlBorder,
        backgroundColor: selected && kind === "check" ? colors.accent : colors.transparent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected && kind === "radio" ? (
        <View style={{ width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.accent }} />
      ) : null}
      {selected && kind === "check" ? <Icon name="check" size={16} color={colors.onAccent} /> : null}
    </View>
  );
}
