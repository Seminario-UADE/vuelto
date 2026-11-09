import type { BottomTabBarProps } from "expo-router/js-tabs";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { hapticoLeve } from "@/lib/haptics";
import { colors, floatingShadow, radius, size, space } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

/** Ruta ficticia del «+»: no es una pantalla, abre el flujo de compra. */
export const RUTA_COMPRAR = "nueva";

const TABS: Record<string, { titulo: string; icon: IconName }> = {
  index: { titulo: "Inicio", icon: "inicio" },
  topes: { titulo: "Topes", icon: "topes" },
  comercios: { titulo: "Comercios", icon: "comercio" },
  perfil: { titulo: "Perfil", icon: "perfil" },
};

/** Alto que ocupa la barra sin la zona segura (las pantallas no necesitan reservarlo: va en el flujo). */
const ALTO_CAPSULA = 64;
const DIAMETRO_MAS = 60;

/**
 * Barra de DESIGN.md v7 §5: una cápsula flotante con Inicio · Topes · ( + ) · Comercios · Perfil.
 * El «+» es la acción principal (comprar): más grande, en el acento, y abre el flujo /comprar en
 * vez de cambiar de pestaña. Accesible como una tab bar nativa: rol de pestaña, estado
 * seleccionado, 44 pt de área táctil, y se oculta con el teclado.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const teclado = useTecladoVisible();
  if (teclado) return null;
  return (
    <View
      style={{
        backgroundColor: colors.canvas,
        paddingHorizontal: space.gutter,
        paddingTop: space.sm,
        paddingBottom: Math.max(insets.bottom, space.md),
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: ALTO_CAPSULA,
          borderRadius: radius.pill,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          boxShadow: floatingShadow,
          paddingHorizontal: space.sm,
        }}
      >
        {state.routes.map((route, i) => {
          if (route.name === RUTA_COMPRAR) {
            return <BotonComprar key={route.key} />;
          }
          const def = TABS[route.name];
          if (!def || !descriptors[route.key]) return null;
          const activa = i === state.index;
          const tocar = () => {
            const ev = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!activa && !ev.defaultPrevented) {
              hapticoLeve();
              navigateToTab(route.key);
            }
          };
          const tinta = activa ? colors.accent : colors.inkSecondary;
          return (
            <Pressable
              key={route.key}
              onPress={tocar}
              accessibilityRole="tab"
              accessibilityLabel={def.titulo}
              accessibilityState={{ selected: activa }}
              aria-selected={activa}
              style={{ flex: 1, minHeight: size.hit, alignItems: "center", justifyContent: "center", gap: 2 }}
            >
              <Icon name={def.icon} activo={activa} size={22} color={tinta} />
              <Text
                variant="caption"
                maxFontSizeMultiplier={1.15}
                weight={activa ? "semibold" : "medium"}
                style={{ color: tinta, letterSpacing: 0 }}
              >
                {def.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BotonComprar() {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Pressable
        onPress={() => {
          hapticoLeve();
          router.push("/comprar");
        }}
        accessibilityRole="button"
        accessibilityLabel="Comprar"
        accessibilityHint="Te decimos con qué pagar y registrás la compra"
        style={({ pressed }) => ({
          width: DIAMETRO_MAS,
          height: DIAMETRO_MAS,
          marginTop: -space.xl,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: colors.canvas,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Icon name="agregar" size={28} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener(process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () =>
      setVisible(true),
    );
    const ocultar = Keyboard.addListener(process.env.EXPO_OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () =>
      setVisible(false),
    );
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return visible;
}
