import { router } from "expo-router";
import { View } from "react-native";
import { ActionRow } from "@/components/action-row";
import { Card } from "@/components/card";
import { ComercioSearch } from "@/components/comercio-search";
import { CompraRow } from "@/components/compra-row";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { space } from "@/theme";

/**
 * Nueva compra (= "registrar" de la issue #39). Primero el comercio, que lleva a Con qué
 * pagar; escanear y cargar a mano quedan como filas secundarias (auditoría P1 #1).
 */
export default function Comprar() {
  const cambios = useSesion((s) => s.comprasNuevas.length);
  const compras = useAsync(() => api.getCompras(), cambios);

  return (
    <Screen kind="tab" aboveTabBar>
      <Text variant="titleLg" accessibilityRole="header">
        Nueva compra
      </Text>

      <View style={{ gap: space.md }}>
        <SectionHeader title="¿Dónde estás comprando?" />
        <ComercioSearch
          sobre="canvas"
          onElegir={(c) => router.push({ pathname: "/comercio/[id]", params: { id: c.id } })}
        />
      </View>

      <View style={{ gap: space.md }}>
        <SectionHeader title="¿Ya pagaste?" />
        <ActionRow
          icon="camara"
          title="Escanear ticket"
          detail="Leemos el ticket y descartamos la foto"
          onPress={() => router.push("/escanear")}
        />
        <ActionRow
          icon="teclado"
          title="Cargar a mano"
          detail="Comercio, monto y con qué pagaste"
          onPress={() => router.push({ pathname: "/revisa", params: { modo: "manual" } })}
        />
        <ActionRow
          icon="grupo"
          title="¿Pagan entre varios?"
          detail="Te decimos quién conviene que pague"
          onPress={() => router.push("/grupo/armar")}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Últimas compras" action={{ label: "Ver todas", onPress: () => router.push("/mis-compras") }} />
        {compras.datos ? (
          compras.datos.compras.length === 0 ? (
            <Text variant="bodyMd" tone="inkSecondary">
              Todavía no registraste compras este mes.
            </Text>
          ) : (
            <Card padding={space.lg} gap={0}>
              {compras.datos.compras.slice(0, 3).map((c, i) => (
                <View key={c.id} style={divisor(i)}>
                  <CompraRow c={c} conFecha />
                </View>
              ))}
            </Card>
          )
        ) : (
          <SkeletonList rows={3} />
        )}
      </View>
    </Screen>
  );
}
