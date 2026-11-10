import { View } from "react-native";
import type { GastoSemana } from "@/data/contracts";
import { pesos } from "@/lib/format";
import { colors, radius, space } from "@/theme";
import { Text } from "./text";

const ALTO = 88;
const ANCHO_BARRA = 28;

/**
 * Barras de lo gastado por tramo de 7 días (v7, como los gráficos de barras de las referencias).
 * Cada tramo tiene su pista; la barra de hoy va en el acento y las pasadas en `surfaceStrong`.
 * Para lectores de pantalla se lee como una lista de cifras.
 */
export function GraficoSemanas({ semanas }: { semanas: readonly GastoSemana[] }) {
  const max = Math.max(1, ...semanas.map((s) => s.monto));
  const pasadas = semanas.filter((s) => !s.futuro);
  return (
    <View
      accessible
      accessibilityLabel={`Gasto por semana: ${pasadas.map((s) => `del ${s.etiqueta.replace("–", " al ")}, ${pesos(s.monto)}`).join("; ")}`}
      style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}
    >
      {semanas.map((s) => (
        <View key={s.etiqueta} style={{ alignItems: "center", gap: space.sm, minWidth: ANCHO_BARRA + space.lg }}>
          <View
            style={{
              height: ALTO,
              width: ANCHO_BARRA,
              justifyContent: "flex-end",
              borderRadius: radius.badge,
              borderCurve: "continuous",
              backgroundColor: colors.canvas,
              overflow: "hidden",
            }}
          >
            {!s.futuro && s.monto > 0 ? (
              <View
                style={{
                  height: Math.max(8, (s.monto / max) * ALTO),
                  borderRadius: radius.badge,
                  borderCurve: "continuous",
                  backgroundColor: s.actual ? colors.accent : colors.surfaceStrong,
                }}
              />
            ) : null}
          </View>
          <Text
            variant="caption"
            weight={s.actual ? "semibold" : "medium"}
            tone={s.actual ? "ink" : "inkSecondary"}
            maxFontSizeMultiplier={1.3}
          >
            {s.etiqueta}
          </Text>
        </View>
      ))}
    </View>
  );
}
