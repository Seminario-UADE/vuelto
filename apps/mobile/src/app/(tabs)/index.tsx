import { router } from "expo-router";
import { View } from "react-native";
import { Card } from "@/components/card";
import { CompraRow } from "@/components/compra-row";
import { divisor } from "@/components/lista";
import { PorConfirmarFila } from "@/components/por-confirmar-fila";
import { PanelInicio } from "@/components/panel-inicio";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Text } from "@/components/text";
import { TopeFila } from "@/components/tope-card";
import { TortaTopes } from "@/components/torta-topes";
import { fechaLarga, pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectHoy, selectResumenCompras, selectTopes, selectUsoDeTopes } from "@/store/selectores";
import { space } from "@/theme";

const TOPES_EN_INICIO = 3;
const COMPRAS_EN_INICIO = 3;

/**
 * Inicio (DESIGN.md v8 §6), de arriba abajo: el panel con el saludo, lo que te devolvieron (≈ y su
 * base) y tres atajos; las compras por confirmar, si hay; los topes que podés usar hoy (v9: la
 * promo aplica hoy y no se agotó; los primeros tres, «Ver todos» abre Topes con el mes completo) y las últimas compras («Ver todas» va a Compras).
 * Comprar está en el «+».
 */
export default function Inicio() {
  const nombre = useAppSelector((s) => s.perfil.nombre);
  const hoy = useAppSelector(selectHoy);
  const topes = useAppSelector(selectTopes);
  const compras = useAppSelector(selectResumenCompras);
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes);
  const uso = useAppSelector(selectUsoDeTopes);
  const sinCompras = compras.compras.length === 0;
  const { monto, base } = topes.devolvieron;
  // Solo los que sirven hoy (v9): la promo aplica hoy y el tope no se agotó. El mes completo, en «Ver todos».
  const topesDeHoy = topes.medios.filter((t) => t.aplicaHoy && t.estado !== "agotado");
  const ultimas = [...compras.compras].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, COMPRAS_EN_INICIO);

  return (
    <Screen kind="tab" aboveTabBar gap={space.xl}>
      <PanelInicio
        nombre={nombre}
        fecha={fechaLarga(hoy).replace(/^./, (c) => c.toUpperCase())}
        devolvieron={sinCompras ? null : { monto, base: base.texto }}
        etiqueta={
          sinCompras
            ? "Todavía no registraste compras. Tocá Con qué pagar cuando estés por pagar."
            : `Este mes te devolvieron aproximadamente ${pesos(monto)}, ${base.texto}.`
        }
      />

      {uso ? <TortaTopes uso={uso} /> : null}

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
          <SectionHeader title="Hoy podés usar" action={{ label: "Ver todos", onPress: () => router.push("/topes") }} />
          {topesDeHoy.length > 0 ? (
            <View style={{ gap: space.md }}>
              {topesDeHoy.slice(0, TOPES_EN_INICIO).map((t) => (
                <Card key={t.clave} padding={space.lg} gap={0} style={{ paddingVertical: space.xs }}>
                  <TopeFila
                    t={t}
                    onPress={() => router.push({ pathname: "/tope/[clave]", params: { clave: t.clave } })}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <Text variant="bodyMd" tone="inkSecondary">
              Hoy no aplica ninguna promo con tope de tus medios.
            </Text>
          )}
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
