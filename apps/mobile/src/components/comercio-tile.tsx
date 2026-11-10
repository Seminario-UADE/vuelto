import { Pressable, useWindowDimensions, View } from "react-native";
import { etiquetaDeComercio, nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { hapticoLeve } from "@/lib/haptics";
import { colors, ONE_COLUMN_FONT_SCALE, radius, rubroColors, space } from "@/theme";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Grilla de comercios en cuadrados redondeados (DESIGN.md v7 §5, como los accesos rápidos de
 * las referencias): ícono del rubro en un cuadrado del color del rubro (v8) y el nombre debajo. Cuatro por fila;
 * tres con texto grande. Tocar uno es elegirlo.
 */
export function GrillaComercios({
  comercios,
  onElegir,
  onAgregar,
  conRubro = false,
  marcados,
  activo,
  onQuitar,
}: {
  comercios: readonly Comercio[];
  onElegir: (c: Comercio) => void;
  /** Ids ya marcados: llevan borde del acento y una × en la esquina que los desmarca (`onQuitar`). */
  marcados?: readonly string[];
  /** El marcado que muestra su respuesta: borde `ink`. */
  activo?: string | null;
  onQuitar?: (c: Comercio) => void;
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
      {comercios.map((c) => {
        const marcado = marcados?.includes(c.id) ?? false;
        // Un comercio que está en dos rubros sale una vez por rubro, con el rubro (#43).
        const etiqueta = conRubro ? `${c.nombre} · ${nombreDeRubro(c)}` : etiquetaDeComercio(c, comercios);
        return (
          <View key={c.id} style={{ width: ancho }}>
            <PressableScale
              onPress={() => {
                hapticoLeve();
                onElegir(c);
              }}
              accessibilityRole="button"
              accessibilityLabel={marcados ? `${etiqueta}${marcado ? ", marcado" : ""}` : etiqueta}
              accessibilityState={marcados ? { selected: marcado } : undefined}
              style={{ width: ancho, alignItems: "center", gap: space.sm }}
            >
              <View
                style={{
                  width: ancho,
                  aspectRatio: 1,
                  borderRadius: radius.tile,
                  borderCurve: "continuous",
                  backgroundColor: rubroColors[c.rubro].bg,
                  borderWidth: marcado ? 2 : 0,
                  borderColor: activo === c.id ? colors.ink : colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={iconoDeRubro[c.rubro]} size={28} color={rubroColors[c.rubro].fg} />
              </View>
              <Text variant="label" align="center" numberOfLines={1} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
                {c.nombre}
              </Text>
              {conRubro || etiqueta !== c.nombre ? (
                <Text variant="caption" tone="inkSecondary" align="center" numberOfLines={1} maxFontSizeMultiplier={1.4} importantForAccessibility="no">
                  {nombreDeRubro(c)}
                </Text>
              ) : null}
            </PressableScale>
            {marcado && onQuitar ? (
              <Pressable
                onPress={() => onQuitar(c)}
                accessibilityRole="button"
                accessibilityLabel={`Desmarcar ${c.nombre}`}
                hitSlop={8}
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
                <Icon name="cerrar" size={14} color={colors.onAccent} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
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
