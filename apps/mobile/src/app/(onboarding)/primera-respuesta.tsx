import { router, Stack } from "expo-router";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { DecisionCard } from "@/components/decision-card";
import { Icon, iconoDeRubro } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Skeleton } from "@/components/skeleton";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { usePerfilLocal } from "@/data/perfil-local";
import { useAsync } from "@/hooks/use-async";
import { colors, radius, space } from "@/theme";

/**
 * Primera respuesta (onboarding 4/5): una decisión de ejemplo antes de pedir la cuenta.
 * Un usuario nuevo no tiene compras, así que no se muestra ninguna cifra de tope (Principio V).
 */
export default function PrimeraRespuesta() {
  const { perfil } = usePerfilLocal();
  const r = useAsync(() => api.recomendar("coto", null));
  const n = perfil.medios.length;

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen footer={<Button label="Guardar mi perfil" onPress={() => router.push("/login")} />}>
        <View style={{ gap: space.sm }}>
          <Text variant="titleLg" accessibilityRole="header">
            Listo. Así funciona:
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Con {n === 1 ? "el medio" : `los ${n} medios`} que elegiste, si hoy comprás en Coto:
          </Text>
        </View>
        {r.datos ? (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Avatar icon={iconoDeRubro[r.datos.comercio.rubro]} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLg" weight="semibold">
                  {r.datos.comercio.nombre}
                </Text>
                <Text variant="label" tone="inkSecondary">
                  Supermercado · {r.datos.dia}
                </Text>
              </View>
            </View>
            <DecisionCard
              titulo={r.datos.medio ? `Te conviene ${r.datos.medio.nombre}` : "Hoy no hay promo"}
              inicial={r.datos.medio?.inicial}
              razon={r.datos.razon}
            />
          </View>
        ) : (
          <Skeleton height={180} r={radius.card} />
        )}
        <Card>
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Icon name="info" size={22} color={colors.warning} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="bodyLg" weight="semibold">
                Tus topes arrancan sin base
              </Text>
              <Text variant="bodyMd" tone="inkSecondary">
                Todavía no sabemos cuánto usaste este mes. Cada compra que registres (escaneando el ticket o aceptando
                una recomendación) afina la estimación.
              </Text>
            </View>
          </View>
        </Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm }}>
          <Icon name="candado" size={16} color={colors.inkSecondary} />
          <Text variant="label" tone="inkSecondary">
            Nunca te pedimos claves ni números de tarjeta
          </Text>
        </View>
      </Screen>
    </>
  );
}
