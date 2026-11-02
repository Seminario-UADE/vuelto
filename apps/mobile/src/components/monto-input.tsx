import { useRef, type ComponentRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { montoEditable, parseMonto } from "@/lib/format";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  value: number | null;
  onChange: (monto: number | null) => void;
  label?: string;
  hint?: string;
  /** Sobre la tarjeta oscura de decisión. */
  onDecision?: boolean;
  autoFocus?: boolean;
};

/**
 * Monto opcional con el teclado numérico del sistema, sin letras (auditoría P2 #15).
 * Solo refina el estimado: la respuesta existe sin él (auditoría P1 #1).
 */
export function MontoInput({ value, onChange, label = "Monto (opcional)", hint, onDecision, autoFocus }: Props) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const tinta = onDecision ? colors.onDecision : colors.ink;
  const sec = onDecision ? colors.onDecisionMuted : colors.inkSecondary;
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" style={{ color: sec }}>
        {label}
      </Text>
      <Pressable
        onPress={() => ref.current?.focus()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.row,
          borderCurve: "continuous",
          backgroundColor: onDecision ? colors.decisionSurface : colors.canvas,
          borderWidth: onDecision ? 0 : 1.5,
          borderColor: colors.controlBorder,
        }}
      >
        <Text variant="titleMd" weight="semibold" tabular style={{ color: tinta }}>
          $
        </Text>
        <TextInput
          ref={ref}
          value={montoEditable(value)}
          onChangeText={(t) => onChange(parseMonto(t))}
          placeholder="0"
          placeholderTextColor={sec}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          autoFocus={autoFocus}
          accessibilityLabel={label}
          accessibilityHint={hint}
          selectionColor={onDecision ? colors.onDecisionAccent : colors.accent}
          style={{
            flex: 1,
            minHeight: 48,
            fontFamily: fonts.semibold,
            fontSize: escala.titleMd.fontSize,
            color: tinta,
            fontVariant: ["tabular-nums"],
          }}
        />
        {value !== null ? (
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel="Borrar monto"
            hitSlop={8}
            style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="cerrar" size={16} color={sec} />
          </Pressable>
        ) : null}
      </Pressable>
      {hint ? (
        <Text variant="label" style={{ color: sec }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
