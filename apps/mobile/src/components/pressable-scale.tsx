import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al tocar. DESIGN.md §7: 0.98 en 100 ms. */
  escala?: number;
  children?: ReactNode;
};

/**
 * Feedback inmediato al toque: escala y vuelve. Solo `transform`; respeta "reducir
 * movimiento" (Reanimated omite la animación con la preferencia del sistema).
 */
export function PressableScale({ escala = 0.98, style, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const s = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        s.set(withTiming(escala, { duration: 100 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withTiming(1, { duration: 100 }));
        onPressOut?.(e);
      }}
      style={[style, animado]}
    />
  );
}
