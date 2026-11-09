import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TopeDetalle } from "@/components/tope-card";
import { aprox } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectTopes } from "@/store/selectores";
import { colors, space } from "@/theme";

/**
 * Tus topes (DESIGN.md v7): cuánto queda por medio, con ≈ y su base, y nada más. Sin total
 * agregado de topes (auditoría P1 #4), sin chips ni consejos: lo que conviene hoy lo dice el «+».
 */
export default function Topes() {
  // Derivados con el motor sobre las compras del store: una compra guardada los cambia al instante.
  const datos = useAppSelector(selectTopes);
  const vacio = datos.devolvieron.monto === 0 && datos.medios.every((m) => m.disponible === null);

  return (
    <Screen kind="tab" aboveTabBar>
      <View style={{ gap: space.xs }}>
        <Text variant="titleLg" accessibilityRole="header">
          Tus topes
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <Icon name="calendario" size={16} color={colors.inkSecondary} />
          <Text variant="label" tone="inkSecondary">
            {datos.mes.replace(/^./, (c) => c.toUpperCase())} · los mensuales se reinician en {datos.reinicioMensualEnDias} días
          </Text>
        </View>
      </View>

      {vacio ? (
        <EmptyState
          title="Todavía no registraste compras"
          body="Cuando registres la primera, vas a ver cuánto tope te queda en cada medio. Tocá + cuando estés por pagar."
        />
      ) : (
        <>
          <View style={{ gap: space.md }}>
            {datos.medios.map((m) => (
              <TopeDetalle
                key={m.clave}
                t={m}
                conConsejo={false}
                onPress={() => router.push({ pathname: "/tope/[clave]", params: { clave: m.clave } })}
              />
            ))}
          </View>

          <Text variant="label" tone="inkSecondary" align="center">
            Estimados según las compras que registrás. Este mes te devolvieron {aprox(datos.devolvieron.monto)},{" "}
            {datos.devolvieron.base.texto}.
          </Text>
          <Button label="Ver mis compras" variant="text" onPress={() => router.push("/mis-compras")} />
        </>
      )}
    </Screen>
  );
}
