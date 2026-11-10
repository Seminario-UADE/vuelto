import type { ReactNode } from "react";
import { View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Props = {
  icon: IconName;
  titulo: string;
  valor: string;
  /** La base del estimado o el contexto de la cifra. */
  detalle?: string | null;
};

/**
 * Un dato en un cuadro `surface` (v7, como «Burn rate / Runway» de las referencias): ícono en un
 * cuadrado, la etiqueta, la cifra y su detalle. Van de a dos por fila con `FilaDeDatos`.
 */
export function Dato({ icon, titulo, valor, detalle }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${titulo}: ${valor.replace("≈", "aproximadamente ")}${detalle ? `, ${detalle}` : ""}`}
      style={{
        flex: 1,
        minWidth: 140,
        gap: space.xs,
        padding: space.lg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.badge,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceStrong,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: space.xs,
        }}
      >
        <Icon name={icon} size={16} color={colors.ink} />
      </View>
      <Text variant="label" tone="inkSecondary">
        {titulo}
      </Text>
      <Text variant="titleMd" weight="bold" tabular>
        {valor}
      </Text>
      {detalle ? (
        <Text variant="caption" tone="inkSecondary">
          {detalle}
        </Text>
      ) : null}
    </View>
  );
}

export function FilaDeDatos({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>{children}</View>;
}
