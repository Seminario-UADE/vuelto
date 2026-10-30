import { View } from "react-native";
import type { Compra } from "@/data/contracts";
import { aprox, fechaCorta, pesos } from "@/lib/format";
import { colors, space } from "@/theme";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { iconoDeRubro } from "./icon";
import { Text } from "./text";

export const etiquetaOrigen = { ticket: "Ticket", excepcion: "Recomendación", manual: "Carga manual" } as const;

/** Fila de compra registrada: comercio, medio, origen, monto y reintegro estimado. */
export function CompraRow({ c, conFecha }: { c: Compra; conFecha?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${c.comercio.nombre}, ${pesos(c.monto)} con ${c.medio.nombre}, ${etiquetaOrigen[c.origen]}. ${
        c.reintegro === null ? "Sin reintegro" : `Te devuelven aproximadamente ${pesos(c.reintegro)}`
      }`}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}
    >
      <Avatar icon={iconoDeRubro[c.comercio.rubro]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLg" weight="semibold">
          {c.comercio.nombre}
        </Text>
        <Text variant="label" tone="inkSecondary">
          {conFecha ? `${fechaCorta(c.fecha)} · ` : ""}
          {c.medio.nombre}
        </Text>
        <Badge label={etiquetaOrigen[c.origen]} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text variant="bodyLg" weight="semibold" tabular>
          {pesos(c.monto)}
        </Text>
        <Text variant="bodyMd" tabular style={{ color: c.reintegro === null ? colors.inkSecondary : colors.accent }}>
          {c.reintegro === null ? "sin reintegro" : `${aprox(c.reintegro)} de vuelta`}
        </Text>
      </View>
    </View>
  );
}
