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
import * as api from "@/data/api";
import type { EstadoInvitacion } from "@/data/contracts";
import { guardarPerfilLocal, usePerfilLocal } from "@/data/perfil-local";
import { setSesion } from "@/data/sesion";
import { useAsync } from "@/hooks/use-async";
import { hapticoExito } from "@/lib/haptics";
import { iniciales } from "@/lib/format";
import { colors, space } from "@/theme";

const MOTIVO: Record<Exclude<EstadoInvitacion, "valida">, { titulo: string; texto: string }> = {
  vencida: { titulo: "Esta invitación venció", texto: "Las invitaciones duran 24 h. Pedile a quien te la mandó que genere otra." },
  usada: { titulo: "Esta invitación ya se usó", texto: "Cada invitación sirve una sola vez. Pedile a quien te la mandó un link nuevo." },
  propia: { titulo: "Es tu propia invitación", texto: "Mandásela a la persona con la que querés vincularte." },
  "ya-contacto": { titulo: "Ya son contactos", texto: "No hace falta aceptar de nuevo. Lo ves en Perfil, en Contactos." },
};

/**
 * Aceptar invitación (ADR-008 §1 y §3): quién invita, qué se comparte, qué no y qué se
 * puede deducir. "Aceptar" y "Ahora no" con el mismo peso visual, nada preseleccionado.
 */
export default function AceptarInvitacion() {
  const { token = "" } = useLocalSearchParams<{ token: string }>();
  const { perfil } = usePerfilLocal();
  const v = useAsync(() => api.verInvitacion(token), token);
  const [aceptando, setAceptando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quien abre el link sin perfil pasa primero por el onboarding y vuelve acá al terminar.
  useEffect(() => {
    if (!perfil.onboardingCompleto) {
      void guardarPerfilLocal({ invitacionPendiente: token }).then(() => router.replace("/bienvenida"));
    }
  }, [perfil.onboardingCompleto, token]);

  const aceptar = async () => {
    setAceptando(true);
    setError(null);
    try {
      const { contacto } = await api.aceptarInvitacion(token);
      hapticoExito();
      setSesion({ aviso: `Ahora ${contacto.nombre} es tu contacto` });
      router.replace("/perfil");
    } catch (e) {
      setAceptando(false);
      setError(e instanceof Error ? e.message : "No pudimos aceptar la invitación. Probá de nuevo.");
    }
  };
  const ahoraNo = () => router.replace("/");

  const d = v.datos;
  const valida = d?.estado === "valida";
  const quien = d?.quienInvita ?? "Alguien";

  return (
    <Screen
      footer={
        d ? (
          valida ? (
            <>
              {error ? (
                <Text variant="label" tone="error" align="center" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              <Button label="Aceptar invitación" variant="secondary" onPress={aceptar} loading={aceptando} />
              <Button label="Ahora no" variant="secondary" onPress={ahoraNo} disabled={aceptando} />
            </>
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
      {!d ? (
        <SkeletonList rows={3} height={96} />
      ) : !valida ? (
        <Card padding={space.xl}>
          <Text variant="titleMd" accessibilityRole="header">
            {MOTIVO[d.estado as Exclude<EstadoInvitacion, "valida">].titulo}
          </Text>
          <Text variant="bodyMd" tone="inkSecondary">
            {MOTIVO[d.estado as Exclude<EstadoInvitacion, "valida">].texto}
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
            Vence en 23 h · sirve una sola vez
          </Text>
        </>
      )}
    </Screen>
  );
}
