import { router } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { TextInput, View } from "react-native";
import { entrarCuenta, registrarCuenta } from "@/data/auth";
import { NOMBRE_MAXIMO, validarNombre } from "@/perfil/modelo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cambiarNombre, guardarBorradorEnCuenta, nombreAlBorrador } from "@/store/perfil-remoto";
import { avisoMostrado, emailPorConfirmarCambio } from "@/store/sesion";
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
  /** Registro al final del onboarding sin cuenta (spec 012, US5): lo elegido queda en la cuenta. */
  guardar: {
    titulo: "Guardá tu perfil",
    subtitulo: "Así tus tarjetas, tus comercios y tus compras quedan guardados y solo vos los ves.",
    boton: "Guardar mi perfil",
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
 * cuenta apenas existe. Con un borrador del onboarding (US5) el registro se titula «Guardá tu
 * perfil» y el nombre va al borrador: lo guarda `guardarBorradorEnCuenta` junto con lo demás, apenas
 * hay sesión (al crearla, o al primer ingreso si hay que confirmar el email).
 */
export function FormularioCuenta({ modo }: { modo: Modo }) {
  const conBorrador = useAppSelector((s) => s.perfil.borrador !== null);
  // Se decide al abrir: si el borrador se vacía al guardarse, el título no cambia antes de salir.
  const [guardar] = useState(modo === "registro" && conBorrador);
  const t = TEXTOS[guardar ? "guardar" : modo];
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
    // Recién con la cuenta creada: un intento fallido (email ya usado) no deja su nombre en el
    // borrador. Lo guarda la misma pasada que lo demás, ahora o en el primer ingreso (FR-031, FR-033).
    if (guardar && n.ok) dispatch(nombreAlBorrador(n.nombre));
    // Con la cuenta ya creada (hay sesión), el nombre va a `perfiles`. Si falla no se frena el alta:
    // queda sin nombre, Perfil pide cargarlo y nunca se muestra uno inventado (FR-029).
    if (modo === "registro" && !guardar && n.ok && r.cuenta !== null) {
      const guardado = await dispatch(cambiarNombre(n.nombre));
      if (!guardado.ok) dispatch(avisoMostrado("No pudimos guardar tu nombre. Cargalo desde Perfil"));
    }
    // Lo elegido sin cuenta pasa a la cuenta antes de seguir. Si falla, queda en el teléfono y la
    // próxima lectura del perfil lo reintenta: Inicio espera y no repite el onboarding.
    if (guardar && r.cuenta !== null) await dispatch(guardarBorradorEnCuenta());
    setEnviando(false);
    if (r.cuenta === null) {
      // El proyecto pide confirmar el email: todavía no hay sesión. Lo elegido sigue en el borrador
      // y se guarda en el primer ingreso (FR-033).
      dispatch(emailPorConfirmarCambio(email.trim()));
      router.replace("/confirmar-email");
      return;
    }
    hapticoExito();
    if (router.canDismiss()) router.dismissAll();
    // Una invitación abierta antes de tener cuenta la abre Inicio apenas el perfil está listo.
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
