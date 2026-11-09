import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { colors, radius, size, space } from "@/theme";
import { Icon } from "./icon";
import { ProgressSegments } from "./progress-segments";
import { Screen } from "./screen";
import { Text } from "./text";

export const PASOS_COMPRA = 4;

type Props = {
  /** 1 a 4. Sin paso (pantalla final) no hay barra de avance. */
  paso?: number;
  titulo: string;
  subtitulo?: string;
  /** Con volver (‹) a la izquierda. Desde el paso 4 no se vuelve: solo se cierra. */
  atras?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
};

/** Cierra el flujo y vuelve a las pestañas. */
export function cerrarFlujo() {
  router.dismissTo("/");
}

/**
 * Una pantalla del flujo de compra (DESIGN.md v7 §5): volver, barra de avance y cerrar arriba;
 * una pregunta como título; una sola acción principal en el pie. Un propósito por pantalla.
 */
export function Paso({ paso, titulo, subtitulo, atras = true, footer, children }: Props) {
  return (
    <Screen kind="tab" footer={footer} gap={space.xl}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: size.hit }}>
        <BotonIcono
          visible={atras && router.canGoBack()}
          icon="atras"
          label="Volver"
          onPress={() => router.back()}
        />
        {paso ? <ProgressSegments total={PASOS_COMPRA} actual={paso} contexto="Compra" ancho={96} /> : <View />}
        <BotonIcono visible icon="cerrar" label="Cerrar" onPress={cerrarFlujo} />
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="titleLg" accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? (
          <Text variant="bodyLg" tone="inkSecondary">
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}

function BotonIcono({ visible, icon, label, onPress }: { visible: boolean; icon: "atras" | "cerrar"; label: string; onPress: () => void }) {
  if (!visible) return <View style={{ width: size.hit }} />;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        width: size.hit,
        height: size.hit,
        borderRadius: radius.control,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}
