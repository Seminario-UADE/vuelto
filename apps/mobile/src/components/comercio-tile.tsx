import { useWindowDimensions, View } from "react-native";
import { etiquetaDeComercio, nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { hapticoLeve } from "@/lib/haptics";
import { colors, ONE_COLUMN_FONT_SCALE, radius, space } from "@/theme";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Grilla de comercios en cuadrados redondeados (DESIGN.md v7 §5, como los accesos rápidos de
 * las referencias): ícono del rubro en un cuadrado `surface` y el nombre debajo. Cuatro por fila;
 * tres con texto grande. Tocar uno es elegirlo.
 */
export function GrillaComercios({
  comercios,
  onElegir,
  onAgregar,
  conRubro = false,
}: {
  comercios: readonly Comercio[];
  onElegir: (c: Comercio) => void;
  /** Si viene, la grilla termina en un cuadrado «Agregar» con borde punteado. */
  onAgregar?: () => void;
  /** Resultados de búsqueda: cada uno con su rubro (spec 004 FR-002). Si no, solo si el nombre se repite. */
  conRubro?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const columnas = fontScale > ONE_COLUMN_FONT_SCALE ? 3 : 4;
  const ancho = Math.floor((width - space.gutter * 2 - space.md * (columnas - 1)) / columnas);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
      {comercios.map((c) => (
        <PressableScale
          key={c.id}
          onPress={() => {
            hapticoLeve();
            onElegir(c);
          }}
          accessibilityRole="button"
          // Un comercio que está en dos rubros sale una vez por rubro, con el rubro (#43).
          accessibilityLabel={conRubro ? `${c.nombre} · ${nombreDeRubro(c)}` : etiquetaDeComercio(c, comercios)}
          style={{ width: ancho, alignItems: "center", gap: space.sm }}
        >
          <View
            style={{
              width: ancho,
              aspectRatio: 1,
              borderRadius: radius.tile,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={iconoDeRubro[c.rubro]} size={28} color={colors.ink} />
          </View>
          <Text variant="label" align="center" numberOfLines={1} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
            {c.nombre}
          </Text>
          {conRubro || etiquetaDeComercio(c, comercios) !== c.nombre ? (
            <Text variant="caption" tone="inkSecondary" align="center" numberOfLines={1} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
              {nombreDeRubro(c)}
            </Text>
          ) : null}
        </PressableScale>
      ))}
      {onAgregar ? (
        <PressableScale
          onPress={onAgregar}
          accessibilityRole="button"
          accessibilityLabel="Agregar comercios"
          style={{ width: ancho, alignItems: "center", gap: space.sm }}
        >
          <View
            style={{
              width: ancho,
              aspectRatio: 1,
              borderRadius: radius.tile,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: colors.inkSecondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="agregar" size={24} color={colors.inkSecondary} />
          </View>
          <Text variant="label" tone="inkSecondary" align="center" numberOfLines={1} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
            Agregar
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
