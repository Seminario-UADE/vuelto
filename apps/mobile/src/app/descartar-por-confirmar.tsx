import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { hapticoLeve } from "@/lib/haptics";
import { useAppDispatch } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { descartarPorConfirmar } from "@/store/thunks";
import { colors, space } from "@/theme";

/**
 * Descartar una compra por confirmar (sheet, spec 012 FR-010): pide confirmación y la saca sin
 * otro efecto. Es una hoja y no un `Alert` porque `Alert.alert` no hace nada en la web.
 */
export default function DescartarPorConfirmar() {
  const { id, comercio = "este comercio" } = useLocalSearchParams<{ id: string; comercio?: string }>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const descartar = () => {
    const pc = dispatch(descartarPorConfirmar(id));
    hapticoLeve();
    dispatch(avisoMostrado(`Descartaste la compra en ${pc?.comercioNombre ?? comercio}.`));
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
      <SheetHeader title={`¿Descartar la compra en ${comercio}?`} />
      <Text variant="bodyLg" tone="inkSecondary">
        Todavía no cuenta para tus topes, así que no cambia nada más. Si después pagás, cargá la compra a mano.
      </Text>
      <View style={{ gap: space.sm }}>
        <Button label="Descartar" variant="destructive" onPress={descartar} />
        <Button label="Cancelar" variant="text" onPress={() => router.back()} />
      </View>
    </View>
  );
}
