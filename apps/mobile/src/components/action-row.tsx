import { View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Props = {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
};

/** Fila de acción secundaria (Lino, ícono, título, detalle y chevron). */
export function ActionRow({ icon, title, detail, onPress }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: 64,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderRadius: radius.row,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLg" weight="semibold">
          {title}
        </Text>
        {detail ? (
          <Text variant="label" tone="inkSecondary">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron" size={18} color={colors.inkSecondary} />
    </PressableScale>
  );
}
