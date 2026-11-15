import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { tokenDeInvitacion } from "@/grupo/token";
import { colors, fonts, radius, space, type as escala } from "@/theme";

/**
 * «Tengo una invitación» (spec 013 US2-5, D11). WhatsApp y otras apps no dejan tocar un link
 * `vuelto://`, así que se pega acá. Se valida en el teléfono, sin red: si no es una invitación, se
 * dice ahí mismo. Si lo es, se abre Aceptar invitación.
 */
export default function PegarInvitacion() {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abrir = (valor: string) => {
    const token = tokenDeInvitacion(valor);
    if (token === null) {
      setError("Eso no parece una invitación de Vuelto. Copiá el link completo que te mandaron.");
      return;
    }
    router.replace({ pathname: "/i/[token]", params: { token } });
  };

  const pegar = async () => {
    const copiado = await Clipboard.getStringAsync();
    setTexto(copiado);
    setError(null);
    if (copiado.trim() !== "") abrir(copiado);
  };

  return (
    <Screen
      footer={
        <>
          <Button label="Pegar y abrir" icon="copiar" onPress={pegar} />
          <Button label="Abrir" variant="secondary" onPress={() => abrir(texto)} disabled={texto.trim() === ""} />
        </>
      }
    >
      <Text variant="bodyLg" tone="inkSecondary">
        Pegá el link que te mandaron (empieza con vuelto://) o el código de la invitación.
      </Text>
      <Card>
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setError(null);
          }}
          onSubmitEditing={() => abrir(texto)}
          placeholder="vuelto://i/…"
          placeholderTextColor={colors.inkSecondary}
          accessibilityLabel="Link o código de la invitación"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          selectionColor={colors.accent}
          style={{
            minHeight: 48,
            paddingHorizontal: space.lg,
            borderRadius: radius.row,
            borderWidth: 1.5,
            borderColor: error ? colors.error : colors.controlBorder,
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
      </Card>
    </Screen>
  );
}
