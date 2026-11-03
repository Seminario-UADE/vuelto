import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { hapticoLeve } from "@/lib/haptics";
import { useAppDispatch } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { eliminarCompra } from "@/store/thunks";
import { colors, space } from "@/theme";

/**
 * Borrar compra (sheet): pide confirmación y avisa que los topes se corrigen. Es una hoja y no
 * un `Alert` porque `Alert.alert` no hace nada en la web (spec 010, FR-001).
 */
export default function BorrarCompra() {
  const { id, comercio = "esta compra" } = useLocalSearchParams<{ id: string; comercio?: string }>();
  const insets = useSafeAreaInsets();
  const [borrando, setBorrando] = useState(false);
  const dispatch = useAppDispatch();

  const borrar = () => {
    setBorrando(true);
    dispatch(eliminarCompra(id));
    hapticoLeve();
    dispatch(avisoMostrado("Compra borrada · tus topes se corrigieron"));
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
      <SheetHeader title={`¿Borrar la compra en ${comercio}?`} />
      <Text variant="bodyLg" tone="inkSecondary">
        Deja de contar para tus topes y tus totales, y tu recomendación se calcula sin ella. Si la cargaste por error, es
        lo que corresponde.
      </Text>
      <View style={{ gap: space.sm }}>
        <Button label="Borrar compra" variant="destructive" onPress={borrar} loading={borrando} />
        <Button label="Cancelar" variant="text" onPress={() => router.back()} />
      </View>
    </View>
  );
}
