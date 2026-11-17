import type { ReactNode } from "react";
import { View } from "react-native";
import { colors, radius, space } from "@/theme";

/**
 * Hoja de Inicio (v10): el contenido debajo del panel sube encima de él con las esquinas de arriba
 * redondeadas y una agarradera, como una hoja apoyada. Es solo visual: no se arrastra (la
 * agarradera no es un control y queda fuera de la accesibilidad). Va justo después de un
 * `PanelSuperior` con `redondeado={false}`, que deja `radius.sheet` libre abajo para esto.
 */
export function Hoja({ gap, children }: { gap: number; children: ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: -space.gutter,
        marginTop: -radius.sheet,
        paddingHorizontal: space.gutter,
        paddingTop: space.sm,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
        borderCurve: "continuous",
        backgroundColor: colors.canvas,
      }}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ alignSelf: "center", width: 36, height: 5, borderRadius: radius.pill, backgroundColor: colors.divider }}
      />
      {/* Pegado a la agarradera: entre los atajos del panel y lo primero de la hoja no sobra aire. */}
      <View style={{ gap, marginTop: space.sm }}>{children}</View>
    </View>
  );
}
