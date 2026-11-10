import { router } from "expo-router";
import { View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { pesos } from "@/lib/format";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PanelSuperior } from "./panel-superior";
import { PressableScale } from "./pressable-scale";
import { useTema } from "./tema-provider";
import { Text } from "./text";

type Props = {
  nombre: string | null;
  /** Fecha larga ya formateada. */
  fecha: string;
  /** `null` = todavía no hay compras. */
  devolvieron: { monto: number; base: string } | null;
  /** Lo que lee el lector de pantalla del bloque del monto. */
  etiqueta: string;
};

/** `label` es lo que se ve (corto, entra en una línea); `a11y`, lo que lee el lector de pantalla. */
const ACCIONES: { icon: IconName; label: string; a11y: string; ir: () => void }[] = [
  { icon: "comprar", label: "Comprar", a11y: "Con qué pagar", ir: () => router.push("/comprar") },
  { icon: "ticket", label: "Escanear", a11y: "Escanear ticket", ir: () => router.push("/escanear") },
  { icon: "topes", label: "Topes", a11y: "Tus topes", ir: () => router.push("/topes") },
  { icon: "comercio", label: "Comercios", a11y: "Comercios", ir: () => router.navigate("/comercios") },
];

const ATAJO = 56;

/**
 * Panel de Inicio (v9): a sangre arriba de todo, como la decisión de «Con qué te conviene pagar»,
 * con el degradé noche → helecho desde arriba al centro (solo en la superficie, nunca en el
 * texto). Arriba, quién sos y un atajo para buscar; al centro, lo que te devolvieron en el mes
 * (el «aproximadamente» en el rótulo, así la cifra queda al eje) con su base en una píldora; abajo,
 * cuatro atajos cuadrados con su nombre debajo.
 */
export function PanelInicio({ nombre, fecha, devolvieron, etiqueta }: Props) {
  const t = useTema();
  const inicial = (nombre ?? "").trim().charAt(0).toUpperCase();
  return (
    <PanelSuperior
      color={colors.heroBg}
      barra="light"
      fondo={
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="panelInicio" cx="0.5" cy="0" r="1">
              <Stop offset="0" stopColor={t.heroBgHi} />
              <Stop offset="1" stopColor={t.heroBg} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#panelInicio)" />
        </Svg>
      }
    >
      <View style={{ gap: space.xl, paddingTop: space.sm, paddingBottom: space.xxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: colors.heroSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="bodyLg" weight="bold" style={{ color: colors.onHero }}>
              {inicial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyLg" weight="semibold" accessibilityRole="header" numberOfLines={1} style={{ color: colors.onHero }}>
              {nombre ? `Hola, ${nombre}` : "Hola"}
            </Text>
            <Text variant="label" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
              {fecha}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push("/comprar")}
            accessibilityRole="search"
            accessibilityLabel="Buscar un comercio para comprar"
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: colors.heroSurface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="buscar" size={20} color={colors.onHero} />
          </PressableScale>
        </View>

        <View accessible accessibilityLabel={etiqueta} style={{ alignItems: "center", gap: space.sm, paddingTop: space.sm }}>
          {devolvieron ? (
            <>
              <Text variant="bodyMd" align="center" style={{ color: colors.onHeroMuted }}>
                Este mes te devolvieron aproximadamente
              </Text>
              <Text
                variant="display"
                align="center"
                tabular
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: colors.onHero, fontSize: 52, lineHeight: 58, letterSpacing: -1.2, alignSelf: "stretch" }}
              >
                {pesos(devolvieron.monto)}
              </Text>
              <View
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs + 2,
                  borderRadius: radius.pill,
                  backgroundColor: colors.heroSurface,
                }}
              >
                <Text variant="label" align="center" style={{ color: colors.onHero }}>
                  {devolvieron.base}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text variant="titleMd" align="center" style={{ color: colors.onHero }}>
                Todavía no registraste compras
              </Text>
              <Text variant="bodyMd" align="center" style={{ color: colors.onHeroMuted }}>
                Tocá «Con qué pagar» cuando estés por pagar.
              </Text>
            </>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: space.sm }}>
          {ACCIONES.map((a) => (
            <PressableScale
              key={a.label}
              onPress={a.ir}
              accessibilityRole="button"
              accessibilityLabel={a.a11y}
              style={{ flex: 1, alignItems: "center", gap: space.sm }}
            >
              <View
                style={{
                  width: ATAJO,
                  height: ATAJO,
                  borderRadius: radius.tile,
                  borderCurve: "continuous",
                  backgroundColor: colors.heroSurface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={a.icon} size={24} color={colors.onHero} />
              </View>
              <Text variant="label" align="center" weight="semibold" numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ color: colors.onHero }}>
                {a.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>
    </PanelSuperior>
  );
}
