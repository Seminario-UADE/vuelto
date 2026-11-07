import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { hapticoLeve } from "@/lib/haptics";
import { colors, radius, size, space } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Lo mínimo que la fila necesita de un comercio (coincide con `Comercio` de la capa de datos). */
export type ComercioDeFila = { id: string; nombre: string; inicial: string };

type Props = {
  /** Los habituales del usuario o, sin habituales, los frecuentes del catálogo. */
  comercios: readonly ComercioDeFila[];
  /** El comercio elegido, o `null` si todavía no eligió. */
  elegido: string | null;
  onElegir: (id: string) => void;
  /** «Buscar», al final de la fila: abre el buscador de comercios. */
  onBuscar: () => void;
};

/** Ancho de cada ítem: el círculo más aire para un nombre corto debajo. */
const ANCHO_ITEM = size.comercio + space.lg;

/**
 * Fila de comercios del hero de Inicio (DESIGN.md §5): círculos de 56 pt en `surfaceStrong` con la
 * inicial en `ink` y el nombre debajo; el elegido va en el acento. «Buscar» cierra la fila.
 * Scroll horizontal hasta el borde de la pantalla: el último ítem cortado avisa que hay más.
 */
export function FilaComercios({ comercios, elegido, onElegir, onBuscar }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.gutter }}
      style={{ marginHorizontal: -space.gutter, flexGrow: 0 }}
    >
      {comercios.map((c) => {
        const activo = c.id === elegido;
        return (
          <Item
            key={c.id}
            nombre={c.nombre}
            activo={activo}
            onPress={() => {
              hapticoLeve();
              onElegir(c.id);
            }}
            accessibilityLabel={c.nombre}
          >
            <Text
              variant="titleMd"
              weight="bold"
              maxFontSizeMultiplier={1.3}
              style={{ color: activo ? colors.onAccent : colors.ink }}
            >
              {c.inicial}
            </Text>
          </Item>
        );
      })}
      <Item nombre="Buscar" activo={false} onPress={onBuscar} accessibilityLabel="Buscar otro comercio">
        <Icon name="buscar" size={size.icon} color={colors.ink} />
      </Item>
    </ScrollView>
  );
}

type ItemProps = {
  nombre: string;
  activo: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
};

function Item({ nombre, activo, onPress, accessibilityLabel, children }: ItemProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: activo }}
      aria-selected={activo}
      style={{ width: ANCHO_ITEM, alignItems: "center", gap: space.xs }}
    >
      <View
        style={{
          width: size.comercio,
          height: size.comercio,
          borderRadius: radius.pill,
          backgroundColor: activo ? colors.accent : colors.surfaceStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
      <Text
        variant="label"
        align="center"
        numberOfLines={2}
        maxFontSizeMultiplier={1.4}
        weight={activo ? "semibold" : "medium"}
        tone={activo ? "ink" : "inkSecondary"}
        importantForAccessibility="no"
        accessible={false}
      >
        {nombre}
      </Text>
    </PressableScale>
  );
}
