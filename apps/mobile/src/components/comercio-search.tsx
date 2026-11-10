import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { buscarComercios, etiquetaDeComercio, nombreDeRubro, RUBROS_DE_MODO } from "@/data/comercios";
import type { Comercio } from "@/data/contracts";
import { useAppSelector } from "@/store/hooks";
import { selectCatalogoComercios, selectComerciosFrecuentes } from "@/store/selectores";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Chip } from "./chip";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  onElegir: (c: Comercio) => void;
  seleccionado?: string | null;
  /** Fondo sobre el que va: el campo usa el contraste opuesto. */
  sobre?: "surface" | "canvas";
};

/**
 * Buscador de comercios + chips de frecuentes. Tocar uno ya es la pregunta "¿dónde?". Busca en
 * los comercios del corpus guardado, sin red (#43); los habituales que coinciden van primero.
 */
export function ComercioSearch({ onElegir, seleccionado, sobre = "surface" }: Props) {
  const [q, setQ] = useState("");
  const [porRubro, setPorRubro] = useState(false);
  const frecuentes = useAppSelector(selectComerciosFrecuentes);
  const catalogo = useAppSelector(selectCatalogoComercios);
  const lista = useMemo(() => {
    if (!q.trim()) return frecuentes;
    const propios = buscarComercios(frecuentes, q);
    return [...propios, ...buscarComercios(catalogo, q).filter((c) => !propios.some((x) => x.id === c.id))].slice(0, 20);
  }, [q, frecuentes, catalogo]);
  const sinResultados = q.trim() !== "" && lista.length === 0;
  // Con un rubro elegido, los rubros quedan a la vista: se ve cuál es y se puede destocar.
  const rubroElegido = RUBROS_DE_MODO.some((c) => c.id === seleccionado);
  return (
    <View style={{ gap: space.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 48,
          paddingHorizontal: space.lg,
          borderRadius: radius.control,
          backgroundColor: sobre === "surface" ? colors.canvas : colors.surfaceStrong,
        }}
      >
        <Icon name="buscar" size={20} color={colors.inkSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscá comercio o supermercado"
          placeholderTextColor={colors.inkSecondary}
          accessibilityLabel="Buscar comercio"
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={colors.accent}
          style={{ flex: 1, minHeight: 44, fontFamily: fonts.regular, fontSize: escala.bodyLg.fontSize, color: colors.ink }}
        />
      </View>
      {sinResultados ? (
        <Text variant="bodyMd" tone="inkSecondary">
          No encontramos “{q.trim()}”. Elegí el rubro y te decimos con qué pagar.
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {lista.map((c) => (
          <Chip
            key={c.id}
            // Buscando, cada resultado con su rubro (FR-002); en los accesos rápidos, solo si se repite.
            label={q.trim() ? `${c.nombre} · ${nombreDeRubro(c)}` : etiquetaDeComercio(c, lista)}
            selected={seleccionado === c.id}
            accessibilityHint="Muestra con qué te conviene pagar"
            onPress={() => {
              setQ("");
              onElegir(c);
            }}
          />
        ))}
      </View>
      {/* O un rubro sin comercio (spec 004 FR-001): solo aplican las promos de todo el rubro. */}
      {sinResultados || porRubro || rubroElegido ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {RUBROS_DE_MODO.map((c) => (
            <Chip
              key={c.id}
              label={c.nombre}
              selected={seleccionado === c.id}
              accessibilityHint="Muestra con qué te conviene pagar en ese rubro"
              onPress={() => {
                setQ("");
                onElegir(c);
              }}
            />
          ))}
        </View>
      ) : (
        <Pressable
          onPress={() => setPorRubro(true)}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
        >
          <Text variant="bodyMd" weight="semibold" tone="accent">
            ¿No sabés el comercio? Elegí el rubro
          </Text>
        </Pressable>
      )}
    </View>
  );
}
