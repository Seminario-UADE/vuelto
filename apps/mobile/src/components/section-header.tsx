import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { space } from "@/theme";
import { Text } from "./text";

type Props = {
  title: string;
  /** Acción de texto a la derecha ("Ver todos"). */
  action?: { label: string; onPress: () => void };
  /** Contenido entre el título y la acción (p. ej. la cuenta regresiva). */
  accessory?: ReactNode;
};

/** Encabezado de sección en sentence case (DESIGN.md §3). */
export function SectionHeader({ title, action, accessory }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm }}>
      <Text variant="titleMd" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {title}
      </Text>
      {accessory}
      <View style={{ flex: 1 }} />
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          hitSlop={12}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text variant="bodyMd" weight="semibold" tone="accent">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
