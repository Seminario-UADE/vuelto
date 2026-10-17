import { useRef, type ComponentRef } from "react";
import { Pressable, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
  tabular?: boolean;
  prefix?: string;
};

/**
 * Campo editable del ticket: etiqueta arriba en Musgo, valor en body-lg y lápiz a la
 * derecha; el error va debajo en Óxido con qué pasó y cómo seguir (DESIGN.md §5).
 */
export function Field({ label, value, onChangeText, placeholder, keyboardType, error, tabular, prefix }: Props) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <View style={{ gap: space.xs }}>
      <Pressable
        onPress={() => ref.current?.focus()}
        style={{
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
          borderRadius: radius.row,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: error ? 2 : 0,
          borderColor: error ? colors.error : colors.transparent,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="inkSecondary">
            {label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {prefix && value !== "" ? (
              <Text variant="bodyLg" weight="semibold" tabular={tabular}>
                {prefix}
              </Text>
            ) : null}
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.inkSecondary}
              keyboardType={keyboardType}
              accessibilityLabel={label}
              selectionColor={colors.accent}
              style={{
                flex: 1,
                minHeight: 28,
                padding: 0,
                fontFamily: fonts.semibold,
                fontSize: escala.bodyLg.fontSize,
                color: colors.ink,
                fontVariant: tabular ? ["tabular-nums"] : undefined,
              }}
            />
          </View>
        </View>
        <Icon name="editar" size={18} color={colors.inkSecondary} />
      </Pressable>
      {error ? (
        <Text variant="label" tone="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
