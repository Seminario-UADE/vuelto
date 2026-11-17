import { ScrollView, View } from "react-native";
import { nombreCortoDeRubro, nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { hapticoLeve, hapticoSeleccion } from "@/lib/haptics";
import { colors, radius, rubroColors, size, space } from "@/theme";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Piezas de «¿Dónde estás comprando?» (v10): los chips de rubro, la fila de tus comercios y la
 * fila de lista. Pensadas para elegir con una mano y rápido, parado en la caja.
 */

const CHIP = 36;

/**
 * Chips de rubro con scroll horizontal hasta el borde (como los filtros de la referencia): filtran
 * la lista de abajo. «Todos» quita el filtro. El elegido va en el acento.
 */
export function ChipsDeRubro({
  rubros,
  elegido,
  onElegir,
}: {
  rubros: readonly Comercio[];
  elegido: number | null;
  onElegir: (categoriaId: number | null) => void;
}) {
  const chips: { id: number | null; label: string; rubro: Comercio | null }[] = [
    { id: null, label: "Todos", rubro: null },
    ...rubros.map((r) => ({ id: r.categoriaId, label: nombreCortoDeRubro(r.categoriaId ?? 0), rubro: r })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.gutter }}
      style={{ marginHorizontal: -space.gutter, flexGrow: 0 }}
      accessibilityRole="tablist"
    >
      {chips.map((c) => {
        const activo = c.id === elegido;
        return (
          <PressableScale
            key={c.id ?? "todos"}
            onPress={() => {
              hapticoSeleccion();
              onElegir(c.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={c.rubro ? nombreDeRubro(c.rubro) : "Todos los rubros"}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              height: CHIP,
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs + 2,
              paddingHorizontal: space.md + 2,
              borderRadius: radius.pill,
              borderCurve: "continuous",
              backgroundColor: activo ? colors.accent : colors.surface,
            }}
          >
            {c.rubro ? (
              <Icon
                name={iconoDeRubro[c.rubro.rubro]}
                size={16}
                color={activo ? colors.onAccent : rubroColors[c.rubro.rubro].fg}
              />
            ) : null}
            <Text
              variant="label"
              weight="semibold"
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={{ color: activo ? colors.onAccent : colors.ink }}
            >
              {c.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const TILE = 64;

/**
 * Tus comercios en una fila con scroll horizontal: el cuadrado del rubro y el nombre debajo.
 * El último cortado contra el borde avisa que hay más.
 */
export function FilaDeTusComercios({ comercios, onElegir }: { comercios: readonly Comercio[]; onElegir: (c: Comercio) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: space.md, paddingHorizontal: space.gutter }}
      style={{ marginHorizontal: -space.gutter, flexGrow: 0 }}
    >
      {comercios.map((c) => (
        <PressableScale
          key={c.id}
          onPress={() => {
            hapticoLeve();
            onElegir(c);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${c.nombre}, ${nombreDeRubro(c)}`}
          style={{ width: TILE + space.md, alignItems: "center", gap: space.sm }}
        >
          <View
            style={{
              width: TILE,
              height: TILE,
              borderRadius: radius.tile,
              borderCurve: "continuous",
              backgroundColor: rubroColors[c.rubro].bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={iconoDeRubro[c.rubro]} size={26} color={rubroColors[c.rubro].fg} />
          </View>
          <Text variant="label" weight="medium" align="center" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ alignSelf: "stretch" }}>
            {c.nombre}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/**
 * Una fila de la lista de comercios: el cuadrado del rubro, el nombre y el rubro debajo, y la
 * flecha. `todoElRubro`: la primera fila con un rubro filtrado, para elegir el rubro sin comercio
 * (spec 004 FR-001): solo aplican las promos de todo el rubro.
 */
export function FilaDeComercio({
  c,
  onElegir,
  todoElRubro,
}: {
  c: Comercio;
  onElegir: (c: Comercio) => void;
  todoElRubro?: "este" | "nombrado";
}) {
  // `este`: la fila de arriba con un rubro ya filtrado. `nombrado`: una fila por rubro, sin resultados.
  const titulo = todoElRubro === "este" ? "No sé en qué comercio" : todoElRubro === "nombrado" ? nombreCortoDeRubro(c.categoriaId ?? 0) : c.nombre;
  const detalle = todoElRubro ? "Solo las promos de todo el rubro" : nombreDeRubro(c);
  return (
    <PressableScale
      onPress={() => {
        hapticoLeve();
        onElegir(c);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: size.rowMin - 4, paddingVertical: space.sm }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.row,
          borderCurve: "continuous",
          backgroundColor: todoElRubro ? colors.transparent : rubroColors[c.rubro].bg,
          borderWidth: todoElRubro ? 1.5 : 0,
          borderStyle: "dashed",
          borderColor: rubroColors[c.rubro].fg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={iconoDeRubro[c.rubro]} size={20} color={rubroColors[c.rubro].fg} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyLg" weight="semibold" numberOfLines={1}>
          {titulo}
        </Text>
        <Text variant="label" tone="inkSecondary" numberOfLines={1}>
          {detalle}
        </Text>
      </View>
      <Icon name="chevron" size={18} color={colors.inkSecondary} />
    </PressableScale>
  );
}
