import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { fechaCorta, pesos } from "@/lib/format";
import { hapticoLeve } from "@/lib/haptics";
import { colors, radius, size, space } from "@/theme";

const LINEAS = [
  ["LECHE ENTERA 1L", 1450],
  ["QUESO CREMOSO 500G", 4850],
  ["ACEITE GIRASOL 1.5L", 3200],
  ["PAN ARTESANAL", 1800],
  ["YOGUR BEBIBLE PACK", 2900],
  ["CARNE PICADA ESP.", 10300],
] as const;

/**
 * Escanear ticket (modal a pantalla completa). En esta versión NO usa la cámara: el visor
 * muestra un ticket de ejemplo y el disparador simula la lectura. Ningún archivo de imagen
 * se crea (spec 002 FR-015, Principio IV).
 */
export default function Escanear() {
  const insets = useSafeAreaInsets();
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disparar = async () => {
    hapticoLeve();
    setLeyendo(true);
    setError(null);
    const t = await api.leerTicket();
    setLeyendo(false);
    if (!t.ok) {
      setError(t.error);
      return;
    }
    router.replace({
      pathname: "/revisa",
      params: {
        modo: "ticket",
        comercio: t.comercio ?? "",
        monto: t.monto ?? "",
        fecha: t.fecha ?? "",
        // Solo si el ticket lo dice; si no, revisa pregunta (RF-10).
        medio: t.medio?.id ?? "",
        texto: t.textoExtraido,
      },
    });
  };

  const aMano = () => router.replace({ pathname: "/revisa", params: { modo: "manual" } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.scrim, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 56 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={{
            width: size.hit,
            height: size.hit,
            borderRadius: radius.pill,
            backgroundColor: colors.decisionSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="cerrar" size={18} color={colors.onDecision} />
        </Pressable>
        <Text variant="titleMd" align="center" accessibilityRole="header" style={{ flex: 1, color: colors.onDecision }}>
          Escaneá el ticket
        </Text>
        <View style={{ width: size.hit }} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: space.section, gap: space.lg }}>
        <View
          accessible
          accessibilityLabel="Visor con un ticket de ejemplo de Coto por 24.500 pesos"
          style={{ padding: space.lg, borderRadius: radius.row, borderWidth: 2, borderColor: colors.onDecisionAccent }}
        >
          <View style={{ backgroundColor: colors.canvas, borderRadius: radius.badge, padding: space.lg, gap: space.xs }}>
            <Text variant="bodyMd" weight="bold" align="center">
              COTO C.I.C.S.A.
            </Text>
            <Text variant="caption" tone="inkSecondary" align="center">
              Suc. 112 · Almagro
            </Text>
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: space.xs }} />
            {LINEAS.map(([item, precio]) => (
              <View key={item} style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text variant="caption" tone="inkSecondary" numberOfLines={1} style={{ flex: 1 }}>
                  {item}
                </Text>
                <Text variant="caption" tabular>
                  {pesos(precio)}
                </Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: space.xs }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="bodyMd" weight="bold">
                TOTAL
              </Text>
              <Text variant="bodyMd" weight="bold" tabular>
                {pesos(24500)}
              </Text>
            </View>
            <Text variant="caption" tone="inkSecondary" align="center">
              {fechaCorta(api.getHoy())}/2026 · 18:42
            </Text>
          </View>
        </View>

        {error ? (
          <Card>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Icon name="info" size={20} color={colors.error} />
              <Text variant="bodyMd" tone="error" style={{ flex: 1 }} accessibilityLiveRegion="polite">
                {error}
              </Text>
            </View>
            <Button label="Cargar a mano" variant="secondary" onPress={aMano} />
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                padding: space.md,
                borderRadius: radius.row,
                backgroundColor: colors.canvas,
              }}
            >
              <Icon name="candado" size={18} />
              <Text variant="label" style={{ flex: 1 }}>
                La foto no se guarda: leemos los datos y la descartamos
              </Text>
            </View>
            <Text variant="label" align="center" style={{ color: colors.onDecisionMuted }}>
              {leyendo ? "Leyendo el ticket…" : "Modo demo: usamos un ticket de ejemplo, sin cámara"}
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.section,
          paddingVertical: space.lg,
        }}
      >
        <Pressable
          onPress={aMano}
          accessibilityRole="button"
          style={{ alignItems: "center", gap: space.xs, minWidth: 88, minHeight: size.hit }}
        >
          <Icon name="teclado" size={24} color={colors.onDecision} />
          <Text variant="label" style={{ color: colors.onDecision }}>
            Cargar a mano
          </Text>
        </Pressable>
        <Pressable
          onPress={disparar}
          disabled={leyendo}
          accessibilityRole="button"
          accessibilityLabel="Leer el ticket"
          accessibilityState={{ busy: leyendo }}
          style={{
            width: 76,
            height: 76,
            borderRadius: radius.pill,
            borderWidth: 4,
            borderColor: colors.onDecision,
            alignItems: "center",
            justifyContent: "center",
            opacity: leyendo ? 0.5 : 1,
          }}
        >
          <View style={{ width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.accent }} />
        </Pressable>
        <View style={{ minWidth: 88 }} />
      </View>
    </View>
  );
}
