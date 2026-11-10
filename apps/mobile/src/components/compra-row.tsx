import { View } from "react-native";
import type { Compra } from "@/data/contracts";
import { aprox, fechaCorta, pesos } from "@/lib/format";
import type { MarcaDeSubida } from "@/store/selectores";
import { colors, rubroColors, size, space } from "@/theme";
import { Avatar } from "./avatar";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

export const etiquetaOrigen = { ticket: "Ticket", excepcion: "Recomendación", manual: "Carga manual" } as const;

type Props = {
  c: Compra;
  conFecha?: boolean;
  /** Si viene, la fila tiene un botón para borrar la compra (spec 010, FR-001). */
  onBorrar?: () => void;
  /** Qué falta para que esté en la cuenta (spec 010, FR-014); sin marca, no se dice nada. */
  marca?: MarcaDeSubida;
};

const TEXTO_MARCA: Record<MarcaDeSubida, string> = {
  "sin-subir": "Sin subir",
  "no-se-pudo": "No se pudo subir",
  "solo-celular": "Solo en este celular",
};

/** Fila de compra registrada: comercio, medio, origen, monto y reintegro estimado. */
export function CompraRow({ c, conFecha, onBorrar, marca }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <View
        accessible
        accessibilityLabel={`${c.comercio.nombre}, ${pesos(c.monto)} con ${c.medio.nombre}, ${etiquetaOrigen[c.origen]}. ${
          c.reintegro === null ? "Sin reintegro" : `Te devuelven aproximadamente ${pesos(c.reintegro)}`
        }${marca ? `. ${TEXTO_MARCA[marca]}` : ""}`}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}
      >
        <Avatar icon={iconoDeRubro[c.comercio.rubro]} forma="cuadrado" rubro={rubroColors[c.comercio.rubro]} />
        <View style={{ flex: 1, gap: 2 }}>
          {/* Comercio y monto arriba; medio y lo que vuelve abajo. El origen solo lo lee el lector de pantalla (v7: menos información). */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm }}>
            <Text variant="bodyLg" weight="semibold" numberOfLines={1} style={{ flex: 1, flexShrink: 1 }}>
              {c.comercio.nombre}
            </Text>
            <Text variant="bodyLg" weight="semibold" tabular>
              {pesos(c.monto)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm }}>
            <Text variant="label" tone="inkSecondary" numberOfLines={1} style={{ flex: 1, flexShrink: 1 }}>
              {conFecha ? `${fechaCorta(c.fecha)} · ` : ""}
              {c.medio.nombre}
            </Text>
            <Text
              variant="label"
              weight="semibold"
              tabular
              style={{ color: c.reintegro === null ? colors.inkSecondary : colors.accent }}
            >
              {c.reintegro === null ? "sin reintegro" : `${aprox(c.reintegro)} de vuelta`}
            </Text>
          </View>
          {marca ? (
            <Text variant="label" tone={marca === "no-se-pudo" ? "error" : "inkSecondary"}>
              {TEXTO_MARCA[marca]}
            </Text>
          ) : null}
        </View>
      </View>
      {onBorrar ? (
        <PressableScale
          onPress={onBorrar}
          accessibilityRole="button"
          accessibilityLabel={`Borrar la compra en ${c.comercio.nombre}`}
          style={{ minWidth: size.hit, minHeight: size.hit, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="quitar" size={22} color={colors.inkSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}
