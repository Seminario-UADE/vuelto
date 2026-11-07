import { router } from "expo-router";
import { View } from "react-native";
import { antiguedad, type CompraPorConfirmar } from "@/data/por-confirmar";
import { pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectMediosDelUsuario } from "@/store/selectores";
import { space } from "@/theme";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Card } from "./card";
import { Text } from "./text";

/**
 * Una compra por confirmar (spec 012, FR-005): comercio, «Pagá con [medio]», monto si lo hay y
 * antigüedad. «Ya pagué» abre Revisá precargada; «Escanear ticket» abre el escaneo con la
 * compra (el cruce con el ticket es la issue #110); «Descartar» pide confirmación (FR-010).
 * La info se lee como un solo bloque y después las acciones, en ese orden.
 */
export function PorConfirmarCard({ c }: { c: CompraPorConfirmar }) {
  const medios = useAppSelector(selectMediosDelUsuario);
  const ahora = useAppSelector((s) => s.sesion.ahora);
  const medio = medios.find((m) => m.id === c.medioId);
  const pagaCon = medio ? `Pagá con ${medio.nombre}` : "Pagá con el medio que elegiste";
  const detalle = [c.monto !== null ? pesos(c.monto) : null, antiguedad(c, ahora)].filter(Boolean).join(" · ");

  return (
    <Card gap={space.lg} padding={space.xl}>
      <View
        accessible
        accessibilityLabel={`Compra por confirmar en ${c.comercioNombre}. ${pagaCon}. ${detalle}.`}
        style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
      >
        <Avatar letras={medio?.inicial ?? c.comercioNombre.charAt(0)} tone="activo" />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="label" tone="inkSecondary">
            Por confirmar · {c.comercioNombre}
          </Text>
          <Text variant="titleMd">{pagaCon}</Text>
          <Text variant="bodyMd" tone="inkSecondary" tabular>
            {detalle}
          </Text>
        </View>
      </View>
      <View style={{ gap: space.sm }}>
        <Button label="Ya pagué" onPress={() => router.push({ pathname: "/revisa", params: { porConfirmar: c.id } })} />
        <Button
          label="Escanear ticket"
          icon="camara"
          variant="secondary"
          onPress={() => router.push({ pathname: "/escanear", params: { porConfirmar: c.id } })}
        />
        <Button
          label="Descartar"
          variant="text"
          onPress={() =>
            router.push({ pathname: "/descartar-por-confirmar", params: { id: c.id, comercio: c.comercioNombre } })
          }
        />
      </View>
    </Card>
  );
}
