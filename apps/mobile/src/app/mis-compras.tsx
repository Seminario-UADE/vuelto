import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { CompraRow, etiquetaOrigen } from "@/components/compra-row";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import type { Compra, OrigenCompra } from "@/data/contracts";
import { useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { aprox, diaDelMes, pesos } from "@/lib/format";
import { colors, space } from "@/theme";

const FILTROS: (OrigenCompra | "todas")[] = ["todas", "ticket", "excepcion", "manual"];

/**
 * Mis compras: lo registrado este mes, con su origen. Filtros en chips con scroll
 * horizontal para que no se corten con texto grande (auditoría P2 #16).
 */
export default function MisCompras() {
  const [filtro, setFiltro] = useState<OrigenCompra | "todas">("todas");
  const cambios = useSesion((s) => s.comprasNuevas.length);
  const todas = useAsync(() => api.getCompras("todas"), cambios);
  const datos = todas.datos;
  const compras = datos?.compras.filter((c) => filtro === "todas" || c.origen === filtro) ?? [];
  const gastaste = datos?.gastaste ?? 0;

  const porDia = new Map<string, Compra[]>();
  for (const c of compras) porDia.set(c.fecha, [...(porDia.get(c.fecha) ?? []), c]);

  return (
    <Screen>
      {!datos ? (
        <SkeletonList rows={4} />
      ) : datos.compras.length === 0 ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Escaneá un ticket o aceptá una recomendación y la compra aparece acá."
          action={{ label: "Registrar compra", onPress: () => router.navigate("/comprar") }}
        />
      ) : (
        <>
          <Card padding={space.xl}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xl }}>
              <View style={{ gap: space.xs, minWidth: 120 }}>
                <Text variant="label" tone="inkSecondary">
                  Gastaste
                </Text>
                <Text variant="titleLg" tabular>
                  {pesos(gastaste)}
                </Text>
              </View>
              <View style={{ gap: space.xs, minWidth: 120 }}>
                <Text variant="label" tone="inkSecondary">
                  Te devolvieron
                </Text>
                <Text variant="titleLg" tabular>
                  {aprox(datos.devolvieron.monto)}
                </Text>
              </View>
            </View>
            <Text variant="label" tone="inkSecondary">
              {datos.devolvieron.base.texto}
            </Text>
          </Card>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -space.gutter }}
            contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.gutter }}
          >
            {FILTROS.map((f) => (
              <Chip
                key={f}
                label={f === "todas" ? "Todas" : etiquetaOrigen[f]}
                selected={filtro === f}
                onPress={() => setFiltro(f)}
              />
            ))}
          </ScrollView>

          {compras.length === 0 ? (
            <Text variant="bodyMd" tone="inkSecondary">
              No hay compras con este origen en {datos.mes}.
            </Text>
          ) : null}

          {[...porDia.entries()].map(([fecha, lista]) => (
            <View key={fecha} style={{ gap: space.sm }}>
              <Text variant="label" weight="semibold" tone="inkSecondary" accessibilityRole="header">
                {diaDelMes(fecha)}
              </Text>
              <Card padding={space.lg} gap={0}>
                {lista.map((c, i) => (
                  <View key={c.id} style={divisor(i)}>
                    <CompraRow c={c} />
                  </View>
                ))}
              </Card>
            </View>
          ))}

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Icon name="info" size={18} color={colors.inkSecondary} />
            <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
              Las compras sin confirmar no cuentan para tus topes.
            </Text>
          </View>
          <Button label="Registrar compra" variant="secondary" icon="agregar" onPress={() => router.navigate("/comprar")} />
        </>
      )}
    </Screen>
  );
}
