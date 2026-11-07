import { TextInput, View, type TextInputProps } from "react-native";
import type { ComponentRef, Ref } from "react";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Text } from "./text";

/** Campo de texto de los formularios (alta, login, nombre): etiqueta arriba y error debajo. */
export function Campo({ label, error, ...props }: TextInputProps & { label: string; error?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" tone="inkSecondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkSecondary}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={{
          minHeight: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.row,
          borderWidth: 1.5,
          borderColor: error ? colors.error : colors.controlBorder,
          backgroundColor: colors.canvas,
          fontFamily: fonts.regular,
          fontSize: escala.bodyLg.fontSize,
          color: colors.ink,
        }}
      />
      {error ? (
        <Text variant="label" tone="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

