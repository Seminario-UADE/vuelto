import { router } from "expo-router";
import { View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { aprox } from "@/lib/format";
import { colors, radius, sombras, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { useEsquema, useTema } from "./tema-provider";
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

const ACCIONES: { icon: IconName; label: string; ir: () => void }[] = [
  { icon: "comprar", label: "Con qué pagar", ir: () => router.push("/comprar") },
  { icon: "ticket", label: "Escanear ticket", ir: () => router.push("/escanear") },
  { icon: "topes", label: "Tus topes", ir: () => router.push("/topes") },
];

/**
 * Panel de Inicio (DESIGN.md v8 §6): una superficie oscura con margen, no una banda. El degradé es
 * tono sobre tono (`heroBg` → `heroBgHi`), solo en la superficie y nunca en el texto. Arriba, quién
 * sos; al centro, lo que te devolvieron con el «≈» y la base atenuados; abajo, tres atajos. Los
 * radios son concéntricos: panel 28, padding 16, atajos 12.
 */
export function PanelInicio({ nombre, fecha, devolvieron, etiqueta }: Props) {
  const t = useTema();
  const sombra = sombras[useEsquema()].cabecera;
  const inicial = (nombre ?? "").trim().charAt(0).toUpperCase();
  return (
    <View
      style={{
        borderRadius: radius.sheet,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: colors.heroBg,
        boxShadow: sombra,
        padding: space.lg,
        gap: space.xl,
      }}
    >
      <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Defs>
          <RadialGradient id="panelInicio" cx="0.5" cy="0" r="1.1">
            <Stop offset="0" stopColor={t.heroBgHi} />
            <Stop offset="1" stopColor={t.heroBg} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#panelInicio)" />
      </Svg>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 40,
            height: 40,
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
          <Text variant="titleMd" accessibilityRole="header" numberOfLines={1} style={{ color: colors.onHero }}>
            {nombre ? `Hola, ${nombre}` : "Hola"}
          </Text>
          <Text variant="label" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
            {fecha}
          </Text>
        </View>
      </View>

      <View accessible accessibilityLabel={etiqueta} style={{ alignItems: "center", gap: space.xs, paddingVertical: space.sm }}>
        {devolvieron ? (
          <>
            <Text variant="bodyMd" style={{ color: colors.onHeroMuted }}>
              Este mes te devolvieron
            </Text>
            <Text variant="display" tabular style={{ color: colors.onHero, fontSize: 52, lineHeight: 58 }}>
              <Text variant="display" style={{ color: colors.onHeroMuted, fontSize: 52, lineHeight: 58 }}>
                ≈
              </Text>
              {aprox(devolvieron.monto).slice(1)}
            </Text>
            <Text variant="label" align="center" style={{ color: colors.onHeroMuted }}>
              {devolvieron.base}
            </Text>
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

      <View style={{ flexDirection: "row", gap: space.sm }}>
        {ACCIONES.map((a) => (
          <PressableScale
            key={a.label}
            onPress={a.ir}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={{
              flex: 1,
              minHeight: 76,
              alignItems: "center",
              justifyContent: "center",
              gap: space.sm,
              paddingHorizontal: space.xs,
              borderRadius: radius.row,
              borderCurve: "continuous",
              backgroundColor: colors.heroSurface,
            }}
          >
            <Icon name={a.icon} size={22} color={colors.onHero} />
            <Text variant="label" align="center" weight="semibold" maxFontSizeMultiplier={1.3} style={{ color: colors.onHero }}>
              {a.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
