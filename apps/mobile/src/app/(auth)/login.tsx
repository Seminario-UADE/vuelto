import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { mediosDeclaradosIds } from "@/data/api";
import { guardarPerfilLocal, usePerfilLocal, type PerfilLocal } from "@/data/perfil-local";
import { hapticoExito } from "@/lib/haptics";
import { colors, fonts, radius, space, type as escala } from "@/theme";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sheet "Guardá tu perfil" (onboarding 5/5 y `(auth)/login` de la issue #39).
 * En Expo Go es un sustituto: no crea ninguna cuenta real ni manda emails.
 */
export default function Login() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const entrar = modo === "entrar";
  const { perfil } = usePerfilLocal();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const terminar = async (cuenta: PerfilLocal["cuenta"]) => {
    setEnviando(true);
    hapticoExito();
    const pendiente = perfil.invitacionPendiente;
    await guardarPerfilLocal({
      onboardingCompleto: true,
      cuenta,
      // Quien entra con una cuenta existente recupera sus medios (en el servidor, su perfil).
      medios: entrar && perfil.medios.length === 0 ? mediosDeclaradosIds() : perfil.medios,
      invitacionPendiente: null,
    });
    if (router.canDismiss()) router.dismissAll();
    router.replace(pendiente ? `/i/${pendiente}` : "/");
  };

  const conEmail = () => {
    if (!EMAIL.test(email.trim())) {
      setError("Revisá el email: falta algo antes o después de la @.");
      return;
    }
    void terminar({ email: email.trim(), proveedor: "email" });
  };

  return (
    <Screen
      kind="sheet"
      footer={
        entrar ? null : (
          <Button label="Ahora no" variant="text" onPress={() => void terminar(null)} disabled={enviando} />
        )
      }
    >
      <SheetHeader
        title={entrar ? "Entrá a tu cuenta" : "Guardá tu perfil"}
        subtitle={
          entrar
            ? "Te mandamos un link al email con el que te registraste."
            : "Así no perdés tus medios ni tus topes si cambiás de celular."
        }
      />
      <View style={{ gap: space.md }}>
        {process.env.EXPO_OS === "ios" ? (
          <Pressable
            onPress={() => void terminar({ email: null, proveedor: "apple" })}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Apple"
            style={{
              minHeight: 56,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: colors.ink,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: space.sm,
            }}
          >
            <Text variant="bodyLg" weight="semibold">
              Continuar con Apple
            </Text>
          </Pressable>
        ) : null}
        <View style={{ gap: space.xs }}>
          <Text variant="label" tone="inkSecondary">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            placeholder="tu@email.com"
            placeholderTextColor={colors.inkSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email"
            returnKeyType="send"
            onSubmitEditing={conEmail}
            selectionColor={colors.accent}
            style={{
              minHeight: 52,
              paddingHorizontal: space.lg,
              borderRadius: radius.row,
              borderWidth: 1.5,
              borderColor: error ? colors.error : colors.controlBorder,
              backgroundColor: colors.canvas,
              fontFamily: fonts.regular,
              fontSize: escala.bodyLg.fontSize,
              color: colors.ink,
            }}
          />
          {error ? (
            <Text variant="label" tone="error" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
        <Button label="Enviarme un link para entrar" onPress={conEmail} disabled={enviando} />
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Icon name="candado" size={16} color={colors.inkSecondary} />
        <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
          Sin contraseña. No pedimos datos de tu banco ni tus claves. Tus contactos solo ven lo que vos aceptes
          compartir.
        </Text>
      </View>
    </Screen>
  );
}
