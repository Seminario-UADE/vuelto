import { View } from "react-native";
import { Card } from "@/components/card";
import { divisor } from "@/components/lista";
import { PorConfirmarFila } from "@/components/por-confirmar-fila";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { aprox, pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectResumenCompras, selectTopes } from "@/store/selectores";
import { colors, radius, space } from "@/theme";

/**
 * Inicio mínimo (DESIGN.md v7 §6): el saludo, una cifra (cuánto te devolvieron este mes, con ≈
 * y su base) y, si hay, las compras por confirmar. Comprar está en el «+»; el detalle, en las
 * otras pestañas. Sin compras, el bloque dice cómo empezar (auditoría v7).
 */
export default function Inicio() {
  const nombre = useAppSelector((s) => s.perfil.nombre);
  const topes = useAppSelector(selectTopes);
  const compras = useAppSelector(selectResumenCompras);
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes);
  const sinCompras = compras.compras.length === 0;
  const { monto, base } = topes.devolvieron;

  return (
    <Screen kind="tab" aboveTabBar>
      <Text variant="titleLg" accessibilityRole="header">
        {nombre ? `Hola, ${nombre}` : "Hola"}
      </Text>

      <View
        accessible
        accessibilityLabel={
          sinCompras
            ? "Todavía no registraste compras. Tocá el botón Comprar cuando estés por pagar."
            : `Este mes te devolvieron aproximadamente ${pesos(monto)}, ${base.texto}`
        }
        style={{
          backgroundColor: colors.decisionBg,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding: space.xxl,
          gap: space.sm,
          minHeight: 180,
          justifyContent: "flex-end",
        }}
      >
        {sinCompras ? (
          <>
            <Text variant="titleMd" style={{ color: colors.onDecision }}>
              Todavía no registraste compras
            </Text>
            <Text variant="bodyLg" style={{ color: colors.onDecisionMuted }}>
              Tocá + cuando estés por pagar y te decimos con qué.
            </Text>
          </>
        ) : (
          <>
            <Text variant="label" style={{ color: colors.onDecisionMuted }}>
              Este mes te devolvieron
            </Text>
            <Text variant="display" tabular style={{ color: colors.onDecision, fontSize: 48, lineHeight: 54 }}>
              {aprox(monto)}
            </Text>
            <Text variant="label" style={{ color: colors.onDecisionMuted }}>
              {base.texto}
            </Text>
          </>
        )}
      </View>

      {porConfirmar.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="inkSecondary">
            Por confirmar
          </Text>
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {porConfirmar.map((c, i) => (
              <View key={c.id} style={divisor(i)}>
                <PorConfirmarFila c={c} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
