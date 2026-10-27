import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import * as api from "@/data/api";
import { setSesion } from "@/data/sesion";
import { hapticoLeve } from "@/lib/haptics";
import { colors, space } from "@/theme";

/** Quitar contacto (sheet): confirma y explica que el vínculo se rompe para los dos (ADR-008 §2). */
export default function Quitar() {
  const { id, nombre = "este contacto" } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const insets = useSafeAreaInsets();
  const [quitando, setQuitando] = useState(false);

  const quitar = async () => {
    setQuitando(true);
    await api.quitarContacto(id);
    hapticoLeve();
    setSesion({ aviso: `Quitaste a ${nombre}. El vínculo se cortó para los dos.` });
    router.back();
  };

  return (
    <View
      style={{
        backgroundColor: colors.canvas,
        paddingHorizontal: space.gutter,
        paddingTop: space.xl,
        paddingBottom: Math.max(insets.bottom, space.lg),
        gap: space.xl,
      }}
    >
      <SheetHeader title={`¿Quitar a ${nombre} de tus contactos?`} />
      <Text variant="bodyLg" tone="inkSecondary">
        El vínculo se corta para los dos. Desde la próxima recomendación, ninguno va a poder incluir al otro en un gasto
        en grupo. Para volver a vincularse hace falta una invitación nueva.
      </Text>
      <View style={{ gap: space.sm }}>
        <Button label="Quitar contacto" variant="destructive" onPress={quitar} loading={quitando} />
        <Button label="Cancelar" variant="text" onPress={() => router.back()} />
      </View>
    </View>
  );
}
