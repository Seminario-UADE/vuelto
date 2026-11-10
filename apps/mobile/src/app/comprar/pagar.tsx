import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { cerrarFlujo, Paso } from "@/components/paso";
import { Text } from "@/components/text";
import { pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectPorConfirmarVigentes } from "@/store/por-confirmar";
import { selectMediosDelUsuario } from "@/store/selectores";
import { colors, radius, space } from "@/theme";

/**
 * Paso 4: «Pagá con Galicia». El medio bien grande, para mirarlo en la caja, y una sola
 * decisión después de pagar (auditoría v7): escanear el ticket (principal), cargarla a mano o
 * dejarla para después. La compra por confirmar no cuenta para los topes hasta que se guarda
 * (FR-003). También se llega desde la fila de Inicio. No hay volver: solo cerrar.
 */
export default function PasoPagar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vigente = useAppSelector(selectPorConfirmarVigentes).find((c) => c.id === id);
  // Al guardar, la compra sale de la lista mientras esta pantalla todavía se ve detrás de la
  // transición: se muestra la última conocida en vez de parpadear «ya no está».
  const [ultima, setUltima] = useState(vigente);
  if (vigente && vigente !== ultima) setUltima(vigente);
  const pc = vigente ?? ultima;
  const medios = useAppSelector(selectMediosDelUsuario);
  const medio = pc ? medios.find((m) => m.id === pc.medioId) : undefined;

  if (!pc) {
    return (
      <Paso paso={4} titulo="Esta compra ya no está" atras={false}>
        <EmptyState
          title="La confirmaste o venció"
          body="Las compras sin confirmar se borran a las 48 horas."
          action={{ label: "Volver al inicio", onPress: cerrarFlujo }}
        />
      </Paso>
    );
  }

  const params = { porConfirmar: pc.id, flujo: "1" };
  return (
    <Paso
      paso={4}
      titulo={`Pagá con ${medio?.nombreCorto ?? "el medio que elegiste"}`}
      atras={false}
      footer={
        <>
          <Button label="Escanear ticket" icon="camara" onPress={() => router.push({ pathname: "/escanear", params })} />
          <Button label="Cargar a mano" variant="secondary" onPress={() => router.push({ pathname: "/revisa", params })} />
          <Button label="Lo confirmo después" variant="text" onPress={cerrarFlujo} />
        </>
      }
    >
      <View
        accessible
        accessibilityLabel={`Pagá con ${medio?.nombre ?? "el medio que elegiste"} en ${pc.comercioNombre}${pc.monto !== null ? `, ${pesos(pc.monto)}` : ""}`}
        style={{
          backgroundColor: colors.decisionBg,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding: space.xxl,
          gap: space.lg,
          alignItems: "flex-start",
        }}
      >
        <Avatar letras={medio?.inicial ?? "?"} tone="decision" size={56} />
        <Text variant="titleLg" style={{ color: colors.onDecision }}>
          {medio?.nombre ?? "El medio que elegiste"}
        </Text>
        <Text variant="bodyLg" tabular style={{ color: colors.onDecisionMuted }}>
          {pc.comercioNombre}
          {pc.monto !== null ? ` · ${pesos(pc.monto)}` : ""}
        </Text>
      </View>

      <View style={{ gap: space.xs }}>
        <Text variant="bodyLg" weight="semibold">
          Cuando pagues, confirmala
        </Text>
        <Text variant="bodyMd" tone="inkSecondary">
          Hasta que la confirmes no cuenta para tus topes.
        </Text>
      </View>
    </Paso>
  );
}
