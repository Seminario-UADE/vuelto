import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { useAppSelector } from "@/store/hooks";
import { colors, radius, space } from "@/theme";

/**
 * «Revisá tu email» (spec 012, US5, FR-033): el proyecto pide confirmar la cuenta antes de entrar.
 * Dice a qué dirección se mandó y cómo seguir. Lo elegido sin cuenta sigue en el teléfono y se
 * guarda en la cuenta en el primer ingreso (`guardarBorradorEnCuenta`).
 */
export default function ConfirmarEmail() {
  const email = useAppSelector((s) => s.sesion.emailPorConfirmar);
  const conBorrador = useAppSelector((s) => s.perfil.borrador !== null);
  return (
    <Screen
      kind="sheet"
      footer={
        <>
          <Button label="Ya confirmé, entrar" onPress={() => router.replace("/login")} />
          <Button label="Usé otro email" variant="text" onPress={() => router.replace("/registro")} />
        </>
      }
    >
      <SheetHeader title="Revisá tu email" />
      <View style={{ gap: space.lg }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="checkCirculo" size={28} />
        </View>
        <Text variant="bodyLg">
          Te mandamos un link a{" "}
          <Text variant="bodyLg" weight="semibold">
            {email ?? "tu email"}
          </Text>
          . Abrilo para confirmar tu cuenta y después entrá con tu email y tu contraseña.
        </Text>
        {conBorrador ? (
          <Text variant="bodyMd" tone="inkSecondary">
            Tus tarjetas y tus comercios quedan guardados en este teléfono y pasan a tu cuenta cuando entres.
          </Text>
        ) : null}
        <Text variant="label" tone="inkSecondary">
          Si no lo ves, buscalo en spam o promociones.
        </Text>
      </View>
    </Screen>
  );
}
