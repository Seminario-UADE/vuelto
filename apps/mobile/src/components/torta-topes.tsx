import { router } from "expo-router";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { TramoDeUso, UsoDeTopes } from "@/data/contracts";
import { aprox, pesos } from "@/lib/format";
import { colors, space, type Tema } from "@/theme";
import { Card } from "./card";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { useTema } from "./tema-provider";
import { Text } from "./text";

const TAMANO = 96;
const TRAZO = 12;
const RADIO = (TAMANO - TRAZO) / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Un tramo nunca menor a esto (fracción del anillo), para que un tope casi agotado se siga viendo. */
const MINIMO = 0.02;
/** Separación entre tramos, en fracción del anillo. */
const HUECO = 0.012;
/** Cuántos medios nombra la leyenda; el resto va como «y N más». */
const EN_LEYENDA = 3;

/** Colores de los tramos en orden. El estado manda sobre el orden: queda poco → advertencia. */
const SERIE = ["accent", "accent2", "rubroGastro", "rubroHogar"] as const satisfies readonly (keyof Tema)[];

function colorDeTramo(t: Tema, tramo: TramoDeUso, i: number): string {
  if (tramo.estado === "queda-poco") return t.warning;
  if (tramo.estado === "agotado") return t.error;
  return t[SERIE[i % SERIE.length]!];
}

/**
 * Anillo de Inicio (v10): cuánto tope te queda, sumando los que ya usaste este mes (issue #149),
 * con un tramo por medio (como el anillo segmentado de la referencia). Cada tramo mide lo que le
 * queda a ese tope sobre el total; lo que falta para cerrar el círculo es lo ya usado. El tramo que
 * queda poco va en advertencia y lo dice la leyenda en texto. Al lado, la cifra estimada y su base
 * (Principio V). Sin compras no hay suma: lo dice y lleva a Topes. Tocar abre Topes.
 */
export function TortaTopes({ uso }: { uso: UsoDeTopes }) {
  const t = useTema();
  if (uso.topes === 0) return <SinTopesUsados texto={uso.base} />;
  const porcentaje = Math.round(uso.queda * 100);
  const conHueco = uso.tramos.filter((x) => x.disponible > 0).length > 1;
  const fracciones = uso.tramos.map((tramo) =>
    uso.nominal > 0 && tramo.disponible > 0 ? Math.max(MINIMO, tramo.disponible / uso.nominal) : 0,
  );
  const arcos = uso.tramos.map((tramo, i) => ({
    clave: tramo.clave,
    color: colorDeTramo(t, tramo, i),
    largo: Math.max(0, fracciones[i]! - (conHueco ? HUECO : 0)),
    // Arranca donde terminó el anterior.
    inicio: fracciones.slice(0, i).reduce((n, f) => n + f, 0),
  }));
  const leyenda = uso.tramos.slice(0, EN_LEYENDA);
  const resto = uso.tramos.length - leyenda.length;
  return (
    <PressableScale
      onPress={() => router.push("/topes")}
      accessibilityRole="button"
      accessibilityLabel={`Te quedan aproximadamente ${pesos(uso.disponible)} de ${pesos(uso.nominal)} de tope, ${porcentaje} por ciento, ${uso.base}. ${uso.tramos
        .filter((x) => x.estado !== "disponible")
        .map((x) => `${x.nombre}: ${x.estado === "agotado" ? "agotado" : "queda poco"}.`)
        .join(" ")} Ver tus topes.`}
    >
      <Card padding={space.lg}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <View style={{ width: TAMANO, height: TAMANO, alignItems: "center", justifyContent: "center" }}>
            <Svg width={TAMANO} height={TAMANO} style={{ position: "absolute" }}>
              <Circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} stroke={t.surfaceStrong} strokeWidth={TRAZO} fill="none" />
              {arcos.map((a) =>
                a.largo > 0 ? (
                  <Circle
                    key={a.clave}
                    cx={TAMANO / 2}
                    cy={TAMANO / 2}
                    r={RADIO}
                    stroke={a.color}
                    strokeWidth={TRAZO}
                    fill="none"
                    strokeDasharray={`${CIRCUNFERENCIA * a.largo} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-CIRCUNFERENCIA * a.inicio}
                    // Arranca arriba (a las 12) y gira en el sentido del reloj.
                    transform={`rotate(-90 ${TAMANO / 2} ${TAMANO / 2})`}
                  />
                ) : null,
              )}
            </Svg>
            <Text variant="bodyLg" weight="bold" tabular>
              {porcentaje}%
            </Text>
            <Text variant="caption" tone="inkSecondary">
              te queda
            </Text>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" tone="inkSecondary">
              Tope que te queda
            </Text>
            <Text variant="titleLg" tabular adjustsFontSizeToFit numberOfLines={1}>
              {aprox(uso.disponible)}
            </Text>
            <Text variant="label" tone="inkSecondary" tabular>
              de {pesos(uso.nominal)} · {uso.base}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: 2, marginTop: space.xs }}>
              {leyenda.map((tramo, i) => (
                <View key={tramo.clave} style={{ flexDirection: "row", alignItems: "center", gap: space.xs, maxWidth: "100%" }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colorDeTramo(t, tramo, i) }} />
                  <Text variant="caption" tone="inkSecondary" numberOfLines={1} style={{ letterSpacing: 0, flexShrink: 1 }}>
                    {tramo.nombre}
                  </Text>
                  {tramo.estado === "disponible" ? null : (
                    // El estado nunca se corta: el nombre cede lugar antes.
                    <Text variant="caption" weight="semibold" numberOfLines={1} style={{ letterSpacing: 0, flexShrink: 0, color: colorDeTramo(t, tramo, i) }}>
                      {tramo.estado === "agotado" ? "agotado" : "queda poco"}
                    </Text>
                  )}
                </View>
              ))}
              {resto > 0 ? (
                <Text variant="caption" tone="inkSecondary" style={{ letterSpacing: 0 }}>
                  y {resto} más
                </Text>
              ) : null}
            </View>
          </View>
          <Icon name="chevron" size={18} color={colors.inkSecondary} />
        </View>
      </Card>
    </PressableScale>
  );
}

/** Todavía sin compras este mes: ninguna suma que mostrar, solo el camino a Topes (issue #149). */
function SinTopesUsados({ texto }: { texto: string }) {
  return (
    <PressableScale
      onPress={() => router.push("/topes")}
      accessibilityRole="button"
      accessibilityLabel={`${texto}. Ver tus topes.`}
    >
      <Card padding={space.lg}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text variant="label" tone="inkSecondary">
              Tope que te queda
            </Text>
            <Text>{texto}.</Text>
            <Text variant="caption" tone="inkSecondary">
              Cuando registres una compra con promo, acá ves cuánto te queda.
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.inkSecondary} />
        </View>
      </Card>
    </PressableScale>
  );
}
