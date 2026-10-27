import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon, iconoDeRubro } from "@/components/icon";
import { MontoInput } from "@/components/monto-input";
import { AlternativaRow, RecomendacionCard } from "@/components/recomendacion";
import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { Skeleton, SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { useAsync } from "@/hooks/use-async";
import { parseMonto } from "@/lib/format";
import { colors, radius, space } from "@/theme";

const RUBRO: Record<string, string> = {
  supermercado: "Supermercado",
  combustible: "Combustible",
  gastronomia: "Gastronomía",
  farmacia: "Farmacia",
  indumentaria: "Indumentaria",
  hogar: "Hogar",
  otro: "Comercio",
};

/**
 * Con qué pagar: pregunta → respuesta → razón → monto → alternativas → grupo → acción
 * (DESIGN.md §6). Un solo primario de una línea ("Usar Galicia", auditoría P2 #8) en un pie
 * fijo que no tapa contenido (P2 #7).
 */
export default function ConQuePagar() {
  const params = useLocalSearchParams<{ id: string; monto?: string }>();
  const [monto, setMonto] = useState<number | null>(parseMonto(params.monto ?? ""));
  const rec = useAsync(() => api.recomendar(params.id, monto), `${params.id}:${monto ?? "-"}`);
  const r = rec.datos;

  const usar = () => {
    if (!r?.medio) return;
    router.push({
      pathname: "/revisa",
      params: { modo: "excepcion", comercio: r.comercio.nombre, monto: monto ?? "", medio: r.medio.id },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: r?.comercio.nombre ?? "" }} />
      <Screen
        footer={
          r ? (
            r.medio ? (
              <Button label={`Usar ${r.medio.nombreCorto}`} onPress={usar} />
            ) : (
              <Button
                label="Cargar la compra a mano"
                variant="secondary"
                onPress={() => router.push({ pathname: "/revisa", params: { modo: "manual", comercio: r.comercio.nombre } })}
              />
            )
          ) : null
        }
      >
        {r ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar icon={iconoDeRubro[r.comercio.rubro]} />
            <Text variant="bodyMd" tone="inkSecondary" style={{ flex: 1 }}>
              {RUBRO[r.comercio.rubro]} · {r.dia}
            </Text>
          </View>
        ) : null}

        {r ? (
          <RecomendacionCard r={r} />
        ) : rec.estado === "error" ? (
          <Card>
            <Text variant="bodyMd" tone="error">
              {rec.error}
            </Text>
            <Button label="Probar de nuevo" variant="secondary" onPress={rec.recargar} />
          </Card>
        ) : (
          <Skeleton height={220} r={radius.card} />
        )}

        {r?.medio ? (
          <Card>
            <MontoInput
              value={monto}
              onChange={setMonto}
              hint="Con el monto te decimos cuánto te devuelven y cuánto tope te queda."
            />
          </Card>
        ) : null}

        {r ? (
          r.alternativas.length > 0 ? (
            <View style={{ gap: space.xs }}>
              <SectionHeader title={r.medio ? "Otras opciones" : "Tus medios hoy"} />
              <Card padding={space.lg} gap={0}>
                {r.alternativas.map((a, i) => (
                  <View key={`${a.titulo}-${i}`} style={{ borderTopWidth: i ? 1 : 0, borderColor: colors.divider }}>
                    <AlternativaRow a={a} />
                  </View>
                ))}
              </Card>
            </View>
          ) : null
        ) : (
          <SkeletonList rows={2} height={56} />
        )}

        <Pressable
          onPress={() =>
            router.push({ pathname: "/grupo/armar", params: { comercio: params.id, monto: monto ?? "" } })
          }
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: 56,
            paddingHorizontal: space.lg,
            borderRadius: radius.row,
            borderWidth: 1.5,
            borderColor: colors.controlBorder,
          }}
        >
          <Icon name="grupo" size={22} />
          <Text variant="bodyLg" weight="semibold" style={{ flex: 1 }}>
            ¿Pagan entre varios?
          </Text>
          <Icon name="chevron" size={18} color={colors.inkSecondary} />
        </Pressable>
      </Screen>
    </>
  );
}
