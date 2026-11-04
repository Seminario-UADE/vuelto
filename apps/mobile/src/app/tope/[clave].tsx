import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Card } from "@/components/card";
import { CompraRow } from "@/components/compra-row";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { divisor } from "@/components/lista";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TopeDetalle } from "@/components/tope-card";
import { estePeriodo } from "@/lib/textos";
import { useAppSelector } from "@/store/hooks";
import { selectComprasDeTope, selectMarcasDeSubida } from "@/store/selectores";
import { colors, space } from "@/theme";

/**
 * Compras de un tope (issue #45): el tope arriba, con su cifra y su base, y abajo las compras que
 * el motor contó en esa base. Todo sale del store: borrar una compra acá corrige el tope y la
 * lista al instante, sin red.
 */
export default function ComprasDelTope() {
  const { clave } = useLocalSearchParams<{ clave: string }>();
  const datos = useAppSelector((s) => selectComprasDeTope(s, clave));
  const subida = useAppSelector(selectMarcasDeSubida);

  if (!datos) {
    return (
      <Screen>
        <EmptyState
          title="Este tope ya no está"
          body="La promo venció o ya no tenés el medio de pago en tu perfil."
          action={{ label: "Volver a tus topes", onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const { tope, compras } = datos;

  return (
    <Screen>
      <TopeDetalle t={tope} />

      {tope.clave.startsWith("grupo:") ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" weight="semibold" tone="inkSecondary" accessibilityRole="header">
            Tope compartido entre
          </Text>
          <Card padding={space.lg} gap={space.sm}>
            {tope.promociones.map((titulo, i) => (
              <Text key={i} variant="bodyMd">
                {titulo}
              </Text>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text variant="label" weight="semibold" tone="inkSecondary" accessibilityRole="header">
          Compras que lo consumieron
        </Text>
        {compras.length === 0 ? (
          <Text variant="bodyMd" tone="inkSecondary">
            Ninguna compra registrada {estePeriodo(tope.periodo)} con {tope.clave.startsWith("grupo:") ? "estas promos" : "esta promo"}.
          </Text>
        ) : (
          <Card padding={space.lg} gap={0}>
            {compras.map((c, i) => (
              <View key={c.id} style={divisor(i)}>
                <CompraRow
                  c={c}
                  conFecha
                  marca={subida.marcas[c.id]}
                  onBorrar={() =>
                    router.push({ pathname: "/borrar-compra", params: { id: c.id, comercio: c.comercio.nombre } })
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Icon name="info" size={18} color={colors.inkSecondary} />
        <Text variant="label" tone="inkSecondary" style={{ flex: 1 }}>
          El consumo es estimado: lo calculamos con estas compras. Una compra borrada deja de contar al instante.
        </Text>
      </View>
    </Screen>
  );
}
