import { Pressable, View } from "react-native";
import { hapticoLeve } from "@/lib/haptics";
import { colors, radius, space } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "borrar"] as const;
/** Hasta $99.999.999: ningún gasto real lo supera y la cifra entra en una línea. */
const MAX_DIGITOS = 8;

/**
 * Teclado numérico del paso del monto: cifras enteras de pesos, sin teclado del sistema, como
 * el paso a paso de la referencia 19. Cada tecla mide 56 pt de alto.
 */
export function TecladoNumerico({ value, onChange }: { value: number | null; onChange: (m: number | null) => void }) {
  const digitos = value === null ? "" : String(value);
  const tocar = (t: (typeof TECLAS)[number]) => {
    hapticoLeve();
    const nuevo = t === "borrar" ? digitos.slice(0, -1) : (digitos + t).replace(/^0+/, "").slice(0, MAX_DIGITOS);
    onChange(nuevo === "" ? null : Number(nuevo));
  };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.sm }}>
      {TECLAS.map((t) => (
        <View key={t} style={{ width: "33.333%", paddingHorizontal: space.xs }}>
          <Pressable
            onPress={() => tocar(t)}
            accessibilityRole="button"
            accessibilityLabel={t === "borrar" ? "Borrar" : t === "000" ? "Tres ceros" : t}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: radius.control,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? colors.surfaceStrong : colors.surface,
            })}
          >
            {t === "borrar" ? (
              <Icon name="borrar" size={24} color={colors.ink} />
            ) : (
              <Text variant="titleMd" weight="semibold" maxFontSizeMultiplier={1.3}>
                {t}
              </Text>
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}
