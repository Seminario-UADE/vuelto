import { useState } from "react";
import { TextInput, View } from "react-native";
import * as api from "@/data/api";
import type { Comercio } from "@/data/contracts";
import { useAsync } from "@/hooks/use-async";
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

/** Buscador de comercios + chips de frecuentes. Tocar uno ya es la pregunta "¿dónde?". */
export function ComercioSearch({ onElegir, seleccionado, sobre = "surface" }: Props) {
  const [q, setQ] = useState("");
  const frecuentes = useAsync(() => api.getComerciosFrecuentes());
  const resultados = useAsync(() => api.buscarComercios(q), q);
  const lista = q.trim() ? (resultados.datos ?? []) : (frecuentes.datos ?? []);
  return (
    <View style={{ gap: space.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: 48,
          paddingHorizontal: space.lg,
          borderRadius: radius.pill,
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
      {q.trim() && resultados.estado === "listo" && lista.length === 0 ? (
        <Text variant="bodyMd" tone="inkSecondary">
          No encontramos “{q.trim()}”. Probá con otro nombre.
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {lista.map((c) => (
          <Chip
            key={c.id}
            label={c.nombre}
            selected={seleccionado === c.id}
            accessibilityHint="Muestra con qué te conviene pagar"
            onPress={() => {
              setQ("");
              onElegir(c);
            }}
          />
        ))}
      </View>
    </View>
  );
}
