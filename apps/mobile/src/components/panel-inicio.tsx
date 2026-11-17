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
  /** Nombre del mes en curso ("noviembre"), para el rótulo del monto. */
  mes: string;
  /** `null` = todavía no hay compras. */
  devolvieron: { monto: number; base: string } | null;
  /** Lo que lee el lector de pantalla del bloque del monto. */
  etiqueta: string;
};

type Accion = { icon: IconName; label: string; a11y: string; ir: () => void; principal?: boolean };

/**
 * `label` es lo que se ve (corto, entra en una línea); `a11y`, lo que lee el lector de pantalla.
 * «Con qué pago» es la razón de ser de Vuelto: el único atajo relleno. Topes no va: la torta de
 * abajo ya lleva ahí.
 */
const ACCIONES: Accion[] = [
  { icon: "comprar", label: "Con qué pago", a11y: "Con qué pagar", ir: () => router.push("/comprar"), principal: true },
  { icon: "ticket", label: "Escanear", a11y: "Escanear ticket", ir: () => router.push("/escanear") },
  { icon: "grupo", label: "Contactos", a11y: "Contactos para el gasto en grupo", ir: () => router.push("/contactos") },
  { icon: "comercio", label: "Comercios", a11y: "Comercios", ir: () => router.navigate("/comercios") },
];

const ATAJO = 56;

/**
 * Panel de Inicio (v10): a sangre arriba de todo y sin esquinas abajo, porque el resto de Inicio
 * sube encima como una hoja (`Hoja`). Un brillo verde arriba al centro que se funde hacia el borde
 * (en el oscuro, con el fondo de la pantalla; en el claro, con un verde hondo: el panel es oscuro en
 * los dos temas). Arriba, quién sos y un atajo para buscar; al centro, lo que te devolvieron en el
 * mes, con el «≈» atenuado delante de la cifra y la base en una píldora; abajo, cuatro atajos.
 */
export function PanelInicio({ nombre, fecha, mes, devolvieron, etiqueta }: Props) {
  const t = useTema();
  const inicial = (nombre ?? "").trim().charAt(0).toUpperCase();
  return (
    <PanelSuperior
      color={colors.heroBg}
      barra="light"
      redondeado={false}
      fondo={
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="panelInicio" cx="0.5" cy="0.18" rx="0.95" ry="0.85" fx="0.5" fy="0.18">
              <Stop offset="0" stopColor={t.heroBgHi} />
              <Stop offset="1" stopColor={t.heroBg} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#panelInicio)" />
        </Svg>
      }
    >
      {/* Abajo deja lugar para que la hoja suba encima (radius.sheet) sin tapar los atajos. */}
      <View style={{ gap: space.xl, paddingTop: space.sm, paddingBottom: space.md + radius.sheet }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View
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

        <View accessible accessibilityLabel={etiqueta} style={{ alignItems: "center", gap: space.sm }}>
          {devolvieron ? (
            <>
              <Text variant="bodyMd" align="center" style={{ color: colors.onHeroMuted }}>
                Te devolvieron en {mes}
              </Text>
              <Text
                variant="display"
                align="center"
                tabular
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: colors.onHero, fontSize: 52, lineHeight: 58, letterSpacing: -1.2, alignSelf: "stretch" }}
              >
                <Text style={{ color: colors.onHeroMuted, fontSize: 34, letterSpacing: 0 }}>≈</Text>
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
                Tocá «Con qué pago» cuando estés por pagar.
              </Text>
            </>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
                  backgroundColor: a.principal ? colors.heroAccent : colors.heroSurface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={a.icon} size={24} color={a.principal ? colors.onHeroAccent : colors.onHero} />
              </View>
              <Text
                variant="label"
                align="center"
                weight="semibold"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                maxFontSizeMultiplier={1.3}
                style={{ color: colors.onHero, alignSelf: "stretch", paddingHorizontal: 2 }}
              >
                {a.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>
    </PanelSuperior>
  );
}
