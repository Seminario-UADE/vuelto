import { View } from "react-native";
import type { PreferenciaTema } from "@/lib/apariencia";
import { hapticoSeleccion } from "@/lib/haptics";
import { colors, radius, space, temas, type Tema } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

const OPCIONES: { valor: PreferenciaTema; label: string }[] = [
  { valor: "sistema", label: "Sistema" },
  { valor: "claro", label: "Claro" },
  { valor: "oscuro", label: "Oscuro" },
];

const ALTO_MINIATURA = 96;

/**
 * Apariencia (v9): tres miniaturas de celular, cada una pintada con los colores reales de su
 * tema; «Sistema» va partida al medio. La elegida lleva el borde del acento y un check. Es un
 * grupo de radios para el lector de pantalla.
 */
export function SelectorApariencia({ valor, onChange }: { valor: PreferenciaTema; onChange: (v: PreferenciaTema) => void }) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Apariencia de la app"
      style={{
        flexDirection: "row",
        gap: space.md,
        padding: space.md,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      {OPCIONES.map((o) => {
        const elegida = o.valor === valor;
        return (
          <PressableScale
            key={o.valor}
            onPress={() => {
              if (!elegida) hapticoSeleccion();
              onChange(o.valor);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegida }}
            accessibilityLabel={o.label}
            style={{ flex: 1, alignItems: "center", gap: space.sm }}
          >
            <View
              style={{
                alignSelf: "stretch",
                height: ALTO_MINIATURA,
                padding: 3,
                borderRadius: radius.tile,
                borderCurve: "continuous",
                borderWidth: 2,
                borderColor: elegida ? colors.accent : colors.transparent,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", borderRadius: radius.row, borderCurve: "continuous", overflow: "hidden" }}>
                {o.valor === "sistema" ? (
                  <>
                    <Miniatura t={temas.claro} recorte="izquierda" />
                    <Miniatura t={temas.oscuro} recorte="derecha" />
                  </>
                ) : (
                  <Miniatura t={o.valor === "claro" ? temas.claro : temas.oscuro} />
                )}
              </View>
              {elegida ? (
                <View
                  style={{
                    position: "absolute",
                    left: space.sm,
                    bottom: space.sm,
                    width: 22,
                    height: 22,
                    borderRadius: radius.pill,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="check" size={14} color={colors.onAccent} />
                </View>
              ) : null}
            </View>
            <Text variant="bodyMd" weight={elegida ? "semibold" : "regular"}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * Una pantalla en miniatura: isla, panel, dos renglones y una tarjeta, con los colores del tema.
 * Partida (Sistema), cada mitad muestra su lado del mismo dibujo.
 */
function Miniatura({ t, recorte }: { t: Tema; recorte?: "izquierda" | "derecha" }) {
  const ancho = recorte ? "200%" : "100%";
  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: t.canvas }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: ancho,
          left: recorte === "derecha" ? "-100%" : 0,
          paddingHorizontal: 8,
          paddingTop: 8,
          gap: 6,
          alignItems: "center",
        }}
      >
        <View style={{ width: 22, height: 6, borderRadius: radius.pill, backgroundColor: t.ink }} />
        <View style={{ alignSelf: "stretch", height: 22, borderRadius: 6, backgroundColor: t.heroBg }} />
        <View style={{ alignSelf: "stretch", gap: 4 }}>
          <View style={{ width: "70%", height: 5, borderRadius: radius.pill, backgroundColor: t.divider }} />
          <View style={{ width: "45%", height: 5, borderRadius: radius.pill, backgroundColor: t.divider }} />
        </View>
        <View style={{ alignSelf: "stretch", flex: 1, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: t.surface }} />
      </View>
    </View>
  );
}
