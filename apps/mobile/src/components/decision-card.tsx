import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors, radius, space } from "@/theme";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Props = {
  /** "Te conviene" + quién/qué, en una sola línea de encabezado (sin rótulo aparte). */
  titulo: string;
  /** Inicial del medio o de quien paga (círculo Champán). */
  inicial?: string | null;
  /** Una línea de razón ("20% en supermercados los miércoles"). */
  razon?: string | null;
  /** Ícono de la razón: check cuando aplica una promo, info cuando no. */
  razonIcon?: IconName;
  /** La cifra (display). `clave` cambia cuando cambia el valor, para el cruce de opacidad. */
  cifra?: { etiqueta: string; valor: string; clave: string } | null;
  /** Dato secundario junto a la cifra ("Te sale ≈$19.600"). */
  secundaria?: string | null;
  /** Línea de tope ("Te quedan ≈$1.600 de tope después de esta compra"). */
  tope?: { texto: string; quedaPoco?: boolean } | null;
  /** Base del estimado, siempre visible si hay cifra estimada (Principio V). */
  base?: string | null;
  children?: ReactNode;
  accessibilityLabel?: string;
};

/**
 * La tarjeta de decisión: la única superficie oscura de la app y solo donde hay una
 * decisión (auditoría P1 #2). Orden fijo: respuesta → razón → cifra → tope → base.
 */
export function DecisionCard({ titulo, inicial, razon, razonIcon = "checkCirculo", cifra, secundaria, tope, base, children, accessibilityLabel }: Props) {
  return (
    <View
      style={{
        backgroundColor: colors.decisionBg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: space.xl,
        gap: space.lg,
      }}
    >
      <View
        accessible
        accessibilityLabel={
          accessibilityLabel ?? [titulo, razon, cifra && `${cifra.etiqueta} ${cifra.valor}`, secundaria, tope?.texto, base].filter(Boolean).join(". ")
        }
        style={{ gap: space.md }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          {inicial ? <Avatar letras={inicial} tone="decision" /> : null}
          <Text variant="titleMd" weight="bold" style={{ flex: 1, color: colors.onDecision }} accessibilityRole="header">
            {titulo}
          </Text>
        </View>
        {razon ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
            <Icon name={razonIcon} size={20} color={colors.onDecisionAccent} />
            <Text variant="bodyMd" style={{ flex: 1, color: colors.onDecision }}>
              {razon}
            </Text>
          </View>
        ) : null}
        {cifra ? (
          <Animated.View key={cifra.clave} entering={FadeIn.duration(150)} style={{ gap: space.xs }}>
            <Text variant="label" style={{ color: colors.onDecisionAccent }}>
              {cifra.etiqueta}
            </Text>
            <Text variant="display" tabular style={{ color: colors.onDecision }} adjustsFontSizeToFit numberOfLines={1}>
              {cifra.valor}
            </Text>
            {secundaria ? (
              <Text variant="bodyMd" weight="semibold" tabular style={{ color: colors.onDecision }}>
                {secundaria}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}
        {tope ? (
          <Text variant="bodyMd" tabular style={{ color: tope.quedaPoco ? colors.onDecisionAccent : colors.onDecision }}>
            {tope.texto}
          </Text>
        ) : null}
        {base ? (
          <Text variant="label" style={{ color: colors.onDecisionMuted }}>
            {base}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
