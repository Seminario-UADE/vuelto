import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { cerrarFlujo, Paso } from "@/components/paso";
import { Text } from "@/components/text";
import { aprox, pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectResumenCompras, selectTopes } from "@/store/selectores";
import { colors, radius, space } from "@/theme";

/**
 * Cierre del flujo de compra (auditoría v7, regla del pico y el final): la compra quedó
 * guardada, cuánto te van a devolver y cuánto tope te queda en ese medio, siempre con ≈ y su
 * base (Principio V). Sin barra de avance.
 */
export default function CompraGuardada() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const compra = useAppSelector(selectResumenCompras).compras.find((c) => c.id === id);
  const topes = useAppSelector(selectTopes);
  const tope = compra ? topes.medios.find((t) => t.medio.id === compra.medio.id && t.cifra !== null) : undefined;

  return (
    <Paso titulo="Compra guardada" atras={false} footer={<Button label="Volver al inicio" onPress={cerrarFlujo} />}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.tile,
          backgroundColor: colors.successBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" size={32} color={colors.ink} />
      </View>

      {compra ? (
        <>
          <Text variant="bodyLg" tone="inkSecondary" tabular>
            {compra.comercio.nombre} · {pesos(compra.monto)} con {compra.medio.nombre}
          </Text>
          {compra.reintegro !== null && compra.reintegro > 0 ? (
            <View
              accessible
              accessibilityLabel={`Te van a devolver aproximadamente ${pesos(compra.reintegro)}`}
              style={{ gap: space.xs }}
            >
              <Text variant="label" tone="inkSecondary">
                Te van a devolver
              </Text>
              <Text variant="display" tabular>
                {aprox(compra.reintegro)}
              </Text>
            </View>
          ) : (
            <Text variant="bodyLg">Esta compra no tiene reintegro.</Text>
          )}
          {tope ? (
            <View style={{ gap: space.xs }}>
              <Text variant="bodyLg" weight="semibold">
                Te quedan {tope.cifra} de tope en {tope.medio.nombreCorto}
              </Text>
              <Text variant="label" tone="inkSecondary">
                {tope.base.texto}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text variant="bodyLg" tone="inkSecondary">
          Ya la ves en tus topes.
        </Text>
      )}
    </Paso>
  );
}
