import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { cerrarSesion as salir } from "@/data/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectPendientesAlCerrarSesion } from "@/store/selectores";
import { avisoMostrado } from "@/store/sesion";
import { colors, space } from "@/theme";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Cerrar sesión con compras sin subir o por confirmar (sheet): avisa cuántas se pierden antes
 * de vaciar el estado local (spec 010 FR-016, spec 012 FR-014). Es una hoja y no un `Alert`
 * porque no funciona en la web.
 */
export default function CerrarSesion() {
  const { guardados, borrados } = useAppSelector(selectPendientesAlCerrarSesion);
  const porConfirmar = useAppSelector(selectPorConfirmarVigentes).length;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const partes = [
    guardados > 0 ? plural(guardados, "compra guardada", "compras guardadas") : null,
    borrados > 0 ? plural(borrados, "borrado", "borrados") : null,
  ].filter(Boolean);
  const sinSubir = partes.length > 0;
  const textoPorConfirmar = plural(porConfirmar, "compra por confirmar", "compras por confirmar");
  const titulo = sinSubir ? "Tenés compras sin subir" : "Tenés compras por confirmar";
  const cuerpo = [
    sinSubir
      ? `Todavía no están en tu cuenta: ${partes.join(" y ")}. Si cerrás sesión ahora, se pierden de este teléfono. Conectate a internet y esperá a que se suban.`
      : null,
    porConfirmar > 0
      ? `${sinSubir ? "Además, si" : "Si"} cerrás sesión se pierde${porConfirmar === 1 ? "" : "n"} ${textoPorConfirmar}: viven solo en este teléfono.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

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
      <SheetHeader title={titulo} />
      <Text variant="bodyLg" tone="inkSecondary">
        {cuerpo}
      </Text>
      <View style={{ gap: space.sm }}>
        <Button label="Seguir acá" onPress={() => router.back()} />
        <Button label="Cerrar sesión igual" variant="text" onPress={cerrar} />
      </View>
    </View>
  );
}
