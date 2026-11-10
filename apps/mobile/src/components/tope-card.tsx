import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { TopeMedio } from "@/data/contracts";
import { pesos } from "@/lib/format";
import { colors, radius, rubroColors, space, topeColors } from "@/theme";
import { Avatar } from "./avatar";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";
import { TopeBar } from "./tope-bar";

/** Hay cifra que mostrar: el motor estimó con compras y el tope no está agotado. */
function conCifra(t: TopeMedio): boolean {
  return t.disponible !== null && t.base.tipo === "compras" && t.estado !== "agotado";
}

/** "Queda poco" / "Tope agotado" en texto de color, sin badge (v7: menos píldoras). */
function TextoEstado({ t }: { t: TopeMedio }) {
  if (t.estado !== "queda-poco" && t.estado !== "agotado") return null;
  return (
    <Text variant="label" weight="semibold" style={{ color: topeColors[t.estado].text }}>
      {t.estado === "agotado" ? "Tope agotado" : "Queda poco"}
    </Text>
  );
}

/**
 * Anillo del tope disponible, con el ícono del rubro adentro. Decorativo, sin porcentaje: la
 * cifra con ≈ y su base van en texto al lado (DESIGN.md §5).
 */
function AnilloTope({ t, diametro = 64 }: { t: TopeMedio; diametro?: number }) {
  const trazo = 6;
  const r = (diametro - trazo) / 2;
  const largo = 2 * Math.PI * r;
  const fraccion = t.disponible !== null && t.nominal > 0 ? Math.max(0, Math.min(1, t.disponible / t.nominal)) : 0;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: diametro, height: diametro, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={diametro} height={diametro} style={{ position: "absolute" }}>
        <Circle cx={diametro / 2} cy={diametro / 2} r={r} stroke={colors.divider} strokeWidth={trazo} fill="none" />
        {fraccion > 0 ? (
          <Circle
            cx={diametro / 2}
            cy={diametro / 2}
            r={r}
            stroke={topeColors[t.estado].bar}
            strokeWidth={trazo}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${largo * fraccion} ${largo}`}
            transform={`rotate(-90 ${diametro / 2} ${diametro / 2})`}
          />
        ) : null}
      </Svg>
      <Icon name={iconoDeRubro[t.rubro]} size={22} color={rubroColors[t.rubro].fg} />
    </View>
  );
}

/**
 * Fila compacta para Inicio (v7): el medio, cuánto queda con ≈, la barra y la base. Tocable:
 * lleva a las compras que consumieron el tope.
 */
export function TopeFila({ t, onPress }: { t: TopeMedio; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta(t)} Ver las compras que lo consumieron.`}
      style={{ gap: space.sm, paddingVertical: space.md }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar letras={t.medio.inicial} forma="cuadrado" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyLg" weight="semibold" numberOfLines={1}>
            {t.medio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary" numberOfLines={1}>
            {t.promo}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {conCifra(t) ? (
            <Text variant="bodyLg" weight="bold" tabular>
              {t.cifra}
            </Text>
          ) : (
            <TextoEstado t={t} />
          )}
          <Text variant="label" tone="inkSecondary" tabular>
            de {pesos(t.nominal)}
          </Text>
        </View>
      </View>
      {t.disponible !== null && t.base.tipo === "compras" ? (
        <TopeBar disponible={t.disponible} nominal={t.nominal} estado={t.estado} />
      ) : null}
      <Text variant="label" tone={t.estado === "agotado" ? "error" : "inkSecondary"}>
        {t.estado === "agotado" ? `${t.base.texto} · ${t.reinicio}` : t.base.texto}
      </Text>
    </PressableScale>
  );
}

/**
 * Tarjeta de un tope (pestaña Topes y encabezado de «Compras del tope»): el anillo con el rubro,
 * el medio y la promo, cuánto queda con ≈ y, al pie, la base y cuándo se reinicia. Con `onPress`
 * es tocable y lleva a las compras que lo consumieron (issue #45).
 */
export function TopeDetalle({ t, onPress }: { t: TopeMedio; onPress?: () => void }) {
  const Contenedor = onPress ? PressableScale : View;
  return (
    <Contenedor
      onPress={onPress}
      accessible={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${etiqueta(t)} Ver las compras que lo consumieron.` : etiqueta(t)}
      style={{
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
        <AnilloTope t={t} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyLg" weight="semibold">
            {t.medio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary">
            {t.promo}
          </Text>
          {conCifra(t) ? (
            <Text variant="titleMd" weight="bold" tabular style={{ marginTop: space.xs }}>
              {t.cifra}{" "}
              <Text variant="label" tone="inkSecondary" weight="medium">
                de {pesos(t.nominal)} por {t.periodo}
              </Text>
            </Text>
          ) : (
            <View style={{ marginTop: space.xs, gap: 2 }}>
              <TextoEstado t={t} />
              <Text variant="label" tone="inkSecondary" tabular>
                Tope de {pesos(t.nominal)} por {t.periodo}
              </Text>
            </View>
          )}
        </View>
        {onPress ? <Icon name="chevron" size={18} color={colors.inkSecondary} /> : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingTop: space.md,
          borderTopWidth: 1,
          borderColor: colors.divider,
        }}
      >
        <Icon name="calendario" size={16} color={colors.inkSecondary} />
        <Text variant="label" tone={t.estado === "agotado" ? "error" : "inkSecondary"} style={{ flex: 1 }}>
          {t.disponible === null || t.base.tipo !== "compras" ? t.base.texto : `${t.base.texto} · ${t.reinicio}`}
        </Text>
      </View>
    </Contenedor>
  );
}

function etiqueta(t: TopeMedio): string {
  if (t.disponible === null) return `${t.medio.nombre}. ${t.base.texto}`;
  if (t.estado === "agotado") return `${t.medio.nombre}. Tope agotado, ${t.base.texto}. ${t.reinicio}.`;
  const estado = t.estado === "queda-poco" ? "Queda poco. " : "";
  return `${t.medio.nombre}. ${estado}Quedan ${(t.cifra ?? "").replace("≈", "aproximadamente ")} de ${pesos(t.nominal)}, ${t.base.texto}.`;
}
