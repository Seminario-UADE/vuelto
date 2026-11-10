import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/card";
import { CompraRow } from "@/components/compra-row";
import { divisor } from "@/components/lista";
import { PorConfirmarFila } from "@/components/por-confirmar-fila";
import { Screen } from "@/components/screen";
import { useEsquema } from "@/components/tema-provider";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import { TopeFila } from "@/components/tope-card";
import { aprox, fechaLarga, pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectHoy, selectResumenCompras, selectTopes } from "@/store/selectores";
import { colors, radius, sombras, space } from "@/theme";

const TOPES_EN_INICIO = 3;
const COMPRAS_EN_INICIO = 3;

/**
 * Inicio (DESIGN.md v8 §6), de arriba abajo: la banda a todo el ancho con el saludo y lo que te
 * devolvieron (≈ y su base); las compras por confirmar, si hay; tus topes, cada uno en su tarjeta
 * (los primeros tres, «Ver todos» abre Topes) y las últimas compras («Ver todas» va a Compras).
 * Comprar está en el «+».
 */
export default function Inicio() {
  const insets = useSafeAreaInsets();
  const esquema = useEsquema();
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
      <View
        accessible
        accessibilityLabel={
          sinCompras
            ? "Todavía no registraste compras. Tocá el botón Comprar cuando estés por pagar."
            : `Este mes te devolvieron aproximadamente ${pesos(monto)}, ${base.texto}. Gastaste ${pesos(compras.gastaste)} en ${compras.cantidadDelMes} compras.`
        }
        style={{
          // Banda a todo el ancho, sin tarjeta (DESIGN.md v8 §6): sube hasta el borde de arriba y
          // se despega del fondo con su sombra en el claro.
          marginHorizontal: -space.gutter,
          marginTop: -(insets.top + space.lg),
          paddingTop: insets.top + space.xl,
          paddingHorizontal: space.gutter,
          paddingBottom: space.xxl,
          gap: space.xs,
          backgroundColor: colors.heroBg,
          borderBottomLeftRadius: radius.sheet,
          borderBottomRightRadius: radius.sheet,
          borderCurve: "continuous",
          boxShadow: sombras[esquema].cabecera,
        }}
      >
        <Text variant="titleLg" accessibilityRole="header" style={{ color: colors.onHero }}>
          {nombre ? `Hola, ${nombre}` : "Hola"}
        </Text>
        <Text variant="bodyMd" style={{ color: colors.onHeroMuted, marginBottom: space.lg }}>
          {fechaLarga(hoy).replace(/^./, (c) => c.toUpperCase())}
        </Text>
        {sinCompras ? (
          <View style={{ gap: space.sm }}>
            <Text variant="titleMd" style={{ color: colors.onHero }}>
              Todavía no registraste compras
            </Text>
            <Text variant="bodyLg" style={{ color: colors.onHeroMuted }}>
              Tocá + cuando estés por pagar y te decimos con qué.
            </Text>
          </View>
        ) : (
          <>
            <Text variant="label" style={{ color: colors.onHeroMuted }}>
              Este mes te devolvieron
            </Text>
            <Text variant="display" tabular style={{ color: colors.onHero, fontSize: 48, lineHeight: 54 }}>
              {aprox(monto)}
            </Text>
            <Text variant="label" style={{ color: colors.onHeroMuted }}>
              {base.texto} · gastaste {pesos(compras.gastaste)}
            </Text>
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
          <View style={{ gap: space.md }}>
            {topes.medios.slice(0, TOPES_EN_INICIO).map((t) => (
              <Card key={t.clave} padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
                <TopeFila
                  t={t}
                  onPress={() => router.push({ pathname: "/tope/[clave]", params: { clave: t.clave } })}
                />
              </Card>
            ))}
          </View>
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
