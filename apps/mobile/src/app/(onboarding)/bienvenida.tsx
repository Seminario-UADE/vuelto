import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { colors, radius, space } from "@/theme";

const PUNTOS: { icon: IconName; texto: string }[] = [
  { icon: "comercio", texto: "Con qué pagar en cada comercio, hoy" },
  { icon: "topes", texto: "Cuánto tope te queda, estimado según tus compras" },
  { icon: "candado", texto: "Sin conectar tu banco ni pedir tus claves" },
];

/** Bienvenida (onboarding 1/5). Da la propuesta antes de pedir nada. */
export default function Bienvenida() {
  return (
    <Screen
      kind="tab"
      footer={
        <>
          <Button label="Empezar" onPress={() => router.push("/medios")} />
          <Button label="Ya tengo cuenta" variant="text" onPress={() => router.push("/login?modo=entrar")} />
          <Text variant="label" tone="inkSecondary" align="center">
            Te lleva un minuto: tus medios y, si querés, tus comercios.
          </Text>
        </>
      }
    >
      <View style={{ gap: space.xl, paddingTop: space.xl }}>
        <Image
          source={require("../../../assets/logo.png")}
          style={{ width: 72, height: 72, borderRadius: radius.row }}
          accessibilityLabel="Vuelto"
        />
        <View style={{ gap: space.md }}>
          <Text variant="titleLg" accessibilityRole="header">
            Pagá con el medio que más te devuelve
          </Text>
          <Text variant="bodyLg" tone="inkSecondary">
            Elegís dónde estás comprando y te decimos con qué pagar. También llevamos la cuenta de cuánto tope de
            reintegro te queda.
          </Text>
        </View>
        <View style={{ gap: space.lg }}>
          {PUNTOS.map((p) => (
            <View key={p.texto} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceStrong,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={p.icon} size={20} />
              </View>
              <Text variant="bodyLg" style={{ flex: 1 }}>
                {p.texto}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
