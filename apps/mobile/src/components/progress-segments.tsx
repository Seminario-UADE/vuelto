import { View } from "react-native";
import { colors, radius, space } from "@/theme";

/**
 * Barra de pasos sin texto visible: los pasos hasta `actual` van completos, aunque se haya
 * entrado a mitad de camino (auditoría v7). El lector de pantalla anuncia "<contexto>, paso N de M".
 */
export function ProgressSegments({
  total,
  actual,
  contexto = "Configuración",
  ancho = 120,
}: {
  total: number;
  actual: number;
  contexto?: string;
  ancho?: number;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${contexto}, paso ${actual} de ${total}`}
      style={{ flexDirection: "row", gap: space.xs, width: ancho }}
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
