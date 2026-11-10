import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space } from "@/theme";

/** Lo que sobra arriba del panel: al tirar hacia abajo (rebote de iOS) se sigue viendo el panel, no el fondo. */
const SOBRANTE_REBOTE = 600;

type Props = {
  /** Color de fondo del panel. Si hay `fondo`, queda debajo como respaldo. */
  color: ColorValue;
  /** Capa de fondo opcional (un degradé), a todo el panel. */
  fondo?: ReactNode;
  /** Cómo va la barra de estado sobre el panel. */
  barra: "light" | "dark";
  accessibilityLabel?: string;
  children: ReactNode;
};

/**
 * Panel a sangre (v9): arriba de todo, de marco a marco y desde el borde superior, con solo las
 * esquinas de abajo redondeadas. Va como primer hijo de un `Screen kind="tab"`: se come el
 * margen lateral y el área segura de arriba, y suma esa área como relleno propio.
 */
export function PanelSuperior({ color, fondo, barra, accessibilityLabel, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        marginHorizontal: -space.gutter,
        marginTop: -(insets.top + space.lg + SOBRANTE_REBOTE),
        paddingTop: insets.top + space.sm + SOBRANTE_REBOTE,
        paddingHorizontal: space.gutter,
        backgroundColor: color,
        borderBottomLeftRadius: radius.sheet,
        borderBottomRightRadius: radius.sheet,
        borderCurve: "continuous",
        overflow: "hidden",
      }}
    >
      <StatusBar style={barra} />
      {fondo ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: SOBRANTE_REBOTE }}
        >
          {fondo}
        </View>
      ) : null}
      {children}
    </View>
  );
}
