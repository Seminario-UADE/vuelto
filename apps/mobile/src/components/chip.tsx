import { colors, radius, size, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Props = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
};

/** Chip de comercio, rubro o filtro. Activo: Verde Bosque con check (DESIGN.md §5). */
export function Chip({ label, onPress, selected, icon, accessibilityHint }: Props) {
  const tinta = selected ? colors.onDecision : colors.ink;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      aria-selected={Boolean(selected)}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 2, bottom: 2 }}
      style={{
        minHeight: size.chip,
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.decisionBg : colors.surfaceStrong,
      }}
    >
      {selected ? <Icon name="check" size={16} color={tinta} /> : icon ? <Icon name={icon} size={18} color={tinta} /> : null}
      <Text variant="bodyMd" weight="medium" style={{ color: tinta }}>
        {label}
      </Text>
    </PressableScale>
  );
}
