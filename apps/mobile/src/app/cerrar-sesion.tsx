import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { cerrarSesion as salir } from "@/data/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPendientesAlCerrarSesion } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { colors, space } from "@/theme";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Cerrar sesión con compras sin subir (sheet): avisa cuántas se pierden antes de vaciar el
 * estado local (spec 010, FR-016). Es una hoja y no un `Alert` porque no funciona en la web.
 */
export default function CerrarSesion() {
  const { guardados, borrados } = useAppSelector(selectPendientesAlCerrarSesion);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const partes = [
    guardados > 0 ? plural(guardados, "compra guardada", "compras guardadas") : null,
    borrados > 0 ? plural(borrados, "borrado", "borrados") : null,
  ].filter(Boolean);

  const cerrar = async () => {
    const error = await dispatch(salir());
    if (error) {
      dispatch(avisoMostrado(error));
      return;
    }
    router.dismissAll();
    router.replace("/bienvenida");
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
      <SheetHeader title="Tenés compras sin subir" />
      <Text variant="bodyLg" tone="inkSecondary">
        {`Todavía no están en tu cuenta: ${partes.join(" y ")}. Si cerrás sesión ahora, se pierden de este teléfono. Conectate a internet y esperá a que se suban.`}
      </Text>
      <View style={{ gap: space.sm }}>
        <Button label="Seguir acá" onPress={() => router.back()} />
        <Button label="Cerrar sesión igual" variant="text" onPress={cerrar} />
      </View>
    </View>
  );
}
