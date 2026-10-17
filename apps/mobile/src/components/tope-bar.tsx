import { useId, useState } from "react";
import { View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import type { EstadoTope } from "@/data/contracts";
import { colors, topeColors } from "@/theme";

type Props = {
  disponible: number;
  nominal: number;
  estado: EstadoTope;
  /** Sobre la tarjeta oscura. */
  onDecision?: boolean;
};

const ALTO = 8;

/**
 * Barra del tope disponible. El relleno termina en un tramo rayado para marcar que el valor
 * es estimado (DESIGN.md §5). Sin porcentajes. Es decorativa: la cifra y la base están en
 * texto al lado.
 */
export function TopeBar({ disponible, nominal, estado, onDecision }: Props) {
  const [ancho, setAncho] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const color = onDecision ? colors.onDecisionAccent : topeColors[estado].bar;
  const pista = onDecision ? colors.decisionSurface : colors.divider;
  const fraccion = nominal > 0 ? Math.max(0, Math.min(1, disponible / nominal)) : 0;
  const lleno = ancho * fraccion;
  const rayado = lleno > 0 ? Math.min(Math.max(lleno * 0.25, 10), 28, lleno) : 0;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={{ height: ALTO, width: "100%" }}
    >
      {ancho > 0 ? (
        <Svg width={ancho} height={ALTO}>
          <Defs>
            <Pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Rect width={3} height={6} fill={color} />
            </Pattern>
          </Defs>
          <Rect width={ancho} height={ALTO} rx={ALTO / 2} fill={pista} />
          {lleno - rayado > 0 ? <Rect width={lleno - rayado + ALTO / 2} height={ALTO} rx={ALTO / 2} fill={color} /> : null}
          {rayado > 0 ? (
            <Rect x={lleno - rayado} width={rayado} height={ALTO} rx={lleno - rayado > 0 ? 0 : ALTO / 2} fill={`url(#${id})`} />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
