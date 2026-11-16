import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { hapticoLeve } from "@/lib/haptics";
import { quitarContacto } from "@/store/contactos";
import { useAppDispatch } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { colors, space } from "@/theme";

/** Quitar contacto (sheet): confirma y explica que el vínculo se rompe para los dos (ADR-008 §2). */
export default function Quitar() {
  const { id, nombre = "este contacto" } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const insets = useSafeAreaInsets();
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // La lista local cambia solo si el servidor confirmó (spec 016 US2-15).
  const quitar = async () => {
    setQuitando(true);
    setError(null);
    try {
      await dispatch(quitarContacto(id));
    } catch {
      setQuitando(false);
      setError("No pudimos quitarlo. Revisá tu conexión y probá de nuevo.");
      return;
    }
    hapticoLeve();
    dispatch(avisoMostrado(`Quitaste a ${nombre}. El vínculo se cortó para los dos.`));
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
        {error ? (
          <Text variant="label" tone="error" align="center" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={error ? "Reintentar" : "Quitar contacto"} variant="destructive" onPress={quitar} loading={quitando} />
        <Button label="Cancelar" variant="text" onPress={() => router.back()} />
      </View>
    </View>
  );
}
