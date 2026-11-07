import { router } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { TextInput, View } from "react-native";
import { entrarCuenta, registrarCuenta } from "@/data/auth";
import { NOMBRE_MAXIMO, validarNombre } from "@/perfil/modelo";
import { useAppDispatch } from "@/store/hooks";
import { cambiarNombre } from "@/store/perfil-remoto";
import { avisoMostrado } from "@/store/sesion";
import { hapticoExito } from "@/lib/haptics";
import type { ErrorAuth } from "@/lib/auth";
import { CLAVE_MINIMA } from "@/lib/auth";
import { colors, space } from "@/theme";
import { Button } from "./button";
import { Campo } from "./campo";
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

/**
 * Sheet de login y de registro (`(auth)/login` y `(auth)/registro`): mismo formulario,
 * distinto texto y distinta llamada a Supabase Auth. Al entrar, la navegación la deciden los
 * layouts según `sesion.usuario` y el perfil del dispositivo (sin medios ⇒ onboarding).
 * El registro pide además el nombre que ven sus contactos (spec 012, FR-027), que se guarda en la
 * cuenta apenas existe.
 */
export function FormularioCuenta({ modo }: { modo: Modo }) {
  const t = TEXTOS[modo];
  const dispatch = useAppDispatch();
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const claveRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [nombre, setNombre] = useState("");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<ErrorAuth | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const n = validarNombre(nombre);
    if (modo === "registro" && !n.ok) {
      setErrorNombre(n.mensaje);
      return;
    }
    setEnviando(true);
    setError(null);
    const r = await dispatch((modo === "registro" ? registrarCuenta : entrarCuenta)(email, clave));
    if (!r.ok) {
      setEnviando(false);
      setError(r);
      return;
    }
    // Con la cuenta ya creada (hay sesión), el nombre va a `perfiles`. Si falla no se frena el alta:
    // queda sin nombre, Perfil pide cargarlo y nunca se muestra uno inventado (FR-029).
    if (modo === "registro" && n.ok && r.cuenta !== null) {
      const guardado = await dispatch(cambiarNombre(n.nombre));
      if (!guardado.ok) dispatch(avisoMostrado("No pudimos guardar tu nombre. Cargalo desde Perfil"));
    }
    setEnviando(false);
    if (r.cuenta === null) {
      // El proyecto pide confirmar el email: todavía no hay sesión.
      dispatch(avisoMostrado("Te mandamos un email para confirmar tu cuenta"));
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
        {modo === "registro" ? (
          <Campo
            label="Tu nombre"
            value={nombre}
            onChangeText={(x) => {
              setNombre(x);
              setErrorNombre(null);
            }}
            placeholder="Como te van a ver tus contactos"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="givenName"
            maxLength={NOMBRE_MAXIMO + 10}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errorNombre ?? undefined}
          />
        ) : null}
        <Campo
          ref={emailRef}
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
