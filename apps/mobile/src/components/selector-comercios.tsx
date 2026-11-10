import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { buscarComercios, nombreDeRubro } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { useAppSelector } from "@/store/hooks";
import { selectCatalogoComercios } from "@/store/selectores";
import { colors, fonts, radius, size, space, type as escala } from "@/theme";
import { Chip } from "./chip";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Props = {
  /** Ids del catálogo marcados. */
  marcados: readonly string[];
  /** El que muestra su respuesta (el último tocado), resaltado. */
  activo: string | null;
  /** Tocar un comercio: lo marca y muestra su respuesta. Tocar uno marcado no lo desmarca. */
  onTocar: (c: Comercio) => void;
  /** La × de un comercio marcado: lo desmarca. */
  onQuitar: (c: Comercio) => void;
};

/** Con el corpus real son cientos: sin búsqueda, unos pocos por rubro; el resto, buscando. */
const POR_RUBRO = 8;

/**
 * Los comercios del catálogo para marcar (spec 012, FR-025): buscador y chips agrupados por rubro.
 * Tocar marca y muestra; desmarcar es la × del comercio marcado, un control aparte para que tocar
 * de nuevo para volver a ver la respuesta no lo saque. Lo usa la primera respuesta del onboarding.
 * Los comercios son los de las promos guardadas, sin red (#43).
 */
export function SelectorComercios({ marcados, activo, onTocar, onQuitar }: Props) {
  const catalogo = useAppSelector(selectCatalogoComercios);
  const [q, setQ] = useState("");

  const grupos = useMemo(() => {
    const buscando = q.trim() !== "";
    const lista = buscando ? buscarComercios(catalogo, q, Infinity) : catalogo;
    // Por categoría de MODO, no por rubro de la app: varias categorías son «otro» y no deben
    // juntarse bajo un solo encabezado.
    const por = new Map<number, Comercio[]>();
    for (const c of lista) por.set(c.categoriaId ?? 99, [...(por.get(c.categoriaId ?? 99) ?? []), c]);
    return [...por.entries()]
      .sort(([a], [b]) => a - b)
      .map(([categoria, xs]) => ({
        categoria,
        muestra: xs[0]!,
        // Los marcados se ven siempre, aunque queden fuera de la muestra.
        lista: buscando ? xs : xs.filter((c, i) => i < POR_RUBRO || marcados.includes(c.id)),
      }));
  }, [catalogo, q, marcados]);

  return (
    <View style={{ gap: space.xl }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 48,
          paddingHorizontal: space.lg,
          borderRadius: radius.control,
          backgroundColor: colors.surfaceStrong,
        }}
      >
        <Icon name="buscar" size={20} color={colors.inkSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscá un comercio"
          placeholderTextColor={colors.inkSecondary}
          accessibilityLabel="Buscar comercio"
          returnKeyType="search"
          selectionColor={colors.accent}
          style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
        />
      </View>
      {q.trim() && grupos.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary">
          No encontramos “{q}”. Probá con otro nombre.
        </Text>
      ) : null}
      {grupos.map(({ categoria, muestra, lista }) => (
        <View key={categoria} style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Icon name={iconoDeRubro[muestra.rubro]} size={18} color={colors.inkSecondary} />
            <Text variant="bodyMd" weight="semibold" tone="inkSecondary">
              {nombreDeRubro(muestra)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {lista.map((c) =>
              marcados.includes(c.id) ? (
                <ChipMarcado
                  key={c.id}
                  comercio={c}
                  activo={activo === c.id}
                  onTocar={() => onTocar(c)}
                  onQuitar={() => onQuitar(c)}
                />
              ) : (
                <Chip key={c.id} label={c.nombre} icon="agregar" onPress={() => onTocar(c)} />
              ),
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Un comercio marcado: el nombre (tocar muestra su respuesta) y la × para desmarcarlo, con su propia
 * área de toque de 44 pt. Activo = fondo del acento con check (DESIGN.md §5); el de la respuesta lleva además un borde `ink`.
 */
function ChipMarcado({
  comercio,
  activo,
  onTocar,
  onQuitar,
}: {
  comercio: Comercio;
  activo: boolean;
  onTocar: () => void;
  onQuitar: () => void;
}) {
  return (
    <View
      style={{
        minHeight: size.chip,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.control,
        backgroundColor: colors.accent,
        borderWidth: 2,
        borderColor: activo ? colors.ink : colors.accent,
      }}
    >
      <PressableScale
        onPress={onTocar}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        accessibilityLabel={`${comercio.nombre}, marcado`}
        accessibilityHint="Muestra con qué te conviene pagar"
        style={{
          minHeight: size.chip,
          flexDirection: "row",
          alignItems: "center",
          gap: space.xs,
          paddingLeft: space.lg,
          paddingRight: space.xs,
        }}
      >
        <Icon name="check" size={16} color={colors.onAccent} />
        <Text variant="bodyMd" weight="medium" style={{ color: colors.onAccent }}>
          {comercio.nombre}
        </Text>
      </PressableScale>
      <Pressable
        onPress={onQuitar}
        accessibilityRole="button"
        accessibilityLabel={`Desmarcar ${comercio.nombre}`}
        hitSlop={4}
        style={{
          width: size.hit,
          minHeight: size.chip,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="cerrar" size={16} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}
