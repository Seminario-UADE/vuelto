import { View } from "react-native";
import { colors, radius, space } from "@/theme";

/**
 * Barra de pasos sin texto visible: cuenta solo los pasos de configuración
 * (auditoría P2 #18). El lector de pantalla anuncia "Configuración, paso N de M".
 */
export function ProgressSegments({ total, actual }: { total: number; actual: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Configuración, paso ${actual} de ${total}`}
      style={{ flexDirection: "row", gap: space.xs, flex: 1, maxWidth: 160 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: i < actual ? colors.accent : colors.divider,
          }}
        />
      ))}
    </View>
  );
}
