import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { Text } from "./text";

type ListaProps = {
  children: ReactNode;
  /**
   * Sangría del divisor desde el borde izquierdo: arranca donde arranca el texto. Por defecto, la de
   * una fila con círculo adelante; `0` para filas sin círculo.
   */
  sangria?: number;
  style?: StyleProp<ViewStyle>;
};

/** Sangría por defecto: el padding de la fila, el círculo y el espacio hasta el texto. */
export const SANGRIA_CON_CIRCULO = space.lg + size.avatar + space.md;

/**
 * Lista agrupada (DESIGN.md §5): una tarjeta `surface` de 16 pt con filas y divisores `divider`
 * insetados desde el texto. Reemplaza a las pilas de tarjetas sueltas.
 */
export function ListaAgrupada({ children, sangria = SANGRIA_CON_CIRCULO, style }: ListaProps) {
  const filas = Children.toArray(children).filter(isValidElement);
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden" },
        style,
      ]}
    >
      {filas.map((fila, i) => (
        <Fragment key={fila.key ?? i}>
          {i > 0 ? <View style={{ height: 1, marginLeft: sangria, backgroundColor: colors.divider }} /> : null}
          {fila}
        </Fragment>
      ))}
    </View>
  );
}

type FilaProps = {
  titulo: string;
  /** Detalle en label `inkSecondary` (base, fecha, medio). */
  detalle?: string | null;
  /** Círculo adelante: `<Avatar>` con la inicial o el ícono del rubro. */
  inicio?: ReactNode;
  /** Valor o control a la derecha (monto, chevron, switch). */
  fin?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Fila de una lista agrupada: 64 pt de alto mínimo que crece con Dynamic Type, título en body-lg y
 * detalle debajo. Con `onPress` es un botón y marca el toque con `surfaceStrong`.
 */
export function FilaAgrupada({ titulo, detalle, inicio, fin, onPress, accessibilityLabel, accessibilityHint }: FilaProps) {
  const contenido = (
    <>
      {inicio}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyLg">{titulo}</Text>
        {detalle ? (
          <Text variant="label" tone="inkSecondary">
            {detalle}
          </Text>
        ) : null}
      </View>
      {fin}
    </>
  );
  const base: ViewStyle = {
    minHeight: size.rowMin,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  };
  if (!onPress) {
    return (
      <View style={base} accessible accessibilityLabel={accessibilityLabel}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [titulo, detalle].filter(Boolean).join(". ")}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? { backgroundColor: colors.surfaceStrong } : null]}
    >
      {contenido}
    </Pressable>
  );
}
