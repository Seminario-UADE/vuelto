import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { anchoColumnaRedes, columnasRedes, HUECO_REDES, MARGEN_CUADRADO_REDES } from "@/perfil/columnas-redes";
import { ETIQUETAS_RED, REDES, type Red } from "@/perfil/modelo";
import { colors, radius, size, space } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Props = {
  /** `null` = todavía no se eligió ninguna. */
  valor: Red | null;
  onChange: (valor: Red) => void;
  accessibilityLabel: string;
};

/**
 * Elegir la red de la tarjeta entre las 9 (DESIGN.md v9.2 §5, «Cuadrado de opción»): una grilla de
 * cuadrados de 16 pt, no un control segmentado, que es para dos o tres opciones. El nombre va entero,
 * en hasta dos líneas. Tiene 3 columnas; con poco ancho o letra grande del sistema baja a 2 y a 1
 * (`columnasRedes`). El elegido lleva borde de 2 pt en el acento y un check, así no depende del color.
 */
export function GrillaRedes({ valor, onChange, accessibilityLabel }: Props) {
  const { fontScale } = useWindowDimensions();
  // Se mide el contenedor, no la ventana: en Perfil la grilla va dentro de una tarjeta con margen.
  const [ancho, setAncho] = useState(0);
  const columnas = columnasRedes(ancho, fontScale);
  const anchoCuadrado = anchoColumnaRedes(ancho, columnas);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setAncho(Math.floor(e.nativeEvent.layout.width))}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: HUECO_REDES }}
    >
      {ancho > 0
        ? REDES.map((red) => {
            const elegida = red === valor;
            return (
              <View key={red} style={{ width: anchoCuadrado }}>
                <PressableScale
                  onPress={() => onChange(red)}
                  accessibilityRole="radio"
                  accessibilityLabel={ETIQUETAS_RED[red]}
                  accessibilityState={{ selected: elegida }}
                  aria-checked={elegida}
                  style={{
                    minHeight: size.rowMin,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: MARGEN_CUADRADO_REDES,
                    paddingVertical: MARGEN_CUADRADO_REDES,
                    borderRadius: radius.tile,
                    borderCurve: "continuous",
                    backgroundColor: colors.surfaceStrong,
                    // El borde siempre ocupa lugar: al elegir no se corre nada.
                    borderWidth: 2,
                    borderColor: elegida ? colors.accent : colors.transparent,
                  }}
                >
                  <Text variant="label" weight={elegida ? "semibold" : "medium"} align="center" importantForAccessibility="no">
                    {ETIQUETAS_RED[red]}
                  </Text>
                </PressableScale>
                {elegida ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -space.xs,
                      right: -space.xs,
                      width: 24,
                      height: 24,
                      borderRadius: radius.pill,
                      backgroundColor: colors.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="check" size={16} color={colors.onAccent} />
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
    </View>
  );
}
