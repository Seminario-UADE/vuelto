import { View, type DimensionValue } from "react-native";
import { colors, radius, space } from "@/theme";

/** Bloque de carga con la forma del contenido. Estático: nada se mueve solo (DESIGN.md §7). */
export function Skeleton({ height, width = "100%", r = radius.row }: { height: number; width?: DimensionValue; r?: number }) {
  return <View style={{ height, width, borderRadius: r, backgroundColor: colors.surfaceStrong }} />;
}

export function SkeletonList({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <View
      style={{ gap: space.md }}
      accessible
      accessibilityLabel="Cargando"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  );
}
