import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { SkeletonList } from "@/components/skeleton";
import { Text } from "@/components/text";
import type { EstadoInvitacion } from "@/data/contracts";
import { textoVencimiento } from "@/grupo/invitacion";
import { rutaPreviaALaInvitacion } from "@/perfil/destino";
import { useAsync } from "@/hooks/use-async";
import { hapticoExito } from "@/lib/haptics";
import { iniciales } from "@/lib/format";
import { aceptarInvitacion, verInvitacion } from "@/store/contactos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { invitacionGuardada } from "@/store/perfil";
import { avisoMostrado } from "@/store/sesion";
import { colors, space } from "@/theme";

const MOTIVO: Record<Exclude<EstadoInvitacion, "valida">, { titulo: string; texto: string }> = {
  vencida: { titulo: "Esta invitación venció", texto: "Las invitaciones duran 24 h. Pedile a quien te la mandó que genere otra." },
  usada: { titulo: "Esta invitación ya se usó", texto: "Cada invitación sirve una sola vez. Pedile a quien te la mandó un link nuevo." },
  propia: { titulo: "Es tu propia invitación", texto: "Mandásela a la persona con la que querés vincularte." },
  "ya-contacto": { titulo: "Ya son contactos", texto: "No hace falta aceptar de nuevo. Lo ves en Perfil, en Contactos." },
  inexistente: { titulo: "Esta invitación no es válida", texto: "Revisá que hayas copiado el link completo, o pedí uno nuevo." },
  "sin-nombre": {
    titulo: "Primero elegí tu nombre",
    texto: "Quien te invitó va a ver tu nombre para mostrar. Elegilo en Perfil y volvé a abrir la invitación.",
  },
};

/**
 * Aceptar invitación (ADR-008 §1 y §3): quién invita, qué se comparte, qué no y qué se
 * puede deducir. "Aceptar" y "Ahora no" con el mismo peso visual, nada preseleccionado.
 */
export default function AceptarInvitacion() {
  const { token = "" } = useLocalSearchParams<{ token: string }>();
  const dispatch = useAppDispatch();
  const onboardingCompleto = useAppSelector((s) => s.perfil.onboardingCompleto);
  const usuario = useAppSelector((s) => s.sesion.usuario);
  const ahora = useAppSelector((s) => s.sesion.ahora);
  const v = useAsync(() => dispatch(verInvitacion(token)), token);
  const [aceptando, setAceptando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Exclude<EstadoInvitacion, "valida"> | null>(null);

  // Quien abre el link sin cuenta ni perfil pasa primero por registro y onboarding, y vuelve acá al terminar.
  useEffect(() => {
    if (!usuario || !onboardingCompleto) {
      dispatch(invitacionGuardada(token));
      router.replace(rutaPreviaALaInvitacion(usuario !== null));
    } else {
      // Ya se abrió: Inicio no vuelve a mandar acá.
      dispatch(invitacionGuardada(null));
    }
  }, [dispatch, usuario, onboardingCompleto, token]);

  const aceptar = async () => {
    setAceptando(true);
    setError(null);
    try {
      const r = await dispatch(aceptarInvitacion(token));
      if (r.estado !== "aceptada") {
        // Cambió entre que se abrió y se tocó «Aceptar» (otra persona la usó, venció, ya son contactos).
        setAceptando(false);
        setMotivo(r.estado);
        return;
      }
      hapticoExito();
      dispatch(avisoMostrado(`Ahora ${r.contacto.nombre ?? "esa persona"} es tu contacto`));
      router.replace("/perfil");
    } catch {
      setAceptando(false);
      setError("No pudimos aceptar la invitación. Revisá tu conexión y probá de nuevo.");
    }
  };
  const ahoraNo = () => router.replace("/");

  const d = v.datos;
  const estado = motivo ?? d?.estado;
  const valida = estado === "valida";
  const fallaDeRed = v.estado === "error" && !d;
  const quien = d?.quienInvita ?? "Alguien";

  return (
    <Screen
      footer={
        fallaDeRed ? (
          <Button label="Reintentar" variant="secondary" onPress={v.recargar} />
        ) : d ? (
          valida ? (
            <>
              {error ? (
                <Text variant="label" tone="error" align="center" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              <Button label={error ? "Reintentar" : "Aceptar invitación"} variant="secondary" onPress={aceptar} loading={aceptando} />
              <Button label="Ahora no" variant="secondary" onPress={ahoraNo} disabled={aceptando} />
            </>
          ) : estado === "sin-nombre" ? (
            // US2-3: sin nombre para mostrar, a Perfil a elegirlo (el otro lo va a ver).
            <Button label="Elegir mi nombre" variant="secondary" onPress={() => router.replace("/perfil")} />
          ) : (
            <Button label="Volver" variant="secondary" onPress={ahoraNo} />
          )
        ) : null
      }
    >
      {valida ? (
        <Text variant="titleLg" accessibilityRole="header">
          {quien} te invita a ser su contacto en Vuelto
        </Text>
      ) : null}
      {fallaDeRed ? (
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            No pudimos abrir la invitación
          </Text>
          <Text variant="bodyMd" tone="inkSecondary" accessibilityLiveRegion="polite">
            Revisá tu conexión y probá de nuevo.
          </Text>
        </Card>
      ) : !d ? (
        <SkeletonList rows={3} height={96} />
      ) : !valida ? (
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            {MOTIVO[estado as Exclude<EstadoInvitacion, "valida">].titulo}
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            {MOTIVO[estado as Exclude<EstadoInvitacion, "valida">].texto}
          </Text>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar letras={iniciales(quien)} size={48} />
            <Icon name="link" size={20} color={colors.inkSecondary} />
            <Avatar icon="perfil" size={48} />
          </View>
          <Text variant="bodyLg" tone="inkSecondary">
            Así pueden decidir juntos quién conviene que pague cuando compran en grupo.
          </Text>

          <Card padding={space.xl}>
            <Text variant="titleMd" accessibilityRole="header">
              Qué se comparte entre ustedes
            </Text>
            {d.comparte.map((t) => (
              <View key={t} style={{ flexDirection: "row", gap: space.sm }}>
                <Icon name="check" size={18} color={colors.accent} />
                <Text variant="bodyMd" style={{ flex: 1 }}>
                  {t}
                </Text>
              </View>
            ))}
          </Card>

          <Card padding={space.xl}>
            <Text variant="titleMd" accessibilityRole="header">
              Qué no se comparte nunca
            </Text>
            {d.noComparte.map((t) => (
              <View key={t} style={{ flexDirection: "row", gap: space.sm }}>
                <Icon name="candado" size={18} color={colors.inkSecondary} />
                <Text variant="bodyMd" style={{ flex: 1 }}>
                  {t}
                </Text>
              </View>
            ))}
          </Card>

          <Card tone="warning">
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Icon name="info" size={18} color={colors.warning} />
              <Text variant="bodyMd" tone="warning" style={{ flex: 1 }}>
                Ojo: {d.sePuedeDeducir.charAt(0).toLowerCase() + d.sePuedeDeducir.slice(1)}
              </Text>
            </View>
          </Card>

          <Text variant="bodyMd" tone="inkSecondary">
            Solo aceptá si conocés a quien te mandó el link. Podés quitar el vínculo cuando quieras desde Perfil, y se
            corta para los dos.
          </Text>
          <Text variant="label" tone="inkSecondary">
            {textoVencimiento(d.venceEn, new Date(ahora))}
          </Text>
        </>
      )}
    </Screen>
  );
}
