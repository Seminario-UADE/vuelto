import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Icon, iconoDeRubro } from "@/components/icon";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import { TopeDetalle } from "@/components/tope-card";
import * as api from "@/data/api";
import type { Rubro } from "@/data/contracts";
import { useSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { aprox } from "@/lib/format";
import { RUBROS } from "@/lib/rubros";
import { colors, space } from "@/theme";


/**
 * Tus topes: cuánto queda por medio, con ≈ y su base. Sin total agregado de topes
 * (auditoría P1 #4) y sin tarjeta oscura: no hay una decisión acá (P1 #2).
 */
export default function Topes() {
  const cambios = useSesion((s) => s.comprasNuevas.length);
  const t = useAsync(() => api.getTopes(), cambios);
  const [rubro, setRubro] = useState<Rubro | null>(null);
  const datos = t.datos;
  const lista = datos?.medios.filter((m) => rubro === null || m.rubro === rubro) ?? [];
  const vacio = datos !== null && datos.devolvieron.monto === 0 && datos.medios.every((m) => m.disponible === null);

  return (
    <Screen kind="tab" aboveTabBar>
      <View style={{ gap: space.xs }}>
        <Text variant="label" tone="inkSecondary">
          {datos ? datos.mes.replace(/^./, (c) => c.toUpperCase()) : " "}
        </Text>
        <Text variant="titleLg" accessibilityRole="header">
          Tus topes
        </Text>
      </View>

      {!datos ? (
        <SkeletonList rows={4} height={140} />
      ) : vacio ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Cuando registres la primera, vas a ver cuánto tope te queda en cada medio."
          action={{ label: "Registrar compra", onPress: () => router.navigate("/comprar") }}
        />
      ) : (
        <>
          <Card padding={space.xl} gap={space.lg}>
            <View
              accessible
              accessibilityLabel={`Este mes te devolvieron aproximadamente ${aprox(datos.devolvieron.monto).slice(1)}, ${datos.devolvieron.base.texto}`}
              style={{ gap: space.xs }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                <Icon name="devolvieron" size={16} color={colors.inkSecondary} />
                <Text variant="label" tone="inkSecondary">
                  Este mes te devolvieron
                </Text>
              </View>
              <Text variant="display" tabular>
                {aprox(datos.devolvieron.monto)}
              </Text>
              <Text variant="label" tone="inkSecondary">
                {datos.devolvieron.base.texto}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <View style={{ gap: space.sm }}>
              <Text variant="bodyMd" weight="semibold">
                {datos.mediosConTope} {datos.mediosConTope === 1 ? "medio con tope disponible" : "medios con tope disponible"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                <Icon name="calendario" size={16} color={colors.inkSecondary} />
                <Text variant="label" tone="inkSecondary">
                  Los mensuales se reinician en {datos.reinicioMensualEnDias} días
                </Text>
              </View>
            </View>
          </Card>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -space.gutter }}
            contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.gutter }}
          >
            <Chip label="Todos" selected={rubro === null} onPress={() => setRubro(null)} />
            {datos.medios.map((m) => (
              <Chip
                key={m.rubro}
                label={RUBROS[m.rubro].corto}
                icon={iconoDeRubro[m.rubro]}
                selected={rubro === m.rubro}
                onPress={() => setRubro(rubro === m.rubro ? null : m.rubro)}
              />
            ))}
          </ScrollView>

          <View style={{ gap: space.md }}>
            {lista.map((m) => (
              <TopeDetalle key={m.medio.id} t={m} />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Icon name="info" size={18} color={colors.inkSecondary} />
            <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
              Los topes son estimados: los calculamos con las compras que registrás. Una compra sin guardar no cambia
              ningún tope.
            </Text>
          </View>
          <Button label="Ver mis compras" variant="secondary" onPress={() => router.push("/mis-compras")} />
        </>
      )}
    </Screen>
  );
}
