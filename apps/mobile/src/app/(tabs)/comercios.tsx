import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { GrillaComercios } from "@/components/comercio-tile";
import { ComerciosDelPerfil } from "@/components/comercios-del-perfil";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import type { Comercio } from "@/data/contracts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectComerciosFrecuentes } from "@/store/selectores";
import { comercioElegido } from "@/store/simulacion";
import { space } from "@/theme";

/**
 * Comercios (DESIGN.md v7): tus habituales en cuadrados. Tocar uno arranca la compra en el paso
 * del monto. Agregar y sacar queda detrás de «Editar», para que la pantalla tenga un solo propósito.
 */
export default function Comercios() {
  const dispatch = useAppDispatch();
  const comercios = useAppSelector(selectComerciosFrecuentes);
  const habituales = useAppSelector((s) => s.perfil.comercios.length);
  const [editando, setEditando] = useState(false);

  const comprarEn = (c: Comercio) => {
    dispatch(comercioElegido(c.id));
    router.push("/comprar/monto");
  };

  return (
    <Screen kind="tab" aboveTabBar>
      <View style={{ gap: space.xs }}>
        <Text variant="titleLg" accessibilityRole="header">
          Tus comercios
        </Text>
        <Text variant="bodyLg" tone="inkSecondary">
          {habituales === 0 ? "Los más usados. Sumá los tuyos con Editar." : "Tocá uno para comprar ahí."}
        </Text>
      </View>

      {editando ? <ComerciosDelPerfil /> : <GrillaComercios comercios={comercios} onElegir={comprarEn} />}

      <Button label={editando ? "Listo" : "Editar"} variant="secondary" onPress={() => setEditando((v) => !v)} />
    </Screen>
  );
}
