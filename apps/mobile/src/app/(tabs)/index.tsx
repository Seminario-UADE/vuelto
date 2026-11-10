import { router } from "expo-router";
import { View } from "react-native";
import { Card } from "@/components/card";
import { CompraRow } from "@/components/compra-row";
import { divisor } from "@/components/lista";
import { PorConfirmarFila } from "@/components/por-confirmar-fila";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import { TopeFila } from "@/components/tope-card";
import { aprox, fechaLarga, pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectHoy, selectResumenCompras, selectTopes } from "@/store/selectores";
import { colors, radius, space } from "@/theme";

const TOPES_EN_INICIO = 3;
const COMPRAS_EN_INICIO = 3;

/**
 * Inicio (DESIGN.md v7 §6), de arriba abajo como las referencias: el bloque oscuro con lo que te
 * devolvieron (≈ y su base) y lo gastado; las compras por confirmar, si hay; tus topes (los
 * primeros tres, «Ver todos» abre Topes) y las últimas compras («Ver todas» va a Compras).
 * Comprar está en el «+».
 */
export default function Inicio() {
  const nombre = useAppSelector((s) => s.perfil.nombre);
  const hoy = useAppSelector(selectHoy);
  const topes = useAppSelector(selectTopes);
  const compras = useAppSelector(selectResumenCompras);
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes);
  const sinCompras = compras.compras.length === 0;
  const { monto, base } = topes.devolvieron;
  const ultimas = [...compras.compras].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, COMPRAS_EN_INICIO);

  return (
    <Screen kind="tab" aboveTabBar gap={space.xl}>
      <View style={{ gap: 2 }}>
        <Text variant="titleLg" accessibilityRole="header">
          {nombre ? `Hola, ${nombre}` : "Hola"}
        </Text>
        <Text variant="bodyMd" tone="inkSecondary">
          {fechaLarga(hoy).replace(/^./, (c) => c.toUpperCase())}
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel={
          sinCompras
            ? "Todavía no registraste compras. Tocá el botón Comprar cuando estés por pagar."
            : `Este mes te devolvieron aproximadamente ${pesos(monto)}, ${base.texto}. Gastaste ${pesos(compras.gastaste)} en ${compras.cantidadDelMes} compras.`
        }
        style={{
          backgroundColor: colors.decisionBg,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding: space.xl,
          gap: space.sm,
        }}
      >
        {sinCompras ? (
          <View style={{ gap: space.sm, minHeight: 120, justifyContent: "flex-end" }}>
            <Text variant="titleMd" style={{ color: colors.onDecision }}>
              Todavía no registraste compras
            </Text>
            <Text variant="bodyLg" style={{ color: colors.onDecisionMuted }}>
              Tocá + cuando estés por pagar y te decimos con qué.
            </Text>
          </View>
        ) : (
          <>
            <Text variant="label" style={{ color: colors.onDecisionMuted }}>
              Este mes te devolvieron
            </Text>
            <Text variant="display" tabular style={{ color: colors.onDecision, fontSize: 44, lineHeight: 50 }}>
              {aprox(monto)}
            </Text>
            <Text variant="label" style={{ color: colors.onDecisionMuted }}>
              {base.texto}
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginTop: space.md,
                paddingTop: space.lg,
                borderTopWidth: 1,
                borderColor: colors.decisionSurface,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" style={{ color: colors.onDecisionMuted }}>
                  Gastaste
                </Text>
                <Text variant="titleMd" weight="bold" tabular style={{ color: colors.onDecision }}>
                  {pesos(compras.gastaste)}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.decisionSurface, marginHorizontal: space.lg }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" style={{ color: colors.onDecisionMuted }}>
                  Compras
                </Text>
                <Text variant="titleMd" weight="bold" tabular style={{ color: colors.onDecision }}>
                  {compras.cantidadDelMes}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {porConfirmar.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Por confirmar" />
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {porConfirmar.map((c, i) => (
              <View key={c.id} style={divisor(i)}>
                <PorConfirmarFila c={c} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {topes.medios.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Tus topes" action={{ label: "Ver todos", onPress: () => router.push("/topes") }} />
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {topes.medios.slice(0, TOPES_EN_INICIO).map((t, i) => (
              <View key={t.clave} style={divisor(i)}>
                <TopeFila
                  t={t}
                  onPress={() => router.push({ pathname: "/tope/[clave]", params: { clave: t.clave } })}
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {ultimas.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Últimas compras" action={{ label: "Ver todas", onPress: () => router.navigate("/compras") }} />
          <Card padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
            {ultimas.map((c, i) => (
              <View key={c.id} style={divisor(i)}>
                <CompraRow c={c} conFecha />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
