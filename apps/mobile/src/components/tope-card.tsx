import { View } from "react-native";
import type { TopeMedio } from "@/data/contracts";
import { pesos } from "@/lib/format";
import { colors, radius, space } from "@/theme";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Icon, iconoDeRubro } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";
import { TopeBar } from "./tope-bar";

function EstadoBadge({ t }: { t: TopeMedio }) {
  if (t.estado === "queda-poco") return <Badge label="Queda poco" tone="warning" />;
  if (t.estado === "agotado") return <Badge label="Tope agotado" tone="error" icon="bloqueo" />;
  return null;
}

/** Resumen corto para la grilla de Inicio. */
export function TopeResumen({ t }: { t: TopeMedio }) {
  return (
    <View
      accessible
      accessibilityLabel={etiqueta(t)}
      style={{
        flex: 1,
        minWidth: 0,
        gap: space.sm,
        padding: space.lg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Avatar letras={t.medio.inicial} size={28} />
        <Text variant="label" weight="semibold" style={{ flex: 1 }}>
          {t.medio.nombre}
        </Text>
      </View>
      <EstadoBadge t={t} />
      {t.disponible === null || t.base.tipo !== "compras" ? (
        <Text variant="label" tone="inkSecondary">
          Sin compras {t.periodo === "semana" ? "esta semana" : "este mes"}: todavía no podemos estimar
        </Text>
      ) : t.estado === "agotado" ? (
        <Text variant="label" tone="error">
          {t.reinicio}
        </Text>
      ) : (
        <View>
          <Text variant="titleMd" weight="bold" tabular>
            {t.cifra}
          </Text>
          <Text variant="label" tone="inkSecondary" tabular>
            de {pesos(t.nominal)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }} />
      {t.disponible !== null && t.base.tipo === "compras" ? (
        <TopeBar disponible={t.disponible} nominal={t.nominal} estado={t.estado} />
      ) : null}
      <Text variant="label" tone="inkSecondary">
        {t.base.tipo === "compras" ? t.base.texto : t.promo}
      </Text>
    </View>
  );
}

/**
 * Fila completa para la pestaña Topes. Con `onPress` es tocable y lleva a las compras que lo
 * consumieron (issue #45); sin él, es el encabezado de esa pantalla.
 */
export function TopeDetalle({ t, onPress, conConsejo = true }: { t: TopeMedio; onPress?: () => void; conConsejo?: boolean }) {
  const Contenedor = onPress ? PressableScale : View;
  return (
    <Contenedor
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${etiqueta(t)} Ver las compras que lo consumieron.` : undefined}
      style={{
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View
        accessible={!onPress}
        accessibilityLabel={onPress ? undefined : etiqueta(t)}
        style={{ flexDirection: "row", gap: space.md }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.row,
            backgroundColor: colors.surfaceStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={iconoDeRubro[t.rubro]} size={20} />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="bodyLg" weight="semibold">
            {t.medio.nombre}
          </Text>
          <Text variant="label" tone="inkSecondary">
            {t.promo}
          </Text>
          <EstadoBadge t={t} />
        </View>
        <View style={{ alignItems: "flex-end", maxWidth: "45%" }}>
          {t.disponible !== null && t.base.tipo === "compras" && t.estado !== "agotado" ? (
            <Text variant="titleMd" weight="bold" tabular>
              {t.cifra}
            </Text>
          ) : null}
          <Text variant="label" tone="inkSecondary" tabular align="right">
            {t.disponible !== null && t.estado !== "agotado" ? "de " : "Tope "}
            {pesos(t.nominal)} / {t.periodo}
          </Text>
        </View>
        {onPress ? <Icon name="chevron" size={18} color={colors.inkSecondary} /> : null}
      </View>
      {t.disponible === null || t.base.tipo !== "compras" ? (
        <View style={{ padding: space.md, borderRadius: radius.row, backgroundColor: colors.canvas }}>
          <Text variant="bodyMd" tone="inkSecondary">
            {t.base.texto}
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.xs }}>
          <TopeBar disponible={t.disponible} nominal={t.nominal} estado={t.estado} />
          <Text variant="label" tone={t.estado === "agotado" ? "error" : "inkSecondary"}>
            {t.base.texto} · {t.reinicio}
          </Text>
        </View>
      )}
      {conConsejo && t.consejo ? (
        <View
          style={{
            flexDirection: "row",
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.row,
            backgroundColor: colors.canvas,
          }}
        >
          <Icon name="consejo" size={18} color={colors.inkSecondary} />
          <Text variant="bodyMd" style={{ flex: 1 }}>
            {t.consejo}
          </Text>
        </View>
      ) : null}
    </Contenedor>
  );
}

function etiqueta(t: TopeMedio): string {
  if (t.disponible === null) return `${t.medio.nombre}. ${t.base.texto}`;
  if (t.estado === "agotado") return `${t.medio.nombre}. Tope agotado, ${t.base.texto}. ${t.reinicio}.`;
  const estado = t.estado === "queda-poco" ? "Queda poco. " : "";
  return `${t.medio.nombre}. ${estado}Quedan ${(t.cifra ?? "").replace("≈", "aproximadamente ")} de ${pesos(t.nominal)}, ${t.base.texto}.`;
}
