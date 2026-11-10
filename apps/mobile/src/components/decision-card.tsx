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
  /** Inicial del medio o de quien paga (círculo `onDecisionAccent`). */
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
  /** Versión baja para el pie de pantallas chicas: menos relleno y la razón en una sola línea. */
  compacta?: boolean;
  /**
   * Versión centrada (v9) para «Con qué te conviene pagar»: el medio grande arriba, la cifra
   * enorme debajo y el resto chico. Va sin fondo propio, dentro del `panel` de `Paso`, que la
   * pinta a sangre. `rotulo` va sobre el título y `subtitulo` debajo ("Crédito · Banco Galicia").
   */
  centrada?: boolean;
  rotulo?: string | null;
  subtitulo?: string | null;
  /** Ícono en el círculo grande cuando no hay inicial (sin promo). */
  icono?: IconName;
  children?: ReactNode;
  accessibilityLabel?: string;
};

/**
 * La tarjeta de decisión: la única superficie invertida de la app (bosque en claro, crema en
 * oscuro; DESIGN.md §5) y solo donde hay una decisión (auditoría P1 #2). Orden fijo: respuesta → razón → cifra → tope → base.
 */
export function DecisionCard(props: Props) {
  if (props.centrada && !props.compacta) return <DecisionCentrada {...props} />;
  const { titulo, inicial, razon, razonIcon = "checkCirculo", cifra, secundaria, tope, base, compacta, children, accessibilityLabel } = props;
  return (
    <View
      style={{
        backgroundColor: colors.decisionBg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: compacta ? space.lg : space.xl,
        gap: compacta ? space.md : space.lg,
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
            <Text variant="bodyMd" style={{ flex: 1, color: colors.onDecision }} numberOfLines={compacta ? 1 : undefined}>
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

const AVATAR_CENTRADA = 72;

/** La cifra de la versión centrada: más grande que `display`, como el monto de las referencias. */
const cifraGrande = { fontSize: 56, lineHeight: 62, letterSpacing: -1.2 } as const;

/**
 * Versión centrada: respuesta (medio) → razón → cifra → tope → base, todo al eje. La cifra cambia
 * con el monto con el mismo cruce de opacidad que la versión de siempre.
 */
function DecisionCentrada({ titulo, inicial, icono, rotulo, subtitulo, razon, razonIcon = "checkCirculo", cifra, secundaria, tope, base, children, accessibilityLabel }: Props) {
  return (
    <View style={{ paddingTop: space.lg, paddingBottom: space.section, gap: space.xl }}>
      <View
        accessible
        accessibilityLabel={
          accessibilityLabel ??
          [rotulo ? `${rotulo} ${titulo}` : titulo, subtitulo, razon, cifra && `${cifra.etiqueta} ${cifra.valor}`, secundaria, tope?.texto, base]
            .filter(Boolean)
            .join(". ")
        }
        style={{ alignItems: "center", gap: space.lg }}
      >
        {inicial ? (
          <Avatar letras={inicial} tone="decision" size={AVATAR_CENTRADA} />
        ) : icono ? (
          // Sin medio (sin promo): círculo neutro, no el verde de "te conviene".
          <View
            style={{
              width: AVATAR_CENTRADA,
              height: AVATAR_CENTRADA,
              borderRadius: radius.pill,
              backgroundColor: colors.decisionSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={icono} size={AVATAR_CENTRADA / 2} color={colors.onDecision} />
          </View>
        ) : null}
        <View style={{ alignItems: "center", gap: space.xs }}>
          {rotulo ? (
            <Text variant="label" align="center" style={{ color: colors.onDecisionMuted }}>
              {rotulo}
            </Text>
          ) : null}
          <Text variant="titleLg" align="center" style={{ color: colors.onDecision }} accessibilityRole="header">
            {titulo}
          </Text>
          {subtitulo ? (
            <Text variant="bodyMd" align="center" style={{ color: colors.onDecisionMuted }}>
              {subtitulo}
            </Text>
          ) : null}
        </View>
        {razon ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.row,
              borderCurve: "continuous",
              backgroundColor: colors.decisionSurface,
              maxWidth: "100%",
            }}
          >
            <Icon name={razonIcon} size={18} color={colors.onDecisionAccent} />
            <Text variant="bodyMd" align="center" style={{ flexShrink: 1, color: colors.onDecision }}>
              {razon}
            </Text>
          </View>
        ) : null}
        {cifra ? (
          <Animated.View
            key={cifra.clave}
            entering={FadeIn.duration(150)}
            style={{ alignItems: "center", gap: space.xs, paddingTop: space.sm, alignSelf: "stretch" }}
          >
            <Text variant="label" align="center" style={{ color: colors.onDecisionAccent }}>
              {cifra.etiqueta}
            </Text>
            <Text
              variant="display"
              align="center"
              tabular
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[cifraGrande, { color: colors.onDecision, alignSelf: "stretch" }]}
            >
              {cifra.valor}
            </Text>
            {secundaria ? (
              <Text variant="bodyMd" weight="semibold" align="center" tabular style={{ color: colors.onDecision }}>
                {secundaria}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}
        {tope || base ? (
          <View style={{ alignItems: "center", gap: space.xs }}>
            {tope ? (
              <Text
                variant="bodyMd"
                align="center"
                tabular
                style={{ color: tope.quedaPoco ? colors.onDecisionAccent : colors.onDecision }}
              >
                {tope.texto}
              </Text>
            ) : null}
            {base ? (
              <Text variant="label" align="center" style={{ color: colors.onDecisionMuted }}>
                {base}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}
