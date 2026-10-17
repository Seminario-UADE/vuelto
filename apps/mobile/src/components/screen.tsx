import { useState, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, floatingShadow, space } from "@/theme";

type Props = {
  children: ReactNode;
  /** Acción fija al pie (un solo primario). El contenido nunca queda debajo de ella. */
  footer?: ReactNode;
  /**
   * `stack`: pantalla con header nativo; el sistema maneja el inset superior.
   * `tab`: raíz de una pestaña sin header; se suma el área segura superior.
   * `sheet`: dentro de un sheet o modal.
   */
  kind?: "stack" | "tab" | "sheet";
  /** El pie está encima de la tab bar (que ya reserva el área segura inferior). */
  aboveTabBar?: boolean;
  gap?: number;
  scrollProps?: Omit<ScrollViewProps, "children" | "contentContainerStyle">;
};

/**
 * Contenedor de pantalla con scroll. Si hay `footer`, mide su alto y lo reserva como
 * espacio al final del contenido más el área segura (auditoría P1 #3, P2 #7 y #9).
 */
export function Screen({ children, footer, kind = "stack", aboveTabBar, gap = space.xxl, scrollProps }: Props) {
  const insets = useSafeAreaInsets();
  const [altoFooter, setAltoFooter] = useState(0);
  const inferior = aboveTabBar || kind === "sheet" ? space.md : Math.max(insets.bottom, space.md);
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentInsetAdjustmentBehavior={kind === "stack" ? "automatic" : "never"}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...scrollProps}
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingTop: kind === "tab" ? insets.top + space.lg : space.lg,
          paddingBottom: (footer ? altoFooter : inferior) + space.xxl,
          gap,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          onLayout={(e) => setAltoFooter(e.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: space.gutter,
            paddingTop: space.md,
            paddingBottom: inferior,
            gap: space.sm,
            backgroundColor: colors.canvas,
            boxShadow: floatingShadow,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
