import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  title: string;
  subtitle?: string;
  onClose?: () => void;
};

/** Título del sheet a la izquierda y cierre "X" de 44 pt a la derecha (DESIGN.md §5–6). */
export function SheetHeader({ title, subtitle, onClose }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
      <View style={{ flex: 1, gap: space.xs, paddingTop: space.sm }}>
        <Text variant="titleLg" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMd" tone="inkSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onClose ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={{
          width: size.hit,
          height: size.hit,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="cerrar" size={18} />
      </Pressable>
    </View>
  );
}
