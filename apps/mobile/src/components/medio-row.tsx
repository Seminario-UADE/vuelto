import { Pressable, View } from "react-native";
import type { MedioDePago } from "@/data/contracts";
import { colors, radius, size, space } from "@/theme";
import { Avatar } from "./avatar";
import { divisor } from "./lista";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  medio: MedioDePago;
  indice: number;
  /** Sin `onQuitar` la fila no tiene botón (el último medio del perfil, o sin conexión). */
  onQuitar?: () => void;
  quitarDeshabilitado?: boolean;
};

/** Un medio de pago en una lista (issue #41): nombre, tipo y banco, y el botón para quitarlo. */
export function MedioRow({ medio, indice, onQuitar, quitarDeshabilitado }: Props) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, ...divisor(indice) }}
    >
      <Avatar letras={medio.inicial} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyLg" weight="semibold">
          {medio.nombre}
        </Text>
        <Text variant="label" tone="inkSecondary">
          {medio.detalle}
        </Text>
      </View>
      {onQuitar ? (
        <Pressable
          onPress={onQuitar}
          disabled={quitarDeshabilitado}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${medio.nombre}`}
          accessibilityState={{ disabled: Boolean(quitarDeshabilitado) }}
          style={{
            width: size.hit,
            height: size.hit,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            opacity: quitarDeshabilitado ? 0.4 : 1,
          }}
        >
          <Icon name="quitar" size={22} color={colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}
