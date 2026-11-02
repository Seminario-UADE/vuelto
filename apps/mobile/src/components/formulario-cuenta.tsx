import { router } from "expo-router";
import { useRef, useState, type ComponentRef, type Ref } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { entrarCuenta, registrarCuenta } from "@/data/auth";
import { setSesion } from "@/data/sesion";
import { hapticoExito } from "@/lib/haptics";
import type { ErrorAuth } from "@/lib/auth";
import { CLAVE_MINIMA } from "@/lib/auth";
import { colors, fonts, radius, space, type as escala } from "@/theme";
import { Button } from "./button";
import { Icon } from "./icon";
import { Screen } from "./screen";
import { SheetHeader } from "./sheet-header";
import { Text } from "./text";

type Modo = "registro" | "entrar";

const TEXTOS = {
  registro: {
    titulo: "Creá tu cuenta",
    subtitulo: "Así tus medios y tus compras quedan guardados y solo vos los ves.",
    boton: "Crear cuenta",
    cambio: "Ya tengo cuenta",
    rutaCambio: "/login",
  },
  entrar: {
    titulo: "Entrá a tu cuenta",
    subtitulo: "Con el email y la contraseña que usaste al registrarte.",
    boton: "Entrar",
    cambio: "Crear una cuenta",
    rutaCambio: "/registro",
  },
} as const;

function Campo({ label, error, ...props }: TextInputProps & { label: string; error?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" tone="inkSecondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkSecondary}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
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
  );
}

/**
 * Sheet de login y de registro (`(auth)/login` y `(auth)/registro`): mismo formulario,
 * distinto texto y distinta llamada a Supabase Auth. Al entrar, la navegación la deciden los
 * layouts según `sesion.usuario` y el perfil del dispositivo (sin medios ⇒ onboarding).
 */
export function FormularioCuenta({ modo }: { modo: Modo }) {
  const t = TEXTOS[modo];
  const claveRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<ErrorAuth | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const r = await (modo === "registro" ? registrarCuenta : entrarCuenta)(email, clave);
    setEnviando(false);
    if (!r.ok) {
      setError(r);
      return;
    }
    if (r.cuenta === null) {
      // El proyecto pide confirmar el email: todavía no hay sesión.
      setSesion({ aviso: "Te mandamos un email para confirmar tu cuenta" });
      router.replace("/login");
      return;
    }
    hapticoExito();
    if (router.canDismiss()) router.dismissAll();
    router.replace("/");
  };

  return (
    <Screen
      kind="sheet"
      footer={<Button label={t.cambio} variant="text" onPress={() => router.replace(t.rutaCambio)} disabled={enviando} />}
    >
      <SheetHeader title={t.titulo} subtitle={t.subtitulo} />
      <View style={{ gap: space.md }}>
        <Campo
          label="Email"
          value={email}
          onChangeText={(x) => {
            setEmail(x);
            setError(null);
          }}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => claveRef.current?.focus()}
          error={error?.campo === "email" ? error.mensaje : undefined}
        />
        <Campo
          ref={claveRef}
          label="Contraseña"
          value={clave}
          onChangeText={(x) => {
            setClave(x);
            setError(null);
          }}
          placeholder={modo === "registro" ? `Al menos ${CLAVE_MINIMA} caracteres` : "Tu contraseña"}
          secureTextEntry
          autoComplete={modo === "registro" ? "new-password" : "current-password"}
          textContentType={modo === "registro" ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={() => void enviar()}
          error={error?.campo === "clave" ? error.mensaje : undefined}
        />
        {error && error.campo === null ? (
          <Text variant="label" tone="error" accessibilityLiveRegion="polite">
            {error.mensaje}
          </Text>
        ) : null}
        <Button label={t.boton} onPress={() => void enviar()} loading={enviando} />
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Icon name="candado" size={16} color={colors.inkSecondary} />
        <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
          No pedimos datos de tu banco ni las claves de tus tarjetas. Tus contactos solo ven lo que vos aceptes
          compartir.
        </Text>
      </View>
    </Screen>
  );
}
