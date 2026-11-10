import { router } from "expo-router";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { UsoDeTopes } from "@/data/contracts";
import { aprox, pesos } from "@/lib/format";
import { colors, space } from "@/theme";
import { Card } from "./card";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { useTema } from "./tema-provider";
import { Text } from "./text";

const TAMANO = 112;
const TRAZO = 14;
const RADIO = (TAMANO - TRAZO) / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Un arco nunca menor a esto, para que un tope casi agotado se siga viendo. */
const MINIMO = 0.03;

/**
 * Gráfico de torta de Inicio (v9): cuánto tope te queda, todos tus topes sumados. Un anillo
 * minimalista (pista hundida, arco en el acento con puntas redondas) con el porcentaje al centro,
 * y al lado la cifra estimada y su base (Principio V). Tocar abre Topes.
 */
export function TortaTopes({ uso }: { uso: UsoDeTopes }) {
  const t = useTema();
  const arco = uso.queda === 0 ? 0 : Math.max(MINIMO, uso.queda);
  const porcentaje = Math.round(uso.queda * 100);
  return (
    <PressableScale
      onPress={() => router.push("/topes")}
      accessibilityRole="button"
      accessibilityLabel={`Te quedan aproximadamente ${pesos(uso.disponible)} de ${pesos(uso.nominal)} de tope, ${porcentaje} por ciento, ${uso.base}. Ver tus topes.`}
    >
      <Card padding={space.lg}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
          <View style={{ width: TAMANO, height: TAMANO, alignItems: "center", justifyContent: "center" }}>
            <Svg width={TAMANO} height={TAMANO} style={{ position: "absolute" }}>
              <Circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} stroke={t.surfaceStrong} strokeWidth={TRAZO} fill="none" />
              {arco > 0 ? (
                <Circle
                  cx={TAMANO / 2}
                  cy={TAMANO / 2}
                  r={RADIO}
                  stroke={t.accent}
                  strokeWidth={TRAZO}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${CIRCUNFERENCIA * arco} ${CIRCUNFERENCIA}`}
                  // Arranca arriba (a las 12) y gira en el sentido del reloj.
                  transform={`rotate(-90 ${TAMANO / 2} ${TAMANO / 2})`}
                />
              ) : null}
            </Svg>
            <Text variant="titleMd" weight="bold" tabular>
              ≈{porcentaje}%
            </Text>
            <Text variant="caption" tone="inkSecondary">
              te queda
            </Text>
          </View>

          <View style={{ flex: 1, gap: space.xs }}>
            <Text variant="label" tone="inkSecondary">
              Tope que te queda
            </Text>
            <Text variant="titleLg" tabular adjustsFontSizeToFit numberOfLines={1}>
              {aprox(uso.disponible)}
            </Text>
            <Text variant="label" tone="inkSecondary" tabular>
              de {pesos(uso.nominal)} en {uso.topes} {uso.topes === 1 ? "tope" : "topes"}
            </Text>
            <Text variant="caption" tone="inkSecondary">
              {uso.base}
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.inkSecondary} />
        </View>
      </Card>
    </PressableScale>
  );
}
